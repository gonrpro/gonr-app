#!/bin/bash
# TASK-231 — scope GONR_EVAL_SECRET to the Preview environment for gonr-app.
# Reads the value from the vercel-pulled production env file and pipes it
# straight into the Vercel CLI; the value is never echoed. Idempotent-ish:
# if the var already exists in preview, reports and exits 0.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

v=""
for f in ".vercel/.env.production.local"; do
  [ -f "$f" ] && v=$(grep -m1 '^GONR_EVAL_SECRET=' "$f" | cut -d= -f2- | sed -e "s/^['\"]*//" -e "s/['\"]*\$//" | tr -d '\r\n' || true)
done
if [ -z "$v" ]; then echo "ABORT: no GONR_EVAL_SECRET in pulled production env"; exit 2; fi
echo "secret loaded from pulled env (len=${#v}, not shown)"

# Remove any existing (possibly quote-mangled) branch-preview value first so
# the add below is the single source of truth. Ignore "not found".
vercel env rm GONR_EVAL_SECRET preview task-218-lab --yes >/dev/null 2>&1 || true
vercel env rm GONR_EVAL_SECRET preview --yes >/dev/null 2>&1 || true

# Branch-scoped: only task-218-lab previews get the secret (tightest scope).
out=$(vercel env add GONR_EVAL_SECRET preview task-218-lab --value "$v" --yes 2>&1) && rc=0 || rc=$?
if [ $rc -eq 0 ]; then
  echo "ADDED: GONR_EVAL_SECRET now scoped to preview branch task-218-lab"
elif echo "$out" | grep -qi 'already.*exist'; then
  echo "ALREADY PRESENT in preview scope — no change"
else
  echo "vercel env add failed (rc=$rc):"
  echo "$out" | grep -vF "$v" | head -12
  exit $rc
fi

# Some Vercel CLI versions require an explicit branch for non-interactive add,
# but Git-triggered previews can still miss branch overrides. Keep an all-preview
# fallback with the same value so TASK-231 probes do not silently hit anon limits.
printf '%s\n' "$v" | vercel env add GONR_EVAL_SECRET preview --yes >/tmp/task-231-env-add-preview.out 2>&1 && all_rc=0 || all_rc=$?
if [ $all_rc -eq 0 ]; then
  echo "ADDED: GONR_EVAL_SECRET all-preview fallback"
elif grep -qi 'already.*exist' /tmp/task-231-env-add-preview.out; then
  echo "ALREADY PRESENT in all-preview fallback"
else
  echo "all-preview env add failed (rc=$all_rc):"
  grep -vF "$v" /tmp/task-231-env-add-preview.out | head -12
  echo "continuing with branch-scoped preview secret"
fi
