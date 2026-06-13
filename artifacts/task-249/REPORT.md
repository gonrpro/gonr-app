# TASK-249 — plant-brain admin static-chunk isolation

**Status:** delivered, awaiting_tester
**Lane:** `/Users/tyler/dev/gonr-app-task218-lab` (on top of frozen TASK-247 patch `artifacts/task-247/task-247.patch`, SHA bc912536…)
**Date:** 2026-06-12

## What changed

### A. Corpus out of the client chunk
- `app/admin/plant-brain-intake/PlantBrainIntakeClient.tsx` no longer
  value-imports `scenarios.ts` (10.7KB) / `questions.ts` (15.8KB). It declares
  `PlantBrainCorpus`, receives it via a required `corpus` prop, and hydrates a
  module-level registry read by the dozen module-scope helpers
  (`freshSession`/`pickNextQuestion`/`applyAnswer`/`exportOpsPlan`/…).
  The render-time global write carries a justified
  `eslint-disable react-hooks/globals` (static deep-equal config, React
  Compiler off; threading is the swap if that changes).
- The literal `'red-wine-silk-3day'` fallback was removed from the client —
  scenario ids are guard fingerprints now and must not exist in client code.
- New `app/admin/plant-brain-intake/corpus.ts` — the ONLY module that
  value-imports the corpus; both… all three pages share it.

### B. Three routes, one gate (scope grew by one route — flagged here)
The audit found two routes; **typecheck surfaced a third**:
`app/spottingboard/builder/page.tsx` also rendered the intake client — with
NO auth, and unlike the other two it IS proxy-reachable on spottingboard.com
(the proxy passes `/spottingboard/*` through; "auth in-app" did not exist on
this route). All three now run the same founder gate:

| Route | Before | After |
|---|---|---|
| `/admin/plant-brain-intake` | founder gate (inline) | founder gate (shared `lib/auth/founder-access.ts`) + corpus via prop |
| `/plant-brain-builder` | none (proxy-only) | founder gate + corpus via prop |
| `/spottingboard/builder` | none (**reachable on SB host**) | founder gate + corpus via prop |

`lib/auth/founder-access.ts` is the admin page's gate extracted verbatim
(`FOUNDER_EMAILS` + Supabase session + localhost dev bypass). If SB workbench
later gets operator-session auth, swap `hasFounderAccess` on the SB route.

### C. Guard extension — `scripts/check-static-chunks.mjs`
Four plant-brain fingerprints added to the zero-tolerance tier:
`red-wine-silk-3day`, `couture textile restorer`, `silk records pressure
marks`, `fresh blood on a cotton shirt walks in` — each verified corpus-only
before wiring. TASK-247 tiers untouched.

## Correction to the TASK-247 report
TASK-247 attributed the POG≈26/NSD=0 static chunk to "plant-brain admin
scenarios". **That attribution was wrong.** The plant-brain content was in a
different chunk (`0vuwelz0q8.bf.js`, fingerprint-verified pre-fix, clean
post-fix). The POG≈26 chunk (`0cv70k41gza1h.js`) is the **courses** surface —
`app/courses/module-1/page.tsx` + `lib/courses/module2.ts`, bilingual spotter
training copy ("POG is your first-line agent…", solvent dwell guidance). It
persists after this fix and is a separate residual (next paragraph). The
tier-2 conjunction guard was calibrated against measured chunk counts, not
the attribution, so it remains valid (that chunk has NSD=0).

## Residual (not in TASK-249 scope — Atlas's call)
Spotter-training course content ships in a static chunk via
`app/courses/module-1` + `lib/courses/module2.ts` (POG×26, EN+ES pro
protocols). Same exposure class, fourth surface. Candidate TASK-250 with the
same recipe: server page + props + fingerprint terms.

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 (and it caught the third route) |
| `npx eslint` on all touched files | clean |
| `npx vitest run` | 47 files, 724/724 pass |
| `npm run build` + postbuild guard | PASS — 70 chunks |
| Manual grep: plant-brain fingerprints in `.next/static/chunks` | empty |
| Corpus location | `.next/server/chunks/ssr/` only |
| Guard negative self-test (seeded `red-wine-silk-3day` chunk) | FAIL closed, exit 1; PASS after removal |
| `next start` smoke, gonr host | `/plant-brain-builder` + `/admin/plant-brain-intake` 307 → `/solve-v2` (proxy unchanged) |
| `next start` smoke, SB host | `/spottingboard/builder` 200 with "Founder access required." stub, **zero corpus strings in response** |
| TASK-247 guard + behavior | intact (same build, same PASS; `/solve-v2` 200) |

Build/start used the same placeholder env as TASK-247 (secret-guard blocks
.env/credential paths in-session; verification only, never deployed).

## Files touched (TASK-249 delta on top of the frozen 247 patch)
- `app/admin/plant-brain-intake/PlantBrainIntakeClient.tsx` (corpus prop + registry, identifier swaps, fallback literal removed)
- `app/admin/plant-brain-intake/page.tsx` (gate via shared helper, corpus prop)
- `app/admin/plant-brain-intake/corpus.ts` (new)
- `app/plant-brain-builder/page.tsx` (founder gate added, corpus prop)
- `app/spottingboard/builder/page.tsx` (founder gate added, corpus prop)
- `lib/auth/founder-access.ts` (new, extracted verbatim)
- `scripts/check-static-chunks.mjs` (plant-brain fingerprints + comment recalibration)
