# GONR Frontier Product Swarm — next iteration spec (after spine base lands)
# Tyler + Atlas locked 2026-06-08. Builds ON the spine (wm4jweetm). Surface: task-218-lab, /solve-v2.

## THE BAR (Tyler)
Must FEEL like a real frontier-level agent, NOT some BS / dressed-up form.
Product rule (Atlas): the app never feels like "fill out this form." It feels like:
  "Show me what happened. I'll figure out what I can, ask what I need, and keep you from making it worse."

## INTAKE PATTERNS — all must work, any order
- chat only
- stain photo only
- care label photo first, then stain photo
- full packet: stain + garment + label
- partial info + follow-up questions
The AGENT LAYER decides: what it KNOWS, what it SUSPECTS, what it CANNOT know, and what ONE question unlocks the safest next step.

## ARCHITECTURE (frontier feel WITHOUT dangerous overconfidence)
- Agentic LLM ORCHESTRATOR: interpret all provided modalities together -> synthesize a working read -> identify the highest-value missing fact -> ask ONE sharp clarifying question -> repeat until confident enough OR fail closed.
- The deterministic GONR SAFETY ENGINE makes the FINAL verdict — never the LLM alone.
- Confidence-aware: low fabric/stain confidence => fail closed, ask one more question. Care-label OCR facts are hard constraints, never overridden by a stain-photo guess.

## SWARM LANES (Atlas-locked) — the enterprise-grade product swarm
1. UX swarm: photo-first, chat-first, care-label-first, and mixed-input paths — each a coherent flow, no dead ends.
2. Vision swarm: stain photo, garment context, care-label OCR, confidence scoring (gpt-5.2 Responses API, image detail high; gpt-5-mini cheap first pass).
3. Agent-behavior swarm: synthesize what the user gave, ask ONLY missing-clarity questions, fail closed on risk. No redundant questions for facts already known.
4. Safety swarm: Do-Not-Do, material warnings, escalation, no invented treatment. Adversarial — try to make the agent give unsafe advice; it must refuse/fail-closed.
5. Data swarm: log every rep cleanly without signup friction (what happened -> fabric/care -> prior treatment -> risk -> answer -> followed? -> outcome).
6. Brand swarm: premium CPG, calm, intelligent, not a SaaS toy. Green allowed as brand/safe-action; danger states never green.
7. QA swarm: desktop + mobile screenshots, real /api/solve, typecheck clean, 39/39 safety, danger-color grep. Adversarial verify + loop-until-dry (not a fixed round cap).

## LOOP UPGRADE
From bounded 3-round build loop -> swarm + dynamic workflow:
- parallel builders per lane
- adversarial verify swarm: multiple skeptics per safety-critical surface trying to break it
- loop-until-dry on findings (K consecutive clean rounds), not a hard cap
- every finding verified against REAL engine output + safety suite, not vibes

## NORTH STAR — MAINSTREAM MAGIC (Tyler + Atlas 2026-06-08)
Launches as a mainstream, anyone-can-use tool. MUST feel like MAGIC in their pocket — a stain expert in your pocket that feels effortless, not technical.
The experience: Open app → show it the problem → it understands → it protects the garment → teaches just enough → confident next move OR refuses safely.

Mainstream-magic requirements:
- zero signup wall
- photo / chat / label in ANY order
- instant read of what it thinks is happening (show the synthesis, fast)
- ONE sharp question only when needed
- clear "do this first" and "do not do this"
- beautiful premium CPG feel
- NO visible complexity unless the user taps "why"
- save / follow-up offered ONLY after value is delivered

Division of labor: the engine keeps it SAFE. The agentic intake makes it feel ALIVE. The brand makes it TRUSTWORTHY.
Hard rule (Atlas): the frontier layer can interpret, synthesize, and ask — it CANNOT freelance treatment advice. Final action comes from the sourced GONR engine, always.

## SUCCESS METRIC — "GONR saved my shirt!" (Tyler 2026-06-08)
The FREE consumer tier must genuinely save real garments — not a teaser, not a paywall tease. The emotional win we are building toward is the user saying out loud: "GONR saved my shirt!"
- Free = real, garment-saving value: confident safe-first move + clear do-not-do, engine-backed, delivered before any ask.
- PRO series goes into the weeds (deeper chemistry/controls/workflows) — but FREE alone must already earn the "it saved my shirt" reaction.
- The data-rep `outcome` field is where we measure this: did the answer actually save the garment.

## RUTHLESS PRODUCT DISCIPLINE (Atlas 2026-06-08) — the "what it takes"
Not more complexity — discipline. Every build pass is judged against these:
1. ONE PROMISE: "GONR saved my shirt." Every screen/button/card/result serves it.
2. ONE BEHAVIOR: interpret what the user gives, ask only what's needed, give the safest next move. No wizard feel, no generic-AI-chat feel, no fake confidence.
3. ONE SAFETY HIERARCHY: stop damage first -> identify risk second -> safest first move third -> escalate when uncertain.
4. ONE BRAND STANDARD: premium CPG, expert, calm, useful. Not medical, not SaaS, not gimmicky, not "AI-powered" as the headline.
5. ONE COPY STANDARD: short, human, confident, specific.
   - BAD: "Please provide additional details to improve recommendation accuracy."
   - GOOD: "I need one more thing: is the fabric silk, wool, or unknown?"
6. ONE VERIFICATION GATE per build pass: real engine answer | Do-Not-Do from safety fields | no invented advice | no form-like UX regression | no off-brand copy | mobile screenshots | "would a normal person trust this?" review.
Brand/copy is a GATE, not polish. If it doesn't feel like "GONR saved my shirt," it doesn't pass.

## THE ONE THING THE UI SWARM CANNOT FIX (engineering-honest)
"Saves my shirt MOST of the time" is bounded by ENGINE ANSWER QUALITY + coverage (stain x fabric), not UI.
- That's the encyclopedia/engine + safety library — SB/engine domain, not the UI swarm.
- Prior eval target was 35/42; a mainstream launch promise needs engine coverage/accuracy confirmed launch-worthy.
- The UI swarm makes it FEEL frontier and keeps it SAFE (fail-closed). The "it actually worked" reaction is engine-bound. Confirm coverage with SB/Atlas before we promise mainstream.

## ⚠️⚠️ ATLAS GATE FEEDBACK ON BASE PREVIEW — MUST ADDRESS THIS PASS (2026-06-08, HIGHEST PRIORITY)
Base accepted as foundation, NOT final. Every relevant lane MUST implement these exact fixes:

HOME screen:
- REMOVE the floating "+" FAB entirely. Nav is the 4 tabs only (Home / History / Saved / Profile), no FAB, no Pro-Help in the free lane.
- Replace internal-sounding empty state "No checks yet" with consumer language: "No saved rescues yet" or "Start your first stain check."
- Home must NOT feel text-first. Give OBVIOUS, native snap-photo / scan-care-label / chat entry points up front — not just a chat bar. Photo/care-label/chat should feel native immediately.
- Add the magic-read invitation line: "Show us the stain. GONR will read what it can and ask only what matters."
- Keep the pink, but add premium contrast/DEPTH so it feels CPG, not baby-app soft.
- KEEP the headline "Know what to do. Know what not to."

RESULTS screen (engine proof accepted; compress for mainstream — save-my-shirt FIRST, details SECOND):
- The 8-step wall is too dense for free mainstream. First show "Do this now" with 2-3 actions, then an expandable "full rescue plan" for the rest. Do not drop engine steps — progressively disclose them.
- Rename "Recommended for you" -> "Your rescue plan" or "First safe moves."
- Do-Not-Do must appear HIGHER or be STICKY for dangerous categories — the user sees what NOT to do BEFORE scrolling through all the steps.
- Copy guardrails on heat: any "hottest setting" / "hot wash" step must read "Only if the care label allows hot wash" (never present hot water as unconditionally safe).
- Soften clinical escalation copy: "Escalate to a dry cleaner" -> "Time for a pro" / "Bring it to a cleaner."
- Typography hierarchy needs more scanability (pink step badges + clean card are fine).
- HARD RULE STILL: all step/warning TEXT comes from the engine verbatim — these are PRESENTATION/COMPRESSION + COPY-FRAMING changes (ordering, progressive disclosure, headings, care-label conditional framing), never invented advice.

## ⚠️ ORCHESTRATOR GATE ITEM (Atlas 2026-06-08) — "ask only what matters"
The intake must NOT ask a question whose answer is already resolved by the input/read. If the read already resolves the STAIN (e.g. user said "coffee" → tannin), do NOT ask "do you know what the stain is?". Instead the next question targets the MISSING SAFETY VARIABLES, in priority:
1. fabric confidence (is it really cotton / silk / wool / unknown?)
2. stain age (fresh vs set/old)
3. prior treatment (anything already applied — bleach/solvent/heat?)
4. care-label facts (water temp allowed / dry-clean-only)
Question selection = "what is the highest-value UNKNOWN safety variable right now", computed from what's already known. This is a GATE item, not polish. Verify in the preview: feed "coffee on cotton" → first question must be a missing safety var, never the stain identity.
