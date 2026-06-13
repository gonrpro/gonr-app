# TASK-250 report

Status: delivered for review (no deploy, no prod alias, no beta promotion, no DB/API/Airtable writes).

## What changed

- Split `app/courses/module-1/page.tsx` and `app/courses/module-2/page.tsx` into server pages plus client islands:
  - `app/courses/module-1/ModuleOneClient.tsx`
  - `app/courses/module-2/ModuleTwoClient.tsx`
- The server pages now import the course corpora from `lib/courses/module1.ts` and `lib/courses/module2.ts`, require `hasFounderAccess()`, and pass `{ meta, lessons, quiz }` into the client islands.
- The client islands keep the existing course UI/state flow but only type-import course shapes. They no longer value-import `MODULE_1_*` or `MODULE_2_*`.
- Extended `scripts/check-static-chunks.mjs` with TASK-250 course fingerprints:
  - `targeted, chemical-level removal of a specific substance`
  - `judgment under pressure`
  - `POG first for the oil component`
  - `Esta mancha se ha fijado`

## Verification

- `npm run typecheck` PASS
- Focused ESLint on TASK-250 files + `scripts/check-static-chunks.mjs` PASS
- `npx vitest run` PASS: 47 files / 724 tests
- Verification build with fake non-secret env PASS:
  - `env NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon SUPABASE_SERVICE_ROLE_KEY=fake-service OPENAI_API_KEY=fake-openai LEMONSQUEEZY_WEBHOOK_SECRET=fake-ls npm run build`
  - Build warning only: pre-existing Turbopack NFT trace warning from `next.config.ts` import trace.
  - `postbuild` static guard PASS: 70 chunks scanned.
- Manual static grep PASS: no TASK-250 course fingerprints in `.next/static/chunks`.
- Seeded negative guard PASS: injecting `POG first for the oil component` into a fake static chunk made `scripts/check-static-chunks.mjs` fail closed.
- Local `next start -p 30250` smoke: `/courses/module-1` and `/courses/module-2` remain proxy-closed (307) and response bodies contain no course corpus fingerprints.
- Codex review closeout PASS: `codex review --uncommitted` reported no discrete/actionable regressions.

## Notes

- The existing proxy already makes `/courses/*` unreachable on the public hosts; TASK-250 adds the same server-side founder boundary used by TASK-249 so the corpus is not relocated into an ungated RSC payload if routing changes later.
- TASK-247 and TASK-249 guard fingerprints remain in place; the postbuild guard still passes against the full built app.
