#!/usr/bin/env bash
# TASK-144 — Build operator-week summary Markdown from Supabase.
#
# Usage:
#   bash build-week-summary.sh <plant_id> [<week-start-YYYY-MM-DD>]
#
# Outputs:
#   ~/lab/output/operator-week-<plant_id>-<week>/summary.md
#
# Tyler/Val can run this from the Mac Mini terminal without engineer help.
# Reads via PostgREST using the Supabase service-role key. Never logs the key.

set -euo pipefail

PLANT_ID="${1:-}"
WEEK_START_INPUT="${2:-}"

if [[ -z "$PLANT_ID" ]]; then
  echo "Usage: build-week-summary.sh <plant_id> [<week-start-YYYY-MM-DD>]" >&2
  exit 1
fi

CREDS_FILE="$HOME/.openclaw/credentials/supabase"
if [[ ! -f "$CREDS_FILE" ]]; then
  echo "Missing Supabase credentials at $CREDS_FILE" >&2
  exit 2
fi

# shellcheck disable=SC1090
source "$CREDS_FILE"

: "${SUPABASE_URL:?SUPABASE_URL not set}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_KEY:-}}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY not set}"

# Compute week window (Monday → Sunday, ET).
if [[ -n "$WEEK_START_INPUT" ]]; then
  WEEK_START="$WEEK_START_INPUT"
else
  WEEK_START=$(date -v-mon '+%Y-%m-%d' 2>/dev/null || date -d 'last monday' '+%Y-%m-%d')
fi
WEEK_END=$(date -v+6d -j -f '%Y-%m-%d' "$WEEK_START" '+%Y-%m-%d' 2>/dev/null || date -d "$WEEK_START + 6 days" '+%Y-%m-%d')

OUT_DIR="$HOME/lab/output/operator-week-${PLANT_ID}-${WEEK_START}"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/summary.md"
TMP=$(mktemp)

echo "Fetching feedback for plant ${PLANT_ID} between ${WEEK_START} and ${WEEK_END}…" >&2

curl -sS "${SUPABASE_URL}/rest/v1/operator_feedback?plant_id=eq.${PLANT_ID}&created_at=gte.${WEEK_START}T00:00:00Z&created_at=lte.${WEEK_END}T23:59:59Z&order=created_at.asc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  > "$TMP"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required (brew install jq)" >&2
  exit 3
fi

TOTAL=$(jq 'length' "$TMP")
DISMISSED=$(jq '[.[] | select(.dismissed == true)] | length' "$TMP")
SUBMITTED=$(( TOTAL - DISMISSED ))

count_field() {
  local field=$1 value=$2
  jq -r --arg f "$field" --arg v "$value" '[.[] | select(.dismissed != true) | .[$f] // empty | select(. == $v)] | length' "$TMP"
}

f6_yes=$(count_field would_use_real_garment yes)
f6_no=$(count_field would_use_real_garment no)

{
cat <<HDR
---
plant_id: ${PLANT_ID}
week_start: ${WEEK_START}
week_end: ${WEEK_END}
generated: $(date '+%Y-%m-%d %H:%M ET')
---

# Operator-Week Summary — ${WEEK_START} to ${WEEK_END}
**Plant:** \`${PLANT_ID}\`
**Total interactions captured:** ${TOTAL} (submitted: ${SUBMITTED}, dismissed: ${DISMISSED})

## F6 — Headline PMF signal: would-use-on-real-garment

| Answer | Count |
|---|---|
| Yes | ${f6_yes} |
| No  | ${f6_no} |

## F1 — Recommendation clarity
HDR

for v in clear partly_clear not_clear wrong; do
  c=$(count_field recommendation_clarity "$v")
  echo "- **${v}**: ${c}"
done

cat <<F2

## F2 — Material/risk match
F2
for v in matched partly_matched didnt_match missing_when_needed; do
  c=$(count_field material_risk_match "$v")
  echo "- **${v}**: ${c}"
done

cat <<F3

## F3 — Stop/escalate clarity
F3
for v in clear unclear missing; do
  c=$(count_field stop_escalate_clarity "$v")
  echo "- **${v}**: ${c}"
done

cat <<F4

## F4 — Provenance clarity
F4
for v in clear partly_clear not_clear didnt_notice; do
  c=$(count_field provenance_clarity "$v")
  echo "- **${v}**: ${c}"
done

cat <<F5

## F5 — Chemistry/agent clarity
F5
for v in clear partly_clear not_clear looked_up; do
  c=$(count_field chemistry_clarity "$v")
  echo "- **${v}**: ${c}"
done

cat <<NOTES

## Operator notes (verbatim)
NOTES

jq -r '
  .[] | select(.dismissed != true)
  | (
      ([.recommendation_note, .material_risk_note, .stop_escalate_note, .provenance_note, .chemistry_note, .would_use_note]
       | map(select(. != null and . != ""))
       | join(" / "))
      as $notes
      | select($notes != "")
      | "- _" + (.created_at // "") + "_ "
        + (if .protocol_id then "(`" + .protocol_id + "`) " else "" end)
        + $notes
    )
' "$TMP"

cat <<TRAILER

## Atlas review notes
<!-- Atlas: fill this section after reviewing the feedback rate, F6 signal, and notes. -->

## Stain Brain safety/provenance read
<!-- SB: review F2/F3/F4 for any safety-language or provenance gaps surfaced by this operator's week. -->

## Tyler decision items
<!-- Tyler: any product/launch/legal decisions this week's data should drive. -->
TRAILER
} > "$OUT"

rm -f "$TMP"

echo "Wrote: $OUT" >&2
echo "$OUT"
