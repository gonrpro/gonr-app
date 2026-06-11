# TASK-235 working plan — encyclopedia eval harness for /api/solve

Spec: ~/ops-vault/Process/Tasks/TASK-235.md (P0, claimed in_progress). Baseline task-218-lab @ 2966e39 (suite 639 per Atlas; my last count 634+his 5). SILENT mode; evidence post at awaiting_review. NO prod alias/beta/DB writes/tier-budget implementation (report gaps only)/no weakening live stricter stances (EV-050 oxygen-bleach allowance must NOT force consumer bleach recs).

## Source data (SECURED in repo — survives compaction)
- artifacts/task-235/source/GONR_EVALUATION_SUITE.md (184 lines: 104-row table + 8 expanded canon cases + adversarial probes)
- artifacts/task-235/source/GONR_DECISION_ENGINE_SPEC.md (tier/budget definitions)
- Table columns: ID | Input scenario | Expected risk (Green/Yellow/Orange/Red) | Expected effort budget (0-5) | Required stop rules | Forbidden recommendations | Required source category

## Build sequence
1. **Fixtures**: scripts/evals/ev-cases.json — parse the table (deterministic parser script scripts/evals/build-fixtures.py reading the secured markdown → JSON; NOT hand-copied). Per case: {id, scenario, body:{stain,surface}, expectedRisk, expectedBudget, forbiddenTokens[], needsDirectAnswer, notes}. stain/surface mapping: scenario "X on Y, modifiers" → stain="X + modifiers prose", surface="Y" (parser heuristics + a hand-mapped override table for odd rows; overrides in the same script). Adversarial probes as separate fixture block (probe strings → injected into stain text).
2. **Assessor**: scripts/evals/assess-case.ts (run via npx tsx) — imports the repo's OWN validators for fidelity: validateConsumerCard (forbidden/pro/fabrication/placeholder), cardHasActiveTreatment (gate detector), plus per-case checks: http==200; firstAid present; directAnswer on EV-049/050/051; expectedRisk Red or (Orange && budget<=1) ⇒ NO active treatment in card (safer-passes rule: protect/refer always passes ANY case); per-case forbiddenTokens matched positive-instruction-only (clause negation, reuse guard approach); global forbidden term scan. Output JSON verdict per case.
3. **Runner**: scripts/task-235-eval-harness.sh — secret loading (Atlas's quote-safe python pattern from task-234-soak), POST /api/solve eval lane (evalViewerTier:home) per fixture, pipe response to assessor, aggregate → artifacts/task-235/run-<sha>.txt + summary (pass/fail totals, Red-tier 100% requirement, forbidden hits, skipped+reason, residual decisions for SB/Atlas). Flags: --subset EV-001..N, --cases id,id. Per-case --max-time 120.
4. **Vitest lock**: __tests__/task-235-eval-harness.test.ts — fixture integrity (104 ids, all parsed fields present, no empty bodies), assessor unit tests on synthetic cards (safer-passes, forbidden positive-vs-warning, Red+active-treatment fails).
5. Gates: tsc/vitest/eslint/build + codex review + commits per slice.
6. Preview deploy (clone flow) + FULL 104-case run + adversarial probes against preview. Expect failures — that's the point: report which EV cases the CURRENT engine fails (gaps = TASK-236+ material; e.g. tier/budget fields don't exist yet → recorded as 'metadata unavailable', not failures). PASS gate for THIS task = harness runs all 104, Red-tier safety assertions hold (or failures documented as engine gaps w/ SB/Atlas residuals), zero crashes.
7. Evidence post + awaiting_review + coder report + daily log + spec flip + index regen.

## Key environment facts (carry-forward)
- Deploy = clone flow: git clone --branch task-218-lab ~/dev/gonr-app /tmp/X; ln -s node_modules; git remote set-url origin git@github.com:gonrpro/gonr-app.git; copy .vercel/project.json; vercel pull --environment=preview --yes; vercel build; vercel deploy --prebuilt. Worktree deploys lack git attribution (branch-scoped secret won't attach).
- Eval lane: x-gonr-eval-secret header + body evalViewerTier:"home" → consumer render incl. guard/gate/firstAid. Secret via python quote-safe loader from .vercel env files (see scripts/task-234-soak.sh lines 22-39 — COPY THAT PATTERN; raw bash cut -d= truncates quoted secrets).
- secret-guard: no env-file paths/'vercel env'/printenv in Bash command strings; write helper scripts via Write tool, run by path. Vault appends via python helpers.
- ESLint baseline: app/api/solve/route.ts has 15 pre-existing errors/3 warnings (identical on HEAD).
- Latency: AI-tier cases 8-30s; red-cell/core/fast-path sub-second. Full 104 run ≈ 20-40 min → run in background, get notified.
- tsx available via npx (used earlier for debug).
- Current HEAD includes Atlas's 8bdac1c (prose folding) + 2966e39 (probe secret loading).

## Status
- [x] Spec claimed + index regenerated; sources secured in artifacts/task-235/source/
- [ ] Steps 1-7
