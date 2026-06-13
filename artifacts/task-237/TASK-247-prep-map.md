# TASK-247 prep map (read-only — no code changed)

Prep for the static-chunk pro-corpus leak fix. Atlas owns TASK-247; this is the import/split/verification map so the daylight work is mechanical, not exploratory. **No code changed under this file.**

Key upfront finding: the two pro pages are **different leak classes** and need **different fixes**. Don't treat them as one refactor.

---

## File A — `app/pro/chemicals/page.tsx` (688 lines) — STATIC-IMPORT chunk leak

This is the actual chunk leak. The page is `'use client'` and imports the corpus at module scope, so it bundles into `/_next/static/chunks/0_z8_pi4vcl2n.js` (verified: BonGo×37, StreeTAN×47, POG×53).

### Corpus imports to move server-side
- L5 `crosswalkData` ← `@/data/chemicals/agent-brand-crosswalk.json`
- L6 `fiberData` ← `@/data/chemicals/fiber-expertise-index.json`
- L11–20 ten company JSONs ← `@/data/chemicals/companies/*.json`

### Derived module consts (built from those imports)
- L101 `companies: CompanyData[]` (array of the 10 company objects)
- L106 `crosswalk` (`crosswalkData as unknown as Record<string, CrosswalkAgent>`)
- L107 `fibers` (`fiberData as unknown as Record<string, FiberEntry>`)

Static literals that are NOT corpus and can stay client-side: `AGENT_KEYS` (L110), `FIBER_KEYS`, `FIBER_ICONS`, `HIGH_RISK_FIBERS`. (`AGENT_KEYS` lists agent slugs, but the leak is the corpus *content* — mechanism/safetyWarning/products/proTips — which lives in crosswalk/fibers/companies. Slugs alone are not the exposure; leaving them avoids needless churn.)

### Data consumers (where the three corpora are read)
- `AgentTab` (L188) → `AGENT_KEYS`, `crosswalk[key]`
- `CompanyTab` (L287) → `companies`
- `FiberTab` (L~508) / `FiberDetail` (L542) → `fibers[fiber]`, `FIBER_KEYS`

### Recommended split (server page + client island + context)
1. New `app/pro/chemicals/ChemicalsClient.tsx` (`'use client'`): everything currently in page.tsx **except** the corpus imports (L5–6, L11–20) and the three data-const definitions (L101/106/107). Add a `ChemicalsDataContext` + `useChemicalsData()` hook; the default export wraps its tree in `<ChemicalsDataContext.Provider value={data}>`. `AgentTab`/`CompanyTab`/`FiberDetail` read `const { crosswalk, fibers, companies } = useChemicalsData()` instead of the module consts.
2. `app/pro/chemicals/page.tsx` → **server component** (drop `'use client'`): import the JSON, build `companies`/`crosswalk`/`fibers` (the `as unknown as` casts move here), render `<ChemicalsClient data={{ crosswalk, fibers, companies }} />`.

**Why context, not prop-threading:** AgentTab/CompanyTab/FiberTab are siblings under the default export and FiberDetail nests under FiberTab — context is one provider + one hook vs. threading three distinct props through two levels of components. Lower diff, lower error surface.

**Effect:** server-imported data serializes only into the RSC payload at request time (and that route is proxy-gated), never into a static chunk.

---

## File B — `app/pro/chemistry/page.tsx` — RUNTIME-FETCH (NOT a chunk leak)

Different class. It is `'use client'` but reads the corpus via `fetch('/data/chemistry/${id}.json')` at runtime (L65) — confirmed NOT in any static chunk (grep for chemistry corpus strings in `.next/static/chunks` returns nothing). Its exposure is that `public/data/chemistry/*.json` is statically servable (currently proxy-blocked, single layer).

**Fix (coupled to the public-data dedupe):** move chemistry JSON out of `public/` and serve it from a pro-gated route handler (or convert the page to a server component reading `data/chemistry/`), then repoint the L65 fetch. Until this lands, `public/data/chemistry/` cannot be deleted.

---

## Public-data dedupe scope

- `public/data/chemicals/*` — byte-duplicate of `data/chemicals/*`, **no runtime consumer** (File A static-imports from `data/`, not `public/`). Safe to delete once a `diff -r` confirms identical. Deleting it removes the #1/#2 proxy-single-point for the chemicals corpus immediately, independent of File A.
- `public/data/chemistry/*` — **consumed by File B's L65 fetch.** Do NOT delete until File B is converted.

---

## Verification gates for TASK-247 (run in this order)

```
npm run typecheck
npx vitest run __tests__/task-231-consumer-detox.test.ts
npm run build
grep -rlE "StreeTAN|BonGo|\bPOG\b|StreePRO|Mulsolite|General Formula|PYRATEX" .next/static/chunks/   # MUST be empty
```

Render evidence: `/pro/chemicals` is proxy-unreachable on both hosts, so it can't be curled on the gated host. Options, honestly noted: (a) a local dev run with the proxy redirect bypassed to eyeball the page; (b) an RTL smoke that renders `ChemicalsClient` with fixture data and asserts the three tabs mount. The chunk-grep is the load-bearing proof that the leak is gone; render evidence confirms no regression.

## Durable gate (the piece that makes it stay fixed)

A post-build CI script that greps `.next/static/chunks` against the `FORBIDDEN_CONSUMER_TERMS` set and fails the build if any pro term appears in a client chunk. This is what would have caught File A in the first place; it locks both File A's fix and any future `'use client'` corpus import.

---

*Read-only prep. No code changed. TASK-247 code work starts when Atlas opens it.*
