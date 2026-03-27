import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const {
      jobId,
      customerName,
      garmentType,
      material,
      garmentColor,
      garmentValue,
      stainCategory,
      stainDescription,
      stainAge,
      previousTreatment,
      preExistingDamage,
      operatorNotes,
      riskLevel,
      riskScore,
      photoDataUrl,
      solveId,
    } = body

    if (!garmentType || !material) {
      return NextResponse.json({ error: 'Garment type and material required' }, { status: 400 })
    }

    const record: Record<string, unknown> = {
      user_id: user?.id || '00000000-0000-0000-0000-000000000000',
      job_id: jobId || `JOB-${Date.now()}`,
      customer_name: customerName || null,
      garment_type: garmentType,
      material: material,
      garment_color: garmentColor || null,
      garment_value: garmentValue || 'medium',
      stain_category: stainCategory || null,
      stain_description: stainDescription || null,
      stain_age: stainAge || 'unknown',
      previous_treatment: previousTreatment || false,
      pre_existing_damage: preExistingDamage || false,
      operator_notes: operatorNotes || null,
      risk_level: riskLevel || 'medium',
      risk_score: riskScore || 5,
      status: 'pending',
      photo_urls: photoDataUrl ? [photoDataUrl] : [],
      solve_id: solveId || null,
    }

    const { data, error } = await supabase
      .from('garment_intakes')
      .insert(record)
      .select('id')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Flag garment error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
