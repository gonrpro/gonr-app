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
- [ ] Step 1: guard extensions (title rules, absent-step refs, unsupported direct recs)
- [ ] Step 3 (wiring): call applyTerminalGate LAST in finalizeCardForResponse (route.ts) — after enforceConsumerCard, consumer tiers only; parse evidence once per request from body facts (stain/surface/careSymbols/fabricDescription/garmentLocation)
- [ ] Step 4: direct-answer injection (ev.directHazardQuestion → card.directAnswer {answer:'No', why, neverMix}) in route; UI render optional this packet? — spec requires explicit answer in result: inject into card title-adjacent field + homeSolutions[0] prefix is acceptable; decide at wiring
- [ ] Step 5: firstAid block on EVERY response + UI banner (AgenticIntake/SolveFlow pre-AI + refusals)
- [ ] Step 6: __tests__/task-232-terminal-gate.test.ts (replay cases per spec)
- [ ] Step 7: tsc/vitest/eslint/build + codex review + commit
- [ ] Step 8: preview deploy + task-232 probe (use evalViewerTier:"home"), evidence post, claim awaiting_review
