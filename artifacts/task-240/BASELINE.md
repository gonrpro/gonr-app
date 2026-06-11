# TASK-240 — Perceived-latency baseline (2026-06-11)

Method: 4-lane parallel baseline (live probes · client-flow trace · server-flow
trace · prior-artifact mine) against preview `gonr-rbbptjst0` @ `3097cca`
(accepted TASK-236 build), measured 15:15 EDT from the Mini via the eval lane.
Vocabulary reuses TASK-234's metric separation: ui_first_guidance ·
deterministic_verdict · ai_tail · raw_overall.

## The numbers

| Path | TTFB (3 runs) | _serverMs | Verdict |
|---|---|---|---|
| Deterministic fast path (red cell) | 2.60s cold / 0.41s / 0.30s | 1428 / 103 / 79 | already snappy warm |
| Library (`source=core`) | 0.29 / 0.32 / 0.37s | 49 / 44 / 42 | already snappy |
| **AI tail (`source=ai`)** | **10.56 / 11.76 / 8.78s** | **10381 / 11502 / 8552** | **THE problem — 97-98% of TTFB is model time** |
| Page GET `/` and `/solve-v2` | TTFB 0.26–0.34s | — | no page-shell problem |

Network overhead is 180–330ms warm everywhere; cold start adds ~2.2s to the
first hit after idle. Prior soaks agree: TASK-233 p95 16.1s raw; TASK-234
deterministic p95 0.40s vs ai_tail p95 21.3s (extreme 38.9s). Conclusion: the
wait Tyler feels is **one non-streaming gpt-4.1-mini call** plus, on the intake
path, a **3-stage server waterfall** (intake LLM → HTTP self-fetch of
/api/solve → AI call) delivered as a single all-at-once JSON.

## Client-side gaps (all evidence file:line in the lane reports)

1. **FirstAidBanner missing from ResultsScreen's `loading` branch** — the
   TASK-232 "first-aid renders while the model thinks" design is implemented
   in AgenticIntake but NOT on the fallback path, retries, follow-ups, or
   EN/ES re-solves. ResultsScreen.tsx:492-524 shows skeleton only.
2. **Blank window on /solve-v2/solve** — `Suspense fallback={null}` +
   `if (!attachReady) return null` (SolveFlow.tsx:108,170-176): chrome only,
   no skeleton, until hydration + boot effect.
3. **Photo path blocks navigation** — AttachMenu awaits the full vision scan
   before router.push (AttachMenu.tsx:194-236), then intake starts after.
4. **Re-solves wipe content** — lang toggle/follow-up sets status='loading',
   replacing a real card with a skeleton for a full roundtrip.
5. **Home CTA has no pending state**; in-conversation ack is already good
   (optimistic echo + narrated thinking, sub-100ms).

## Server-side gaps

6. **Staged first byte is provably feasible** — evidence/redCells/firstAid are
   computed deterministically pre-AI (route.ts:1084-1129 fast path proves it);
   nothing safe-to-show waits on the model. Token-streaming the AI text is
   correctly OUT (every safety gate operates on the complete card); the safe
   shape is a 2-stage response: `{firstAid, directAnswer, riskFlags}` at
   ~0.3-0.5s, full gated card as stage 2.
7. **Sequential independent awaits** — gate check, getUserPlant, decide()
   library lookup run serially (route.ts:845-882); getSessionEmail awaited
   before body parse. Promise.all + deferred await ≈ 0.3-0.8s off every path.
8. **Intake verdict turn self-fetches /api/solve over HTTP** — extra function
   invocation + cold-start exposure (intake/route.ts:158-176).
9. **pending_protocols cache is write-only** — INSERTed per AI solve, never
   read; a read-through (feeding the EXISTING full gate pipeline) would skip
   the 10s model call for repeat stain×surface combos.
10. Floating log promises lack waitUntil (correctness under Fluid, not speed).

## Smallest-fix plan (risk-ordered)

**Patch 1 — client-only, zero safety surface (targets the 100/300/800ms gates):**
A1 FirstAidBanner in ResultsScreen loading branch (one line) ·
A2 intake-shell skeleton + banner as Suspense fallback and !attachReady state
(+ loading.tsx) · A3 Home CTA pending state + route prefetch ·
A4 'revalidating' state keeps stale card visible on re-solves ·
A5 next/dynamic the fallback screens.

**Patch 2 — server staging + parallelization (the perceived-latency win):**
B1 two-stage solve response (stage-1 deterministic guidance <0.5s, stage-2
full gated card; client renders stages) · B2 Promise.all the independent
awaits + deferred session await.

**Held for Atlas decision (not in first patches):** in-process intake→solve
call (must preserve cookie/IP/eval semantics) · pending_protocols read-through
cache (data-usage semantics) · cold-start warmup ping · model-routing changes
(locked, needs timing+eval proof per spec).

Acceptance mapping: A3+existing ack ⇒ <100ms feedback; A2/A1 skeleton+banner ⇒
meaningful state <300ms; B1 ⇒ no blank wait >800ms — safe guidance on screen
in ~0.5s while the AI tail finishes in background. ai_tail p95 itself is then
reported honestly as the residual (model-time) line item.
