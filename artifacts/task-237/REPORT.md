# TASK-237 — Chemicals Audience Leak Audit

**Lane:** `~/dev/gonr-app-task218-lab` (branch task-218-lab) · Next 16.2.1
**Date:** 2026-06-11
**Authorization:** audit + smallest structural gate only; no prod, no public claims, no deploy.
**Verdict:** one real consumer-solve-path drift gap PATCHED; one real (low-likelihood) static-chunk leak delivered as a ready patch for Atlas to land with render review; one consumer-copy call flagged to SB. No deploy.

---

## What I patched (smallest structural gate on the rendering path)

The only audience boundary that protects the *actually consumer-reachable* surface (`/api/solve` output) against pro-term leakage is `enforceConsumerCard` → `FORBIDDEN_CONSUMER_TERMS` in `lib/safety/rule-table.ts`. The audit found three pro agents that the corpus uses but the guard did **not** list, plus a regex that missed the corpus's own spelling of one term:

- **Mulsolite** — in 13 `data/core` cards (mostly stripped fields, but `grass-silk.solventNote` survived only by accident, blocked by "acetic acid" in the same string). Not guarded.
- **StreePRO** — pro agent, not guarded.
- **PYRATEX** — not present in the repo today, but listed in the ticket's representative set; guarded pre-emptively.
- **"General Formula No. 209"** — the corpus spelling. The old rule `/formula\s*209/i` does **not** match "Formula No. 209". Widened to `/(?:general\s+)?formula\s*(?:no\.?\s*)?209/i`.

**Files changed:**
- `lib/safety/rule-table.ts` — `FORBIDDEN_CONSUMER_TERMS`: added `streepro`, `mulsolite`, `pyratex`; widened `formula-209`.
- `__tests__/task-231-consumer-detox.test.ts` — added the three terms to both the prompt-forbidden list and the output-guard `leakCases`; changed the 209 case to the "General Formula No. 209" spelling so the widened regex is exercised.

**Verification:**
- `npx vitest run __tests__/task-231-consumer-detox.test.ts` → **60/60 pass** (was 54; +6 new term cases).
- `npm run typecheck` → clean.
- Release-gate eval harness (TASK-235/236) not affected by a forbidden-term addition; not re-run here (serialize per single-flight rule before any harness run).

This closes the residual risk on the consumer path: if template text or AI output ever echoes Mulsolite/StreePRO/PYRATEX/"General Formula No. 209", the card now falls back instead of rendering it.

---

## Finding #3 — pro corpus ships in a client chunk (REAL, low-likelihood; ready patch below — NOT landed)

`app/pro/chemicals/page.tsx` is `'use client'` and statically imports the entire `data/chemicals` corpus at module scope (lines 5–20). Result: the corpus is bundled into a static JS chunk under `/_next/static/`, which the proxy matcher explicitly exempts (`matcher: ['/((?!_next/static|_next/image).*)']`).

**Verified directly:** `.next/static/chunks/0_z8_pi4vcl2n.js` contains BonGo×37, StreeTAN×47, POG×53. Anyone who knows the hashed chunk URL gets the full corpus with zero auth.

**Why it is low-likelihood, not zero:** `/pro/chemicals` is proxy-unreachable on both hosts (GONR redirects to `/solve-v2`, spottingboard redirects to login), so the chunk URL is never advertised and the hash rotates every build. Today's only mitigation is hash obscurity — a real single-point, but not an open door.

**Why I did not land it tonight:** the fix is a server/client split of a 688-line interactive page (plus `app/pro/chemistry/page.tsx`, the other client importer). The page is proxy-unreachable, so it cannot be render-tested locally — only build-verified. A blind 688-line refactor in the ship lane at night is the wrong risk profile. It needs Atlas's render review.

**Ready patch (the smallest structural gate for this vector):**
1. Rename the current `app/pro/chemicals/page.tsx` body to a client island `app/pro/chemicals/ChemicalsClient.tsx` (keep `'use client'`), but have it receive `crosswalk`, `fiber`, and `companies` via a single `data` prop (thread to `AgentTab`/`CompanyTab`/`FiberTab` via props or a small `ChemicalsDataContext`).
2. Make `page.tsx` a server component (no `'use client'`) that imports the JSON and renders `<ChemicalsClient data={...} />`. Server-imported data serializes only into the RSC payload at request time (gated route), never into a static chunk.
3. Same treatment for `app/pro/chemistry/page.tsx`.
4. **Verify:** `npm run build` then `grep -rl "StreeTAN\|BonGo\|POG" .next/static/chunks/` returns nothing.

Recommend cutting this as its own small ticket so the build verification gets done properly.

---

## Finding #7 — "dry-side" trade vocabulary reaches consumers (CONSUMER-COPY CALL → SB, not a unilateral guard change)

7 cards (`butter-polyester`, `candle-wax-cotton`, `candle-wax-linen`, `cooking-oil-carpet`, `grease-denim`, `gum-cotton`, `gum-denim`) pass sanitize + guard with the phrase "dry-side" intact in consumer-kept fields — verified in `stainChemistry` (e.g. candle-wax-cotton: "Candle wax is a dry-side, wax/oil-family deposit…") and `meta.tags`. "dry-side"/"wet-side" are **not** in `FORBIDDEN_CONSUMER_TERMS`. This is the only pro vocabulary that demonstrably reaches an anon/free/home device today via `/api/solve`.

**Why I did not just block it:** adding `(?:wet|dry)-side` to the forbidden list would knock all 7 cards into the generic fallback, *reducing* consumer card quality, for a vocabulary nicety. The strings are educational/boundary copy ("a dry-side deposit"), not products and not instructions. Whether trade-classification vocabulary belongs on a consumer screen is an SB/doctrine copy call, not a Lab guard decision (SB owns card data/copy when live).

**For SB:** decide one of — (a) leave as consumer-safe educational vocabulary; (b) reword the 7 cards' consumer fields to drop "dry-side" (keeps the cards, removes the vocab); (c) block the term and accept 7 cards dropping to fallback. Exact cards + strings attached above.

---

## Other findings (documented, no action needed under this ticket)

- **#1/#2 — `public/data/chemicals/` + `public/data/chemistry/`** are byte-duplicates of `data/` placed under a statically-servable root. Currently blocked by `proxy.ts` (single layer). Not consumer-reachable today. `public/data/chemistry/*` IS runtime-fetched by `app/pro/chemistry/page.tsx` (unreachable page), so it is not a pure orphan — de-publishing needs the #3 server-component work done first. Recommend folding into the #3 ticket.
- **#6 — coverage collision (scan-reported, not independently re-counted):** the scan estimates ~195/270 `data/core` cards retain a forbidden term (POG/NSD/"spotter") in a consumer-kept field, so they always serve the generic fallback to consumers. This is a **quality/coverage** issue, not a leak. I did not independently re-derive the 195 figure; the durable way to measure and lock it is the CI gate below.
- **Orphans:** `data/chemistry-families.json` (605KB, BonGo×6) and `data/safety-data.js` have zero importers — no current exposure, future-import risk only.
- **Public-by-design:** spottingboard.com `/` and `/spottingboard` carry "POG · RR-100 · Adjust-A-Blend" operator marketing, served unauthenticated by design. Not a consumer-app leak; noted for awareness. Stray backup file `components/spottingboard/LiveChatDemo.tsx.pre-task168-*.bak` should be removed in housekeeping.

---

## Recommended durable fix (one follow-up ticket)

A repo-level CI test that simulates `sanitizeCardForTier` + `enforceConsumerCard` over every `data/core/*.json` and asserts no forbidden term survives in a consumer-kept field — would have caught both the dry-side cards and the coverage collision, and would lock `public/data/` against future pro-file additions. This is the gate that makes the audit self-enforcing instead of a point-in-time sweep.

## Boundary

No prod alias, beta promotion, DB/Airtable/API write, retrieval index, source/card truth promotion, public guidance expansion, product recommendation, checkout, outreach, purchase, sample, supplier action, or release authorized or performed. Lab patched the guard + tests only; Atlas owns commits and any deploy.
