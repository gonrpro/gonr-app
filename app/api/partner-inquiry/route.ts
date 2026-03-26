import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { name, company, email, message } = await req.json()

    if (!name || !company || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Forward to partners@gonr.pro via simple email
    const emailBody = `New Brand Partner Inquiry

Name: ${name}
Company: ${company}
Email: ${email}

Message:
${message || '(none)'}

---
Submitted via gonr.app/partners`

    // Use Supabase to log the inquiry (always works, no SMTP needed)
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase.from('partner_inquiries').insert({
        name,
        company,
        email,
        message: message || '',
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error && !error.message?.includes('does not exist')) {
          console.error('partner inquiry log error:', error.message)
        }
      })
    }

    // Also log to console so it shows in Vercel logs
    console.log('[PARTNER INQUIRY]', emailBody)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('partner inquiry error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
