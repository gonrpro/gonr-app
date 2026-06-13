# TASK-250 — verifier report (Lab)

**Role split per Atlas 2026-06-12 07:07 EDT:** implementation delta is
Atlas-owned (server/client course-page split, guard fingerprints); Lab is
verifier/report only. No implementation files were modified by Lab — Lab's
overlapping `lib/courses` typing edits were reverted before verification so
the tree under test is single-author. Lab's read-only audit:
`artifacts/task-250/AUDIT.md`.

## Tree under test

- `app/courses/module-1/page.tsx` + `app/courses/module-2/page.tsx` — server
  components: founder gate (`lib/auth/founder-access.ts`, shared with
  TASK-249) + corpus imports + `{meta, lessons, quiz}` props
- `app/courses/module-1/ModuleOneClient.tsx`,
  `app/courses/module-2/ModuleTwoClient.tsx` — client islands, type-only
  `lib/courses` imports, inline `CourseMeta` interface
- `scripts/check-static-chunks.mjs` — four course fingerprints added to the
  zero-tolerance tier (matching the audit's verified-corpus-only candidates)
- On top of frozen `artifacts/task-249/task-249.patch` (SHA 70591785…)

## Verification results — ALL PASS

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| Focused eslint (4 course files + guard script) | exit 0, no findings |
| `npx vitest run` | 47 files, 724/724 pass |
| `npm run build` + postbuild guard | PASS — 70 chunks scanned |
| Course fingerprints in `.next/static/chunks` | none (grep exit 1) |
| TASK-247 + TASK-249 fingerprints in static chunks | none — prior guards intact |
| NSD/POG density recount | no chunk above 4 of either — the courses POG×26 chunk is gone |
| Course corpus location | `.next/server/chunks/ssr/app_courses_module-2_*` only |
| Seeded self-test (`POG first for the oil component` planted in a fake chunk) | guard FAILS closed, exit 1, names the term; PASS after removal |
| gonr-host smoke | `/courses/module-1`, `/courses/module-2`, `/pro/chemicals`, `/plant-brain-builder` all 307 → `/solve-v2` (reachability posture unchanged) |
| SB-host smoke | `/courses/module-1` → login redirect (unchanged); `/spottingboard/builder` still serves "Founder access required." (TASK-249 gate intact) |
| `/solve-v2` | 200 |

Build/start used the standard placeholder non-secret env (same as
TASK-247/249 verification; never deployed).

## Inspection notes (no action required)

1. Founder gate on the course pages cannot be exercised over HTTP on either
   host (proxy intercepts first on gonr; SB host redirects non-`/spottingboard`
   paths to login). Gate proof is code-level: both pages call
   `hasFounderAccess()` before rendering, same pattern verified live on
   `/spottingboard/builder` in TASK-249.
2. The clients keep quiz/heading UI copy ("Quiz: The Spotter's Mindset" etc.)
   client-side — labels, not corpus; not fingerprinted; consistent with the
   badges.ts decision in the audit.
3. The clients define a local `CourseMeta` interface instead of a shared
   exported type. Structurally identical to the META consts; cosmetic only.

## Acceptance criteria check

- Courses pro-voice/training copy absent from unauthenticated static chunks ✓
- Course pages build; reachability/gating preserved (and strengthened with the
  founder gate per the accepted audit plan) ✓
- Durable automated guard fails closed on reintroduction ✓
- TASK-247 and TASK-249 isolation intact ✓

**Verdict: PASS — ready for Atlas to advance status.**
