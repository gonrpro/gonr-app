// app/admin/factory/page.tsx
// Local-first Protocol Factory console for founder/operator review.
// Read-only. Lists live core cards, local drafts, and Lab output drafts in one place.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com', 'eval@gonr.app', 'jeff@cleanersupply.com']
const ROOT = process.cwd()
const LAB_OUTPUT_ROOT = path.resolve(process.env.LAB_OUTPUT_ROOT ?? path.join(process.env.HOME ?? '/Users/tyler', 'lab/output'))

async function isLocalDevBypass() {
  if (process.env.NODE_ENV !== 'development') return false
  const h = await headers()
  const host = h.get('host') ?? ''
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
}

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

type CardJson = Record<string, unknown>
type StepJson = Record<string, unknown>

function asString(v: unknown, fallback = '') { return typeof v === 'string' ? v : fallback }
function asNumber(v: unknown) { return typeof v === 'number' ? v : Number(v) }
function asArray(v: unknown): unknown[] { return Array.isArray(v) ? v : [] }
function asRecord(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {} }

type CardRecord = {
  key: string
  title: string
  stain: string
  surface: string
  source: 'core' | 'core-draft' | 'lab-draft'
  file: string
  taskId?: string
  reviewState?: string
  verification?: string
  version?: number
  issueCount: number
  issues: string[]
}

function safeJson(file: string): CardJson | null {
  try { return JSON.parse(readFileSync(file, 'utf8')) as CardJson } catch { return null }
}

function normalKey(raw: CardJson | null, fallback: string) {
  return String(raw?.id ?? raw?.card_key ?? fallback).toLowerCase().replaceAll('_', '-')
}

function titleCasePart(s: string) {
  const keep = new Set(['pH', 'UV', 'PVC'])
  return s.split('-').map(w => keep.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function expectedTitle(stain: string, surface: string) {
  return `${titleCasePart(stain)} on ${titleCasePart(surface)}`
}

function auditCard(card: CardJson, key: string) {
  const issues: string[] = []
  const meta = asRecord(card.meta)
  const stain = String(card.stain_canonical ?? meta.stainCanonical ?? key.split('-').slice(0, -1).join('-') ?? '')
  const surface = String(card.surface_canonical ?? meta.surfaceCanonical ?? key.split('-').at(-1) ?? '')
  const title = String(card.title ?? '')
  if (!title) issues.push('missing title')
  if (stain && surface && title && title !== expectedTitle(stain, surface)) issues.push(`title mismatch: expected "${expectedTitle(stain, surface)}"`)
  if (String(card.id ?? '').replaceAll('_', '-') !== key) issues.push('id/card key mismatch')

  const pro = asArray(card.spottingProtocol).map(asRecord) as StepJson[]
  if (!pro.length) issues.push('missing spottingProtocol')
  pro.forEach((step, i) => {
    if (asNumber(step.step) !== i + 1) issues.push(`pro step ${i + 1}: non-sequential step number`)
    if (!step.agent) issues.push(`pro step ${i + 1}: missing step title/agent`)
    if (!step.instruction) issues.push(`pro step ${i + 1}: missing instruction`)
    if (!step.dwellTime && !step.dwell) issues.push(`pro step ${i + 1}: missing dwell/process timing`)
    if (!step.safetyNote) issues.push(`pro step ${i + 1}: missing safety note`)
  })

  const home = asArray(card.homeSolutions).map(asRecord) as StepJson[]
  if (!home.length) issues.push('missing homeSolutions')
  home.forEach((step, i) => {
    if (!step.agent) issues.push(`home step ${i + 1}: missing step title/agent`)
    if (!step.instruction) issues.push(`home step ${i + 1}: missing instruction`)
  })

  const safetyMatrix = asRecord(card.safetyMatrix)
  if (!card.stainChemistry && !card.whyThisWorks) issues.push('missing chemistry/why-this-works text')
  if (!asArray(safetyMatrix.neverDo).length) issues.push('missing safetyMatrix.neverDo')
  if (!asArray(meta.tags).length) issues.push('missing meta.tags badges')
  if (!asArray(card.sources).length) issues.push('missing sources')
  return issues
}

function loadDir(dir: string, source: CardRecord['source']) {
  if (!existsSync(dir)) return [] as CardRecord[]
  return readdirSync(dir).filter(f => f.endsWith('.json')).map(file => {
    const full = path.join(dir, file)
    const card = safeJson(full)
    const fallback = file.replace(/\.json$/, '')
    const key = normalKey(card, fallback)
    const meta = asRecord(card?.meta)
    const stain = String(card?.stain_canonical ?? meta.stainCanonical ?? key.split('-').slice(0, -1).join('-'))
    const surface = String(card?.surface_canonical ?? meta.surfaceCanonical ?? key.split('-').at(-1))
    const issues = card ? auditCard(card, key) : ['invalid json']
    return {
      key,
      title: String(card?.title ?? expectedTitle(stain, surface)),
      stain,
      surface,
      source,
      file: full,
      reviewState: asString(card?.review_state, '') || undefined,
      verification: asString(card?.verification_level, '') || undefined,
      version: typeof card?.version === 'number' ? card.version : undefined,
      issueCount: issues.length,
      issues,
    }
  })
}

function loadLabDrafts() {
  if (!existsSync(LAB_OUTPUT_ROOT)) return [] as CardRecord[]
  const rows: CardRecord[] = []
  for (const taskId of readdirSync(LAB_OUTPUT_ROOT)) {
    const dir = path.join(LAB_OUTPUT_ROOT, taskId)
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue
    for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const full = path.join(dir, file)
      const card = safeJson(full)
      const fallback = file.replace(/-v\d+\.json$/, '').replace(/\.json$/, '')
      const key = normalKey(card, fallback)
      const meta = asRecord(card?.meta)
      const stain = String(card?.stain_canonical ?? meta.stainCanonical ?? key.split('-').slice(0, -1).join('-'))
      const surface = String(card?.surface_canonical ?? meta.surfaceCanonical ?? key.split('-').at(-1))
      const issues = card ? auditCard(card, key) : ['invalid json']
      rows.push({ key, title: String(card?.title ?? expectedTitle(stain, surface)), stain, surface, source: 'lab-draft', file: full, taskId, reviewState: asString(card?.review_state, '') || undefined, verification: asString(card?.verification_level, '') || undefined, version: typeof card?.version === 'number' ? card.version : undefined, issueCount: issues.length, issues })
    }
  }
  return rows
}

function loadInventory() {
  const rows = [
    ...loadDir(path.join(ROOT, 'data/core'), 'core'),
    ...loadDir(path.join(ROOT, 'data/core-drafts'), 'core-draft'),
    ...loadLabDrafts(),
  ]
  const byKey = new Map<string, CardRecord[]>()
  for (const r of rows) byKey.set(r.key, [...(byKey.get(r.key) ?? []), r])
  return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, versions]) => ({ key, versions }))
}

export default async function ProtocolFactoryPage() {
  const localDev = await isLocalDevBypass()
  const email = localDev ? 'local-dev-founder-preview@gonr.local' : await getSessionEmail()
  if (!localDev && (!email || !FOUNDER_EMAILS.includes(email))) return <div className="p-6 text-sm text-red-700">Founder access required.</div>

  const inventory = loadInventory()
  const totalVersions = inventory.reduce((n, x) => n + x.versions.length, 0)
  const issueRows = inventory.filter(x => x.versions.some(v => v.issueCount > 0)).length
  const labDrafts = inventory.flatMap(x => x.versions).filter(v => v.source === 'lab-draft')

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">Protocol Factory Console</h1>
        <p className="text-sm text-slate-600">One local review surface for planned combos, live core cards, drafts, Lab output, badges, and consistency issues.</p>
        <Link href="/admin/coverage" className="text-xs text-blue-700 hover:underline">Open coverage matrix →</Link>
        {localDev ? <p className="mt-1 text-xs font-medium text-amber-800">Local dev founder bypass active. Production remains auth-gated.</p> : null}
      </header>

      <section className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Combos" value={inventory.length} />
        <Stat label="Card files / versions" value={totalVersions} />
        <Stat label="Lab drafts" value={labDrafts.length} />
        <Stat label="Combos with audit flags" value={issueRows} tone={issueRows ? 'warn' : 'ok'} />
      </section>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Combo</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Sources / status</th>
              <th className="px-3 py-2">Review</th>
              <th className="px-3 py-2">Consistency</th>
              <th className="px-3 py-2">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.map(({ key, versions }) => {
              const best = versions.find(v => v.source === 'lab-draft') ?? versions.find(v => v.source === 'core-draft') ?? versions[0]
              const issues = [...new Set(versions.flatMap(v => v.issues))]
              return (
                <tr key={key} className="align-top hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs text-slate-800">{key}</td>
                  <td className="px-3 py-2 text-slate-900">{best.title}<div className="text-xs text-slate-500">{best.stain} / {best.surface}</div></td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {versions.map(v => <Badge key={`${v.source}-${v.file}`} label={`${v.source}${v.version ? ` v${v.version}` : ''}`} tone={v.source === 'lab-draft' ? 'purple' : v.source === 'core-draft' ? 'amber' : 'green'} />)}
                    </div>
                    <div className="mt-1 text-[0.7rem] text-slate-500">{versions.map(v => v.file.replace(ROOT, '').replace(process.env.HOME ?? '/Users/tyler', '~')).join(' · ')}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">{best.reviewState ?? best.verification ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {issues.length === 0 ? <span className="text-emerald-700">clean</span> : <details><summary className="cursor-pointer text-amber-800">{issues.length} flag(s)</summary><ul className="mt-1 list-disc pl-4 text-slate-700">{issues.slice(0, 8).map(i => <li key={i}>{i}</li>)}</ul>{issues.length > 8 ? <p className="text-slate-500">+{issues.length - 8} more</p> : null}</details>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <Link className="text-blue-700 hover:underline" href={`/admin/cards/${encodeURIComponent(key)}`}>DB detail</Link>
                      {versions.filter(v => v.source === 'lab-draft' && v.taskId).map(v => <Link key={v.file} className="text-purple-700 hover:underline" href={`/admin/preview/${encodeURIComponent(v.taskId!)}/${encodeURIComponent(v.key)}`}>Lab preview</Link>)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'warn' | 'ok' }) {
  const color = tone === 'warn' ? 'text-amber-800' : tone === 'ok' ? 'text-emerald-800' : 'text-slate-900'
  return <div className="rounded border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className={`text-2xl font-semibold ${color}`}>{value}</p></div>
}

function Badge({ label, tone }: { label: string; tone: 'green' | 'amber' | 'purple' }) {
  const klass = tone === 'green' ? 'bg-emerald-100 text-emerald-800' : tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
  return <span className={`rounded px-1.5 py-0.5 text-[0.7rem] ${klass}`}>{label}</span>
}
