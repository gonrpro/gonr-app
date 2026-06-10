# TASK-232 working plan (Lab) — Sprint 1: result contract + terminal gate + first-aid banner

Spec: ~/ops-vault/Process/Tasks/TASK-232.md (P0, in_progress, ship lane = this worktree).
Baseline: task-218-lab @ 4fd6ea8 (TASK-231 accepted; 229b green; suite ~590 tests).

## Build steps (sequence)

1. **Extend `lib/solve/consumer-output-guard.ts`** (contract additions on top of TASK-231):
   - title rules: max length, truncation artifacts (`…(`, unbalanced parens, double periods), nonsense/classifier-fragment patterns ("user is unsure what caused it. on what seems")
   - absent-step references: escalation/whyThisWorks/whatToTell mentioning chemicals (peroxide/bleach/ammonia/enzyme/vinegar/solvent/detergent) not present in homeSolutions/steps
   - unsupported direct recommendations: chlorine bleach/ammonia/acetone as POSITIVE instruction anywhere in consumer card = violation (negation-aware)
2. **New `lib/solve/session-evidence.ts`**: parse red-cell evidence from request (stain/surface text + careSymbols + body fields): { dcoUnknownStain, dyeTransferPositive, leatherSuedeLiquid, liningAcetate, heatApplied, rubbedHard, priorChem[], unknownFabric, unknownCare, unknownColorfastness, valuableItem }. Reuse orchestrator HEAT_APPLIED-style application-only regexes; question-vs-applied discipline (646aad2 pattern).
3. **New `lib/solve/terminal-safety-gate.ts`**: `applyTerminalGate(card, evidence, {stain,surface})` → pass | downgrade(refer/protect card w/ reason + preserved Do-Not-Do) . Runs LAST in `finalizeCardForResponse` (after guard, after sanitize). Red cells per spec lines 48-56. Downgrade card = minimalSafeCard variant carrying: explicit reason line, first-aid steps, never-mix warning, referral.
4. **Direct-answer enforcement**: detect direct hazard questions (bleach/ammonia/acid/"can I use/mix X") from request text → card must carry explicit `directAnswer` {answer:'no', why, neverMix}; deterministic injection in route (not validation-only).
5. **First-aid banner**: deterministic `buildFirstAid(stainClass)` (blot/no rub/no heat/no chemistry/check label/refer-if-risky) → included as `firstAid` field on EVERY /api/solve response incl. refusals/fallback/disambiguation. UI: AgenticIntake + SolveFlow render banner immediately on submit (pre-AI), ResultsScreen renders firstAid on refusals. Test threshold: banner data present in 100% of responses; UI renders it before generation completes (component test).
6. **Tests `__tests__/task-232-terminal-gate.test.ts`** — replay cases (spec Verification): unknown+DCO→refer-only; dye-transfer+matching-card→no wet DIY; heat/rubbed→downgrade; direct bleach question→explicit no+never-mix; fabricated history blocked unless in session; banner present; forbidden grep across new regression set; 229b+231 untouched.
7. **Gates**: tsc, full vitest, eslint changed files, vercel build, codex review (closeout skill), commit(s).
8. **Preview proof**: deploy --prebuilt; extend `scripts/task-231-preview-probe.sh` → `task-232-preview-probe.sh` with red-cell replay cases + schema check + expected fail-closed assertions (evalViewerTier:"home" body param, 200s required). Post evidence; claim awaiting_review. NO prod alias.

## Key route facts (verified earlier)
- All consumer exits flow through `finalizeCardForResponse` (route.ts, after POST start) → guard for non-paid (PAID_TIERS spotter/operator/founder) → sanitize. Terminal gate slots in there.
- Eval probe: x-gonr-eval-secret + body.evalViewerTier (route.ts:731, gated by isEvalRunner; renders as chosen tier).
- careSymbols arrive in JSON body; orchestrator folds prior-chem/heat into stain/surface text (priorTreatment tokens).
- buildContextualFallback(ctx) + cautiousFallbackEligible exist in lib/safety/filter.
- secret-guard: never reference env-file paths or `vercel env`/printenv tokens in Bash command strings — use Write-tool scripts run by path.

## Status
- [x] Spec claimed in_progress, index regenerated
- [x] Step 2: lib/solve/session-evidence.ts WRITTEN (untested) — red-cell evidence parser, question-vs-applied discipline, direct hazard question detection
- [x] Step 3 (module): lib/solve/terminal-safety-gate.ts WRITTEN (untested) — firedRedCells, cardHasActiveTreatment (negation-aware), buildDowngradeCard (preserves warnings), applyTerminalGate (protect-only cards pass, active treatment downgrades)
- [x] Step 1: guard extensions DONE (title rules, absent-step refs, unsupported direct recs) — committed
- [x] Step 3 (wiring): applyTerminalGate wired LAST in finalizeCardForResponse — committed (part-1 commit after 4fd6ea8)
- [x] Step 4: card.directAnswer injection in route — committed (lib/solve/first-aid.ts buildDirectAnswer)
- [x] Step 5 (API): card.firstAid on every consumer card — committed
- [x] Step 5 (UI, intake half): FirstAidBanner.tsx DONE + i18n firstaid.* keys (EN/ES) + rendered in AgenticIntake thinking/asking — commit 8e6ff26
- [ ] Step 5 (UI, results half): ResultsScreen.tsx — render card.firstAid (on refusal/downgrade/fallback cards: sources 'terminal-safety-gate', 'deterministic-fallback', hard-refuse, _safetyBlocked) + card.directAnswer (always when present, ABOVE the steps: bold "No —" + why + instead). Consumer render area ~line 401 (materialWarnings/neverDo merge), DoNotDoPanel pattern at import line 34. SolveResponse type may need firstAid/directAnswer optional fields (type lives in ResultsScreen.tsx exports, line 8-11 of AgenticIntake imports it).
- [ ] Step 6: __tests__/task-232-terminal-gate.test.ts — replay cases: (a) parseSessionEvidence units incl. question-vs-applied + care-restriction-not-disclosure; (b) firedRedCells per class; (c) applyTerminalGate: active-treatment card + each red cell → downgrade (assert downgrade card passes validateConsumerCard + has firstAid-compatible shape + preserves warnings); protect-only card passes; (d) unknown+DCO replay; dye-transfer + verified-card replay; heat/rubbed replays; (e) buildDirectAnswer bleach/ammonia/mix = explicit No + never-mix text; (f) buildFirstAid variants (leather/DCO adds no-soak; priorChems adds rinse-stop); (g) guard additions: title cases from pressure test ("…(care label: dry…", double period, classifier fragment), absent-step ref (escalation cites peroxide, steps don't), direct-rec (apply ammonia) negation-aware; (h) banner: AgenticIntake renders FirstAidBanner in thinking phase (component test w/ @testing-library if present — CHECK __tests__ for existing component-test pattern; if none, skip UI test and note residual risk).
- [ ] Step 7: tsc/vitest/eslint/build + codex-review skill (closeout) + commit 3/3
- [ ] Step 8: vercel build + deploy --prebuilt; write scripts/task-232-preview-probe.sh (extend 231 probe: red-cell replay bodies w/ evalViewerTier:"home", assert 200 + downgrade/refusal shape + zero forbidden + firstAid present + directAnswer on bleach question); run; evidence post (changed files, exact test commands, replay outcomes, grep, preview URL, residual risks); flip spec awaiting_review + regen index + coder report + daily log. NO prod alias.
- [ ] Step 6: __tests__/task-232-terminal-gate.test.ts (replay cases per spec)
- [ ] Step 7: tsc/vitest/eslint/build + codex review + commit
- [ ] Step 8: preview deploy + task-232 probe (use evalViewerTier:"home"), evidence post, claim awaiting_review
