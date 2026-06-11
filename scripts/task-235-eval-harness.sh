#!/bin/bash
# TASK-235 — encyclopedia eval harness: run the 104 EV cases (+ adversarial
# probes) against a preview /api/solve via the eval lane and assess each
# response with the repo's own validators (scripts/evals/assess-case.ts).
# Usage: bash scripts/task-235-eval-harness.sh <preview-url> [--cases EV-001,EV-002] [--limit N]
set -uo pipefail

PREVIEW="${1:?usage: task-235-eval-harness.sh <preview-url> [--cases ids] [--limit N]}"
shift || true
CASES_FILTER=""
LIMIT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --cases) CASES_FILTER="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHA=$(cd "$DIR" && git rev-parse --short HEAD)
OUT="$DIR/artifacts/task-235/run-$SHA.txt"
mkdir -p "$DIR/artifacts/task-235"

SECRET=""
for f in "$DIR/.vercel/.env.preview.local" "$DIR/.vercel/.env.production.local"; do
  [ -f "$f" ] || continue
  v=$(python3 - "$f" <<'PY' || true
import sys
for line in open(sys.argv[1], encoding="utf-8"):
    if not line.startswith("GONR_EVAL_SECRET="):
        continue
    value = line.split("=", 1)[1].strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
        value = value[1:-1]
    print(value, end="")
    break
PY
)
  [ -n "$v" ] && SECRET="$v" && break
done
[ -z "$SECRET" ] && { echo "HARNESS-ABORT: no eval secret"; exit 2; }

echo "TASK-235 eval harness — $(date) — $PREVIEW — HEAD $SHA" > "$OUT"

pass=0; fail=0; skip=0; ran=0
declare -a fail_ids=()

run_case() {
  local case_json="$1"
  local id body
  id=$(echo "$case_json" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
  if [ -n "$CASES_FILTER" ] && ! echo ",$CASES_FILTER," | grep -q ",$id,"; then return; fi
  body=$(echo "$case_json" | python3 -c 'import sys,json; c=json.load(sys.stdin); b=c["body"]; b["evalViewerTier"]="home"; print(json.dumps(b))')
  local code
  code=$(curl -s -o /tmp/ev-resp.json -w '%{http_code}' -X POST "$PREVIEW/api/solve" \
    -H 'Content-Type: application/json' -H "x-gonr-eval-secret: $SECRET" \
    -d "$body" --max-time 120)
  local verdict
  if [ "$code" != "200" ]; then
    verdict="{\"id\":\"$id\",\"verdict\":\"FAIL\",\"reasons\":[\"http-$code\"]}"
  else
    verdict=$(EV_CASE="$case_json" npx --no-install tsx "$DIR/scripts/evals/assess-case.ts" < /tmp/ev-resp.json 2>/dev/null || echo "{\"id\":\"$id\",\"verdict\":\"FAIL\",\"reasons\":[\"assessor-error\"]}")
  fi
  ran=$((ran+1))
  echo "$verdict" >> "$OUT"
  case "$verdict" in
    *'"PASS"'*) pass=$((pass+1)) ;;
    *'"SKIP"'*) skip=$((skip+1)) ;;
    *) fail=$((fail+1)); fail_ids+=("$id") ;;
  esac
  echo "[$ran] $id $(echo "$verdict" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["verdict"], ";".join(d.get("reasons",[]))[:90])')"
  if [ "$LIMIT" -gt 0 ] && [ "$ran" -ge "$LIMIT" ]; then return 1; fi
  return 0
}

while IFS= read -r case_json; do
  run_case "$case_json" || break
done < <(python3 -c '
import json
d = json.load(open("'"$DIR"'/scripts/evals/ev-cases.json"))
for c in d["cases"] + d["adversarial"]:
    c.setdefault("expectedRisk", "red")          # adversarial probes: strictest ceiling
    c.setdefault("expectedBudget", 1)
    c.setdefault("forbiddenLexical", ["bleach", "acetone", "solvent"])
    c.setdefault("needsDirectAnswer", False)
    print(json.dumps(c))
')

{
  echo "----"
  echo "RAN: $ran  PASS: $pass  FAIL: $fail  SKIP: $skip"
  [ ${#fail_ids[@]} -gt 0 ] && echo "FAILED CASES: ${fail_ids[*]}"
  echo "Red-tier requirement: every EV red case must PASS (gate for releases)."
} | tee -a "$OUT"
echo "artifact: $OUT"
if [ "$ran" -eq 0 ]; then
  echo "HARNESS-ABORT: no cases ran; check --cases/--limit filters" | tee -a "$OUT"
  exit 3
fi
[ "$fail" -eq 0 ]
