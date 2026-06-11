#!/bin/bash
# TASK-240 — measure the staged NDJSON response: time-to-stage1 (deterministic
# guidance) vs time-to-final (full gated card) on the consumer AI path.
set -uo pipefail
PREVIEW="${1:?usage: task240-staged-probe.sh <preview-url>}"
case "$PREVIEW" in
  https://gonr-*.vercel.app) ;;
  *) echo "ABORT: preview URL must be a gonr-*.vercel.app deployment"; exit 2 ;;
esac
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SECRET=""
f="$DIR/.vercel/.env.preview.local"
[ -f "$f" ] && SECRET=$(python3 - "$f" <<'PY'
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
[ -z "$SECRET" ] && { echo "ABORT: no eval secret"; exit 2; }

# NOTE: staged mode is DISABLED for eval traffic by design. To probe staging we
# must hit the anon path (no eval header) — use a one-off stain so we don't
# pollute anyone's session, and accept the anon credit consumption (preview DB).
probe() {
  local label="$1" body="$2" hdr=()
  python3 - "$PREVIEW" "$body" <<'PY'
import json, sys, time, urllib.request
url, body = sys.argv[1] + "/api/solve", sys.argv[2]
req = urllib.request.Request(url, data=body.encode(), headers={"Content-Type": "application/json"})
t0 = time.time()
with urllib.request.urlopen(req, timeout=120) as resp:
    ctype = resp.headers.get("Content-Type", "")
    if "x-ndjson" not in ctype:
        data = resp.read()
        print(f"  classic JSON ({ctype.split(';')[0]}): total={time.time()-t0:.3f}s source={json.loads(data).get('source')}")
    else:
        buf = b""
        stages = []
        while True:
            chunk = resp.read(1)
            if not chunk:
                break
            buf += chunk
            if chunk == b"\n":
                line = buf.decode().strip(); buf = b""
                if not line: continue
                obj = json.loads(line)
                stages.append((obj.get("_stage"), time.time()-t0, obj.get("source"), bool(obj.get("firstAid")), bool(obj.get("directAnswer"))))
        for st, t, src, fa, da in stages:
            print(f"  stage={st}: t={t:.3f}s source={src} firstAid={fa} directAnswer={da}")
PY
}

echo "== staged anon AI-path (ketchup/polyester):"
for i in 1 2; do
  echo " run $i:"
  probe ai '{"stain":"ketchup","surface":"polyester kid shirt","staged":true}'
done
echo "== staged anon with hazard question (bleach on white cotton):"
probe dq '{"stain":"coffee, can I use bleach?","surface":"white cotton shirt, machine-wash label","staged":true}'
echo "== eval lane still classic JSON even with staged:true:"
curl -s -X POST "$PREVIEW/api/solve" -H 'Content-Type: application/json' -H "x-gonr-eval-secret: $SECRET" \
  -d '{"stain":"ketchup","surface":"polyester kid shirt","staged":true,"evalViewerTier":"home"}' \
  -o /tmp/task240-evalcheck.json -w "  http=%{http_code} ctype=%{content_type} total=%{time_total}s\n" --max-time 120
python3 -c "import json; d=json.load(open('/tmp/task240-evalcheck.json')); print('  parsed as single JSON ok, source=', d.get('source'))"
echo "== fast path unaffected (red cell, staged requested — deterministic return wins):"
curl -s -X POST "$PREVIEW/api/solve" -H 'Content-Type: application/json' \
  -d '{"stain":"unknown stain, not sure what it is","surface":"dry-clean-only suit","staged":true}' \
  -o /tmp/task240-fastcheck.json -w "  http=%{http_code} ctype=%{content_type} total=%{time_total}s\n" --max-time 120
python3 -c "import json; d=json.load(open('/tmp/task240-fastcheck.json')); print('  single JSON, source=', d.get('source'), 'fastPath=', d.get('_fastPath'))"
