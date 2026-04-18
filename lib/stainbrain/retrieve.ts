// lib/stainbrain/retrieve.ts — TASK-005 Phase 2.
//
// Server-side retrieval over sb_chunks for AI-fallback grounding. Called
// from /api/solve BEFORE generateAIProtocol() when canonical library misses
// AND the STAIN_BRAIN_RETRIEVAL_ENABLED env flag is truthy.
//
// Current implementation: embeds the query via OpenAI, fetches sb_chunks
// via PostgREST, scores cosine similarity client-side, returns top-K with
// source metadata. Fine at our current ~1.2k row scale; graduate to a
// Postgres RPC using pgvector's <=> operator once we cross ~10k chunks or
// see p95 latency cross ~400 ms.
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
    const chunks = await fetchChunks(url, key)

    const scored = chunks
      .map(c => {
        const emb = typeof c.embedding === 'string' ? JSON.parse(c.embedding) as number[] : c.embedding
        return { row: c, sim: cosineSim(queryVec, emb) }
      })
      .sort((a, b) => b.sim - a.sim)
      .slice(0, topK)

    const sourceMap = await fetchSourcesByIds(url, key, [...new Set(scored.map(s => s.row.source_id))])

    const result: RetrievedChunk[] = scored.map(({ row, sim }) => {
      const src = sourceMap.get(row.source_id)
      return {
        content: row.content,
        section: row.section,
        similarity: sim,
        source: {
          id: row.source_id,
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
