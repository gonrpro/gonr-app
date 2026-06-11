#!/bin/bash
# TASK-236 debug — fetch failing eval cards from a preview and print the text
# around suite-advisory pattern hits. No secrets printed.
set -uo pipefail
PREVIEW="${1:?usage: task236-probe-fails.sh <preview-url>}"
# Never send the eval secret to a non-GONR host (codex-review P2), and never
# load it from the production env file for a debug probe.
case "$PREVIEW" in
  https://gonr-*.vercel.app|https://gonr-*.vercel.app/) ;;
  *) echo "ABORT: preview URL must be a gonr-*.vercel.app deployment"; exit 2 ;;
esac
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SECRET=""
for f in "$DIR/.vercel/.env.preview.local"; do
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
[ -z "$SECRET" ] && { echo "ABORT: no eval secret"; exit 2; }

probe() {
  local id="$1" stain="$2" surface="$3"
  curl -s -X POST "$PREVIEW/api/solve" -H 'Content-Type: application/json' \
    -H "x-gonr-eval-secret: $SECRET" \
    -d "{\"stain\":\"$stain\",\"surface\":\"$surface\",\"evalViewerTier\":\"home\"}" \
    --max-time 120 > "/tmp/task236-$id.json"
  python3 - "$id" <<'PY'
import json, re, sys
id = sys.argv[1]
d = json.load(open(f"/tmp/task236-{id}.json"))
card = d.get("card") or {}
text = json.dumps({**card, "directAnswer": {**(card.get("directAnswer") or {}), "question": None}})
pats = {
  "repeat-until": r"\b(?:repeat|keep\s+(?:trying|going)|again\s+and\s+again|until\s+(?:it\s+)?(?:lifts|comes\s+out|is\s+gone))\b",
  "mix-combo": r"\b(?:mix(?:ing)?|combine)\b[^.;\n]{0,80}\b(?:products?|cleaners?|chemicals?|detergent|soap|vinegar|bleach|ammonia|peroxide|alcohol|solvent|acetone|cleaner|stain\s+remover|gel|spray|solution)\b",
  "prod-with-prod": r"\b(?:products?|detergent|soap|vinegar|bleach|ammonia|peroxide|alcohol|solvent|acetone|cleaner|solution)\b[^.;\n]{0,40}\b(?:with|and)\b[^.;\n]{0,40}\b(?:products?|detergent|soap|vinegar|bleach|ammonia|peroxide|alcohol|solvent|acetone|cleaner|solution)\b",
  "product-instr": r"[^.;!?\n]{0,60}\b(?:use|apply|try|add|dab|pour|soak|wash|rinse|flush|treat)\b[^.;!?\n]{0,40}\b(?:detergent|soap|cleaner|stain\s+remover|gel|spray|enzyme|alcohol|vinegar|peroxide)\b[^.;!?\n]{0,30}",
}
print(f"=== {id} source={card.get('source')}")
for name, p in pats.items():
    for m in re.finditer(p, text, re.I):
        s = max(0, m.start()-60)
        print(f"  [{name}] …{text[s:m.end()+40]}…")
PY
}

probe EV-001 "red wine" "white cotton shirt, fresh, label machine-wash"
probe EV-010 "ink" "cotton tee, low value"
probe EV-062 "grease, traveling, only napkins and water" "shirt"
