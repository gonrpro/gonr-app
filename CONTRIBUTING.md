# Contributing to gonr-app

Internal engineering notes for GONR contributors. Scope is narrow — this file covers the discipline tooling + hook setup. Architectural decisions live in the ops vault, not here.

## Git hooks (required)

GONR ships a pre-push hook that blocks pushes when a tracked file imports a path that resolves to an untracked file. Without this, a `vercel --prod` from a dev machine can upload the local working tree including untracked files, so production works while the repo diverges — and every subsequent CI run fails (see TASK-072 rationale, 2026-04-23 outage).

### Install (one-liner)

```bash
bash scripts/install-git-hooks.sh
```

This symlinks `.git/hooks/pre-push → scripts/pre-push-check.sh`. Sub-second on every push.

### Optional: local build gate

For extra safety, chain a local `npm run build` into the pre-push flow:

```bash
bash scripts/install-git-hooks.sh --with-build
```

Adds ~60 s to every push. Recommended for long-lived branches or before a release push. Bypass the slow build but keep the fast import guard with:

```bash
GONR_SKIP_BUILD_GATE=1 git push
```

### Bypass (emergencies only)

```bash
git push --no-verify
```

Skips **all** pre-push hooks. Only use when shipping a hotfix and the hook is failing for a reason you've already triaged. Any push that uses `--no-verify` should be followed by a pull request comment or vault note explaining why.

### Uninstall

```bash
bash scripts/install-git-hooks.sh --uninstall
```

## What the hooks catch

| Hook | Speed | Catches |
|---|---|---|
| `scripts/pre-push-check.sh` | <1 s | `@/`-aliased imports that point at files not tracked in `git ls-files`. Exactly the TASK-072 2026-04-23 bug class. |
| `scripts/pre-push-build.sh` | ~60 s | Anything `next build` would catch on CI: type errors, missing modules, ESLint failures, unresolved imports from any path. Optional. |

## Troubleshooting

- **Hook blocks a push but the file actually exists on disk.** That's the point — the file exists on *your* disk but isn't in `git ls-files`. Run `git status` to find the untracked file, `git add` it, and retry.
- **Hook takes longer than ~1 s.** Check the repo size / number of tracked files. The hook runs `git ls-files` once and greps the output; on very large repos this can be slow. Open an issue; the implementation can switch to a faster membership test.
- **CI still fails after the hook passes.** The hook catches the untracked-import class specifically. Real type errors, ESLint warnings, and other build failures need the `--with-build` gate or CI itself. Look at the Vercel build log.
