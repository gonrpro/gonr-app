#!/usr/bin/env bash
# TASK-072 pre-push guard — scans TypeScript files in the push payload for
# `@/` alias imports, confirms every target resolves to a file tracked in
# git, and fails the push with a clear report if any don't.
#
# Install:
#   ln -sf ../../scripts/pre-push-check.sh .git/hooks/pre-push
#   chmod +x scripts/pre-push-check.sh
#
# Bypass (use sparingly):
#   git push --no-verify
#
# Why this exists:
#   2026-04-23 — four `lib/auth/viewerTier.ts` / `components/ui/PreviewBanner.tsx`
#   style files existed locally but were never `git add`'d. Every
#   commit that imported them built clean on Lab's Mac (file exists on
#   disk) but failed on every GitHub Actions + Vercel deploy (CI pulls
#   git state only). Manual `vercel --prod` bundled the local working
#   tree including untracked files, so prod + repo drifted silently.
#   This hook catches that class of bug before the push lands.

set -euo pipefail

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$GIT_ROOT"

# Read pre-push stdin: `<local ref> <local sha> <remote ref> <remote sha>` per ref.
# If no stdin (called directly), scan the current HEAD commit as a smoke test.
COMMITS=""
if [ -t 0 ]; then
  # Direct invocation — scan HEAD only
  COMMITS="HEAD"
else
  while IFS=' ' read -r local_ref local_sha remote_ref remote_sha; do
    if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
      continue  # branch delete, nothing to check
    fi
    if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
      # New branch — scan everything not on the default remote branch yet
      BASE=$(git merge-base "$local_sha" origin/main 2>/dev/null || echo "")
      if [ -n "$BASE" ]; then
        COMMITS="$COMMITS $BASE..$local_sha"
      else
        COMMITS="$COMMITS $local_sha"
      fi
    else
      COMMITS="$COMMITS $remote_sha..$local_sha"
    fi
  done
fi

if [ -z "$COMMITS" ]; then
  exit 0
fi

# Collect all .ts/.tsx files touched in the push payload
CHANGED=$(git diff --name-only $COMMITS 2>/dev/null | grep -E '\.(ts|tsx)$' | sort -u || true)

if [ -z "$CHANGED" ]; then
  exit 0
fi

# Build the set of git-tracked files once — used as the "is this file in the repo?" membership test
TRACKED=$(git ls-files)

VIOLATIONS=""
for file in $CHANGED; do
  [ -f "$file" ] || continue
  # Extract `@/<path>` imports from this file. Handles: import ... from '@/path'
  # and dynamic import('@/path'). Strip quotes + trailing whitespace.
  IMPORTS=$(grep -oE "['\"]@/[^'\"]+['\"]" "$file" 2>/dev/null | tr -d "'\"" || true)
  for imp in $IMPORTS; do
    # @/foo/bar -> candidate paths: foo/bar.ts, foo/bar.tsx, foo/bar/index.ts, foo/bar/index.tsx, foo/bar.js, foo/bar.jsx, foo/bar.json
    rel="${imp#@/}"
    found=0
    for ext in "" ".ts" ".tsx" ".js" ".jsx" ".json" "/index.ts" "/index.tsx" "/index.js"; do
      candidate="${rel}${ext}"
      if echo "$TRACKED" | grep -qxF "$candidate"; then
        found=1
        break
      fi
    done
    if [ "$found" -eq 0 ]; then
      VIOLATIONS+=$'\n  '"$file imports @/$rel — not tracked in git"
    fi
  done
done

if [ -n "$VIOLATIONS" ]; then
  echo ""
  echo "❌ pre-push-check: untracked import targets detected"
  echo "$VIOLATIONS"
  echo ""
  echo "These files exist on your disk but aren't in the repo, so CI and Vercel will fail."
  echo "Run: git status  — to see what's untracked."
  echo "Fix: git add <missing-file> and amend/include in this push."
  echo "Bypass (last resort): git push --no-verify"
  echo ""
  exit 1
fi

exit 0
