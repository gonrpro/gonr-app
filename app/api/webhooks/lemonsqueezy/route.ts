import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

// Use service-role client for webhook writes (bypasses RLS)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase env vars for webhook handler')
  }
  return createClient(url, serviceKey)
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret)
  const digest = hmac.update(rawBody).digest('hex')
  return signature === digest
}

// Map LemonSqueezy product/variant to GONR tier
function resolveProductTier(productName: string): 'home' | 'spotter' | 'operator' {
  const lower = (productName || '').toLowerCase()
  if (lower.includes('operator')) return 'operator'
  if (lower.includes('spotter')) return 'spotter'
  if (lower.includes('home')) return 'home'
  // Default to spotter for now (primary product)
  return 'spotter'
}

export async function POST(req: NextRequest) {
  const eventName = req.headers.get('x-event-name') || 'unknown'
  const signature = req.headers.get('x-signature') || ''
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

  if (!secret) {
    console.error('[LS Webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Read raw body for signature verification
  const rawBody = await req.text()

  // Verify webhook signature
  if (!verifySignature(rawBody, signature, secret)) {
    console.error('[LS Webhook] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('[LS Webhook] Failed to parse payload')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = payload.data?.attributes || {}
  const meta = payload.meta || {}

  console.log(`[LS Webhook] Event: ${eventName}`, {
    orderId: data.order_number || data.id,
    customerEmail: data.user_email,
    productName: data.product_name || meta.custom_data?.product_name,
  })

  try {
    const supabase = getSupabaseAdmin()

    switch (eventName) {
      case 'order_created': {
        const email = data.user_email?.toLowerCase()
        if (!email) {
          console.error('[LS Webhook] order_created missing user_email')
          return NextResponse.json({ error: 'Missing email' }, { status: 400 })
        }

        const productName = data.first_order_item?.product_name || ''
        const tier = resolveProductTier(productName)

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              email,
              tier,
              is_active: true,
              ls_order_id: String(data.order_number || data.id || ''),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          )

        if (error) {
          console.error('[LS Webhook] Supabase upsert failed (order_created):', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`[LS Webhook] order_created: ${email} → ${tier}`)
        break
      }

      case 'subscription_created': {
        const email = data.user_email?.toLowerCase()
        if (!email) {
          console.error('[LS Webhook] subscription_created missing user_email')
          return NextResponse.json({ error: 'Missing email' }, { status: 400 })
        }

        const productName = data.product_name || ''
        const tier = resolveProductTier(productName)

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              email,
              tier,
              is_active: true,
              ls_subscription_id: String(data.id || ''),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          )

        if (error) {
          console.error('[LS Webhook] Supabase upsert failed (subscription_created):', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`[LS Webhook] subscription_created: ${email} → ${tier}`)
        break
      }

      case 'subscription_updated': {
        const email = data.user_email?.toLowerCase()
        if (!email) break

        const productName = data.product_name || ''
        const tier = resolveProductTier(productName)
        const isActive = data.status === 'active' || data.status === 'on_trial'

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              email,
              tier,
              is_active: isActive,
              ls_subscription_id: String(data.id || ''),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          )

        if (error) {
          console.error('[LS Webhook] Supabase upsert failed (subscription_updated):', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`[LS Webhook] subscription_updated: ${email} → ${tier} (active: ${isActive})`)
        break
      }

      case 'subscription_cancelled': {
        const email = data.user_email?.toLowerCase()
        if (!email) break

        const { error } = await supabase
          .from('subscriptions')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email)

        if (error) {
          console.error('[LS Webhook] Supabase update failed (subscription_cancelled):', error)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`[LS Webhook] subscription_cancelled: ${email}`)
        break
      }

      default:
        console.log(`[LS Webhook] Unhandled event: ${eventName}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[LS Webhook] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
