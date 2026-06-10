// lib/solve/history-store.ts
// TASK-233 — client-side persisted results so History reopens the EXACT
// stored answer instead of re-running AI from a bare keyword (pressure-test
// P1: keyword re-solves lost context, gave nondeterministic answers, and
// burned inference). Entries are keyed by the server correlationId so rows
// from /api/solves/history can be matched to a stored result.
//
// localStorage, versioned key, ring-capped, and every call is try/catch-safe
// (quota, privacy mode, SSR) — persistence failures must never break a solve.
// The stored response carries the full TASK-232 session-evidence outputs
// (card._terminalGate, firstAid, directAnswer), so reopening preserves them.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoredResponse = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoredInput = any

export interface HistoryEntry {
  id: string
  ts: number
  input: StoredInput
  response: StoredResponse
}

const KEY = 'gonr.history.v1'
const CAP = 50

function readAll(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function writeAll(entries: HistoryEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, CAP)))
  } catch {
    // Quota/privacy failures are non-fatal — history just won't persist.
  }
}

export function saveHistoryEntry(entry: HistoryEntry): void {
  if (!entry?.id) return
  const rest = readAll().filter((e) => e?.id !== entry.id)
  writeAll([entry, ...rest])
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  if (!id) return null
  return readAll().find((e) => e?.id === id) ?? null
}

export function listHistoryIds(): Set<string> {
  return new Set(readAll().map((e) => e?.id).filter(Boolean))
}

export function listHistoryEntries(): HistoryEntry[] {
  return readAll().filter((e) => Boolean(e?.id))
}
