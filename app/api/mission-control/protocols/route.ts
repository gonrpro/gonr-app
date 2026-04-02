import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Use service role key for admin access
    const supabaseUrl = 'https://ljcmslyirxqtmdaxzuiq.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    
    let query = supabase
      .from('pending_protocols')
      .select('*')
      .order(sortBy, { ascending: false })

    if (filter === 'unverified') query = query.eq('verified', false)
    if (filter === 'verified') query = query.eq('verified', true)
    if (filter === 'high-traffic') query = query.gt('solve_count', 5)

    if (search.trim()) {
      query = query.or(`stain.ilike.%${search.trim()}%,surface.ilike.%${search.trim()}%`)
    }

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch protocols' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = 'https://ljcmslyirxqtmdaxzuiq.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { id, action } = await request.json()
    
    if (action === 'verify') {
      const { error } = await supabase
        .from('pending_protocols')
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
          verified_by: 'tyler',
          source: 'verified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: 'Failed to verify protocol' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = 'https://ljcmslyirxqtmdaxzuiq.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Missing protocol ID' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('pending_protocols')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete protocol' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}