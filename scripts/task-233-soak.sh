#!/bin/bash
# TASK-233 — 100-run soak/stress harness against a preview deployment.
# Mixed matrix: clean solves, refusals, red cells, hazard question, browser-
# path intake runs, and malformed-body failure simulation. Measures
# time-to-first-guidance (TTFB — every consumer card carries firstAid in-body,
# and the client banner renders instantly, so first byte ≈ first guidance for
# the API lane). A DEAD END = non-200 without a structured JSON body, or a
# 200 with neither card nor structured error/disambiguation.
# Run: bash scripts/task-233-soak.sh <preview-url>
set -uo pipefail

PREVIEW="${1:?usage: task-233-soak.sh <preview-url>}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHA=$(cd "$DIR" && git rev-parse --short HEAD)
OUT="$DIR/artifacts/task-233/soak-$SHA.txt"
mkdir -p "$DIR/artifacts/task-233"

SECRET=""
for f in "$DIR/.vercel/.env.preview.local" "$DIR/.vercel/.env.production.local"; do
  [ -f "$f" ] && v=$(grep -m1 '^GONR_EVAL_SECRET=' "$f" | cut -d= -f2- | sed -e "s/^['\"]*//" -e "s/['\"]*\$//" | tr -d '\r\n') && [ -n "$v" ] && SECRET="$v" && break
done
[ -z "$SECRET" ] && { echo "SOAK-ABORT: no eval secret"; exit 2; }

BODIES=(
  '{"stain":"coffee","surface":"cotton","evalViewerTier":"home"}'
  '{"stain":"red wine","surface":"silk","evalViewerTier":"home"}'
  '{"stain":"grease","surface":"polyester pants","evalViewerTier":"home"}'
  '{"stain":"unknown stain, not sure what caused it","surface":"dress labeled dry-clean-only (fiber unknown)","evalViewerTier":"home"}'
  '{"stain":"red wine, dye bled onto my towel when I spot tested","surface":"cotton dress","evalViewerTier":"home"}'
  '{"stain":"mud, I already used hot water and the hair dryer on it","surface":"wool blazer","evalViewerTier":"home"}'
  '{"stain":"coffee stain, can I just use bleach?","surface":"cotton shirt","evalViewerTier":"home"}'
  '{"stain":"ink","surface":"suede jacket","evalViewerTier":"home"}'
  '{"stain":"blood","surface":"cotton","evalViewerTier":"home"}'
  '{"stain":"tomato sauce","surface":"rayon dress","evalViewerTier":"home"}'
)

dead=0; runs=0; lat=()
echo "TASK-233 soak — $(date) — $PREVIEW — HEAD $SHA" > "$OUT"

run_solve() {
  local body="$1" tag="$2"
  local out code ttfb total
  out=$(curl -s -o /tmp/soak-resp.json -w '%{http_code} %{time_starttransfer} %{time_total}' \
    -X POST "$PREVIEW/api/solve" -H 'Content-Type: application/json' \
    -H "x-gonr-eval-secret: $SECRET" -d "$body" --max-time 120)
  code=${out%% *}; rest=${out#* }; ttfb=${rest%% *}; total=${rest#* }
  local ok
  ok=$(python3 -c '
import json,sys
try:
    d = json.load(open("/tmp/soak-resp.json"))
except Exception:
    print("DEAD-unparseable"); sys.exit()
if d.get("card") or d.get("error") or d.get("disambiguation_prompt") or d.get("noVerifiedProtocol"):
    print("ok")
else:
    print("DEAD-empty")
')
  runs=$((runs+1)); lat+=("$ttfb")
  if [ "$code" != "200" ] && [ "$ok" = "DEAD-unparseable" ]; then dead=$((dead+1)); fi
  if [ "$ok" = "DEAD-empty" ]; then dead=$((dead+1)); fi
  echo "run=$runs tag=$tag code=$code ttfb=${ttfb}s total=${total}s body_check=$ok" >> "$OUT"
}

run_intake_malformed() {
  local out code
  out=$(curl -s -o /tmp/soak-resp.json -w '%{http_code}' -X POST "$PREVIEW/api/intake" \
    -H 'Content-Type: application/json' -d '{"transcript":"NOT-AN-ARRAY","proceed":12}' --max-time 90)
  code=$out
  local ok
  ok=$(python3 -c '
import json
try:
    d = json.load(open("/tmp/soak-resp.json"))
    print("ok-structured" if isinstance(d, dict) and d else "DEAD-empty")
except Exception:
    print("DEAD-unparseable")
')
  runs=$((runs+1))
  [ "$ok" != "ok-structured" ] && dead=$((dead+1))
  echo "run=$runs tag=intake-malformed code=$code body_check=$ok (structured failure = fail-closed, client renders first-aid fallback)" >> "$OUT"
}

# 90 solve runs (matrix x9) + 5 malformed-intake failure sims + 5 more solves = 100
for round in 1 2 3 4 5 6 7 8 9; do
  for body in "${BODIES[@]}"; do run_solve "$body" "round$round"; done
done
for i in 1 2 3 4 5; do run_intake_malformed; done
for body in "${BODIES[@]:0:5}"; do run_solve "$body" "final"; done

# p95 of solve TTFB
p95=$(printf '%s\n' "${lat[@]}" | sort -n | awk '{a[NR]=$1} END {print a[int(NR*0.95)]}')
{
  echo "----"
  echo "RUNS: $runs  DEAD_ENDS: $dead  p95_first_guidance: ${p95}s (threshold 8s)"
  if [ "$dead" -eq 0 ] && python3 -c "exit(0 if float('$p95') < 8 else 1)"; then
    echo "SOAK RESULT: PASS"
  else
    echo "SOAK RESULT: FAIL"
  fi
} | tee -a "$OUT"
grep -q 'SOAK RESULT: PASS' "$OUT"
