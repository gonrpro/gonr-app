# TASK-249 audit (read-only — no code changed, spec still `queued`)

Pre-implementation map for the plant-brain admin static-chunk exposure, same
pattern as the TASK-247 prep map. **No file mutations under this audit.**

## The leak

`app/admin/plant-brain-intake/PlantBrainIntakeClient.tsx` (`'use client'`)
statically imports the full training corpus at module scope:

- `scenarios.ts` (10.7KB) — `SEED_SCENARIOS` pro-voice scenario briefs
  (POG protocols, owner-only couture handling, pre-test doctrine), plus
  `AXIS_OPTIONS` / `AXIS_LABELS`
- `questions.ts` (15.8KB) — `QUESTIONS` pool + `MODULES` + `PHASE_THRESHOLDS`

Verified in the current build: scenario signature `red-wine-silk-3day` sits in
`.next/static/chunks/0vuwelz0q8.bf.js`; the POG≈26 chunk flagged in TASK-247
(`0cv70k41gza1h.js`) carries the scenario body text. `.next/static/**`
bypasses the proxy matcher, so this is world-readable with a chunk URL.

## Two routes render the same client — different gate states

| Route | Gate | State |
|---|---|---|
| `/admin/plant-brain-intake` | server page checks Supabase session against `FOUNDER_EMAILS` (+ localhost dev bypass) | correct boundary — reuse it |
| `/plant-brain-builder` | **none** — `PlantBrainBuilderClient.tsx` just re-exports the intake client; page + layout have zero auth | proxy-only protection (NEW finding) |

Consequence for the fix: moving the corpus to server pages converts the
exposure from static-chunk to RSC payload — but on `/plant-brain-builder`
the RSC payload would still be ungated-but-proxy-blocked. The builder page
must get the same founder gate (or render the client without seed data).
Without that, TASK-249 just relocates the exposure.

## Fix shape (mirrors TASK-247)

1. Move `SEED_SCENARIOS`, `QUESTIONS`, `MODULES`, `PHASE_THRESHOLDS`,
   `AXIS_OPTIONS`, `AXIS_LABELS` imports into the two server pages; pass via a
   single `data` prop. Types stay importable (type-only imports don't bundle).
2. Strip content-bearing literals from the client (e.g. the
   `'red-wine-silk-3day'` fallback id at `PlantBrainIntakeClient.tsx:215`
   derives from `data` instead).
3. Founder-gate `app/plant-brain-builder/page.tsx` with the same
   session-check used by the admin page (extract the helper so it's shared).
4. Extend `scripts/check-static-chunks.mjs` with plant-brain signature terms
   (scenario ids + distinctive pro-voice phrases), keeping the TASK-247 tiers
   untouched.

## Open sequencing question (for Atlas before any code)

TASK-247's diff is uncommitted in this same worktree and `awaiting_review`.
Coding TASK-249 on top mixes the two review surfaces. Options:
- **A:** snapshot the TASK-247 diff to `artifacts/task-247/task-247.patch`
  (frozen review artifact), then implement 249 on top now.
- **B:** hold 249 until 247 review lands/commits.
