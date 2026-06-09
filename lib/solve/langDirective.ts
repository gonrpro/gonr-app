// lib/solve/langDirective.ts — TASK-218 (Tyler 2026-06-09)
//
// ES→AI-tier output language directive for the AI fallback generator.
//
// When a non-English request reaches the AI tier (the curated card library is
// English-only, so decide() routes non-English requests here), the model must
// answer IN that language. We generate Spanish PROSE but force the chemical/
// agent NAMES to stay in English standard form.
//
// That carve-out is a SAFETY requirement, not a style choice: the deterministic
// runSafetyFilter keys its banned-agent detection on English chemical names in
// the `agent`/`instruction` fields. Translating "Ammonia" → "amoníaco" would
// slip a banned-agent-on-tannin past the filter — a silent safety regression.
// Context detection (isTannin/isSilk/isProtein) already runs off the canonical
// English stain/surface, so it is unaffected by Spanish prose.
//
// Durable fix (flagged to SB): localized library cards + Spanish chemical
// synonyms in the filter keyword set. Until then, English agent names keep the
// suspenders intact while users get Spanish guidance.

export function langOutputDirective(lang: string | undefined): string {
  const code = (lang ?? 'en').toLowerCase()
  if (code === 'es') {
    return `

## OUTPUT LANGUAGE: SPANISH (es) — MANDATORY
Write ALL user-facing prose in natural, fluent Spanish (usted form): the "title", every step "instruction", "technique", "temperature", and "dwellTime", "stainChemistry", "whyThisWorks", every "homeSolutions" entry, every "materialWarnings" entry, the "escalation" text ("when"/"whatToTell"/"specialistType"), and each product "use" and "note". Do not leave any user-facing sentence in English.

SAFETY EXCEPTION — these stay in English (required for downstream safety verification):
- In every spottingProtocol step's "agent" field, keep the chemical/tool name in standard English form (e.g. "Ammonia", "Chlorine Bleach", "Acetone", "Hydrogen Peroxide", "Enzyme Detergent", "White Vinegar", "Cold Water"). You MAY append the Spanish term in parentheses, e.g. "Ammonia (amoníaco)". NEVER translate the agent name itself.
- Keep all JSON keys exactly as specified.
- Keep these enum/structural values in English: "stainFamily", "source", and everything under "meta".`
  }
  // English (or any language not yet wired) — no directive, behavior unchanged.
  return ''
}
