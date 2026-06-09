// TASK-218 — thin client store for SAVED CARE LABELS (the Saved screen "Labels" tab).
//
// Care-label scans are presentation facts (fiber + care symbols + label warnings),
// not engine verdicts, so they live in a lightweight localStorage store rather than
// a new Supabase table — no backend dependency, no signup wall. The care-label flow
// (CareLabelInfo / scanner lane) writes here via saveLabel(); the Saved screen reads
// and removes. Care-label warnings are SAFETY constraints — stored verbatim, never
// authored or softened here.

const STORE_KEY = 'gonr_saved_labels_v1'

export interface SavedLabel {
  /** Stable client id. */
  id: string
  /** Decoded fiber content, e.g. "100% Cotton". */
  fiber: string
  /** Care-label symbol tokens (engine enum), verbatim. */
  careSymbols: string[]
  /** Explicit label warnings, verbatim. */
  warnings: string[]
  /** Optional user title for the garment. */
  title?: string
  /** ISO timestamp the label was saved. */
  savedAt: string
}

/** Input accepted by saveLabel — id/savedAt are generated if absent. */
export interface SaveLabelInput {
  fiber: string
  careSymbols?: ReadonlyArray<string>
  warnings?: ReadonlyArray<string>
  title?: string
}

// Shared stable empty array — returned as the server snapshot every time so
// useSyncExternalStore sees a constant reference during SSR/hydration.
const EMPTY: SavedLabel[] = []

// Cached snapshot for useSyncExternalStore — getSnapshot must return a STABLE
// reference while the underlying raw string is unchanged, or React loops forever.
let snapshot: SavedLabel[] = []
let snapshotRaw: string | null = null
const listeners = new Set<() => void>()

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `label_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function isSavedLabel(value: unknown): value is SavedLabel {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.fiber === 'string' &&
    Array.isArray(v.careSymbols) &&
    Array.isArray(v.warnings) &&
    typeof v.savedAt === 'string'
  )
}

function readRaw(): string | null {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(STORE_KEY)
  } catch {
    return null
  }
}

function parseLabels(raw: string): SavedLabel[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedLabel)
  } catch {
    return []
  }
}

/** Read all saved labels, newest first. Tolerant of corrupt/legacy payloads. */
export function listSavedLabels(): SavedLabel[] {
  const raw = readRaw()
  if (raw === null) return []
  return parseLabels(raw)
}

function persist(labels: ReadonlyArray<SavedLabel>): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(labels))
  } catch {
    // quota / incognito — non-fatal, the label simply isn't persisted.
  }
  // Refresh the cached snapshot and notify subscribers (useSyncExternalStore).
  snapshotRaw = readRaw()
  snapshot = snapshotRaw === null ? [] : parseLabels(snapshotRaw)
  for (const listener of listeners) listener()
}

// ── External-store API (for useSyncExternalStore in the Saved screen) ────────

/** Subscribe to label changes — same-tab mutations + cross-tab `storage` events. */
export function subscribeSavedLabels(listener: () => void): () => void {
  listeners.add(listener)
  if (isBrowser()) window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    if (isBrowser()) window.removeEventListener('storage', listener)
  }
}

/** Stable client snapshot — only re-allocates when the stored raw string changes. */
export function getSavedLabelsSnapshot(): SavedLabel[] {
  const raw = readRaw()
  if (raw === snapshotRaw) return snapshot
  snapshotRaw = raw
  snapshot = raw === null ? [] : parseLabels(raw)
  return snapshot
}

/** Server snapshot — no localStorage on the server, so the list starts empty. */
export function getSavedLabelsServerSnapshot(): SavedLabel[] {
  return EMPTY
}

/** Append a scanned label and return the full updated list (newest first). */
export function saveLabel(input: SaveLabelInput): SavedLabel[] {
  const label: SavedLabel = {
    id: newId(),
    fiber: input.fiber,
    careSymbols: [...(input.careSymbols ?? [])],
    warnings: [...(input.warnings ?? [])],
    title: input.title,
    savedAt: new Date().toISOString(),
  }
  const next = [label, ...listSavedLabels()]
  persist(next)
  return next
}

/** Remove one saved label by id and return the updated list. */
export function deleteSavedLabel(id: string): SavedLabel[] {
  const next = listSavedLabels().filter((label) => label.id !== id)
  persist(next)
  return next
}
