# TASK-240 — Results: snappy step-to-step UX + latency recovery

Delivered HEAD: `9f2f16f` (patches across `9829dcd` → `9f2f16f`).
Final preview: `gonr-dkd2851de` (client code identical from `5822bd3`).
Baseline reference: `artifacts/task-240/BASELINE.md` (AI tail = 97-98% of
wait; client gaps: missing firstAid on loading, null boot window, skeleton
wipes on re-solve).

## What shipped

**Patch 1 — client (no blank/skeleton-only states remain):**
- FirstAidBanner on the Results loading branch — conservative guidance is now
  on screen during EVERY wait (fallback path, retries, follow-ups, EN/ES
  re-solves), completing the TASK-232 design.
- `SolveBootShell` replaces the null window on /solve-v2/solve: Suspense
  fallback + `!attachReady` state + route `loading.tsx` all render the intake
  shell (logo, context card, thinking line, first-aid) from first paint.
- Home CTA: pressed/“Starting…” state on submit (<100ms feedback) + route
  prefetch on first keystroke.
- Re-solves keep the existing verdict visible, dimmed with an “Updating your
  answer…” chip — no more skeleton wipe on language toggle/follow-up.
- Fallback intake screens + attach sheet are now dynamic imports (out of the
  initial route bundle).

**Patch 2 — server staging + parallelization (gates untouched):**
- Opt-in staged NDJSON response (`staged: true`, consumer AI path only):
  stage 1 = deterministic `{firstAid, directAnswer}` built from gated session
  evidence — no model prose, no treatment steps; stage 2 = the full gated
  card from the IDENTICAL payload builder the classic path uses. AI failure
  inside the stream degrades to the same safe fallback. Harness fixtures
  never send `staged` → release-gate semantics unchanged.
- Auth roundtrip starts before body parse; gate check + plant lookup run
  concurrently (gate consumed + checked exactly as before).
- ResultsScreen consumes the stream: an asked hazard question now renders its
  explicit "No" answer during the wait.

**Determinism follow-ups (eval variance → deterministic):**
- "dried in the dryer" = heat-set disclosure (EV-044 → gate-sourced PASS).
- Verb-less product pairs ("soap and vinegar") join GOV-COMBO-1 (EV-078
  class); "soap and water"/"detergent solution" survive.

## Measured results (staged probe, preview, eval lane)

| Path | Stage 1 (safe guidance) | Final (full gated card) |
|---|---|---|
| AI tail, run 1 (cold-ish) | **1.46s** | 13.32s |
| AI tail, run 2 (warm) | **0.38s** | 8.89s |
| Hazard question (bleach) | **0.31s** — incl. explicit directAnswer "No" | 10.05s |
| No `staged` flag | — | classic single JSON, 10.15s (harness shape ✓) |
| Fast path / library / pages | unchanged | 0.3–0.45s warm (baseline) |

Perceived-latency acceptance vs spec:
- **<100ms feedback**: CTA pressed state + AgenticIntake's existing optimistic
  echo (client-local). ✓
- **<300ms meaningful next state**: boot shell renders at first paint
  (prerendered loading.tsx); skeleton mirrors the result layout. ✓
- **No blank/spinner-only wait >800ms**: first-aid copy is on screen in every
  waiting state, and on the staged path the engine's real stage-1 guidance
  lands at 0.3–1.5s. ✓
- **Full-result latency reported separately**: ai_tail remains 8.9–13.3s of
  model time — the residual is MODEL latency, not transport/UX. Next lever is
  model routing/caching (explicitly held for Atlas per scope).

## Verification

- typecheck + 712/712 vitest + targeted ESLint clean (route/filter baselines
  byte-identical pre-existing) + vercel build green at every commit.
- Full TASK-235 release-gate eval at delivered HEAD: see run artifact
  (`run-9f2f16f.txt`) — result recorded in the delivery message.
- Screenshots (mobile viewport 390×844, headless Chrome): home, solve boot
  state, settled result — `~/lab/output/TASK-240/screenshots/`.
- Held per Atlas: in-process intake→solve call, pending_protocols cache,
  warmup ping, model routing changes.
