# TASK-234 working plan — latency separation + deterministic fast path + 401 cleanup

Spec: ~/ops-vault/Process/Tasks/TASK-234.md (claimed in_progress). Baseline task-218-lab @ 4b609c3 (suite 624). SILENT mode. NO prod alias/beta/DB writes/safety downgrade. Preserve 229b/231/232/233 (focused suites must stay green by exact command).

## Key facts carried forward
- Red-cell evidence: lib/solve/session-evidence.ts parseSessionEvidence + lib/solve/terminal-safety-gate.ts firedRedCells/buildDowngradeCard (deterministic, contract-clean, preserves warnings of original card if given).
- AI fallback branch in app/api/solve/route.ts: consumer+founder only; currently always calls generateAIProtocol (8-28s). finalize re-gates everything + attaches firstAid/directAnswer.
- Soak harness scripts/task-233-soak.sh measures raw TTFB only; artifacts in artifacts/task-233/.
- Anon 401: HomeScreen recent-checks + HistoryScreen fetch /api/solves/history → 401 resource error for anon. HistoryScreen already merges local entries (233).
- Deploy: clone flow (see task-233 PLAN); probe lane x-gonr-eval-secret + evalViewerTier:home; eval probes of fast path must use consumer tier (founder skips consumer gate).
- secret-guard: scripts via Write tool; vault appends via python helper.
- eslint baseline: route.ts 15 pre-existing errors/3 warnings.

## Build sequence
1. **Deterministic fast path (the one mitigation):** in route.ts AI-fallback branch, BEFORE generateAIProtocol: for NON-PAID tiers only, parse evidence; if firedRedCells(evidence).length > 0 → serve buildDowngradeCard({}, reasons, ctx.stain, ctx.surface) through finalizeCardForResponse with source 'deterministic-fast-path', tier 4, confidence 1 (deterministic), _fastPath: true; recordEvent + logSolveHistory/logSolveReview consistent with other exits. Founder/eval-founder unchanged. Safety: equal-or-better (deterministic protect+refer replaces AI output that the gate would constrain anyway); UX latency: 16-28s → <1s on the HIGHEST-RISK sessions.
2. **Timing instrumentation (PII-free):** route POST start `const t0 = Date.now()`; attach `_serverMs: Date.now() - t0` on the main consumer exits (library, fast-path, hard-refuse, AI, fallback). No user identifiers.
3. **Soak v2 (metric separation):** upgrade scripts/task-233-soak.sh → task-234 mode or new scripts/task-234-soak.sh reporting per-category p95: (a) ui_first_guidance = client banner, constant <2s by construction (documented line, not measured over HTTP), (b) deterministic_verdict = p95 TTFB of fast-path/core/refusal/hard-refuse runs (threshold 8s — HARD), (c) ai_tail = p95 TTFB of ai-generated runs (REPORTED, threshold informational unless Atlas selects), (d) raw overall TTFB (reported). PASS = 0 dead ends AND deterministic_verdict p95 < 8s; ai_tail printed with explicit "Atlas-select" note. Category detection via response source field + _fastPath.
4. **Anon 401 cleanup (optional, low-risk):** client-side `hasLikelySession()` helper (document.cookie includes 'sb-') in lib/solve/history-store.ts or lib/auth; HomeScreen recent-checks + HistoryScreen skip the /api/solves/history fetch when absent (anon path: local entries only — semantics unchanged, auth not weakened). Find HomeScreen fetch site first.
5. Tests __tests__/task-234-fast-path.test.ts: fast-path unit via route source-lock + gate fns (red cell + non-paid → downgrade card before AI: test buildDowngradeCard({}) shape passes contract; evidence cases route correctly — actual route branch tested via source-lock regex + live probe), soak category parser unit if shell-free logic extracted, cookie-helper unit, 401-skip source-locks. Full suites by exact command (229b/231/232/233 focused).
6. Gates: tsc, full vitest, eslint changed, vercel build, codex review (closeout), commits.
7. Preview deploy (clone flow), run: task-232 probe (regression 7/7), new soak v2 (PASS on deterministic metric; record ai_tail), fast-path live verification (red-cell case returns source deterministic-fast-path with ttfb < 2s), console capture on /solve-v2 anon (no 401 resource error now). Evidence post + awaiting_review + coder report + daily log + spec flip + regen index.

## Status
- [x] Spec claimed in_progress + index regenerated
- [ ] Steps 1-7
