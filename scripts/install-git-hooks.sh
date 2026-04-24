#!/usr/bin/env bash
# TASK-072 — install the GONR git hooks in this clone.
#
# Wires scripts/pre-push-check.sh → .git/hooks/pre-push as a symlink so the
# untracked-import guard fires on every `git push`. Idempotent — safe to run
# on a clone that already has hooks installed.
#
# Optional: with --with-build, also chain scripts/pre-push-build.sh after
# the import guard so `npm run build` runs locally before the push lands.
# That's a slower gate (~60s) and opt-in; the import guard is the minimum.
#
# Usage:
#   bash scripts/install-git-hooks.sh             # import guard only (default)
#   bash scripts/install-git-hooks.sh --with-build  # import guard + local build
#   bash scripts/install-git-hooks.sh --uninstall   # remove hooks

set -euo pipefail

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || { echo "not a git repo"; exit 1; })
cd "$GIT_ROOT"

HOOKS_DIR=".git/hooks"
PRE_PUSH="$HOOKS_DIR/pre-push"
mkdir -p "$HOOKS_DIR"

case "${1:-}" in
  --uninstall)
    if [ -L "$PRE_PUSH" ] || [ -f "$PRE_PUSH" ]; then
      rm -f "$PRE_PUSH"
      echo "removed $PRE_PUSH"
    else
      echo "no pre-push hook to remove"
    fi
    exit 0
    ;;
  --with-build)
    MODE="with-build"
    ;;
  "" | --import-guard-only)
    MODE="import-guard-only"
    ;;
  *)
    echo "usage: $0 [--with-build | --import-guard-only | --uninstall]"
    exit 1
    ;;
esac

# Replace any existing pre-push hook with our managed one.
if [ -e "$PRE_PUSH" ] || [ -L "$PRE_PUSH" ]; then
  rm -f "$PRE_PUSH"
fi

if [ "$MODE" = "import-guard-only" ]; then
  # Simple symlink — fastest, minimal wiring.
  ln -sf "../../scripts/pre-push-check.sh" "$PRE_PUSH"
  chmod +x scripts/pre-push-check.sh
  echo "installed $PRE_PUSH → scripts/pre-push-check.sh"
  echo "(import guard only; add --with-build to also run npm run build before pushes)"
else
  # Chain both: import guard first (fast, mandatory), then build gate (slow, opt-in).
  cat > "$PRE_PUSH" <<'HOOK'
#!/usr/bin/env bash
# GONR pre-push — managed by scripts/install-git-hooks.sh. Edit the install
# script, not this file; re-run the installer to regenerate.
set -euo pipefail
GIT_ROOT=$(git rev-parse --show-toplevel)
# Forward stdin (ref/sha lines from git) to the import guard.
"$GIT_ROOT/scripts/pre-push-check.sh"
# Advisory build gate — bypass with GONR_SKIP_BUILD_GATE=1
"$GIT_ROOT/scripts/pre-push-build.sh"
HOOK
  chmod +x "$PRE_PUSH"
  chmod +x scripts/pre-push-check.sh scripts/pre-push-build.sh
  echo "installed $PRE_PUSH → chains pre-push-check.sh + pre-push-build.sh"
fi
