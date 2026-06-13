# TASK-250 audit (read-only — no code changed, spec still `queued`)

Pre-implementation map for the courses static-chunk exposure. Same recipe as
TASK-247/249. **No file mutations under this audit.**

## The leak

Both course pages are `'use client'` and statically import the full bilingual
training corpus:

- `app/courses/module-1/page.tsx` (274 lines) ← `MODULE_1_META/LESSONS/QUIZ`
  from `lib/courses/module1.ts` (20.3KB — spotter doctrine, EN+ES)
- `app/courses/module-2/page.tsx` (162 lines) ← `MODULE_2_META/LESSONS/QUIZ`
  from `lib/courses/module2.ts` (31.2KB — POG×26 first-line-agent language,
  solvent dwell guidance, customer scripts, EN+ES)

Verified in the current build: course content sits in TWO static chunks
(`0cv70k41gza1h.js` = the POG×26 chunk TASK-249 re-attributed, plus
`16sn6c1qtoksp.js`).

## Not part of the leak (no change planned)

- `components/courses/LessonCard.tsx` / `QuizPlayer.tsx` — **type-only**
  imports from `lib/courses/module1`; they receive content via props already.
- `lib/courses/badges.ts` (2.4KB) — gamification labels + localStorage
  helpers, imported by `app/profile/page.tsx` (client). No pro chemistry;
  stays client-side. (`spotter-mindset` badge id lives here + in the module-1
  page, so it is NOT usable as a guard fingerprint.)

## Gating posture

`/courses/*` has no in-app auth and is proxy-unreachable on both hosts
(gonr: not consumer surface → 307; SB host: not `/spottingboard/*` → login
redirect). Spec says "preserve existing intended reachability/gating" AND
"pass only through gated server-rendered payloads". Plan: founder gate via
the shared `lib/auth/founder-access.ts` — consistent with Atlas's TASK-249
mandate (don't relocate corpus into an ungated RSC payload), and a no-op for
today's users since the routes are proxy-closed anyway. Flagged for review;
swap to an operator-session check later if courses ship to operators.

## Fix shape

1. `app/courses/module-{1,2}/page.tsx` → server pages: founder gate, import
   the module corpus, render new `ModuleOneClient.tsx` / `ModuleTwoClient.tsx`
   (current page bodies) with `{meta, lessons, quiz}` props. Simpler than
   TASK-249: content flows top-down only — no module-scope helper registry
   needed, plain props suffice.
2. Strip any corpus literals from the client bodies if present (audit of page
   bodies during implementation; `spotter-mindset` badge id is fine to keep).
3. Guard: add course fingerprints to the zero-tolerance tier — verified
   corpus-only, covering BOTH files:
   - module1: `the targeted, chemical-level removal of a specific substance`,
     `judgment under pressure`
   - module2: `POG first for the oil component`, `Esta mancha se ha fijado`
4. After fix, the POG×26 chunk disappears → recalibrate the tier-2 comment;
   threshold itself unchanged.

## Sequencing

TASK-249 is awaiting_review, uncommitted in the same worktree (on top of the
frozen 247 patch). Same A-pattern as last cycle: freeze the 249 delta as
`artifacts/task-249/task-249.patch`, then build 250 on top.
