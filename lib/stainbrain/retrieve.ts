// lib/stainbrain/retrieve.ts — TASK-005 Phase 2.
//
// Server-side retrieval over sb_chunks for AI-fallback grounding. Called
// from /api/solve BEFORE generateAIProtocol() when canonical library misses
// AND the STAIN_BRAIN_RETRIEVAL_ENABLED env flag is truthy.
//
// Implementation: embeds the query via OpenAI, calls the `sb_search_chunks`
// Postgres RPC (pgvector HNSW <=> cosine distance), returns top-K with
// source metadata. Preview verification showed 4817 ms on the client-side
// scan at ~1.2k rows — switched to RPC in Phase 2 tightening. If the RPC
// is unavailable (older env, migration not applied), falls back to the old
// client-side scan so dev/preview environments don't break.
//
// Kill switch: STAIN_BRAIN_RETRIEVAL_ENABLED=true enables. Any other value
// (unset, 'false', '') returns an empty retrieval — caller falls back to
// the existing no-grounding AI path with zero behavior change.

const EMBEDDING_MODEL = 'text-embedding-3-small'
const DEFAULT_TOP_K = 5
const FETCH_LIMIT = 2000  // upper bound on chunks scanned per query; grows with the corpus

export interface RetrievedChunk {
  content: string
  section: string | null
  similarity: number
  source: {
    id: string
    family: string
    subfamily: string | null
    title: string
  }
}

export interface RetrievalResult {
  enabled: boolean
  retrieved: boolean
  chunks: RetrievedChunk[]
  top_source_ids: string[]
  latency_ms: number
  query: string
  error?: string
}

export function isRetrievalEnabled(): boolean {
  return process.env.STAIN_BRAIN_RETRIEVAL_ENABLED === 'true'
}

async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  })
  if (!res.ok) throw new Error(`embed ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.data[0].embedding as number[]
}

interface RawChunkRow {
  id: string
  source_id: string
  content: string
  section: string | null
  embedding: number[] | string
}

interface RawSourceRow {
  id: string
  family: string
  subfamily: string | null
  title: string
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const n = a.length
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

async function fetchChunks(url: string, key: string): Promise<RawChunkRow[]> {
  const res = await fetch(
    `${url}/rest/v1/sb_chunks?select=id,source_id,content,section,embedding&limit=${FETCH_LIMIT}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) throw new Error(`fetch sb_chunks ${res.status}: ${await res.text()}`)
  return res.json() as Promise<RawChunkRow[]>
}

interface RpcRow {
  id: string
  source_id: string
  content: string
  section: string | null
  similarity: number
}

async function rpcSearch(
  url: string,
  key: string,
  queryVec: number[],
  topK: number
): Promise<RpcRow[] | null> {
  // Null return signals "RPC not available; caller should fall back." Any
  // other failure mode re-throws so we don't silently mask real issues.
  const res = await fetch(`${url}/rest/v1/rpc/sb_search_chunks`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_embedding: queryVec, match_count: topK }),
  })
  if (res.status === 404) return null // function not yet applied
  if (!res.ok) throw new Error(`rpc sb_search_chunks ${res.status}: ${await res.text()}`)
  return res.json() as Promise<RpcRow[]>
}

async function fetchSourcesByIds(url: string, key: string, ids: string[]): Promise<Map<string, RawSourceRow>> {
  if (ids.length === 0) return new Map()
  const idList = ids.join(',')
  const res = await fetch(
    `${url}/rest/v1/sb_sources?select=id,family,subfamily,title&id=in.(${idList})`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) throw new Error(`fetch sb_sources ${res.status}: ${await res.text()}`)
  const rows = (await res.json()) as RawSourceRow[]
  const map = new Map<string, RawSourceRow>()
  for (const r of rows) map.set(r.id, r)
  return map
}

/**
 * Retrieve top-K chunks semantically matching `query`.
 * Returns a disabled/empty result (no error) if the kill switch is off
 * or required env vars are missing — caller MUST handle `retrieved: false`.
 */
export async function retrieveForQuery(
  query: string,
  opts: { topK?: number } = {}
): Promise<RetrievalResult> {
  const start = Date.now()
  const empty: RetrievalResult = {
    enabled: isRetrievalEnabled(),
    retrieved: false,
    chunks: [],
    top_source_ids: [],
    latency_ms: 0,
    query,
  }

  if (!empty.enabled) return { ...empty, latency_ms: Date.now() - start }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  const apiKey = process.env.OPENAI_API_KEY

  if (!url || !key || !apiKey) {
    return { ...empty, error: 'missing_env_creds', latency_ms: Date.now() - start }
  }

  const topK = opts.topK ?? DEFAULT_TOP_K

  try {
    const queryVec = await embedQuery(query, apiKey)

    // Try the pgvector RPC first — HNSW index, server-side <=> operator,
    // target < 400 ms. If not yet applied to this env, fall back to
    // client-side full scan so dev/preview doesn't break.
    let scored: { source_id: string; content: string; section: string | null; sim: number }[]
    const rpcRows = await rpcSearch(url, key, queryVec, topK).catch(() => null)
    if (rpcRows && rpcRows.length > 0) {
      scored = rpcRows.map(r => ({
        source_id: r.source_id,
        content: r.content,
        section: r.section,
        sim: r.similarity,
      }))
    } else {
      const chunks = await fetchChunks(url, key)
      scored = chunks
        .map(c => {
          const emb = typeof c.embedding === 'string' ? JSON.parse(c.embedding) as number[] : c.embedding
          return { source_id: c.source_id, content: c.content, section: c.section, sim: cosineSim(queryVec, emb) }
        })
        .sort((a, b) => b.sim - a.sim)
        .slice(0, topK)
    }

    const sourceMap = await fetchSourcesByIds(url, key, [...new Set(scored.map(s => s.source_id))])

    const result: RetrievedChunk[] = scored.map(s => {
      const src = sourceMap.get(s.source_id)
      return {
        content: s.content,
        section: s.section,
        similarity: s.sim,
        source: {
          id: s.source_id,
          family: src?.family ?? 'Unknown',
          subfamily: src?.subfamily ?? null,
          title: src?.title ?? 'Unknown source',
        },
      }
    })

    return {
      enabled: true,
      retrieved: true,
      chunks: result,
      top_source_ids: [...new Set(result.map(r => r.source.id))],
      latency_ms: Date.now() - start,
      query,
    }
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : 'retrieval_failed',
      latency_ms: Date.now() - start,
    }
  }
}

/**
 * Deterministic source-family list for a retrieval. Dedupes, preserves
 * retrieval-order (highest similarity first), caps at `max`.
 * Used to populate an AI card's `grounded_sources` field server-side
 * without trusting the model to self-cite.
 */
export function sourceFamilyList(result: RetrievalResult, max = 3): string[] {
  if (!result.retrieved) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of result.chunks) {
    const label = c.source.subfamily
      ? `${c.source.family} — ${c.source.subfamily}`
      : c.source.family
    if (!seen.has(label)) {
      seen.add(label)
      out.push(label)
    }
    if (out.length >= max) break
  }
  return out
}

/**
 * Inject deterministic source attribution into an AI card. Sets
 * `grounded_sources` (always) and appends a "Grounded in: X, Y, Z." tail
 * to `whyThisWorks` if the narrative didn't already mention any of the
 * source names (case-insensitive). No-op when retrieval didn't run.
 */
export function applyGroundedAttribution<T extends { whyThisWorks?: string; grounded_sources?: string[] }>(
  card: T,
  result: RetrievalResult
): T {
  const sources = sourceFamilyList(result)
  if (sources.length === 0) return card
  ;(card as { grounded_sources?: string[] }).grounded_sources = sources

  const why = card.whyThisWorks ?? ''
  const whyLower = why.toLowerCase()
  const alreadyNamed = sources.some(s => {
    const key = s.split('—')[0].trim().toLowerCase()
    return whyLower.includes(key)
  })
  if (!alreadyNamed) {
    const tail = ` Grounded in: ${sources.join(', ')}.`
    ;(card as { whyThisWorks?: string }).whyThisWorks = why.trim() + tail
  }
  return card
}

/** Format retrieved chunks for injection into an AI system prompt. */
export function formatRetrievedContext(result: RetrievalResult): string {
  if (!result.retrieved || result.chunks.length === 0) return ''
  const blocks = result.chunks.map((c, i) => {
    const src = `${c.source.family}${c.source.subfamily ? ' / ' + c.source.subfamily : ''} / ${c.source.title}`
    const section = c.section ? ` [${c.section}]` : ''
    return `[Source ${i + 1}: ${src}${section}]\n${c.content}`
  })
  return [
    '## GROUNDED CONTEXT (retrieved from verified professional references)',
    '',
    'The following excerpts were retrieved from the Stain Brain knowledge base (Dan Eisen, Stamford Fabritec, NCA, UCLA, internal GONR chemistry + safety notes, etc.) for this specific query. Use them as primary source-of-truth. If an excerpt contradicts the generic methodology earlier in this prompt, prefer the excerpt for this specific stain × fiber case.',
    '',
    'Do NOT quote excerpts verbatim. Synthesize into the protocol JSON. Acknowledge grounding by including up to three source family names in `whyThisWorks`.',
    '',
    blocks.join('\n\n'),
    '',
    '---',
    '',
  ].join('\n')
}
