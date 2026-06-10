#!/bin/bash
# TASK-231 helper: print only length + short hash for local pulled eval secrets.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

for label in production preview development; do
  f=".vercel/.env.$label.local"
  if [ ! -f "$f" ]; then
    echo "$label missing-file"
    continue
  fi
  v=$(grep -m1 '^GONR_EVAL_SECRET=' "$f" | cut -d= -f2- | sed -e "s/^['\"]*//" -e "s/['\"]*\$//" | tr -d '\r\n' || true)
  if [ -z "$v" ]; then
    echo "$label missing-secret"
  else
    printf '%s len=%s sha12=%s\n' "$label" "${#v}" "$(printf %s "$v" | shasum -a 256 | cut -c1-12)"
  fi
done
