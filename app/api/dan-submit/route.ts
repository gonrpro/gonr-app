import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req: Request) {
  try {
    const card = await req.json()

    if (!card.stain || !card.fiber || !card.steps?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save to dan-submissions directory
    const dir = join(process.cwd(), 'dan-submissions')
    await mkdir(dir, { recursive: true })

    const filename = `${Date.now()}-${card.stain.toLowerCase().replace(/\s+/g, '-')}-${card.fiber.toLowerCase().replace(/\s+/g, '-')}.json`
    await writeFile(join(dir, filename), JSON.stringify(card, null, 2))

    return NextResponse.json({ ok: true, filename })
  } catch (err) {
    console.error('Dan submit error:', err)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
