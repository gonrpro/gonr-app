# data/core/ — Verified Protocol Database

Gold-standard protocol cards. These are loaded at runtime by `lib/protocols/lookup.ts` and served as Tier 1-3 results.

## Protocol Sources

| Source | Badge | Where |
|--------|-------|-------|
| **Core** | ✅ Master Protocol (gold) | `data/core/*.json` — hand-authored or promoted from cache |
| **Verified** | ✅ Verified (green) | `pending_protocols` table — AI-generated, Tyler-reviewed |
| **AI Cached** | 🔄 AI Generated (gray) | `pending_protocols` table — AI-generated, not yet reviewed |
| **AI Fresh** | 🔄 AI Generated (purple) | Real-time AI generation — not yet cached |

## How to Promote a Verified Card to Core

### From Mission Control (recommended)

1. Open Mission Control → Protocols
2. Find the card (sort by "Most Traffic" to prioritize)
3. Click **Promote** — downloads the card as `{stain}-{surface}.json`
4. Drop the JSON file into `data/core/`
5. Commit and deploy

### Manual Promotion

1. Query the card from Supabase:
   ```sql
   select card from pending_protocols where cache_key = 'coffee::marble countertop';
   ```
2. Save the `card` JSONB value as `data/core/{stain}-{surface}.json`
3. Verify the JSON matches the ProtocolCard schema
4. Add/confirm `"source": "verified"` in the JSON
5. Commit to repo

## File Naming Convention

- **Preferred (v6):** `{stain-slug}+{surface-slug}.json` → `coffee+marble-countertop.json`
- **Legacy:** `{stain}-{surface}.json` → `coffee-marble-countertop.json`
- Both formats are supported by the lookup engine

## Quality Checklist Before Promoting

- [ ] Chemistry is correct (stainChemistry, whyThisWorks)
- [ ] Steps are safe for the specified surface
- [ ] No safety matrix violations
- [ ] Products are real and have correct names
- [ ] Difficulty rating is reasonable
- [ ] Customer explanation is clear and accurate
- [ ] Escalation guidance is appropriate

## Cache Key Format

Normalized: `stain.toLowerCase().trim() + "::" + surface.toLowerCase().trim()`

Examples:
- `blood::cotton`
- `red wine::silk`
- `coffee::marble countertop`

This ensures "Blood on Cotton" and "blood on cotton" hit the same cache entry.
