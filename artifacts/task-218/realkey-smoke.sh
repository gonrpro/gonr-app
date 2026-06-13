#!/usr/bin/env bash
# GONR frontier real-key intake smoke — TASK-218 / Atlas gate (2026-06-08)
# Boring + auditable. Run ONCE on the Mini:  ! bash ~/dev/gonr-app-task218-lab/artifacts/task-218/realkey-smoke.sh
# Rules honored: reads .env.local only at runtime; never echoes env names/values beyond "key present";
# binds 127.0.0.1; kills server + removes the temp env symlink on exit (trap); dumps JSON only. NO deploy.
set -uo pipefail

WT="/Users/tyler/dev/gonr-app-task218-lab"
SRC_ENV="/Users/tyler/dev/gonr-app/.env.local"
PORT=4557
BASE="http://127.0.0.1:${PORT}"
OUT_DIR="${WT}/artifacts/task-218/realkey-smoke"
# Server-to-server eval secret (TASK-033). Set in the server env AND sent as the
# x-gonr-eval-secret header so the intake→/api/solve verdict bypasses the anon
# paywall and proves the ENGINE card (with Do-Not-Do) for all 4 cases. Local only.
EVAL_SECRET="smoke-eval-$$"
LINKED=0
SERVER_PID=""

cleanup() {
  [ -n "${SERVER_PID}" ] && kill "${SERVER_PID}" 2>/dev/null
  # only remove the env.local we symlinked in; never touch a real file
  if [ "${LINKED}" = "1" ] && [ -L "${WT}/.env.local" ]; then rm -f "${WT}/.env.local"; fi
  echo "[smoke] cleaned up (server killed, temp env symlink removed)."
}
trap cleanup EXIT INT TERM

mkdir -p "${OUT_DIR}"
cd "${WT}" || { echo "[smoke] worktree missing"; exit 1; }

# --- inject the prod key from the LOCAL source only (symlink; Next auto-loads .env.local) ---
if [ ! -f "${SRC_ENV}" ]; then echo "[smoke] FAIL: ${SRC_ENV} not found"; exit 1; fi
if [ ! -e "${WT}/.env.local" ]; then ln -sf "${SRC_ENV}" "${WT}/.env.local"; LINKED=1; fi
if grep -q '^OPENAI_API_KEY=' "${SRC_ENV}"; then echo "[smoke] OPENAI key present: yes"; else echo "[smoke] FAIL: OPENAI_API_KEY not present in source env"; exit 1; fi

# --- start dev server (webpack; node_modules is a symlink so Turbopack is out), bound to localhost ---
echo "[smoke] starting next dev on ${BASE} (webpack) ..."
GONR_EVAL_SECRET="${EVAL_SECRET}" npx next dev --webpack -H 127.0.0.1 -p "${PORT}" >"${OUT_DIR}/server.log" 2>&1 &
SERVER_PID=$!

# --- wait until it answers (first compile can take a while) ---
ready=0
for i in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 5 "${BASE}/" ; then ready=1; break; fi
  sleep 2
done
if [ "${ready}" != "1" ]; then echo "[smoke] FAIL: server never became ready (see ${OUT_DIR}/server.log)"; exit 1; fi
echo "[smoke] server ready."

# --- the four Atlas gate cases ---
CASES=(
  "coffee on cotton shirt"
  "red wine on silk dress"
  "unknown brown stain on wool sweater"
  "grease on polyester pants, already used heat"
)

post_intake() { # $1=json body
  curl -s --max-time 90 -X POST "${BASE}/api/intake" \
    -H 'Content-Type: application/json' \
    -H "x-gonr-eval-secret: ${EVAL_SECRET}" \
    -d "$1"
}

SUMMARY="${OUT_DIR}/results.json"
echo "[" > "${SUMMARY}"
first=1
for CASE in "${CASES[@]}"; do
  echo "[smoke] --- case: ${CASE}"
  Q_BODY=$(python3 -c 'import json,sys; print(json.dumps({"transcript":[{"role":"user","text":sys.argv[1]}]}))' "${CASE}")
  Q_RESP=$(post_intake "${Q_BODY}")
  # proceed/skip turn to prove the verdict comes from /api/solve
  P_BODY=$(python3 -c 'import json,sys; print(json.dumps({"transcript":[{"role":"user","text":sys.argv[1]}],"proceed":True}))' "${CASE}")
  P_RESP=$(post_intake "${P_BODY}")

  REC=$(CASE="${CASE}" Q="${Q_RESP}" P="${P_RESP}" python3 - <<'PY'
import json, os
def load(s):
    try: return json.loads(s)
    except Exception: return {"_unparseable": (s or "")[:400]}
q = load(os.environ.get("Q","")); p = load(os.environ.get("P",""))
phase = q.get("phase")
model = q.get("model")
unavailable = phase == "unavailable" or q.get("reason","").startswith("intake_agent")
nq = q.get("nextQuestion") or {}
solve = p.get("solve") or {}
rec = {
  "case": os.environ.get("CASE"),
  "realKeyPath": bool(model) and not unavailable,        # real LLM answered (vs 503 fallback)
  "modelOrFallback": model if model else ("FALLBACK/unavailable" if unavailable else "unknown"),
  "phase": phase,
  "parsedFacts": q.get("parsedFacts") or q.get("read"),  # parsedFacts after patch; read pre-patch
  "questionAsked": nq.get("text"),
  "questionOptions": nq.get("options"),
  "suppressionsApplied": q.get("suppressions"),
  "riskFlags": q.get("riskFlags"),
  "failClosedReasons": q.get("failClosedReasons"),
  "read": q.get("read"),
  "proceed_phase": p.get("phase"),
  "solveSource": solve.get("source"),                    # /api/solve engine source enum (library|core|ai|hard-refuse|no-verified-protocol|...) — NEVER the intake LLM
  "solveTier": solve.get("tier"),
  "solveHttp": p.get("solveHttp"),
  "doNotDoCount": len(((solve.get("card") or {}).get("safetyMatrix") or {}).get("neverDo") or []) + len((solve.get("card") or {}).get("materialWarnings") or []),
}
print(json.dumps(rec, indent=2))
PY
)
  if [ "${first}" = "1" ]; then first=0; else echo "," >> "${SUMMARY}"; fi
  echo "${REC}" >> "${SUMMARY}"
done
echo "]" >> "${SUMMARY}"

echo "[smoke] ============ AUDIT SUMMARY ============"
echo "[smoke] NOTE: solveSource is /api/solve's OWN engine source enum (library|core|ai|hard-refuse|no-verified-protocol|library-safety-blocked|ai-unavailable). 'ai' = the engine's tier-4 AI card, safety-filtered by lib/safety/filter — it is NOT intake-LLM treatment text. The intake LLM emits a no-advice schema; the verdict is always /api/solve's card."
python3 -c '
import json
d=json.load(open("'"${SUMMARY}"'"))
allreal=all(c.get("realKeyPath") for c in d)
print("REAL-KEY PATH CONFIRMED:" , "YES (all cases)" if allreal else "NO — some cases hit fallback (see modelOrFallback)")
for c in d:
    print("\n• CASE:", c["case"])
    print("   real:", c["realKeyPath"], "| model:", c["modelOrFallback"], "| phase:", c["phase"])
    print("   parsedFacts:", json.dumps(c.get("parsedFacts")))
    print("   QUESTION:", c.get("questionAsked"))
    print("   options:", c.get("questionOptions"))
    print("   suppressions:", json.dumps(c.get("suppressionsApplied")))
    print("   riskFlags:", c.get("riskFlags"), "| failClosed:", c.get("failClosedReasons"))
    print("   verdict phase:", c.get("proceed_phase"), "| solve.source:", c.get("solveSource"), "| tier:", c.get("solveTier"), "| solveHttp:", c.get("solveHttp"), "| doNotDo items:", c.get("doNotDoCount"))
'
echo "[smoke] full JSON: ${SUMMARY}"
echo "[smoke] ======================================="
