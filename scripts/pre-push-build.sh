#!/usr/bin/env bash
# TASK-072 — optional local build gate, advisory.
#
# Runs `npm run build` locally before a push so CI/Vercel aren't the first
# thing that discovers a type error, a missing import, or an ESLint failure
# that would fail the build. Pairs with pre-push-check.sh, which catches the
# specific untracked-import class of bug even before this runs.
#
# This hook is EXPLICITLY advisory — by default it's NOT wired to
# .git/hooks/pre-push. Lab ops / CONTRIBUTING.md docs describe how to opt
# in. Rationale: a full `next build` takes ~60s and blocks every push, so
# we don't impose it on everyone by default. Pre-push-check stays on as
# the mandatory fast guard; this script is the optional slow guard.
#
# Install (as a supplementary pre-push step):
#   .git/hooks/pre-push can chain: first pre-push-check.sh, then this.
#   See scripts/install-git-hooks.sh --with-build for the wiring.
#
# Bypass:
#   git push --no-verify  (skips ALL pre-push hooks including pre-push-check.sh)
#   GONR_SKIP_BUILD_GATE=1 git push  (skips this script only, keeps the import guard)

set -euo pipefail

if [ "${GONR_SKIP_BUILD_GATE:-0}" = "1" ]; then
  echo "pre-push-build: GONR_SKIP_BUILD_GATE=1 — skipping local build"
  exit 0
fi

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$GIT_ROOT"

start=$(date +%s)
echo "pre-push-build: running 'npm run build' locally…"

# Build with CI-like env. NEXT_TELEMETRY_DISABLED keeps the output clean.
# CI=true is what GitHub Actions + Vercel set; matches their lint strictness.
if ! CI=true NEXT_TELEMETRY_DISABLED=1 npm run build >/tmp/gonr-prepush-build.log 2>&1; then
  echo ""
  echo "❌ pre-push-build: npm run build failed"
  echo ""
  tail -40 /tmp/gonr-prepush-build.log
  echo ""
  echo "Full log: /tmp/gonr-prepush-build.log"
  echo "Fix the build, or bypass this gate with:"
  echo "  GONR_SKIP_BUILD_GATE=1 git push    (runs the import guard but skips the slow build)"
  echo "  git push --no-verify               (skips ALL pre-push hooks — emergencies only)"
  exit 1
fi

end=$(date +%s)
echo "pre-push-build: build passed in $((end - start))s"
exit 0
