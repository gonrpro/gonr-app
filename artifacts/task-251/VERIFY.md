# TASK-251 — independent verifier report (Lab)

**Roles per Atlas 2026-06-12 19:16 EDT:** implementation = Atlas (OpenClaw/Codex); Lab = independent verifier. Attribution corrections in the spec + both reports confirmed present before verification. Lab's only tree mutation during verification was a throwaway probe test, created and removed in the same command.

**Verdict: PASS — implements the locked decision faithfully. Three non-blocking notes for Reviewer.**

## Independent verification (re-derived, not echoed)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| Focused eslint (ratified-cards, engine, test, coverage script, solve-source) | clean |
| Focused vitest (4 suites incl. new TASK-251 file) | pass |
| Full `npx vitest run` | 48 files, 734/734 |
| Verification build + postbuild chunk guard | PASS, 70 chunks — TASK-247/249/250 guards intact |
| Coverage replay re-derived by Lab (`npx tsx scripts/task-251-coverage-report.ts`) | output IDENTICAL to committed report except generation timestamp — **511 before-gate tier-1/2 matches → 0 consumer library serves → 511 denied to safe fallback**; per-family table present |
| Direct engine probes (Lab-authored, not Atlas's tests) | anon → `legacyDenied`, card null, confidence 0 ✓ · free → denied ✓ · founder → library card served, `source: 'core'`, no deny ✓ |
| Bypass audit | `decide()` is the ONLY `lookupProtocol` caller in app code; the route handles `legacyDenied` before any library-card mutation; no alternate path serves a core card to consumers |
| Fallback path | denied result builds the contextual safe fallback and runs the full `finalizeCardForResponse` stack (sanitize → governor → guard → terminal gate); honest `source: 'library-unratified-denied'`, confidence 0 |
| Allowlist mechanics | `data/ratified-cards.json` empty per the locked decision; `validEntry` requires `cardId` + `ratificationSource` + `ratifiedAt` (partial entries rejected → fail-closed); missing card id → denied (fail-closed) |
| Acceptance criteria | all four met: no unratified card reaches anon/free; allowlist is sole admission with ratification refs; before/after coverage quantified per family; prior-task protections unchanged |

## Notes for Reviewer (non-blocking)

1. **`_legacyCardDenied` rides the consumer JSON response** (denied card id + allowlist version). Card ids are taxonomy slugs, not content — low risk — but consider stripping to a boolean (or moving behind a debug flag) so consumer responses carry no internal identifiers.
2. **Denied solves log `EVENT_TYPES.SOLVE_AI_FALLBACK_SERVED`** with a `denied_legacy_card_id` payload. Telemetry works, but the event name is semantically overloaded (no AI fallback occurred). A dedicated event type would keep dashboards honest; fine to defer.
3. **`home` tier is denied too** (gate = not-in-PAID_TIERS = anon/free/home). This matches the spec's parenthetical definition and the trust posture, but home is a *paying* consumer tier — worth a deliberate Tyler/Atlas ack that $7.99/mo subscribers get safe fallbacks until ratification fills the allowlist, since they feel the coverage cliff first.

## Coverage reality (the accepted tradeoff, now quantified)

With the empty allowlist, all 511 replayed library matches deny to fallback for consumer tiers. The ratification pipeline (TASK-238 entries + SB review + source ledger) is now the only road back to real library guidance for consumers — exactly as Tyler decided.

## Gate posture

Unchanged: review artifact only. No deploy, prod alias, beta promotion, DB/API writes, retrieval, source-truth promotion, or release.
