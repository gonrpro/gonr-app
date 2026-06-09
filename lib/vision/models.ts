// lib/vision/models.ts
// Centralized OpenAI vision model configuration.
// One place to swap a model id.
//
// VERIFY FIRST (BUILD-SPEC + FRONTIER-SWARM-SPEC): a code comment is NOT proof these
// ids resolve in the DEPLOYED environment. The agentic intake (/api/intake) fails
// closed to 503 when OPENAI_API_KEY is missing/placeholder OR these ids 404, and the
// client then silently degrades to the deterministic form path — invisibly. So the
// authoritative check is the DEPLOY-TIME live probe, not this comment:
//   npm run frontier:probe -- https://<deployment>.vercel.app
// (asserts /api/intake returns phase 'question'|'verdict', not 503/'unavailable').
// Run it against any preview/prod URL BEFORE claiming the frontier flow ships.
//
// VISION ARCHITECTURE (Atlas-locked 2026-06-08):
//   - Primary photo-reading model: gpt-5.2 (Responses API, image detail high)
//   - Cheap first pass / retries:  gpt-5-mini
//   - Last confirmed via GET /v1/models on 2026-06-08: gpt-5.2, gpt-5-mini, gpt-4.1
//     all resolved 200 — but treat the live probe above as the source of truth.
//   - If an id ever stops resolving, change it HERE — every caller reads these
//     constants, so it is a one-line swap. NEVER silently downgrade elsewhere.

/** Authoritative photo-reading model for the 3-image scan packet. */
export const VISION_PRIMARY_MODEL = 'gpt-5.2' as const

/** Cheap triage / retry model for the scan packet. */
export const VISION_CHEAP_MODEL = 'gpt-5-mini' as const

/** Legacy single-image vision model (chat-completions path: identifyStain / readCareLabel). */
export const LEGACY_VISION_MODEL = 'gpt-4.1' as const

/** OpenAI API base. */
export const OPENAI_API_BASE = 'https://api.openai.com/v1' as const

/** Image detail for vision inputs — high, per the locked vision architecture. */
export const VISION_IMAGE_DETAIL = 'high' as const
