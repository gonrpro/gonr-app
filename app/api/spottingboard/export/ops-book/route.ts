// app/api/spottingboard/export/ops-book/route.ts
//
// TASK-162 — Plant Ops Book export (Markdown v1).
// GET /api/spottingboard/export/ops-book → returns the plant's ops book as
// `text/markdown; charset=utf-8` with an attachment Content-Disposition.
//
// Auth chain:
//   1. session email → 401 if absent
//   2. getUserPlant(email) → 404 if no plant
//   3. service-role read of plant_brain_items + plant profile (membership
//      already verified by getUserPlant; service-role read is safe per
//      TASK-157 P1-1 pattern)
//   4. Render markdown via renderOpsBookMarkdown
//   5. Return as downloadable .md
//
// All plant members (owner|operator|spotter) get export access — read-only.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listPlantBrainItems } from '@/lib/spottingboard/items'
import { renderOpsBookMarkdown, type PlantSummary } from '@/lib/spottingboard/ops-book'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch {
    return null
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'plant'
}

export async function GET(_req: NextRequest) {
  const email = await getSessionEmail()
  if (!email) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 })
  }

  const plant = await getUserPlant(email)
  if (!plant) {
    return NextResponse.json({ error: 'no_plant_context' }, { status: 404 })
  }

  try {
    // listPlantBrainItems uses service-role; membership already verified by
    // getUserPlant which only returns plants the user is a member of.
    const items = await listPlantBrainItems(plant.plantId, { limit: 1000 })

    const supabase = getSupabaseAdmin()
    // Read additional plant profile fields for the title page if available.
    const { data: plantRow } = await supabase
      .from('plants')
      .select('name, solvent, solvents')
      .eq('id', plant.plantId)
      .maybeSingle()

    const profile = plantRow as { solvent?: string; solvents?: string[] } | null
    const solventStr =
      profile?.solvent ?? (profile?.solvents ?? []).join(', ') ?? ''
    const plantSummary: PlantSummary = {
      name: plant.name,
      plantId: plant.plantId,
      primary_solvent: solventStr.length > 0 ? solventStr : undefined,
    }

    const generated_at = new Date().toISOString()
    const markdown = renderOpsBookMarkdown({
      plant: plantSummary,
      items,
      generated_at,
      generated_by: email,
      include_tribal: true,
    })

    const datePart = generated_at.split('T')[0]
    const filename = `${slugify(plant.name)}-ops-book-${datePart}.md`

    console.log('[/api/spottingboard/export/ops-book] generated', {
      plant_id: plant.plantId,
      generated_by: email,
      item_count: items.length,
      bytes: markdown.length,
    })

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[/api/spottingboard/export/ops-book] render failed', {
      plant_id: plant.plantId,
      generated_by: email,
      err: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'export_failed' }, { status: 500 })
  }
}
