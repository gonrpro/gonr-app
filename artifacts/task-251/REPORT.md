# TASK-251 report

Author/implementer: Atlas (OpenClaw/Codex). Lab is the independent verifier for this delta.

Status: delivered for review (no deploy, no prod alias, no beta promotion, no DB/API/Airtable writes).

## What changed

- Added an explicit empty ratified-card allowlist at `data/ratified-cards.json`.
- Added `lib/solve/ratified-cards.ts` with the allowlist loader and consumer-tier checks.
- Extended `lib/decision/engine.ts` so anon/free/home tier-1/2 `data/core` matches return a `legacyDenied` result unless the card id is explicitly ratified.
- Updated `app/api/solve/route.ts` to handle `legacyDenied` before any library card mutations, serving the contextual safe fallback with `source: 'library-unratified-denied'`, `confidence: 0`, and the existing finalize/sanitize/governor/guard/terminal-gate stack.
- Added provenance mapping for `library-unratified-denied` so consumer UI renders an honest non-verified source line.
- Added focused TASK-251 tests and updated the Spanish library-bypass control tests to use founder tier for the paid/pro unchanged path.
- Added `scripts/task-251-coverage-report.ts` and generated `artifacts/task-251/coverage-report.md`.

## Verification

- `node /Users/tyler/.openclaw/workspace/scripts/gonr_live_check.mjs` PASS: `gonr_health=200`, `supabase_signups_24h=0`, local-only migrations intentionally gated.
- `/Users/tyler/claude-lab/scripts/lab-bridge-watchdog.sh` PASS.
- `npm run typecheck` PASS.
- Focused ESLint on TASK-251 support/test/report files PASS. Full `app/api/solve/route.ts` lint still reports pre-existing `no-explicit-any` debt, not introduced by TASK-251.
- `npx vitest run __tests__/task-251-consumer-legacy-deny.test.ts __tests__/task-247-consumer-card-guard.test.ts __tests__/consumer-safety/es-ai-tier-fallback.test.ts __tests__/consumer-safety/solve-source.test.ts` PASS: 4 files / 30 tests.
- `npx vitest run` PASS: 48 files / 734 tests.
- Coverage replay generated: 511 before-gate tier-1/2 matches, 0 after-gate consumer library serves, 511 denied to safe fallback.
- Verification build with fake non-secret env PASS:
  - `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon SUPABASE_SERVICE_ROLE_KEY=fake-service OPENAI_API_KEY=sk-fake GONR_EVAL_SECRET=fake LEMONSQUEEZY_WEBHOOK_SECRET=fake npm run build`
  - Build warning only: pre-existing Turbopack NFT trace warning from `next.config.ts`.
  - `postbuild` static guard PASS: 70 chunks scanned.
- `codex review --uncommitted` PASS: no discrete/actionable issues reported. The review sandbox's attempted Vitest run hit read-only EPERM, but local Vitest passed before and after review.

## Artifacts

- Coverage report: `artifacts/task-251/coverage-report.md`
- Atlas-authored vault implementation report: `500 Agents/Lab/Reports/TASK-251/coder-report.md`

## Residuals

- Initial allowlist intentionally remains empty. Future consumer admission requires a versioned `data/ratified-cards.json` entry with explicit TASK/SB/source ratification reference.
- No runtime, retrieval, public guidance, source/card truth, DB/API, deploy, beta, product, outreach, checkout, purchase, sample, supplier, prod alias, or release gate moved.
