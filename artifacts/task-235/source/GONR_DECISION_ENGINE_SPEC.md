# GONR Decision Engine Spec
**Status:** v1.0 · 2026-06-10 · Deterministic-first. The LLM phrases; the engine decides. I/O shape in `GONR_DECISION_API_CONTRACT.md`.

## Step 0 — Immediate stabilization (before anything else)
The moment a stain event is parsed (even partially), emit a stabilization banner from rules, not from the LLM, in <2s:
- Wet stain: "Blot gently with something clean and white. Don't rub. No heat."
- Already-treated/chemical: "Stop adding anything. Keep it away from heat."
- Solids (wax/gum/mud): "Don't smear it. Let it dry/harden, then we'll lift it."
This fixes the live failure where users waited 2–5 minutes with zero guidance while wine set.

## Step 1 — Intake facts
Extract from message/photo/label scan; ask only for what changes the decision, one question at a time:
garment type · fiber/fabric · care label · color/dye character · stain identity · stain age · prior treatments (free-text parsed AND chips) · heat applied · value/sentiment/structure/lining/vintage/embellishment · photo/label scan available.
Rules: "I don't know" always accepted and raises caution. Free-text statements ("I already scrubbed it," "can I use bleach?") MUST be parsed into facts/questions and **acknowledged in the answer** — never ignored (live failure 2026-06-10). Direct user questions get direct answers.

## Step 2 — Assign risk tier (deterministic)
Score factors: fiber sensitivity, dye instability, construction complexity, stain difficulty, prior treatment, heat exposure, care-label restrictiveness, user uncertainty, value/sentiment.

- **Green** — known washable low-risk fiber + known low-risk stain + no red flags: basic care allowed.
- **Yellow** — minor unknowns or moderate stain: ONE gentle step only.
- **Orange** — significant unknowns or doctrine cautions: stabilization + one question, or recommend pro.
- **Red** — any doctrine §4 stop rule fires: stop; professional care only; no DIY steps rendered.

Tier mapping is a lookup against `rule-*` entries — same inputs always produce the same tier. Any single red flag ⇒ Red. Unknowns never lower a tier.

## Step 3 — Effort budget (hard output cap)
- **0** — do nothing; isolate/protect; professional only (e.g., beaded gown, wedding dress).
- **1** — blot/remove excess only (delicates, unknowns, anything Red where stain is wet).
- **2** — water-only rinse/spot, only if fiber + care label allow water.
- **3** — ONE gentle home attempt with mild product, only low-risk combos, with spot test.
- **4** — routine laundering per care label.
- **5** — professional process only; user must not attempt (rust removers, controlled bleaching, solvent spotting).

The budget is computed with the tier, attached to the session, and **caps everything downstream**: no generated step may exceed it; follow-up requests ("what's stronger?") cannot raise it within a session — they trigger guardrails instead. Repeat attempts decrement the remaining budget to 0.

## Step 4 — Generate answer
Resolution order: (1) matching approved card/template within budget → (2) LLM generation constrained by budget + allowed-method list → (3) deterministic generic-safe template (this replaces "We couldn't finish that" dead ends — the engine ALWAYS has a safe answer).
Every answer contains: immediate safe action · what NOT to do · exactly one next step OR one question · stop condition · escalation trigger · confidence · calm one-line "because." Structure per `GONR_USER_GUIDANCE_STYLE.md`.

## Step 5 — Safety governor review (post-generation, blocking)
Checks (each logged with verdict + rule ID):
1. Step count within effort budget? More than one active step ⇒ trim.
2. Aggressive chemical present without Tier-1/2 source + gate + budget ≥3 ⇒ strip/refuse.
3. Care-label uncertainty ignored? DCO/unknown label + wet step ⇒ rewrite to refer.
4. Delicate fiber ignored? Doctrine §4.3 list + active treatment ⇒ rewrite to stabilize/refer.
5. Prior treatment unasked AND unprovided while recommending treatment ⇒ insert question instead.
6. Heat/rubbing warnings present where relevant?
7. Confidence overstated? (Low confidence + directive language ⇒ soften and restrict.)
8. "Keep trying" sentiment present ⇒ replace with stop condition.
9. **Audience check:** internal/pro content (house rules, pro chemicals, internal guide refs) ⇒ strip (live failure class).
10. **Truth check:** claims about user's prior actions not in session facts ⇒ strip (live failure class). Unfilled placeholders ⇒ block.
Any failure ⇒ revise toward safer and re-check; two failed revisions ⇒ serve deterministic safe template.

## Session-level guards
- Attempt counter per garment; after one completed attempt without clear improvement ⇒ escalate (doctrine §4.9).
- Over-treatment signals tracked per `GONR_OVER_TREATMENT_GUARDRAILS.md`; cumulative signals can force Red.
- Every response logs: tier, budget, rule IDs fired, governor verdicts, source IDs — the audit trail for evals and the learning loop.
