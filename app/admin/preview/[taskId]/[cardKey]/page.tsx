// app/admin/preview/[taskId]/[cardKey]/page.tsx
// TASK-104 — file-backed founder preview for Lab-authored protocol drafts.
// Read-only: loads ~/lab/output/<taskId>/<cardKey>-v1.json and renders the
// same tier-aware ResultCard columns as /admin/cards/[cardKey]. No DB writes.

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import ResultCard from '@/components/solve/ResultCard'
import type { ProtocolCard, Tier } from '@/lib/types'

const FOUNDER_EMAILS = [
  'tyler@gonr.pro',
  'tyler@nexshift.co',
  'twfyke@me.com',
  'eval@gonr.app',
  'jeff@cleanersupply.com',
]

const LAB_OUTPUT_ROOT = path.resolve(process.env.LAB_OUTPUT_ROOT ?? path.join(process.env.HOME ?? '/Users/tyler', 'lab/output'))

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email?.toLowerCase() ?? null
  } catch {
    return null
  }
}

function safeSegment(value: string, label: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(value)) {
    throw new Error(`invalid ${label}`)
  }
  return value
}

function candidateFiles(taskId: string, cardKey: string) {
  const dir = path.resolve(LAB_OUTPUT_ROOT, taskId)
  const names = [
    `${cardKey}-v1.json`,
    `${cardKey}.json`,
    `${cardKey.replace(/-/g, '_')}-v1.json`,
    `${cardKey.replace(/-/g, '_')}.json`,
  ]
  return names.map(name => path.resolve(dir, name))
}

function assertInsideLabOutput(filePath: string) {
  const rel = path.relative(LAB_OUTPUT_ROOT, filePath)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('preview path escaped lab output root')
  }
}

async function loadDraft(taskIdRaw: string, cardKeyRaw: string): Promise<{ card: ProtocolCard; filePath: string }> {
  const taskId = safeSegment(taskIdRaw, 'taskId')
  const cardKey = safeSegment(cardKeyRaw, 'cardKey')
  for (const filePath of candidateFiles(taskId, cardKey)) {
    assertInsideLabOutput(filePath)
    if (!existsSync(filePath)) continue
    const raw = await readFile(filePath, 'utf8')
    return { card: JSON.parse(raw) as ProtocolCard, filePath }
  }
  throw new Error(`draft not found for ${taskId}/${cardKey}`)
}

export default async function DraftPreviewPage({
  params,
}: {
  params: Promise<{ taskId: string; cardKey: string }>
}) {
  const email = await getSessionEmail()
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return <div className="p-6 text-sm text-red-700">Founder access required.</div>
  }

  const { taskId, cardKey } = await params
  let loaded: { card: ProtocolCard; filePath: string }
  try {
    loaded = await loadDraft(taskId, cardKey)
  } catch (err) {
    return (
      <div className="p-6 text-sm text-red-700">
        Draft preview failed: {err instanceof Error ? err.message : String(err)}
      </div>
    )
  }

  const { card, filePath } = loaded

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/cards" className="text-xs text-slate-500 hover:underline">← back to card library</Link>
          <h1 className="text-2xl font-semibold text-slate-900">Draft preview: {card.title ?? cardKey}</h1>
          <p className="font-mono text-xs text-slate-600">{taskId} / {cardKey}</p>
          <p className="mt-1 text-xs text-slate-500">Read-only file preview · no DB writes · {filePath}</p>
        </div>
      </header>

      <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        This is a Lab draft rendered from <code>~/lab/output</code>. It is not live, imported, or published.
        Use this page for founder preview only; promotion/import remains a separate gate.
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TierColumn label="🟢 Home" sub="free / anon / home tier" card={card} viewerTier="home" />
        <TierColumn label="🟠 Spotter" sub="cumulative: home + pro chemistry" card={card} viewerTier="spotter" />
        <TierColumn label="🟣 Operator" sub="cumulative: spotter + shop controls" card={card} viewerTier="operator" />
      </section>
    </div>
  )
}

function TierColumn({
  label,
  sub,
  card,
  viewerTier,
}: {
  label: string
  sub: string
  card: ProtocolCard
  viewerTier: Tier | 'anon'
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-[0.7rem] text-slate-600">{sub}</p>
      </div>
      <div className="p-3">
        <ResultCard card={card} source="verified" viewerTier={viewerTier} />
      </div>
    </div>
  )
}
