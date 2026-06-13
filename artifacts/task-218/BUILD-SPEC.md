# GONR Consumer Build Spec — TASK-218 (auto-distilled from map workflow wf_d4d8ee3d)
# Surface: /Users/tyler/dev/gonr-app-task218-lab  | branch task-218-lab | Lab builds, Atlas gates/deploys

## LOCKED DECISIONS (Atlas veto cheap; find-replace)
- Route base: /solve-v2/* (matches Atlas consumer lane + brand guide)
- Bottom nav: mockup 4 tabs = Home / History / Saved / Profile (no center FAB). Mockup is visual source of truth.
- Free-to-use, NO signup wall. Solve first, THEN offer Save / outcome. Data moat = useful reps, not forced accounts.
- Quietly capture the rep: (1) what happened (2) garment/fabric/care label (3) prior treatment (4) risk conditions (5) answer shown (6) whether followed (7) outcome.

## ENGINE CONTRACT
I have everything needed. Compiling the contract doc.

GONR ENGINE CONTRACT — TASK-218 UI BUILD REFERENCE
Worktree: /Users/tyler/dev/gonr-app-task218-lab
Generated from live route + lib + data inspection.

==================================================================
ENDPOINT 1 — POST /api/solve   (THE PRIMARY ENGINE)
File: app/api/solve/route.ts (1151 lines) | Auth: session cookie only (email never trusted from body)
Feeds: Home stain-input screen → Result/Verdict screen (the core consumer flow, TASK-218 packet 2)
==================================================================
METHOD: POST. Accepts TWO content types:

A) application/json (text-only solve):
   { stain: string (required), surface?: string, lang?: "en"|"es" }

B) multipart/form-data (photo solve):
   image?: File           (stain photo → vision identifyStain)
   careLabel?: File        (care-label photo → vision readCareLabel)
   stainHint?: string      (text overrides image if present)
   surfaceHint?: string
   fabricDescription?: string
   garmentLocation?: string
   lang?: string
   (email is NEVER read from body/form — derived from Supabase session only)

RESPONSE — this endpoint is a DISCRIMINATED UNION. The UI must branch on which keys are present. Possible shapes:

1. SUCCESS (library or AI card):
   {
     card: ProtocolCard | null,   // see ProtocolCard schema below; null in no-verified-protocol case
     tier: number,                 // 1-3 library, 4 AI/fallback
     confidence: number,           // 0–1
     source: "library" | "library-plant-tuned" | "ai" | "ai-plant-tuned"
             | "hard-refuse" | "no-verified-protocol" | "library-safety-blocked"
             | "ai-unavailable",
     stainType: string,            // resolved chemistry family (protein|tannin|oil-grease|dye|mineral|oxidizable|combination|particulate|wax-gum|mildew|adhesive|...)
     correlationId?: string,
     viewerTier: "anon"|"free"|"home"|"spotter"|"operator"|"founder",
     // optional flags the UI should render badges for:
     _safetyBlocked?: true,        // AI/library card was nuked, contextual safe fallback returned
     _aiUnavailable?: true,        // AI down, generic fallback
     _hardRefuse?: true,           // deterministic dangerous-combo refusal
     ai_fallback_disclosure?: { label: string, body: string }   // "general starting point, not stain-specific" banner
   }

2. DISAMBIGUATION PROMPT (pro tiers, ambiguous input):
   {
     disambiguation_prompt: { question: string, options: [{ label, value, ... }] },
     original_query: { stain, surface },
     correlationId, viewerTier
   }

3. NO VERIFIED PROTOCOL (spotter/operator, library miss):
   { card: null, noVerifiedProtocol: true, message: string, source: "no-verified-protocol", tier:4, confidence:0, stainType, viewerTier }

4. CARE LABEL SCANNED BUT NO STAIN (HTTP 422):
   { error: "stain_not_identified", fiberContext: { fiber, careSymbols[], warnings[] }, message }

5. ERRORS:
   400 { error: "Stain required" }
   402 { error, reason, viewerTier }     // paywall: reason = "trial_expired" | "anon_limit"
   429 { error: "Too many requests" }     // 60 req/min/IP
   503 { error, reason:"temporary_error", viewerTier }   // fail-closed
   500 { error: "Internal server error" }

>>> ProtocolCard schema (the object the Result screen renders). Library cards (data/core/*.json) are the richest; AI cards are a subset. Fields present:
   id, title, stainType, stainFamily, surface, sector, source, verified (bool),
   difficulty (1-10 number), timeEstimate, lastValidated, verification_level ("cross_ref"|"draft"|...),
   meta: { stainCanonical, surfaceCanonical, tier, riskLevel ("low"|"medium"|"high"), tags[], freePreview },
   stainChemistry (string), whyThisWorks (string), scienceNote (string), defaultAssumption,
   spottingProtocol: [ { step:number, side:"wet"|"dry", agent, technique, equipment, dwellTime, instruction, warning? } ],   // PRO step list
   professionalProtocol: [...],   // legacy pro steps (often absent)
   homeSolutions: string[] | [paragraph,...],   // consumer narrative steps
   diyProtocol: [...],
   ***safetyMatrix: { neverDo: string[], fiberSensitivities: string[] },   // STRUCTURED DO-NOT-DO — see flags below
   ***materialWarnings: string[],   // structured per-card warnings, engine PREPENDS computed warnings here
   escalation: { when, whatToTell, specialistType },   // STRUCTURED handoff/"take to a pro" data
   deepSolveHooks / deepSolvePrompt,   // pro-tier Deep Solve trigger (stripped for non-paid)
   products: { professional:[{name,use,note}], consumer:[{name,use,note}], household? },   // affiliate-enriched
   sources: string[], cross_refs: [...],
   _fiberContext?: { fiber, careSymbols[], warnings[] }   // injected when a care label was scanned

>>> TIER SANITIZATION (load-bearing — UI must NOT assume pro fields exist): for viewerTier anon/free/home the server DELETES spottingProtocol, professionalProtocol, products.professional, customerHandoff, deepSolve, deepSolvePrompt, pro/pro_es, and truncates sources. Consumer screens render homeSolutions + materialWarnings + escalation + safetyMatrix only. Paid tiers (spotter/operator/founder) get the full card.

==================================================================
ENDPOINT 2 — POST /api/deep-solve   (PRO complex-case reasoning)
File: app/api/deep-solve/route.ts | Auth: requireProAuth() (paid only) | Model: gpt-4.1
Feeds: Pro "Deep Solve" screen (operator complex-case panel) — NOT in consumer TASK-218 flow
==================================================================
REQUEST (application/json):
   { stain: string (required), cardId?: string, context?: string,
     situations?: string[]  (enum: stain_old, already_treated, high_value, customer_upset, delicate_fiber, unknown_fiber, dye_bleed, heat_damage),
     lang?: "en"|"es" }

RESPONSE (strict JSON schema, validated server-side):
   {
     assessment: string,
     ***modifiedProtocol: [ { step:number, agent:string, instruction:string, warning: string|null } ],
     ***riskFactors: string[]  (2-3 items),
     outcomes: { best:string, likely:string, worst:string },
     ***recommendation: "proceed" | "caution" | "release",   // STRUCTURED safety verdict enum (falls back to "caution")
     recommendationNote: string
   }
ERRORS: 400 {error:"Stain required"}, 401/403 from requireProAuth, 503 {error} (quota/key), 500 {error}.

==================================================================
ENDPOINT 3 — POST /api/scan-label   (care-label OCR)
File: app/api/scan-label/route.ts → lib/vision/index.ts readCareLabel() | Model: gpt-4.1 vision
Feeds: "Scan care label" capture step on the input screen
==================================================================
REQUEST (application/json): { image: string (base64, required) }
RESPONSE (CareLabelData):
   {
     fiber: string,             // "100% Silk" / "80% Wool, 20% Nylon"
     ***careSymbols: string[],   // STRUCTURED label enum: dry-clean-only, no-bleach, no-heat, hand-wash-only, do-not-wash, no-iron
     ***warnings: string[],      // explicit label warnings (structured-ish, but free-text strings)
     rawText?: string
   }
ERRORS: 400 {error:"No image provided"}, 500 {error:"API key not configured"}. On exception returns 200 with empty safe shape { fiber:"unknown", careSymbols:[], warnings:[], confidence:"low" }.

==================================================================
ENDPOINT 4 — POST /api/scan-stain   (stain photo ID)
File: app/api/scan-stain/route.ts → lib/vision/index.ts identifyStain() | Model: gpt-4.1 vision
Feeds: "Take a photo of the stain" capture step on the input screen
==================================================================
REQUEST (application/json): { image: string (base64, required) }
RESPONSE (StainIdentification):
   {
     stain: string,        // "Red Wine"
     surface: string,      // "Silk Blouse" / "Bathtub"
     family: string,       // tannin|protein|oil-grease|oxidizable|dye|combination|mineral|unknown
     confidence: "high"|"medium"|"low",
     reasoning: string     // one sentence — FREE TEXT
   }
ERRORS: 400, 500. On exception returns 200 safe shape { family:"unknown", stain:"Unknown stain", confidence:"low", reasoning:"Could not analyze image." }

==================================================================
ENDPOINT 5 — POST /api/stain-brain   (PRO chat assistant)
File: app/api/stain-brain/route.ts | Auth: requireProAuth() (paid only) | Model: gpt-4.1
Feeds: Pro "Stain Brain" chat screen (operator console) — NOT consumer TASK-218
==================================================================
REQUEST (application/json):
   { messages: [{ role: "user"|"assistant", content: string }] (required, non-empty), lang?: "en"|"es" }
RESPONSE: { reply: string }   // FREE TEXT — a ~750-line professional system prompt grounds it (Eisen / "Art of Spotting" chemistry), but output is unstructured markdown-ish prose. No structured do-not-do object; safety lives inside the prose.
ERRORS: 400 {error:"Messages required"}, 401/403 requireProAuth, 500 {error:"API key not configured"}, 502 {error:"Stain Brain unavailable"}.

==================================================================
SAFETY / DO-NOT-DO vs FREE-TEXT FLAG SUMMARY (what the user asked to flag)
==================================================================
STRUCTURED do-not-do / safety / care-label data (renderable as chips/lists/badges):
 • /api/solve ProtocolCard.safetyMatrix.neverDo[]  → hard "never X" list
 • /api/solve ProtocolCard.materialWarnings[]       → warning strings (engine auto-injects fiber/acetate/marble/protein rules)
 • /api/solve ProtocolCard.escalation{when,whatToTell,specialistType} → structured "take to a pro" handoff
 • /api/solve meta.riskLevel (low|medium|high) + _safetyBlocked/_hardRefuse flags → verdict badges
 • /api/deep-solve recommendation enum (proceed|caution|release) + riskFactors[]  → structured verdict
 • /api/scan-label careSymbols[] (fixed enum) → care-label icon row
FREE-TEXT only (render as prose, no structured safety object):
 • /api/stain-brain reply (chat prose)
 • /api/scan-stain reasoning
 • /api/deep-solve assessment / outcomes (descriptive)
 • ProtocolCard homeSolutions / stainChemistry / whyThisWorks / scienceNote

==================================================================
LOCAL SOURCED DATA AVAILABLE (data/ — renderable WITHOUT an API call)
==================================================================
 • data/core/*.json — 251 verified ProtocolCards (gold "Master Protocol" tier), naming {stain}-{surface}.json or {stain}+{surface}.json. Loaded at runtime by lib/protocols/lookup.ts. Each carries full safetyMatrix, materialWarnings, escalation, spottingProtocol, homeSolutions, sources, verification_level. THIS is the source-gated, SB-reviewed protocol library behind /api/solve tiers 1-3.
 • data/safety-data.js — 63 static material safety profiles (IIFE → window.SAFETY_PROFILES). Categories: fibers(16), carpet(16), marine(10), auto(7), leather(6), hard_surfaces(5), sneaker(3). Each profile: { id, material, materialClass, category, emoji, safeChemicals[{name,note}], unsafeChemicals[{name,note}], testFirst[{name,note}], phRange, temperatureMax, warnings[], proTip }. STRUCTURED safe/unsafe chemical compatibility — ideal for a "is X safe on this fabric" card. Materials: Silk, Wool, Cashmere, Cotton, Linen, Rayon, Polyester, Nylon, Spandex, Acetate, Denim, Velvet, Chenille, Microfiber, Gore-Tex, Down, Aniline/Pigmented/Patent/Synthetic Leather, Suede, Nubuck, + carpets/marine/auto/sneaker.
 • data/chemistry-families.json — 12 stain families (protein, tannin, oil-grease, etc.), each: { id, name{en,es}, emoji, tagline{en,es}, stains[], identification{visual{en,es},...} }. Bilingual. Powers family education/identification UI.
 • data/family-keywords.json — { families: { protein:{ id, keywords[] }, ... } }. Keyword→family classifier used by detectFamily().
 • data/combo-stain-map.json — combination-stain disambiguation: triggers{ coffee/tea/... }{ followUpQuestion, emoji, reason, variants[{ label, emoji, chipStyle, stainType, routeTo, protocolExists, notes }] }. Drives the "what kind of coffee?" follow-up chip row before surface selection.
 • data/stain-aliases.json — 156 synonym→canonical mappings (wine/merlot/cabernet→red-wine, espresso/americano→coffee-black). { _meta, aliases{} }.
 • data/surface-aliases.json — 164 surface synonym→canonical mappings (blouse→silk, oxford→cotton-white). { _meta, aliases{} }.
 • data/predictive-intake-gate-spec.json — intake gating spec (13KB).
 • data/chemicals/ and data/chemistry/ — additional chemical reference subtrees (not opened in detail).

KEY UI NOTE: Aliases + chemistry-families + combo-stain-map + safety-data.js can power the entire input/disambiguation/education flow CLIENT-SIDE with zero API cost; only the final protocol (/api/solve) and pro features need server calls. The consumer Result screen should be built to render ONLY the non-pro card fields (homeSolutions, materialWarnings, safetyMatrix.neverDo, escalation, meta.riskLevel) because tier sanitization strips spottingProtocol/products.professional before they ever reach an anon/free/home browser.

## BRAND + COMPONENT GUIDE
GONR BRAND + COMPONENT GUIDE — for UI build agents (worktree: /Users/tyler/dev/gonr-app-task218-lab, consumer surface = TASK-218 "solve-v2")

CRITICAL CONTEXT FIRST — two color systems live in this repo, do not mix them
- The legacy/operator app (DESIGN.md frontmatter, app/globals.css `:root`, components/ui/*) is GREEN-themed (`--accent: #166534`, brand-green #22C55E). This is the OLD palette. DESIGN.md's frontmatter colors block (primary #22C55E green) is STALE — its prose body is still useful for layout/spacing philosophy, but ignore its green color tokens for consumer work.
- The consumer surface (TASK-218) is GREEN-FREE: pink / magenta / orange / navy. The source of truth is the `.gonr-consumer` block in app/globals.css plus /Users/tyler/shared-workspace/gonr-brand-kit/brand_tokens.json. The mockup image confirms hot-pink primary, white cards, pink-tinted accents, navy text, zero green.
- Build agents on the consumer (solve-v2) surface MUST follow the green-free system below. HomeScreen.tsx is the canonical, approved reference implementation — copy its patterns.

GREEN-FREE RULE (non-negotiable, Tyler-locked "green out for good")
- No success-green anywhere on consumer surfaces. There is NO generic success/positive color.
- Verdict/state differentiation is done via LABEL + ICON + BORDER + COPY HIERARCHY, never via a green "this is safe" fill.
- The safe/positive verdict (`diy_safe`) renders in NAVY (#071B55) with a check icon + label — NOT green.
- WARNING: components/consumer/ConsumerSolveShell.tsx currently VIOLATES this — it is full of hardcoded greens (#1F7A52, #2E9E6B, #E8F6EE, #F5FBF7, green focus rings, green submit button, green step badges, green verdict color for diy_safe). Treat ConsumerSolveShell as NOT brand-compliant; do not copy its colors. Reuse its structure/logic (the classify() engine wiring, field options, verdict layout) but re-skin to the green-free tokens. Flag this if asked to extend it.

COLOR TOKENS (consumer — use these, defined in `.gonr-consumer` in app/globals.css)
- CSS vars (preferred): --gonr-primary #F70A75 (hot pink) · --gonr-bg #FFF0F7 (soft pink) · --gonr-surface #ffffff · --gonr-text #071B55 (navy) · --gonr-text-2 #5B6275 (gray) · --gonr-border rgba(7,27,85,0.08)
- Tailwind theme colors (from @theme block, use as `text-gonr-*`/`bg-gonr-*`): gonr-navy #071B55 · gonr-hotpink #F70A75 · gonr-magenta #D70BFF · gonr-orange #FF5A18 · gonr-softpink #FFF0F7 · gonr-lightgray #F5F6FA · gonr-textgray #5B6275
- Verdict-state accents (green-free, defined as vars): --gonr-state-safe #071B55 (navy, diy_safe) · --gonr-state-limited #E8920C (amber, diy_limited/constraints) · --gonr-state-stop #F70A75 (hot pink, stop_use_pro/do_not_attempt) · --gonr-state-info #5B6275 (neutral gray, insufficient_info)

GRADIENT (the signature brand element)
- Canonical: `linear-gradient(90deg, #F70A75 0%, #E40B86 38%, #FF5A18 100%)` (pink→magenta→orange), exposed as `--gonr-gradient-hero`.
- Helper classes: `.gonr-gradient` (background fill — used for FABs, step badges, chevron pills) and `.gonr-gradient-text` (clipped gradient text — used for the GONR wordmark). Reuse these classes; do not re-declare the gradient inline.

FONTS
- Consumer font stack: `var(--font-nunito), 'Nunito Sans', ui-rounded, system-ui, sans-serif` (set on `.gonr-consumer`). Rounded, heavy. Nunito Sans is the brand face (brand_tokens recommends Nunito Sans ExtraBold).
- Weights run heavy: headings use `font-black`/`font-extrabold`; body `font-bold`/medium. Labels are uppercase + tracking-wide (`uppercase tracking-wide`).
- (Legacy/operator surfaces use Avenir Next via `--font-sans` — not for consumer.)

APPROVED LOGO / MARK USAGE
- Approved asset lives at /Users/tyler/shared-workspace/gonr-brand-kit/approved-logo-2026-05-24/ (also gonr_logo_primary.svg in the kit root). NEVER recreate or redraw the mark — wire in the approved file. The `high-res-logo-pack-2026-05-24/` folder is REJECTED / DO_NOT_USE.
- The mark is "GONR" only — no "Stain Solutions", no tagline baked into the lockup (despite brand_tokens.json naming it "GONR Stain Solutions"). Do not add "Stain Solutions" to any logo.
- Current placeholder in HomeScreen: `<span className="gonr-gradient-text text-2xl font-black tracking-tight">GONR</span>` — gradient wordmark text. Spec note in code says swap for the transparent sparkle-O asset when available. Acceptable interim; prefer the approved asset.
- No "LG"-style placeholder badges, no invented marks.

SPACING / LAYOUT PATTERNS (reuse)
- Mobile-first single column. Consumer content column = `max-w-[480px]` centered (`mx-auto`), horizontal padding `px-5`, bottom padding `pb-28` to clear the fixed bottom nav. Page wrapper: `<main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5">`.
- Vertical rhythm between sections: `mt-6`/`mt-7`. Grid gaps `gap-2`/`gap-3`.
- Radius scale: cards 22px (`.gonr-card`), inner tiles `rounded-2xl`(16)/`rounded-xl`(12), pills/FABs `rounded-full`. Brand kit rounded tokens: sm 8 / md 12 / lg 16 / pill 999.
- Full-screen PWA shell: mounting ConsumerShellChrome adds body class `gonr-consumer-shell`, which hides the legacy global header/footer/nav and zeroes main padding so the consumer UI owns the viewport. Any consumer route should render ConsumerShellChrome once.

CARD PATTERN (reuse — do not reinvent)
- Use the `.gonr-card` class for ALL consumer cards: white surface, `border: 1px solid var(--gonr-border)`, `border-radius: 22px`, soft navy-tinted shadow `0 12px 34px -20px rgba(7,27,85,0.22)`. Defined in globals.css.
- Standard card row pattern (icon tile + text + chevron): pink-tinted icon tile `grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink` + a label/sublabel stack + a `.gonr-gradient` chevron pill or a `text-gonr-navy/40` chevron. See HomeScreen "Scan a stain" CTA and "Coffee on Cotton" row.
- Icons inside cards are hot-pink (`text-gonr-hotpink`), text is navy (`text-gonr-navy`), sublabels gray (`text-gonr-textgray`).

REUSABLE UI COMPONENTS (components/ui/ — reuse instead of rebuilding)
- Badge.tsx — single source of truth for color-coded labels. Tones: safety (danger/caution/safe), tier (home/spotter/operator), status (live/comingSoon/locked), utility (neutral/schema), chemistry families (protein/tannin/oil/dye/rust/combination). Sizes sm/md/lg. NOTE: Badge's `safe`/`live` tones are GREEN and its chemistry palette is operator-era — fine on operator/reference surfaces, but on green-free consumer surfaces avoid the green tones or restyle. Color is never the only signal — text always carries meaning.
- BadgeLink.tsx — clickable Badge wrapper; emits `onOpen()` for a quick-reference modal, parent owns modal state. Native `<button>`, a11y handled. Taxonomy-agnostic.
- IconTileButton.tsx — button with lucide icon + label; variants primary/tile/tile-active/accent/warning/ghost; 44px min hit target, focus ring, active scale. Variants are green-accented (operator palette) — restyle for consumer or use for operator surfaces.
- QuickReferenceModal.tsx — modal shell pairs with BadgeLink.
- TierGate.tsx — tier-gating wrapper (member/pro gating).
- PreviewBanner.tsx — preview/testing-mode banner.
- Icon library: lucide-react throughout (Settings, ScanLine, Coffee, Wine, Droplet, Leaf, ChevronRight, Home, Clock, Lightbulb, MapPin, Camera, Shirt, Upload, Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Clipboard). Use lucide; do NOT use emoji as UI chrome (DESIGN.md rule). Chips are text-only — no forced icons/emoji prefixes on chip labels.

BUTTONS / CTAS / CHIPS (consumer patterns from HomeScreen)
- Primary CTA / FAB / step badges: `.gonr-gradient` fill + white text + `rounded-full` + shadow (e.g. center scan FAB `gonr-gradient ... h-14 w-14 rounded-full text-white shadow-xl ring-4 ring-white`).
- Small intake tiles: `.gonr-card` mini, `min-h-[70px]`, centered icon (hot-pink) + tiny extrabold navy label.
- Links/secondary actions: `text-gonr-hotpink font-bold` (e.g. "View all").
- Numbered journey steps: gradient circle with white number + icon + tiny label.
- Generic legacy classes exist in globals.css (`.btn-primary`, `.chip`, `.input`, `.card`, `.step-badge`, `.tier-badge`) but these are GREEN-themed (`--accent` green) — for consumer surfaces prefer the `.gonr-*` / Tailwind `gonr-*` token classes, not these.

CONSUMER SHELL / NAV STRUCTURE
- Route base: `/solve-v2` (home), `/solve-v2/solve` (intake/solve, accepts `?input=stain|care-label|upload` and `?stain=<name>`), `/solve-v2/history`, `/solve-v2/care`, `/solve-v2/pro-help`, `/solve-v2/settings`.
- ConsumerShellChrome.tsx — 'use client', mounts to add/remove body class `gonr-consumer-shell` (full-viewport, hides legacy chrome). Render once per consumer route.
- Bottom nav (BottomNav in HomeScreen.tsx) — fixed, `max-w-[480px]` centered, `border-t border-[var(--gonr-border)] bg-white/95 backdrop-blur`, 4 items (Home / History / Care / Pro Help) as a `grid-cols-4`, active = `text-gonr-hotpink`, inactive = `text-gonr-navy/50`, plus a center gradient scan FAB floated above the bar (`absolute -top-5 left-1/2 -translate-x-1/2`, `.gonr-gradient`, ring-4 ring-white). Reuse this nav verbatim across consumer screens.
- ConsumerSolveShell.tsx — the intake form + verdict result engine: wires lib/consumer-safety/classifier `classify(SolveInput)` → SafetyVerdict, renders verdict (label/first-action/avoid/why/confidence), allowed-steps card from CONSUMER_CARDS_PHASE0, and a referral/cleaner-handoff block with copy-summary. Reuse its DATA wiring and field option lists (MATERIAL/STAIN/CARE/HEAT/COLOR/AGE/VALUE options, PRIOR_TREATMENTS, EXAMPLE_CHIPS) and the 4 verdict levels (diy_safe / diy_with_constraints / stop_use_pro / do_not_attempt). RE-SKIN its colors to green-free before shipping — its current greens are a known violation.

VERDICT LEVELS (4-state, green-free mapping for new work)
diy_safe → navy (#071B55) + check icon · diy_with_constraints/diy_limited → amber (#E8920C) + shield · stop_use_pro → hot pink (#F70A75) + alert · do_not_attempt → hot pink/red + X. Differentiate by icon+label+border+copy, not by a green success fill.

DESIGN PHILOSOPHY (from DESIGN.md prose — still valid, color section excepted)
- Professional stain intelligence, not generic SaaS. Fast, calm, direct, trustworthy. Visual noise is the enemy; get the user to the next correct action fast.
- Mobile-first, large thumb targets (44px+), compact readable cards, hierarchy via spacing/weight before borders/fills, minimal nesting, restrained shadows (no glassmorphism excess, no ornamental gradients except hero moments).
- Don't: emoji as chrome, decorative guess-the-meaning icons, multiple competing accent colors for primary actions, consumer-wellness/crypto/gaming/generic-SaaS feel, numeric dwell times in routine protocol presentation.
- Honesty rule (visible in HomeScreen comments): no fake telemetry/personalization claims ("Common stains" not "trending", "Start with these" not "personalized for you"); "Scan a stain" is an entry into context intake, not a camera-certainty promise.

KEY FILE PATHS
- Consumer tokens + shell CSS: /Users/tyler/dev/gonr-app-task218-lab/app/globals.css (`.gonr-consumer`, `@theme` block, `gonr-consumer-shell`)
- Canonical green-free reference screen: /Users/tyler/dev/gonr-app-task218-lab/components/consumer/screens/HomeScreen.tsx
- Shell chrome: /Users/tyler/dev/gonr-app-task218-lab/components/consumer/ConsumerShellChrome.tsx
- Solve/verdict engine (re-skin needed): /Users/tyler/dev/gonr-app-task218-lab/components/consumer/ConsumerSolveShell.tsx
- Reusable primitives: /Users/tyler/dev/gonr-app-task218-lab/components/ui/{Badge,BadgeLink,IconTileButton,QuickReferenceModal,TierGate,PreviewBanner}.tsx
- Brand kit + approved logo: /Users/tyler/shared-workspace/gonr-brand-kit/ (brand_tokens.json, approved-logo-2026-05-24/, brand-taglines.md; high-res-logo-pack = DO NOT USE)
- Legacy design doc (prose useful, color frontmatter stale/green): /Users/tyler/dev/gonr-app-task218-lab/DESIGN.md

TAGLINES (locked 2026-06-06, brand-taglines.md) — Commons: "OPEN DEBATE. BETTER SCIENCE." · Encyclopedia: "SOURCED. SAFETY-GATED. CITABLE." · System: "OPEN CLAIMS. VERIFIED CANON." Consumer app taglines (brand_tokens): "Scan it. Solve it. GONR." / "Stains don't stand a chance." Bright, no green.

## BUILD PLAN (full)
GONR CONSUMER BUILD PLAN — TASK-218 (solve-v2)
Worktree: /Users/tyler/dev/gonr-app-task218-lab

=====================================================================
1. BUILD-HEALTH BLOCKERS (fix posture before screen work)
=====================================================================
NONE block the build. Typecheck PASS (exit 0), `next build` will pass (Next 16 does not run eslint during build; next.config.ts has no ignore flags but type gate is clean). Consumer components (components/consumer/*) are lint-clean and typecheck-clean.

Lint FAIL = 150 problems (111 errors, 39 warnings), entirely @typescript-eslint/no-explicit-any debt. It does NOT gate the build and is NOT in the consumer surface. Treat as a parallel cleanup track, NOT a precondition. Do not let it block screen building.

Rule for build agents: any NEW consumer code must ship zero `any` and zero unused vars — do not add to the debt. The existing `any` hotspots are off the consumer path and owned separately:
  - lib/safety/filter.ts:16,42,87,91,216 (5 — highest concentration)
  - lib/types.ts:84,85,86,87
  - lib/protocols/lookup.ts:305,365
  - lib/events/record.ts:82
  - app/(mc)/mission-control/protocols/page.tsx:94
  - plus app/api/* route handlers + __tests__/auth-routes.test.ts
Only 2 warnings are --fix-able; the 111 errors need manual typing. Schedule as a separate TASK after the spine ships, or hand to a cleanup agent in parallel. NOT a screen-build dependency.

One real pre-build gap to resolve with Atlas (not a blocker, a routing decision): the spec references both `/solve-v2/*` (brand guide route base) and legacy `/app/history`, `/app/saved`, `/app/scan`, `/app/profile`. Decide whether the consumer spine lives under `/solve-v2/*` (preferred per brand guide) and which legacy pages get re-skinned vs re-pointed. Lock the route base BEFORE screen 1 so nav links are stable.

=====================================================================
2. CORE SPINE — minimal "real intelligent tool" path
=====================================================================
Goal: ask -> real /api/solve answer -> Results + Do-Not-Do, with Care Label as the safety on-ramp. Build in this order; each step is testable against the live engine.

STEP 0 (shared scaffolding — do FIRST, see Section 4): lock route base, mount ConsumerShellChrome once, finalize BottomNav. Single owner.

STEP 1 — Home (reskin)  [screen 1, exists partial]
  File: components/consumer/screens/HomeScreen.tsx (edit in place)
  Engine: none on load (optional recent-solves read via /api/solves/history — NO telemetry/personalization copy)
  UI: lead with a single free-text "What's going on?" field + pink "Ask GONR" pill CTA (input-first, NOT the scan-card grid). GONR gradient wordmark. Promise line "Know what to do. / Know what not to." (preserve the "know what NOT to" safety hook). RECENT list bound to history data with a real empty-state. A "+"/attach affordance opens the Attach Menu (screen 2).
  Render NO verdict/treatment/"safe to try" language. No fake counts.

STEP 2 — Attach Menu  [screen 2, net-new]
  File: components/consumer/AttachMenu.tsx (bottom action-sheet)
  Engine: Take/Choose Photo -> POST /api/scan-stain (base64) -> {family,stain,confidence,reasoning}; Scan Care Label -> POST /api/scan-label -> {fiber,careSymbols,warnings,confidence}
  UI: white rounded sheet "What's going on?", 5 rows (Take Photo / Choose Photo / Scan Care Label / Add Product Label / Voice Note) each icon+title+sublabel+chevron, + Cancel. Surface "Scan Care Label" prominently (safety on-ramp — do not bury it). Carry vision result into Chat (screen 3) as pre-filled context.
  Add Product Label + Voice Note have NO backing endpoint — degrade gracefully, no dead taps; Voice Note falls back to typed text. Flag both as dependencies to Atlas. Vision confidence is a HINT, never a verdict.

STEP 3 — Chat / Clarifying Intake  [screen 3, net-new]
  File: components/consumer/screens/ChatIntakeScreen.tsx (route app/.../solve)
  Engine: /api/solve (returns disambiguation_prompt for ambiguous input) + data/predictive-intake-gate-spec.json drives WHICH questions; pre-fill from scan-stain/scan-label
  UI: captured-context chip (thumb + "Red wine on white cotton shirt"), GONR assistant bubble reflecting detected facts + 2-3 clarifying questions rendered from the gate/disambiguation_prompt (NOT hard-coded). Quick-reply chips. Accumulate answers into the SolveInput object already modeled in ConsumerSolveShell (reuse its MATERIAL/STAIN/CARE/HEAT/COLOR/AGE/VALUE vocab as the answer-mapping target). "Ask a follow-up…" input at bottom.
  This is the safety gate: GLOBAL-001 high-risk-unknown flags (delicate/specialty fiber, leather/suede/aniline, unknown dye, unknown stain, prior treatment, heat, luxury) FORCE full intake — no skipping to a confident answer. Mark vision facts as "looks like", confirmable. "unknown" is a valid safe answer.

STEP 4 — Details Collected (confirmation)  [screen 4, net-new]
  File: components/consumer/screens/DetailsCollectedScreen.tsx
  Engine: POST assembled context -> /api/solve -> card | disambiguation_prompt | noVerifiedProtocol; Sources line = response.source + ai_fallback_disclosure
  UI: context chip, "Your details" card listing collected SolveInput fields rendered FROM STATE (never defaults), transition line "Got it. Here's the best approach…", Sources footer reflecting ACTUAL source (verified card vs AI fallback — do not always show both). Keep "Ask a follow-up" so users can correct a fact (re-open/patch intake, don't silently ignore). This is the consent/transparency checkpoint — must allow catching a wrong fact before the engine answers. No treatment preview here.

STEP 5 — Results / Solution  [screen 5, exists partial in ConsumerSolveShell]
  File: components/consumer/screens/ResultsScreen.tsx (NEW dedicated component; lift logic out of ConsumerSolveShell, re-skin green-free)
  Engine: /api/solve -> card.title + card.spottingProtocol[] {step,instruction}; consumer/home tier renders homeSolutions + materialWarnings + escalation + safetyMatrix.neverDo only (tier sanitization strips spottingProtocol/products.professional server-side — UI must NOT assume pro fields exist)
  UI: header "Recommended for you", white .gonr-card, numbered-pill vertical step list (gradient pills), bold action title + one-line body per step. Render EXACTLY what the engine returns (cap to engine's 5-8 contract; do NOT hardcode a count). Collapsible "Important notes" accordion (pink-tinted) for materialWarnings — visible/affordant, not buried. If source='ai-unavailable' or ai_fallback_disclosure present, render that banner verbatim.
  Step 1 from engine is the safe-first move — render at position 1, never reorder/invent.

STEP 6 — Do-Not-Do  [screen 6, exists partial inline in ConsumerSolveShell]
  File: components/consumer/screens/DoNotDoPanel.tsx (own component; render as a strongly-styled section co-located with Results OR standalone — must be visually distinct from allowed steps)
  Engine: /api/solve -> card.materialWarnings[] + safetyMatrix.neverDo[]; and/or classifier verdict.avoid[]
  UI: header "Things to avoid (for this stain)", rows = red XCircle (lucide) + bold prohibition + optional one-line reason. Red/pink severity styling (ship the severity CSS in the same patch). Iterate ALL returned items — do NOT .slice(0,5)/cap (the existing inline render truncates avoid at 5; the dedicated panel must show everything). Pair each prohibition with its engine-provided reason.
  Highest-stakes teaching surface. Every line comes from the engine — invent nothing.

CARE LABEL (safety on-ramp, build alongside spine) — see screen 7/13 in Section 3; the decode display map is the one net-new authoring task and feeds the spine's fiber constraints.

Spine done = Home -> Attach -> Chat -> Details -> Results + Do-Not-Do wired to live /api/solve, green-free, no leaked pro fields. That proves the intelligent tool.

=====================================================================
3. SECONDARY SCREENS (build order, after spine is live)
=====================================================================
S1. Care Label Info  [screen 7, partial] — components/consumer/screens/CareLabelInfo.tsx
    Engine: /api/scan-label -> {fiber,careSymbols[],warnings[],confidence}. Build the NEW token->{icon,humanLabel} decode map (presentation copy, in-scope; covers lib/vision token vocab: dry-clean-only,no-bleach,no-heat,hand-wash-only,do-not-wash,no-iron,machine-wash-warm,tumble-dry-low). lucide approximations or licensed ASTM/ISO set — do NOT pixel-trace. Low-confidence/empty -> "couldn't read clearly", never fabricate fiber. Fabric-durability summary from engine material context, not hand-authored. Surface restrictive symbols as do-not warnings; propagate to solve constraints.

S2. Scan Care Label (camera)  [screen 13, partial] — replace app/scan/page.tsx placeholder
    getUserMedia rear-camera viewfinder + shutter -> base64 -> /api/scan-label (reuse CareLabelScanner.tsx fetch). HTTPS required (fine on Vercel); graceful fallback to file-input for non-secure/denied. `declare global` only if a Web API lacks DOM types. -> transitions to Care Label Info (S1). Offer "Use this fiber" handoff into solve + "Save to Library".

S3. Product Recommendations  [screen 8, partial] — extract from components/solve/ResultCard.tsx into a shared sub-component
    Engine: card.products.consumer / .household (route strips products.professional for home/anon/free). enrichProducts.ts synthesizes Amazon url + tag gonr08-20. UI: "Recommended products (Optional)" — Optional styled as muted tag, horizontal cards (icon + name + engine `use`/`note` + "Why?" expand showing `note` verbatim). Household-first ordering ahead of branded GONR SKU. Render only when non-empty; hide section otherwise (no "Coming soon"). Author NO product copy.

S4. Follow-up / Clarify  [screen 9, partial] — same scroll thread as Results
    Engine: re-call /api/solve with refined query -> card OR disambiguation_prompt{question,options[]} (lib/protocols/ambiguity.ts). Unknown path appends -unknown-general (explicit consent to baseline). UI: grey quoted prior bubble + tailored answer block + "results may vary" footer (safety copy, keep it). disambiguation_prompt -> render question + tappable option chips. Preserve original verdict level — user can't "ask around" a do_not_attempt. Questions come from ambiguity.ts, not invented.

S5. Save / Bookmark  [screen 10, partial] — in-result Save confirmation
    Engine: POST /api/protocols/save (card + optional notes); GET /api/protocols/saved. UI: "Saved just now" timestamp, Notes field -> notes param, full-width pink button toggling Save -> Saved. Persist FULL protocol_json incl. verdict/safety fields (never steps-only). notes = personal, never authoritative/shared. Respect tier-stripping on re-render.

S6. Saved / Library  [screen 12, partial] — app/saved/page.tsx (re-skin + tabs)
    Engine: GET /api/protocols/saved, DELETE /api/protocols/saved/[id]. Add segmented [Saved]|[Labels] control; Labels tab needs a NEW thin store (Supabase table or localStorage) for saved scans/products. Compact rows expand to ResultCard/label detail. Safety fields render exactly as ResultCard shows them — never stripped.

S7. Settings / Profile  [screen 15, partial] — lean consumer view of app/profile/page.tsx
    Engine: GET/PATCH /api/profile, GET /api/usage, Supabase OTP/signOut. Profile row + 2 toggles (Stain type alerts, Product recommendations — marketing prefs ONLY, must never suppress safety warnings) + Clear history (needs new DELETE on /api/solves/history; confirm dialog, soft/trash delete) + About/How GONR Works + red Log out. Gate operator-only sections to operator role. Confirm with Atlas before removing language/theme controls (no design removal without approval).

LATER (defer; need decisions/endpoints):
  - History [screen 11, full] — functional; only cosmetic reskin to match mockup (per-row thumbnail, relative timestamps, demote filter bar). Do not regress auth/filter logic.
  - Product Label Info [screen 14, none] — BLOCKED on data decision (vision /api/scan-product vs curated lookup) AND Tyler/Atlas + SB review. Highest invention risk; "Best for"/"Key ingredients"/"Safety" are factual brand claims — must be sourced, never authored/LLM-guessed at render. Do not build until feed is locked.

=====================================================================
4. SHARED-FILE INTEGRATION POINTS — DO SEQUENTIALLY (single owner, no parallel)
=====================================================================
These touch files every screen imports; concurrent edits = merge conflicts and brand drift. Land each, commit, then fan out screen work.

A. Route base + router decision (app/solve-v2/* tree or legacy paths) — LOCK FIRST with Atlas. Every nav link and screen route depends on it.
B. ConsumerShellChrome.tsx — mount ONCE per consumer route (adds body class gonr-consumer-shell, hides legacy chrome). Decide the wrapping layout/template so individual screens don't each re-mount it.
C. BottomNav (currently in HomeScreen.tsx) — extract to a shared component and finalize the tab set. NOTE: brand guide describes Home/History/Care/Pro-Help + center scan FAB, but screen-1 mockup wants Home/History/Saved/Profile (4 tabs, no FAB). Resolve this conflict with Atlas BEFORE extracting — every screen renders this nav. One canonical nav, reused verbatim.
D. app/globals.css `.gonr-consumer` / `@theme` tokens — if any new token/severity class is needed (e.g. Do-Not-Do red severity), add it here once, owned by one agent. No per-screen inline gradient/token redeclaration.
E. SolveInput / shared types — the fact shape lives in ConsumerSolveShell.tsx + lib/consumer-safety/types. If lifting it into a shared module for Chat/Details/Results to import, do that extraction once before those screens start.
F. Shared sub-components extracted from ConsumerSolveShell / ResultCard (ResultsScreen step renderer, DoNotDo panel, Products sub-component) — extract before the screens that consume them; one extraction commit, then parallelize.

Order: A -> B -> C -> D -> E -> F, then screen agents fan out in parallel on Section 2/3.

=====================================================================
5. SAFETY GUARDRAILS (every build agent honors — non-negotiable)
=====================================================================
- RENDER ENGINE FIELDS ONLY. Never author stain chemistry, prohibitions, step text, product claims, or care advice in a component. Steps come from card.spottingProtocol/homeSolutions; warnings from materialWarnings/safetyMatrix.neverDo; avoid from verdict.avoid — verbatim, in engine order.
- NEVER REORDER OR INVENT STEPS. Engine's step 1 = safe-first move; render at position 1.
- DO-NOT-DO PROMINENCE. Show ALL returned avoid/materialWarnings items — never .slice()/truncate safety content to fit layout. Pair prohibition + reason. Visually distinct from allowed steps (red/pink severity, never confused).
- TIER SANITIZATION RESPECT. Consumer/home view must never render spottingProtocol pro steps or products.professional — server strips them; UI must not re-add, hardcode, or re-expand on saved-card re-render. Assume pro fields may be absent.
- HONEST SOURCING. ai_fallback_disclosure / source='ai-unavailable' -> render the disclosure banner verbatim ("general starting point, not stain-specific"). Sources line reflects real source (verified card vs AI) — never overstate "Encyclopedia-verified".
- GREEN-FREE (Tyler-locked). No success-green anywhere. Verdict state via LABEL+ICON+BORDER+COPY: diy_safe=navy #071B55+check, diy_with_constraints=amber #E8920C+shield, stop_use_pro/do_not_attempt=hot-pink #F70A75+alert/X. Use .gonr-* tokens, NOT legacy .btn-primary/.chip (green). ConsumerSolveShell's current greens (#1F7A52 etc.) are a known violation — reuse its logic/data wiring, re-skin its colors.
- VISION IS A HINT, NOT A VERDICT. Mark detected fiber/stain "looks like", confirmable. "unknown" downgrades certainty, never escalates. Care-label flags (no-bleach/dry-clean-only/no-heat) propagate as constraints and are NEVER overridden by a stain-photo guess.
- FORCE INTAKE ON HIGH-RISK-UNKNOWN (predictive-intake-gate GLOBAL-001). No skipping clarifying questions into a confident answer for delicate/specialty fiber, leather/suede/aniline, unknown dye/stain, prior treatment, heat, luxury.
- NO FABRICATED TELEMETRY. "Common stains" not "trending"; no "personalized for you", no fake counts/social proof. "Scan a stain" = context intake, not a camera-certainty promise.
- PERSIST FULL SAFETY ON SAVE. Save the complete protocol_json incl. verdict/warnings; never steps-only. Toggles (alerts/recs) govern marketing only — never suppress safety content.
- DESTRUCTIVE = CONFIRM + TRASH. Clear history needs confirm + soft delete. Never plaintext-log email/token.
- PRODUCT LABEL (screen 14) GATED. No brand "Best for"/ingredient/safety claims ship without sourced data + Tyler/Atlas + SB review. Do not build on guessed facts.
- NEW CODE = ZERO any / ZERO unused. Don't add to the lint debt. Run npx eslint on patched files before claiming clean (targeted, not global summary).
## BRAND FEEL (Tyler 2026-06-08)
Premium CPG brand that can also operate in Professional markets. The consumer app must FEEL premium — typography, spacing, motion, polish (think Method-tier consumer brand), NOT a utilitarian workbench. Still green-free, approved GONR mark.

## VISION ARCHITECTURE (Atlas-locked 2026-06-08) — parallel track, does NOT block spine
- Primary photo-reading model: OpenAI **gpt-5.2** via **Responses API**, image detail: **high**.
- Cheap first pass / retries: **gpt-5-mini**.
- VERIFY FIRST: confirm gpt-5.2 + gpt-5-mini resolve on our OpenAI key (GET /v1/models or tiny test call) BEFORE wiring. If an id is unavailable, SURFACE it — never silently downgrade.
- 3-image packet: (1) stain close-up (2) full garment/context (3) care label.
- Force STRUCTURED output: probable fabric(s)+confidence, probable stain family+confidence, visible risk signs, care-label OCR facts, what it CANNOT know from the image, next question if confidence low.
- care-label OCR + fabric text BEATS visual guessing.
- The GONR safety engine makes the FINAL recommendation, not the LLM alone.
- KEY RULE: model may say "likely cotton" / "looks like oil/tannin", but if fabric/stain confidence is LOW the app FAILS CLOSED and asks one more question. Precision without dangerous overconfidence.
- Vision output is a HINT into intake, never a verdict; care-label flags (no-bleach/dry-clean-only/no-heat) propagate as hard constraints, never overridden by a stain-photo guess.

## ⚠️ OVERRIDES — READ LAST, THESE WIN (Atlas 2026-06-08)
These supersede any conflicting rule above (esp. the strict "no green anywhere" in the plan/guardrails).

1. GREEN: "green-free" = clean premium brand, NOT anti-green. GONR OWNS green as its expert / safe-action color. Green is permitted for: brand identity, expert framing, and a genuinely-safe verified action (calm, premium — never neon SaaS).
   - SAFETY GUARDRAIL THAT STILL HOLDS: danger states never read green. Do-Not-Do, stop-use-pro, do_not_attempt, fail-closed, and material warnings use hot-pink/amber/red severity — never green, never softened. Green must never be the signal that overrides or visually competes with a prohibition. A safe-action green and a do-not-do must be unmistakably different.

2. CONSUMER BRAND PRINCIPLES (premium fabric-care brand with an intelligent tool attached — NOT "an AI stain app"):
   - clean, calm, beautiful; free utility first; teaches without overwhelming; protects garments before selling anything; builds trust for future products.
   - Brand language: premium CPG on the surface, textile intelligence underneath, professional credibility in the bones.

## ✅ PREVIEW GATE (Atlas-locked definition of done — the build is not done until ALL pass)
- /solve-v2 runnable
- real /api/solve payload + result shown (NOT mock)
- Do-Not-Do pulled from card.safetyMatrix.neverDo / materialWarnings
- no signup wall (solve first, then offer save/outcome)
- data rep logged (what happened → fabric/care → prior treatment → risk → answer → outcome)
- typecheck clean (npx tsc --noEmit)
- consumer safety suite 39/39
- visual-pass screenshots
