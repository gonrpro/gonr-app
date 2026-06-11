#!/bin/bash
# TASK-234 — metric-separated soak (supersedes task-233-soak.sh for gating).
# Reports FOUR latency metrics separately:
#   ui_first_guidance      — client first-aid banner; renders on submit before any
#                            network wait (TASK-232 acceptance <2s). Constant by
#                            construction; stated, not HTTP-measured.
#   deterministic_verdict  — p95 TTFB of deterministic answers (fast-path red
#                            cells, library/core, refusals, fallbacks). HARD gate: < 8s.
#   ai_tail                — p95 TTFB of ai-generated cards. REPORTED; threshold
#                            is Atlas's call (engine streaming/cache follow-up).
#   raw_overall            — p95 TTFB across everything (the TASK-233 number).
# PASS = 0 dead ends AND deterministic_verdict p95 < 8s.
# Run: bash scripts/task-234-soak.sh <preview-url>
set -uo pipefail

PREVIEW="${1:?usage: task-234-soak.sh <preview-url>}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHA=$(cd "$DIR" && git rev-parse --short HEAD)
OUT="$DIR/artifacts/task-234/soak-$SHA.txt"
mkdir -p "$DIR/artifacts/task-234"

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

dead=0; runs=0
det_lat=(); ai_lat=(); all_lat=()
echo "TASK-234 metric-separated soak — $(date) — $PREVIEW — HEAD $SHA" > "$OUT"

run_solve() {
  local body="$1" tag="$2"
  local out code ttfb total rest
  out=$(curl -s -o /tmp/soak234.json -w '%{http_code} %{time_starttransfer} %{time_total}' \
    -X POST "$PREVIEW/api/solve" -H 'Content-Type: application/json' \
    -H "x-gonr-eval-secret: $SECRET" -d "$body" --max-time 120)
  code=${out%% *}; rest=${out#* }; ttfb=${rest%% *}; total=${rest#* }
  local meta
  meta=$(python3 -c '
import json
try:
    d = json.load(open("/tmp/soak234.json"))
except Exception:
    print("DEAD unparseable"); raise SystemExit
src = d.get("source") or "?"
ok = bool(d.get("card") or d.get("error") or d.get("disambiguation_prompt") or d.get("noVerifiedProtocol"))
cat = "ai" if src == "ai" or src == "ai-generated" else "det"
sms = d.get("_serverMs", "?")
print(("ok" if ok else "DEAD") + f" {cat} src={src} serverMs={sms}")
')
  runs=$((runs+1)); all_lat+=("$ttfb")
  case "$meta" in
    DEAD*) dead=$((dead+1)) ;;
    "ok ai"*) ai_lat+=("$ttfb") ;;
    *) det_lat+=("$ttfb") ;;
  esac
  if [ "$code" != "200" ]; then dead=$((dead+1)); fi
  echo "run=$runs tag=$tag code=$code ttfb=${ttfb}s total=${total}s $meta" >> "$OUT"
}

for round in 1 2 3 4 5 6 7 8 9 10; do
  for body in "${BODIES[@]}"; do run_solve "$body" "round$round"; done
done

p95() { printf '%s\n' "$@" | sort -n | awk '{a[NR]=$1} END {if (NR==0) print "n/a"; else print a[int(NR*0.95)==0?1:int(NR*0.95)]}'; }
det_p95=$(p95 "${det_lat[@]:-}")
ai_p95=$(p95 "${ai_lat[@]:-}")
all_p95=$(p95 "${all_lat[@]:-}")
{
  echo "----"
  echo "RUNS: $runs  DEAD_ENDS: $dead"
  echo "ui_first_guidance: <2s by construction (client banner renders on submit pre-network; TASK-232 acceptance)"
  echo "deterministic_verdict_p95: ${det_p95}s over ${#det_lat[@]} runs (HARD gate < 8s)"
  echo "ai_tail_p95: ${ai_p95}s over ${#ai_lat[@]} runs (REPORTED — threshold is Atlas's call; engine streaming/cache follow-up)"
  echo "raw_overall_p95: ${all_p95}s over ${#all_lat[@]} runs"
  if [ "$dead" -eq 0 ] && python3 -c "exit(0 if float('$det_p95') < 8 else 1)" 2>/dev/null; then
    echo "SOAK RESULT: PASS (0 dead ends; deterministic verdict p95 under 8s)"
  else
    echo "SOAK RESULT: FAIL"
  fi
} | tee -a "$OUT"
grep -q 'SOAK RESULT: PASS' "$OUT"
