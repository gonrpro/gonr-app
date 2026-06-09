#!/usr/bin/env node
/**
 * TASK-218 FRONTIER — DEPLOY-TIME "VERIFY FIRST" GATE.
 *
 * The headline experience is the AGENTIC intake (/api/intake): the LLM orchestrator
 * reads the input, asks ONE sharp question, then hands the assembled facts to the
 * DETERMINISTIC GONR engine which writes the verdict. If OPENAI_API_KEY is missing /
 * a placeholder, OR gpt-5.2 / gpt-5-mini 404 in the DEPLOYED env, /api/intake fails
 * closed with HTTP 503 {phase:'unavailable'} and the client silently degrades to the
 * form-ier deterministic wizard. The degrade is SAFE — but invisible. If it is live
 * in the deployed env, 100% of users get the form path and the "stain expert in your
 * pocket" agent never runs.
 *
 * Per FRONTIER-SWARM-SPEC + BUILD-SPEC ("VERIFY FIRST: confirm gpt-5.2 + gpt-5-mini
 * resolve on our key BEFORE wiring; if unavailable, SURFACE it, never silently
 * downgrade"): this script hits the REAL deployed /api/intake and asserts the agent
 * actually runs (phase 'question' | 'verdict', not 503/'unavailable'). It NEVER writes
 * or inspects treatment advice — the engine owns the verdict; this only proves the
 * agent path is alive. Run it against a preview/prod URL BEFORE claiming the frontier
 * flow ships.
 *
 * Usage:
 *   node scripts/probe-frontier-live.mjs <base-url>
 *   GONR_DEPLOY_URL=https://gonr-app-xyz.vercel.app node scripts/probe-frontier-live.mjs
 *
 * Exit 0 = agent path live. Exit 1 = magic path dead in this env (do NOT ship as
 * "frontier"); exit 2 = probe could not reach the target.
 *
 * Prints names/phases/statuses only — never secrets, never request bodies with keys.
 */

const base = (process.argv[2] || process.env.GONR_DEPLOY_URL || process.env.PROBE_URL || '')
  .trim()
  .replace(/\/+$/, '')

if (!base) {
  console.error('FAIL: no target URL. Pass a deployed base URL or set GONR_DEPLOY_URL.')
  console.error('  node scripts/probe-frontier-live.mjs https://<deployment>.vercel.app')
  process.exit(2)
}

const url = `${base}/api/intake`
// proceed:true forces the full agent path: model read -> deterministic-engine handoff
// -> phase 'verdict'. A live-but-cautious agent may still answer 'question'; either
// proves the agent ran. A dead key / 404 model returns 503 {phase:'unavailable'}.
const probeBody = {
  transcript: [{ role: 'user', text: 'coffee splash on a white cotton t-shirt' }],
  hints: { userNote: 'coffee splash on a white cotton t-shirt' },
  proceed: true,
}

const LIVE_PHASES = new Set(['question', 'verdict'])

async function main() {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(probeBody),
      signal: AbortSignal.timeout(60_000),
    })
  } catch (err) {
    console.error(`FAIL(unreachable): could not POST ${url}`)
    console.error(`  ${err instanceof Error ? err.message : String(err)}`)
    process.exit(2)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  const phase = data && typeof data === 'object' ? data.phase : undefined
  const reason = data && typeof data === 'object' ? data.reason : undefined

  // The exact silent-degrade signal the gate exists to catch.
  if (res.status === 503 || phase === 'unavailable') {
    console.error('FAIL: frontier agent is DEAD in this environment.')
    console.error(`  POST ${url} -> HTTP ${res.status} phase=${phase ?? 'n/a'} reason=${reason ?? 'n/a'}`)
    console.error('  Every user gets the deterministic form path; the agentic "stain expert')
    console.error('  in your pocket" never runs. Do NOT claim the frontier flow ships.')
    if (reason === 'intake_agent_unconfigured') {
      console.error('  -> OPENAI_API_KEY is missing/placeholder in the DEPLOYED env. Set the real key.')
    } else if (reason === 'intake_agent_model_unavailable') {
      console.error('  -> gpt-5.2 / gpt-5-mini 404 on this key. Update ids in lib/vision/models.ts.')
    }
    process.exit(1)
  }

  if (res.status !== 200 || !LIVE_PHASES.has(phase)) {
    console.error('FAIL: unexpected /api/intake response.')
    console.error(`  POST ${url} -> HTTP ${res.status} phase=${phase ?? 'n/a'}`)
    console.error(`  expected HTTP 200 with phase 'question' | 'verdict'.`)
    process.exit(1)
  }

  console.log('PASS: frontier agent is LIVE in this environment.')
  console.log(`  POST ${url} -> HTTP ${res.status} phase=${phase} model=${data.model ?? 'n/a'}`)
  if (phase === 'verdict') {
    console.log(`  engine handoff: solveHttp=${data.solveHttp ?? 'n/a'} (agent -> deterministic /api/solve)`)
  }
  process.exit(0)
}

main()
