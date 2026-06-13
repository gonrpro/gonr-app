# TASK-247 — pro chemical corpus static-chunk isolation

**Status:** delivered, awaiting_tester
**Lane:** `/Users/tyler/dev/gonr-app-task218-lab` (working tree, uncommitted per lane convention)
**Date:** 2026-06-12

## What changed

### A. `/pro/chemicals` — server/client split (the real chunk leak)
- `app/pro/chemicals/page.tsx` → server component. Owns all corpus imports
  (crosswalk, fiber index, 10 company JSONs) **and** `AGENT_KEYS` (the
  `NSD`/`POG` slugs double as forbidden consumer terms, so they moved
  server-side too — deviation from the prep map, which had left them client).
- `app/pro/chemicals/ChemicalsClient.tsx` (new) → client island with all UI,
  receives `{agentKeys, crosswalk, fibers, companies}` via one prop, fans out
  internally through `ChemicalsDataContext` + `useChemicalsData()`.
- Corpus now serializes only into the proxy-gated route's RSC payload
  (verified in `.next/server/chunks/ssr/`), never into `.next/static/chunks/`.

### B. `/pro/chemistry` — runtime-fetch conversion (different exposure class)
- `app/pro/chemistry/page.tsx` → server component importing the 12 family
  JSONs from `data/chemistry/` (canonical copy), same display order as the
  retired `FAMILY_FILES` fetch list.
- `app/pro/chemistry/ChemistryClient.tsx` (new) → same UI minus the
  `fetch('/data/chemistry/*.json')` + loading state. Helpers typed (the old
  page was `any`-typed; new file lints clean).

### C. Static-public dedupe
- `git rm -r public/data/chemicals public/data/chemistry` (staged).
  `public/data/chemicals` had no consumer (diff-confirmed byte-identical
  JSONs); `public/data/chemistry` was only consumed by the fetch removed in B.

### D. Durable build gate — `scripts/check-static-chunks.mjs` (postbuild)
- Wired as `"postbuild"` so every `npm run build` (local, pre-push, Vercel)
  runs it; exit 1 fails the build.
- Tier 1, zero tolerance: BonGo, StreeTAN, StreePRO, Mulsolite, PYRATEX,
  General Formula (No.) 209 — corpus-unique terms, any hit in any chunk fails.
- Tier 2, NSD/POG conjunction: fails any chunk where min(NSD, POG) > 8.
  **Spec deviation, documented:** zero-tolerance on bare NSD/POG is not
  achievable — they ship as 1–4-count UI strings across legacy solve/spotter
  surfaces and in PUBLIC SpottingBoard marketing copy
  (`app/spottingboard/page.tsx:77`), and the admin plant-brain scenarios chunk
  carries POG≈26/NSD=0. Corpus content is dense in BOTH (chemicals ≈52/51,
  chemistry ≈21/48), so the conjunction cleanly separates leak from UI copy.
- Also fails if `public/data/chemicals|chemistry` reappears (locks C).
- Negative self-test run: seeded a fake chunk with StreeTAN/BonGo → guard
  exited 1 naming both; removed → PASS.

### E. Consumer-card guard test — `__tests__/task-247-consumer-card-guard.test.ts`
- Runs the REAL `sanitizeCardForTier` + `enforceConsumerCard` over all 270
  `data/core/*.json` cards. To make that possible, `sanitizeCardForTier` +
  `PAID_TIERS` moved verbatim from `app/api/solve/route.ts` to
  `lib/solve/sanitize-card.ts` (route imports it; behavior unchanged).
- Hard invariants: sanitize strips every pro-only field on all 270 cards;
  the full sanitize→enforce pipeline emits zero forbidden terms; paid tiers
  untouched; seeded-leak self-test.
- **Data finding (SB/Atlas lane, not fixed here):** 195/270 cards carry trade
  terms (NSD ×121, sodium hydrosulfite ×65, spotter-refs ×60, acetic acid ×57,
  POG ×45, amyl acetate ×24, VDS ×13, Mulsolite ×1) in consumer-kept
  educational fields (`scienceNote`, `whyThisWorks`, `stainChemistry`,
  `safetyMatrix`, `escalation`, `homeSolutions`). The runtime guard blocks
  these to the safe fallback, so no term reaches a consumer — but those cards
  cannot serve their real content to anon/free users. Static simulation only;
  runtime block-rate needs its own probe before anyone quotes it.
  Test ratchets against `__tests__/task-247-dirty-cards-baseline.json`
  (195 files): baseline may shrink, never grow.

## Verification (all run in the lane)

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npx eslint` on all 8 new/changed files | clean (route.ts has pre-existing `any`/unused warnings in untouched code) |
| `npx vitest run` (full suite) | 47 files, 724/724 pass |
| `npm run build` (+ postbuild guard) | pass — 70 chunks scanned, clean |
| Manual grep `.next/static/chunks` for corpus terms | empty |
| NSD/POG per-chunk after fix | max NSD=2; max POG=26 (plant-brain admin scenarios, pre-existing, NSD=0 there) |
| Guard negative self-test | fails seeded leak with exit 1 |
| Corpus in server output | present only in `.next/server/chunks/ssr/` |
| `next start` smoke | `/pro/chemicals` 307→`/solve-v2` (gating unchanged), `/data/chemistry/*.json` no longer exists+gated, `/solve-v2` 200, static chunk fetch 200 ungated (why the guard matters) |

Build/start used placeholder Supabase/LemonSqueezy env (secret-guard blocks
`.env`/credentials paths in-session; this `.next` is verification-only and
never deployed — Ops builds with real env).

## Render evidence limitation (per prep map)
`/pro/chemicals` and `/pro/chemistry` are proxy-unreachable on every host, so
no curl-rendering of the actual pages is possible. Proof of no-regression is:
verbatim component move (diffable), typecheck, full build, SSR-chunk corpus
presence, and the unchanged redirect behavior above.

## Residual risks / follow-ups (not in scope)
1. **Plant-brain admin content** (`app/admin/plant-brain-intake/`
   questions/scenarios) ships pro-voice training text in a static chunk
   (POG≈26). Same exposure class TASK-247 fixed, different surface.
2. **195-card data debt** above — SB/source lane.
3. `lib/ui/chemistryIcons.tsx` / `chemistryFamily.ts` keep NSD/POG as slug
   keys (1–4 per chunk) — runtime-matching keys for card data, not corpus
   content; eliminating them means renaming agent keys across data + UI.
