import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { assertRequiredEnv, REQUIRED_LS_WEBHOOK_ENV, warnRecommendedLsVariantEnv } from '@/lib/env-check'
import type { SpottingBoardProduct, EntitlementStatus } from '@/lib/entitlements/types'
import { resolveSpottingBoardProduct, SBPRO_FAMILY } from '@/lib/payments/sb-product-resolver'

// TASK-142 Step 2 (C2): fail-closed at module load if required env is missing.
// Symptom shifts from "first paying customer silently lost" to "deploy smoke
// test 500s immediately." Variant IDs are recommended-not-required (webhook
// falls back to product-name match) so they only warn.
assertRequiredEnv(REQUIRED_LS_WEBHOOK_ENV, 'LemonSqueezy webhook')
warnRecommendedLsVariantEnv()

// Use service-role client for webhook writes (bypasses RLS)
function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase env vars for webhook handler')
  }
  return createClient(url, serviceKey)
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  // TASK-157 fix P1-7: validate hex format before decoding so non-hex inputs
  // fail fast instead of relying on Buffer.from() coercion behavior.
  if (!/^[0-9a-fA-F]{64}$/.test(signature)) return false
  try {
    const hmac = createHmac('sha256', secret)
    const digest = hmac.update(rawBody).digest('hex')
    const sigBuf = Buffer.from(signature, 'hex')
    const digestBuf = Buffer.from(digest, 'hex')
    if (sigBuf.length !== digestBuf.length) return false
    return timingSafeEqual(sigBuf, digestBuf)
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Existing GONR consumer/individual-spotter products (user-scoped subscriptions)
// ─────────────────────────────────────────────────────────────────────────────
type BillingTier = 'home' | 'spotter' | 'operator'

const HOME_VARIANT_ID = process.env.LS_HOME_VARIANT_ID
const SPOTTER_VARIANT_ID = process.env.LS_SPOTTER_VARIANT_ID
const OPERATOR_VARIANT_ID = process.env.LS_OPERATOR_VARIANT_ID

function resolveProductTier(productName: string, variantId?: string | null): BillingTier {
  if (variantId) {
    const idStr = String(variantId)
    if (HOME_VARIANT_ID && idStr === HOME_VARIANT_ID) return 'home'
    if (SPOTTER_VARIANT_ID && idStr === SPOTTER_VARIANT_ID) return 'spotter'
    if (OPERATOR_VARIANT_ID && idStr === OPERATOR_VARIANT_ID) return 'operator'
  }

  const lower = (productName || '').toLowerCase()
  if (lower.includes('operator')) return 'operator'
  if (lower.includes('home')) return 'home'
  if (lower.includes('spotter')) return 'spotter'

  return 'spotter'
}

// ─────────────────────────────────────────────────────────────────────────────
// New SpottingBoard plant-scoped products (TASK-154)
//
// resolveSpottingBoardProduct + SBPRO_FAMILY are imported from
// `@/lib/payments/sb-product-resolver` so the resolver is unit-testable
// without going through the full webhook handler.
// ─────────────────────────────────────────────────────────────────────────────

function isRecurringProduct(product: SpottingBoardProduct): boolean {
  return product === 'spottingboard_pro' || product === 'plant_brain_runtime'
}

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency ledger (Atlas decision 8)
//
// Returns:
//   - { processed: true } — event already processed; webhook should 200 immediately
//   - { processed: false, eventTs } — event new; caller proceeds, then marks processed
//   - { stale: true } — event has an older event_ts than a same-subscription
//     event we already processed; caller should 200 without rewriting state
// ─────────────────────────────────────────────────────────────────────────────
interface LedgerCheckResult {
  processed: boolean
  stale?: boolean
  eventTs?: string | null
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

async function checkAndReserveLedger(
  supabase: SupabaseClient,
  eventId: string,
  eventName: string,
  eventTs: string | null,
  rawBody: string,
): Promise<LedgerCheckResult> {
  const { data: existing } = await supabase
    .from('lemonsqueezy_webhook_events')
    .select('event_id, processed, event_ts')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing?.processed) {
    return { processed: true }
  }

  // First time we've seen this event_id: insert reservation row.
  const { error: insertErr } = await supabase
    .from('lemonsqueezy_webhook_events')
    .upsert(
      {
        event_id: eventId,
        event_name: eventName,
        event_ts: eventTs,
        payload_digest: sha256Hex(rawBody),
        processed: false,
      },
      { onConflict: 'event_id' },
    )
  if (insertErr) {
    console.error('[LS Webhook] ledger insert failed', insertErr)
  }

  return { processed: false, eventTs }
}

async function markLedgerProcessed(
  supabase: SupabaseClient,
  eventId: string,
  result: string,
): Promise<void> {
  await supabase
    .from('lemonsqueezy_webhook_events')
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      processing_result: result,
    })
    .eq('event_id', eventId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Conservative timestamp/period guard (Atlas decision 8)
//
// Refuses to overwrite plant_entitlements with an older event when the row
// already reflects a newer event. Prevents out-of-order LS deliveries from
// rolling back a customer's state.
// ─────────────────────────────────────────────────────────────────────────────
function isNewerEvent(
  existingUpdatedAt: string | null | undefined,
  incomingEventTs: string | null,
): boolean {
  // TASK-157 fix P1-2: fail-closed on missing timestamps. Atlas's wiring
  // decision 8 calls for a "conservative timestamp/period guard" — if either
  // side lacks a usable timestamp, refuse to overwrite and let the existing
  // row stand. Previous behavior defaulted to allow-write, which was the
  // permissive direction.
  if (!existingUpdatedAt) return true       // no existing row → safe to write (first event for this plant/product)
  if (!incomingEventTs) {
    console.warn('[LS Webhook] event missing timestamp; refusing overwrite (fail-closed)')
    return false
  }
  const existingMs = new Date(existingUpdatedAt).getTime()
  const incomingMs = new Date(incomingEventTs).getTime()
  if (!Number.isFinite(existingMs) || !Number.isFinite(incomingMs)) {
    console.warn('[LS Webhook] non-finite timestamp; refusing overwrite (fail-closed)', {
      existingUpdatedAt,
      incomingEventTs,
    })
    return false
  }
  return incomingMs >= existingMs
}

// ─────────────────────────────────────────────────────────────────────────────
// Plant entitlement upsert (the new SBPro/PlantBrainRuntime/StarterPack branch)
// ─────────────────────────────────────────────────────────────────────────────
interface SBPaymentEvent {
  product: SpottingBoardProduct
  plantId: string
  billingEmail: string
  status: EntitlementStatus
  lsSubscriptionId: string | null
  lsOrderId: string | null
  lsVariantId: string | null
  currentPeriodEndAt: string | null
  cancelledAt: string | null
  metadata?: Record<string, unknown>
  eventTs: string | null
}

async function applySBEntitlement(
  supabase: SupabaseClient,
  evt: SBPaymentEvent,
): Promise<{ ok: boolean; result: string }> {
  // Recurring-product app assertion (paired with DDL CHECK constraint).
  if (isRecurringProduct(evt.product) && !evt.lsSubscriptionId) {
    return { ok: false, result: 'recurring_missing_subscription_id' }
  }

  // Conservative ordering guard: read the current row's updated_at and skip
  // if the incoming event is older.
  const { data: existing } = await supabase
    .from('plant_entitlements')
    .select('updated_at, status, current_period_end_at')
    .eq('plant_id', evt.plantId)
    .eq('product', evt.product)
    .maybeSingle()

  if (existing && !isNewerEvent(existing.updated_at as string | null, evt.eventTs)) {
    console.warn('[LS Webhook] stale event for plant', evt.plantId, evt.product, {
      existingUpdatedAt: existing.updated_at,
      incomingEventTs: evt.eventTs,
    })
    return { ok: true, result: 'stale_event_skipped' }
  }

  const row = {
    plant_id: evt.plantId,
    product: evt.product,
    status: evt.status,
    billing_email: evt.billingEmail.toLowerCase(),
    ls_subscription_id: evt.lsSubscriptionId,
    ls_order_id: evt.lsOrderId,
    ls_variant_id: evt.lsVariantId,
    current_period_end_at: evt.currentPeriodEndAt,
    cancelled_at: evt.cancelledAt,
    metadata: evt.metadata ?? {},
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('plant_entitlements')
    .upsert(row, { onConflict: 'plant_id,product' })

  if (error) {
    console.error('[LS Webhook] plant_entitlements upsert failed', error)
    return { ok: false, result: 'db_error' }
  }

  return { ok: true, result: 'ok' }
}

function extractPlantId(payload: Record<string, unknown>): string | null {
  const data = (payload?.data as Record<string, unknown> | undefined)?.attributes as
    | Record<string, unknown>
    | undefined
  const meta = payload?.meta as Record<string, unknown> | undefined

  const customDataA = (data?.custom_data ?? meta?.custom_data) as Record<string, unknown> | undefined
  const plantId = customDataA?.plant_id
  if (typeof plantId === 'string' && plantId.length > 0) return plantId
  return null
}

function pickVariantId(payload: Record<string, unknown>): string | null {
  const attrs = (payload?.data as Record<string, unknown> | undefined)?.attributes as
    | Record<string, unknown>
    | undefined
  if (!attrs) return null
  const candidates: unknown[] = [
    (attrs.first_subscription_item as Record<string, unknown> | undefined)?.variant_id,
    (attrs.first_order_item as Record<string, unknown> | undefined)?.variant_id,
    attrs.variant_id,
  ]
  for (const c of candidates) {
    if (c != null) return String(c)
  }
  return null
}

function lsStatusToEntitlementStatus(lsStatus: string | null | undefined): EntitlementStatus {
  switch (lsStatus) {
    case 'active':
    case 'on_trial':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'cancelled':
      return 'cancelled'
    case 'expired':
      return 'expired'
    case 'paused':
      return 'paused'
    default:
      return 'active'
  }
}

const PAST_DUE_GRACE_DAYS = 7

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const eventName = req.headers.get('x-event-name') || 'unknown'
  const signature = req.headers.get('x-signature') || ''
  const eventId = req.headers.get('x-event-id') || ''
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

  if (!secret) {
    console.error('[LS Webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const rawBody = await req.text()

  if (!verifySignature(rawBody, signature, secret)) {
    console.error('[LS Webhook] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    console.error('[LS Webhook] Failed to parse payload')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data =
    ((payload.data as Record<string, unknown> | undefined)?.attributes as Record<string, unknown> | undefined) ?? {}
  const meta = (payload.meta as Record<string, unknown> | undefined) ?? {}

  const eventTs = (data.updated_at as string | undefined) ?? null

  const supabase = getSupabaseAdmin()

  // Idempotency: skip if we've already processed this event.
  if (eventId) {
    const ledger = await checkAndReserveLedger(supabase, eventId, eventName, eventTs, rawBody)
    if (ledger.processed) {
      return NextResponse.json({ received: true, idempotent: true })
    }
  }

  // Determine which family this event belongs to.
  const variantId = pickVariantId(payload)
  const productName =
    (data.product_name as string | undefined) ||
    (data.first_order_item as Record<string, unknown> | undefined)?.product_name as string | undefined ||
    ''

  const sbProduct = resolveSpottingBoardProduct(productName, variantId)

  console.log(`[LS Webhook] Event: ${eventName}`, {
    eventId,
    orderId: data.order_number || (payload.data as Record<string, unknown> | undefined)?.id,
    customerEmail: data.user_email,
    productName,
    variantId,
    sbProduct,
  })

  try {
    // TASK-157 fix P1-8 (2026-05-07): if the resolver returned null but the
    // product name looks SB-related, refuse to silently fall through to the
    // legacy GONR consumer path (which defaults misnamed events to 'spotter').
    // Better to 422 and surface the misconfiguration than mis-tier a payment.
    if (sbProduct === null && /spotting\s*board|plant\s*brain|gonr\s*addon|gonr\s*runtime|sbpro/i.test(productName)) {
      console.error('[LS Webhook] looks-like-SB product did not resolve', {
        eventId,
        productName,
        variantId,
      })
      if (eventId) await markLedgerProcessed(supabase, eventId, 'unrecognized_sb_product')
      return NextResponse.json(
        { error: 'unrecognized_sb_product', product_name: productName },
        { status: 422 },
      )
    }

    // ─────────────────────────────────────────────────────────────────────
    // SpottingBoard family path (TASK-154)
    // ─────────────────────────────────────────────────────────────────────
    if (sbProduct && SBPRO_FAMILY.has(sbProduct)) {
      const plantId = extractPlantId(payload)
      const billingEmail = (data.user_email as string | undefined)?.toLowerCase()

      if (!plantId) {
        console.error('[LS Webhook] SB event missing custom_data.plant_id', { eventId, sbProduct })
        // Atlas review fix #2 (2026-05-07): do NOT mark processed for
        // retryable failures. The reservation row stays at processed=false
        // so LS retries actually re-run the handler instead of being
        // short-circuited by the ledger to a 200.
        return NextResponse.json(
          { error: 'missing_plant_id', sb_product: sbProduct },
          { status: 422 },
        )
      }

      if (!billingEmail) {
        // Atlas review fix #2 (2026-05-07): same — retryable, do not mark processed.
        return NextResponse.json({ error: 'missing_email' }, { status: 422 })
      }

      // TASK-157 fix P0-2 (2026-05-07): verify the billing email belongs to
      // the plant before applying entitlement. Without this, a buyer could
      // tamper with checkout custom_data.plant_id to route premium to a plant
      // they don't belong to. HMAC protects against external forgery; this
      // check protects against authorized-buyer-routes-to-wrong-plant.
      //
      // Retryable — buyer might join the plant after payment. Do NOT mark
      // ledger processed; LS retry will re-run after the buyer signs up.
      const { data: membership, error: membershipErr } = await supabase
        .from('plant_users')
        .select('user_email')
        .eq('plant_id', plantId)
        .eq('user_email', billingEmail)
        .maybeSingle()

      if (membershipErr) {
        console.error('[LS Webhook] plant_users lookup failed', { eventId, plantId, membershipErr })
        return NextResponse.json({ error: 'membership_check_failed' }, { status: 500 })
      }

      if (!membership) {
        console.error('[LS Webhook] billing email not a member of target plant', {
          eventId,
          plantId,
          billingEmail,
          sbProduct,
        })
        return NextResponse.json(
          { error: 'billing_email_not_member_of_plant', plant_id: plantId, sb_product: sbProduct },
          { status: 422 },
        )
      }

      // Atlas review fix #3 (2026-05-07): defer recurring SB products on
      // order_created. LemonSqueezy fires order_created BEFORE
      // subscription_created for new recurring subscriptions, but
      // order_created has no subscription id — which fails the recurring-
      // product assertion. Skip recurring order_created and let the
      // subscription_created event do the upsert. starter_pack (one-time)
      // legitimately processes here.
      if (eventName === 'order_created' && isRecurringProduct(sbProduct)) {
        if (eventId) await markLedgerProcessed(supabase, eventId, 'deferred_to_subscription_created')
        console.log('[LS Webhook] order_created for recurring SB product deferred', {
          eventId,
          sbProduct,
        })
        return NextResponse.json({ received: true, deferred: 'subscription_created' })
      }

      const lsSubscriptionId =
        eventName.startsWith('subscription_') || eventName === 'subscription_payment_success'
          ? String((payload.data as Record<string, unknown> | undefined)?.id ?? '') || null
          : null

      const lsOrderId =
        (data.order_number as string | undefined) ||
        ((payload.data as Record<string, unknown> | undefined)?.id as string | undefined) ||
        null

      const currentPeriodEndAt = (data.renews_at as string | undefined) ?? null
      const lsStatus = (data.status as string | undefined) ?? null

      let evt: SBPaymentEvent | null = null

      switch (eventName) {
        case 'order_created': {
          // Atlas fix #3: recurring products were deferred above; only
          // starter_pack (one-time) reaches here. 30-day onboarding window.
          evt = {
            product: sbProduct,
            plantId,
            billingEmail,
            status: 'active',
            lsSubscriptionId: null,
            lsOrderId,
            lsVariantId: variantId,
            currentPeriodEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancelledAt: null,
            metadata: {},
            eventTs,
          }
          break
        }
        case 'subscription_created':
        case 'subscription_resumed':
        case 'subscription_payment_success': {
          evt = {
            product: sbProduct,
            plantId,
            billingEmail,
            status: 'active',
            lsSubscriptionId: String((payload.data as Record<string, unknown> | undefined)?.id ?? '') || null,
            lsOrderId,
            lsVariantId: variantId,
            currentPeriodEndAt,
            cancelledAt: null,
            metadata: {},
            eventTs,
          }
          break
        }
        case 'subscription_updated': {
          evt = {
            product: sbProduct,
            plantId,
            billingEmail,
            status: lsStatusToEntitlementStatus(lsStatus),
            lsSubscriptionId: String((payload.data as Record<string, unknown> | undefined)?.id ?? '') || null,
            lsOrderId,
            lsVariantId: variantId,
            currentPeriodEndAt,
            cancelledAt: lsStatus === 'cancelled' ? new Date().toISOString() : null,
            metadata: {},
            eventTs,
          }
          break
        }
        case 'subscription_payment_failed': {
          const graceUntil = new Date(
            Date.now() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString()
          evt = {
            product: sbProduct,
            plantId,
            billingEmail,
            status: 'past_due',
            lsSubscriptionId: String((payload.data as Record<string, unknown> | undefined)?.id ?? '') || null,
            lsOrderId,
            lsVariantId: variantId,
            currentPeriodEndAt,
            cancelledAt: null,
            metadata: { past_due_grace_until: graceUntil },
            eventTs,
          }
          break
        }
        case 'subscription_cancelled': {
          evt = {
            product: sbProduct,
            plantId,
            billingEmail,
            status: 'cancelled',
            lsSubscriptionId: String((payload.data as Record<string, unknown> | undefined)?.id ?? '') || null,
            lsOrderId,
            lsVariantId: variantId,
            currentPeriodEndAt,                      // preserve the period the customer paid for
            cancelledAt: new Date().toISOString(),
            metadata: {},
            eventTs,
          }
          break
        }
        case 'subscription_expired': {
          evt = {
            product: sbProduct,
            plantId,
            billingEmail,
            status: 'expired',
            lsSubscriptionId: String((payload.data as Record<string, unknown> | undefined)?.id ?? '') || null,
            lsOrderId,
            lsVariantId: variantId,
            currentPeriodEndAt: null,
            cancelledAt: null,
            metadata: {},
            eventTs,
          }
          break
        }
        case 'subscription_paused': {
          evt = {
            product: sbProduct,
            plantId,
            billingEmail,
            status: 'paused',
            lsSubscriptionId: String((payload.data as Record<string, unknown> | undefined)?.id ?? '') || null,
            lsOrderId,
            lsVariantId: variantId,
            currentPeriodEndAt,
            cancelledAt: null,
            metadata: {},
            eventTs,
          }
          break
        }
        case 'order_refunded': {
          evt = {
            product: sbProduct,
            plantId,
            billingEmail,
            status: 'expired',
            lsSubscriptionId: lsSubscriptionId,
            lsOrderId,
            lsVariantId: variantId,
            currentPeriodEndAt: null,
            cancelledAt: null,
            metadata: { refund_reason: data.refunded_at as string | undefined },
            eventTs,
          }
          break
        }
        default: {
          if (eventId) await markLedgerProcessed(supabase, eventId, 'unhandled_sb_event')
          return NextResponse.json({ received: true, unhandled: eventName })
        }
      }

      const result = await applySBEntitlement(supabase, evt)
      if (eventId) await markLedgerProcessed(supabase, eventId, result.result)
      if (!result.ok) {
        return NextResponse.json({ error: result.result }, { status: 500 })
      }
      return NextResponse.json({ received: true, sb_product: sbProduct, result: result.result })
    }

    // ─────────────────────────────────────────────────────────────────────
    // Existing GONR consumer/individual-spotter path (preserved as-is)
    // ─────────────────────────────────────────────────────────────────────
    switch (eventName) {
      case 'order_created': {
        const email = (data.user_email as string | undefined)?.toLowerCase()
        if (!email) {
          // Atlas review fix #2 (2026-05-07): retryable — do not mark processed.
          console.error('[LS Webhook] order_created missing user_email')
          return NextResponse.json({ error: 'Missing email' }, { status: 400 })
        }

        const productNameForTier =
          ((data.first_order_item as Record<string, unknown> | undefined)?.product_name as string | undefined) || ''
        const tier = resolveProductTier(productNameForTier, variantId)

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              email,
              tier,
              status: 'active',
              ls_order_id: String(data.order_number || (payload.data as Record<string, unknown> | undefined)?.id || ''),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' },
          )

        if (error) {
          console.error('[LS Webhook] Supabase upsert failed (order_created):', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (eventId) await markLedgerProcessed(supabase, eventId, 'ok_legacy_order')
        console.log(`[LS Webhook] order_created: ${email} → ${tier}`)
        break
      }

      case 'subscription_created': {
        const email = (data.user_email as string | undefined)?.toLowerCase()
        if (!email) {
          // Atlas review fix #2: retryable — do not mark processed.
          console.error('[LS Webhook] subscription_created missing user_email')
          return NextResponse.json({ error: 'Missing email' }, { status: 400 })
        }

        const tier = resolveProductTier(productName, variantId)

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              email,
              tier,
              status: 'active',
              ls_subscription_id: String((payload.data as Record<string, unknown> | undefined)?.id ?? ''),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' },
          )

        if (error) {
          console.error('[LS Webhook] Supabase upsert failed (subscription_created):', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (eventId) await markLedgerProcessed(supabase, eventId, 'ok_legacy_subscription')
        console.log(`[LS Webhook] subscription_created: ${email} → ${tier}`)
        break
      }

      case 'subscription_updated': {
        const email = (data.user_email as string | undefined)?.toLowerCase()
        if (!email) {
          if (eventId) await markLedgerProcessed(supabase, eventId, 'missing_email')
          break
        }

        const tier = resolveProductTier(productName, variantId)
        const isActive = data.status === 'active' || data.status === 'on_trial'

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              email,
              tier,
              status: isActive ? 'active' : 'cancelled',
              ls_subscription_id: String((payload.data as Record<string, unknown> | undefined)?.id ?? ''),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' },
          )

        if (error) {
          console.error('[LS Webhook] Supabase upsert failed (subscription_updated):', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (eventId) await markLedgerProcessed(supabase, eventId, 'ok_legacy_subscription_update')
        console.log(`[LS Webhook] subscription_updated: ${email} → ${tier} (active: ${isActive})`)
        break
      }

      case 'subscription_cancelled': {
        const email = (data.user_email as string | undefined)?.toLowerCase()
        if (!email) {
          if (eventId) await markLedgerProcessed(supabase, eventId, 'missing_email')
          break
        }

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('email', email)

        if (error) {
          console.error('[LS Webhook] Supabase update failed (subscription_cancelled):', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (eventId) await markLedgerProcessed(supabase, eventId, 'ok_legacy_cancellation')
        console.log(`[LS Webhook] subscription_cancelled: ${email}`)
        break
      }

      default:
        if (eventId) await markLedgerProcessed(supabase, eventId, 'unhandled_legacy_event')
        console.log(`[LS Webhook] Unhandled event: ${eventName}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[LS Webhook] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
