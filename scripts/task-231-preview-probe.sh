#!/bin/bash
# TASK-231 — live card-level leak probe against a preview deployment.
# Loads GONR_EVAL_SECRET from the vercel-pulled env files INTERNALLY and never
# prints it (or any header). Output is only: case, HTTP code, response source
# field, and forbidden-term hit count. Run: bash scripts/task-231-preview-probe.sh <preview-url>
set -euo pipefail

PREVIEW="${1:?usage: task-231-preview-probe.sh <preview-url>}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

SECRET=""
for f in "$DIR/.vercel/.env.production.local" "$DIR/.vercel/.env.preview.local" "$DIR/.vercel/.env.development.local"; do
  if [ -f "$f" ]; then
    v=$(grep -m1 '^GONR_EVAL_SECRET=' "$f" | cut -d= -f2- | sed -e "s/^['\"]*//" -e "s/['\"]*\$//" | tr -d '\r\n' || true)
    if [ -n "$v" ]; then SECRET="$v"; break; fi
  fi
done
if [ -z "$SECRET" ]; then echo "PROBE-ABORT: GONR_EVAL_SECRET not found in pulled env"; exit 2; fi

FORBIDDEN='neutrali[sz]e bleach with vinegar|NSD|POG|VDS|[Bb]on[Gg]o|[Ss]tree[Tt][Aa][Nn]|[Ff]ormula 209|[Bb]leaching [Gg]uide|acetic|amyl acetate|steam gun|[Jj]erry|house rules|hydrosul(ph|f)ite|titanium sulfate'

overall=0
probe() {
  local label="$1" body="$2"
  local resp code
  resp=$(curl -s -w '\n%{http_code}' -X POST "$PREVIEW/api/solve" \
    -H 'Content-Type: application/json' \
    -H "x-gonr-eval-secret: $SECRET" \
    -d "$body" --max-time 90)
  code=$(echo "$resp" | tail -1)
  local json
  json=$(echo "$resp" | sed '$d')
  local hits source
  hits=$(echo "$json" | grep -ocE "$FORBIDDEN" || true)
  source=$(echo "$json" | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin); print(d.get("source","?"))
except Exception: print("unparseable")')
  echo "CASE [$label]: http=$code source=$source forbidden_hits=$hits bytes=$(echo -n "$json" | wc -c | tr -d ' ')"
  if [ "$code" != "200" ]; then
    overall=1
    echo "  NON-200 RESPONSE: expected live card response"
    echo "$json" | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin)
  safe = {k: d.get(k) for k in ("error", "message", "requires_upgrade", "evalProbe") if k in d}
  if safe: print("  ERROR FIELDS:", safe)
except Exception:
  pass'
  fi
  if [ "$hits" != "0" ]; then
    overall=1
    echo "  LEAK MATCHES (term only, 40-char window):"
    echo "$json" | grep -oE ".{0,15}($FORBIDDEN).{0,15}" | head -5
  fi
}

probe "coffee/cotton (AI-or-library)" '{"stain":"coffee","surface":"cotton","evalViewerTier":"home"}'
probe "wine/silk (refusal path)"       '{"stain":"red wine","surface":"silk","evalViewerTier":"home"}'
probe "makeup/wool (AI path)"          '{"stain":"makeup","surface":"wool blazer","evalViewerTier":"home"}'
probe "peroxide-prone tannin (mustard/cotton)" '{"stain":"mustard","surface":"cotton","evalViewerTier":"home"}'
probe "unknown/mixed (fallback path)"  '{"stain":"mystery brown stain","surface":"rayon dress","evalViewerTier":"home"}'

if [ "$overall" = "0" ]; then echo "PROBE RESULT: PASS — 0 forbidden-term hits across all cases"; else echo "PROBE RESULT: FAIL — leaks above"; fi
exit $overall
