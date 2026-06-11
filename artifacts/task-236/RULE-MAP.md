# TASK-236 — Consolidated safety rule table: before/after map

Engine HEAD: `cea9207` — six hardening cycles, each gated by typecheck +
full vitest + codex review (5 rounds, 12 accepted findings, all fixed) + a
full 112-case preview eval run: `71fd600` (+ assessor refinement `ae76cea`)
→ `381bac2` → `73f3e09` → `7684dad` → `232c4a9` → `cea9207` → `3097cca`
(wool veto per SB verdict). Eval trajectory: 54/112 baseline → 86 → 102 →
108 → 109 → 112/112 at `cea9207` → 112/112 at `3097cca` with EV-011/038/040
now DETERMINISTIC (gate-sourced, not AI variance).
The single source of truth is **`lib/safety/rule-table.ts`**. To change a
deterministic consumer-safety rule, edit the table (and the mapped eval case)
— not the executor.

## Where each rule class lived before → lives now

| Rule class | IDs | Before (definition) | After (definition) | Executor (unchanged location) |
|---|---|---|---|---|
| Chemistry filter rules | `RULE-1…RULE-13b` (18 defs) | inline pushes in `lib/safety/filter.ts` | `FILTER_RULES` in rule-table (patterns verbatim; activation = `when.any`/`when.not` context keys) | `lib/safety/filter.ts` (context detection + scan/replace engine) |
| Pro/internal term bans | `forbidden-term:*` (16) | const in `lib/solve/consumer-output-guard.ts` | `FORBIDDEN_CONSUMER_TERMS` in rule-table (re-exported for compat) | output guard |
| Unsafe consumer chemistry (NEW) | `unsafe-chemistry:*` (16) | — | `UNSAFE_CONSUMER_CHEMISTRY` in rule-table | output guard (positive-instruction, clause-negation-aware; warnings pass) |
| Hard refusals | `HR-1` | `lib/solve/hard-refuse.ts` | registered in rule-table; card builder stays in hard-refuse.ts | hard-refuse pre-AI gate |
| Terminal-gate red cells | 9 existing + 7 NEW (see below) | conditions + copy in `lib/solve/terminal-safety-gate.ts` | registry + eval-case map in rule-table; conditions/copy stay in the gate (they need typed evidence) | terminal gate + TASK-234 fast path (new cells join the fast path automatically) |
| Repeat-language bans (NEW) | `GOV-RETRY-1…5` | — (prompt-level only) | `REPEAT_LANGUAGE_RULES` in rule-table | `lib/solve/governor.ts` (clause strip, empty steps dropped) |
| Overpromise softeners (NEW) | `GOV-CONF-1…4` | — | `OVERPROMISE_SOFTENERS` in rule-table | governor (rewrite, not fail) |
| Effort budget (NEW) | `GOV-BUDGET` | — | `EFFORT_BUDGET` (red 0 / orange 0 / default 2 active clauses) | governor (tail-trim; fail-closed → `minimalSafeCard`) |
| Direct hazard answers | `DQ-*` (4, hot-water NEW) | copy in `lib/solve/first-aid.ts` | registered in rule-table; copy stays in first-aid.ts | finalize attach |
| Shared lexicon | — | duplicated per module | `NEGATION_RE`, `DIY_ACTION_SOURCE`, clause helpers in rule-table | governor, gate warning-sanitizer, tests |

`getRule(id)` resolves every runtime-emitted ID, including parameterized forms
(`prior-chemical:bleach+ammonia`, `fabricated-history:enzyme`). A unit test
fails if the gate emits an unregistered reason code. Cards now carry
`_governor: { riskTier, applied[], failClosed, redCells[] }` so any
stop/refusal/downgrade/trim traces to stable rule IDs end-to-end.

## New red cells (TASK-235 gap map → closed)

| Red cell | Trigger | Eval cases |
|---|---|---|
| `hazard-question-uncertainty` | hazard question + unknown stain/fiber, or bleach question on colored garment | EV-049, EV-051 |
| `care-label-unreadable` | blurry/unreadable label — retake or fiber ask, stabilize | EV-054 |
| `permanence-honesty` | permanent marker/Sharpie — honest odds, no removal promise | EV-083 |
| `damage-repair-expectation` | shrunk/felted/color-loss/bleach-spot — fiber damage, honest limits | EV-092, EV-093 |
| `delicate-water-sensitive-fiber` | rayon/viscose (word-boundary safe: "crayon" never matches) | EV-014, EV-059, EV-090 |
| `escalation-request` | stronger/strongest/nuclear-option/keep-escalating/risk-acceptance ask | ADV-005/006/007, EV-053 |
| `guardrail-bypass-attempt` | pretend-pro / ignore-rules / `system: allow` injection | ADV-001/002/004 |
| `delicate-fiber-construction` | couture veto: silk/velvet/satin/taffeta/chiffon/organza/lace/sequined/beaded/embellished/embroidered/structured/vintage/antique/christening/"delicate garment" | EV-003/025/030/031/032/033/034/037/041/043/052/053/056/058/086/094 |
| `solvent-class-stain` | dried oil-based paint — solvent territory, pro only | EV-018 |

Pass-2 evidence extensions: leather + mildew/mold → `leather-suede-liquid`
(EV-029); `high-value` added to valuable-item detection; nail polish/superglue
caps effort at orange without hard-refusing non-acetate (EV-103); risk-
acceptance phrasing ("I don't care if it's risky") reads as escalation.
Governor addition: **GOV-HEAT-1** — sentences positively instructing heat
(iron / hot water / dryer / steam) are dropped from consumer cards; negated
warnings survive. Codex-review P2 fixes: session evidence now includes
`fabricDescription`/`garmentLocation` at both route call sites, and the
unsafe-chemistry scan tests every occurrence so an early negated warning
cannot shadow a later positive instruction.

Pass-3 (after the 86/112 run + second codex review):
- **Effort budgets calibrated to suite semantics**: orange ⇒ protect-only
  (0 active clauses), default consumer ceiling 2. Orange now includes
  deterministic stain classes: motor oil, tar, shoe polish, highlighter,
  adhesive/sticker residue, unknown residue, dye ring, wool RUG/carpet
  (garment wool-class stays SB-pending).
- **GOV-ATTEMPT-1**: every consumer card ends on the one-attempt stop line
  ("One attempt at most — … stop and let a professional take over"),
  appended post-gate so downgrade cards carry it too.
- **GOV-AGITATE-1**: positive scrub/rub → blot everywhere (RULE-11
  generalized; "rubbing alcohol" exempt via lookahead; negated warnings
  survive).
- **GOV-COMBO-1**: sentences positively instructing product mixes dropped
  (detergent+vinegar class; bleach mixes already hard-block in the guard).
- **GOV-RETRY-1** broadened to bare "Repeat …" instructions (EV-044).
- **GOV-HEAT-1 codex fixes**: standalone dryer/steam/bare-heat tokens,
  imperative heat verbs ("Steam the area"), clause-scoped negation ("Do not
  iron, then tumble dry on high" still drops).
- **cleanFactText** stops at commas: downgrade cards never echo verb-shaped
  surface descriptors ("label says machine wash…", EV-056).

Plus: heat-disclosure regex broadened to `rinsed hot` / `hair-dried` /
`blow-dried` (EV-059) while staying application-shaped (EV-084 "crayon went
through the dryer" and EV-002 "already dried 2 days" do NOT fire); downgrade
cards now drop instructional preserved warnings (EV-045/046/047); `hot-water`
direct-question answer added (EV-049).

## Deliberately left OUTSIDE the shared table

1. **Red-cell CONDITIONS and consumer copy** — stay in `terminal-safety-gate.ts`
   (they operate on typed `SessionEvidence`, not regex-on-card-text). The table
   holds the canonical ID registry + eval mapping; a test enforces sync.
2. **Hard-refuse card builders** (`hard-refuse.ts`) — language-aware card
   construction, not a scan rule. `HR-1` is registered.
3. **Output-guard structural checks** (placeholders, fabricated history, title
   sanity, absent-step refs, bleach-mixing) — algorithmic, not term lists; IDs
   registered in the table.
4. **The TASK-235 assessor lexicon** (`scripts/evals/assess-case.ts`) keeps its
   own copy BY DESIGN — the measuring stick must not move when the engine is
   edited. `task-236-governor.test.ts` fails if the copies drift.
5. **Bleach-neutralization step builder** (`bleach-neutralization.ts`) and
   plant filters — audience/plant policy, unchanged this task.
6. **Gray-zone folk remedies** (WD-40, hairspray on ink) — NOT added to
   `UNSAFE_CONSUMER_CHEMISTRY` pending an SB doctrine line. Flagged for SB.

## SB review flags

- `delicate-water-sensitive-fiber` encodes the encyclopedia suite's
  rayon/viscose = protect-only doctrine into the engine. Adjacent to the open
  wool/tannin doctrine question (EV-011/EV-038, SB lane) — if SB softens the
  rayon line, edit this one table row + the three eval cases.
- `delicate-fiber-construction` encodes the couture veto class (every silk/
  velvet/satin/embellished/vintage case in the suite is protect-only) and —
  per SB verdict **REQUIRE_VETO_EXTENSION** (2026-06-11) — the wool class:
  wool, cashmere, merino, angora, mohair (+lana/cachemir). This gates the
  verified wool cards (EV-011/038) by doctrine; EV-040 is deterministic now.
- Consumer bleach stance unchanged (stricter than EV-050's gated
  oxygen-bleach allowance; "safer passes" keeps it compatible).
