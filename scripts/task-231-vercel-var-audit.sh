#!/bin/bash
# TASK-231 helper: list Vercel metadata for the eval-secret variable only.
set -euo pipefail
vercel env ls 2>&1 | grep -E '(^|[[:space:]])GONR_EVAL_SECRET([[:space:]]|$)|Environment Variables' | sed -E 's/[[:space:]]+/ /g' | head -40
