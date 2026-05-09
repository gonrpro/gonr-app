#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v supabase >/dev/null 2>&1; then
  echo "⚠️  supabase CLI not installed; skipping migration drift check"
  exit 0
fi

if ! supabase projects list >/dev/null 2>&1; then
  echo "⚠️  supabase CLI is not authenticated; skipping migration drift check"
  exit 0
fi

output="$(supabase migration list 2>&1 || true)"
printf '%s\n' "$output"

# Supabase marks drift/missing rows in text output differently across CLI versions.
# Keep the matcher conservative: fail only when the CLI says a local migration is not remote/applied.
if printf '%s\n' "$output" | grep -Eiq '(local.*remote.*missing|remote.*local.*missing|not.*applied|Pending|Only local|Local only)'; then
  echo "❌ Supabase migration drift detected. Apply/repair migrations or document an intentional pending state before deploy."
  exit 1
fi

echo "✅ Supabase migration drift check completed"
