// GONR Safety Reference Library — Static Chemical Compatibility Profiles
// Generated: 2026-03-17
// Categories: fibers, leather, carpet, marine, auto, hard_surfaces, sneaker
(function() {
var SAFETY_PROFILES = [

  // ─── FIBERS ──────────────────────────────────────────────────────────────

  {
    "id": "silk",
    "material": "Silk",
    "materialClass": "Protein Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Cool water (distilled)", "note": "Silk is water-soluble stain friendly when cool; heat causes irreversible fiber swelling and color loss"},
      {"name": "Mild pH-neutral soap (e.g., Ivory, Woolite)", "note": "pH 6–7 preserves the sericin protein coating and maintains fiber luster"},
      {"name": "White wine vinegar (diluted 1:4)", "note": "Mild acid (pH ~3.5 diluted) helps neutralize alkaline residues and brightens dulled silk without fiber damage"},
      {"name": "Enzyme cleaner (protease-free, e.g., Biokleen Bac-Out diluted)", "note": "Amylase and lipase enzymes are safe; avoid protease variants which digest silk's protein backbone"},
      {"name": "Club soda / carbonated water", "note": "CO₂ bubble action lifts fresh stains mechanically; neutral pH does no chemical damage"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (sodium hypochlorite)", "note": "Oxidizes and severs disulfide bonds in silk's fibroin protein — causes permanent yellowing and catastrophic fiber dissolution"},
      {"name": "Hydrogen peroxide (>3%)", "note": "Strong oxidizer bleaches the amino acid chromophores; can turn white silk yellow and weaken fiber structure irreversibly"},
      {"name": "Alkaline detergents (pH >8, e.g., OxiClean, washing soda)", "note": "Saponifies the sericin protein coating, strips natural luster, and causes fiber felting/shrinkage"},
      {"name": "Acetone / nail polish remover", "note": "Dissolves silk's sericin coating and can strip dye — causes permanent dull patches"},
      {"name": "Ammonia-based cleaners (e.g., Windex)", "note": "Ammonia (pH ~11) hydrolyzes peptide bonds in silk protein, causing irreversible fiber degradation and loss of sheen"},
      {"name": "Protease enzyme cleaners (e.g., Zout, Biz)", "note": "Proteases are specifically engineered to break down proteins — silk IS a protein, so these digest the fiber itself"}
    ],
    "testFirst": [
      {"name": "Rubbing alcohol (isopropyl)", "note": "Can strip acid dyes common on silk — test on hidden seam before using on ink or grease stains"},
      {"name": "Dry-cleaning solvent (perchloroethylene)", "note": "Most silks are dry-clean safe, but highly embellished or weighted silks may have solvent-sensitive finishes"}
    ],
    "phRange": "4.5 – 7.0",
    "temperatureMax": "86°F / 30°C",
    "warnings": [
      "Never wring or twist wet silk — the fiber is weakest when wet and will distort permanently",
      "Water spotting on silk is caused by mineral deposits from tap water — always use distilled water",
      "Heat from a dryer or iron set above 'silk' setting causes irreversible fiber fusion and glazing",
      "Perspiration (alkaline when aged) slowly destroys silk — treat underarm stains immediately before pH rises"
    ],
    "proTip": "Weighted silk (common in vintage scarves and ties) contains metalite salts added during manufacturing to increase apparent weight and sheen — these salts cause the fabric to shatter and split with ANY moisture, solvent, or mechanical stress. If you see fine cracks in silk along fold lines, stop and advise dry-clean only with a specialist. No amateur spotting."
  },

  {
    "id": "wool",
    "material": "Wool",
    "materialClass": "Protein Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Cool water (distilled)", "note": "Wool felts with heat + agitation; cool water minimizes scale-raising on the cuticle and prevents irreversible fiber interlocking"},
      {"name": "Woolite / pH-neutral wool wash", "note": "Formulated pH 6–7 to avoid alkaline hydrolysis of keratin protein; surfactant blend is gentle on the cuticle layer"},
      {"name": "White wine vinegar (diluted 1:4)", "note": "Mildly acidic; closes raised cuticle scales after washing, prevents dulling, and neutralizes alkaline detergent residue"},
      {"name": "Glycerin (neat)", "note": "Safe humectant for loosening dried, set stains on wool without solvent damage; works by rehydrating and relaxing the dried residue"},
      {"name": "Dish soap (Dawn Original, diluted)", "note": "pH ~7; effective on grease and oil stains — wool's natural lanolin makes it somewhat oil-compatible and Dawn's degreasing action works without fiber damage at low concentration"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (sodium hypochlorite)", "note": "Destroys keratin protein via oxidative attack on disulfide bonds — wool dissolves in concentrated bleach within minutes"},
      {"name": "Oxygen bleach (OxiClean, sodium percarbonate)", "note": "Oxidizers attack the disulfide cross-links in keratin, weakening fiber strength and causing irreversible yellowing in high concentrations"},
      {"name": "Alkaline detergents (pH >8, e.g., washing soda, Tide original)", "note": "Saponifies lanolin and hydrolyzes peptide bonds in keratin — causes fiber swelling, felting, and permanent shrinkage"},
      {"name": "Protease enzyme cleaners (Zout, Biz, Persil Bio)", "note": "Wool is keratin (protein) — protease enzymes are designed to break down exactly this structure; will cause fiber dissolution"},
      {"name": "Hot water (>100°F / 38°C)", "note": "Heat raises and opens cuticle scales; combined with any agitation causes irreversible felting — fibers interlock and the fabric shrinks dramatically"},
      {"name": "Ammonia-based cleaners", "note": "Strongly alkaline (pH 10–11) — raises cuticle scales, causes dye bleeding, and hydrolyzes keratin over time"}
    ],
    "testFirst": [
      {"name": "Rubbing alcohol (isopropyl 70%)", "note": "Safe on most wools but can strip reactive dyes used on bright-colored or hand-dyed wool — test before using on ink stains"},
      {"name": "Dry-cleaning solvent (Carbona, K2r)", "note": "Safe on most wool but wool flannel and some hand-woven wools have unstable finishes — test on inner seam allowance"}
    ],
    "phRange": "4.5 – 7.0",
    "temperatureMax": "100°F / 38°C",
    "warnings": [
      "Wool felts from the combination of heat + moisture + agitation — any one alone is less risky, but all three together are catastrophic",
      "Never rub wool when wet — blot only; the cuticle scales interlock permanently under friction",
      "Dried food stains on wool should be rehydrated with cool water before any mechanical action to avoid fiber breakage",
      "Moth damage (from larvae) weakens wool fiber invisibly — pre-treat stored wool with cedar or lavender before spotting attempts"
    ],
    "proTip": "When treating a set protein stain (blood, egg, dairy) on wool, the instinct is to use warm water to dissolve it — that's the wrong move on two counts: heat sets protein stains AND raises wool's cuticle. Always work with cool water and a neutral enzyme detergent specifically without protease. The stain will release slowly but the fiber stays intact."
  },

  {
    "id": "cashmere",
    "material": "Cashmere",
    "materialClass": "Protein Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Baby shampoo (e.g., Johnson's No More Tears)", "note": "pH ~7, fragrance-free versions are essentially ideal cashmere wash — same gentle surfactant action as Woolite but more universally available"},
      {"name": "Distilled cool water", "note": "Cashmere fibers are 14–19 microns — much finer than wool — making them even more susceptible to mineral deposits and heat damage; distilled water is non-negotiable"},
      {"name": "Woolite (original)", "note": "pH-neutral, protein-fiber-safe surfactant blend formulated specifically to avoid alkaline hydrolysis of delicate keratin fibers"},
      {"name": "White wine vinegar (diluted 1:6)", "note": "Final rinse acidifier that closes the cuticle and restores cashmere's signature soft hand feel; prevents static and pilling"},
      {"name": "Glycerin solution (5% in water)", "note": "Rehydrates dried stains safely and softens fiber; useful for dried milk, cream, and food stains on cashmere without solvent risk"}
    ],
    "unsafeChemicals": [
      {"name": "Any chlorine bleach (sodium hypochlorite)", "note": "Dissolves keratin protein — cashmere's ultra-fine fiber diameter (14–19 microns) means it dissolves even faster than wool"},
      {"name": "Protease enzyme detergents (Persil Bio, Biz)", "note": "Cashmere is pure protein — protease enzymes specifically target and cleave peptide bonds, rapidly destroying fiber integrity"},
      {"name": "Alkaline cleaners (pH >8)", "note": "The finest cashmere fibers have proportionally more surface area than coarser wools, making alkaline attack faster and more damaging"},
      {"name": "Rubbing alcohol (isopropyl)", "note": "Strips dyes common in dyed cashmere — causes immediate, permanent bleaching or color shift; especially damaging on dark or jewel-tone cashmere"},
      {"name": "Acetone", "note": "Dissolves the lanolin and any finishing agents, and strips dye — causes severe irreversible color loss and fiber stiffness"},
      {"name": "Commercial stain removers (Resolve, Shout)", "note": "Most contain pH >8 surfactants, optical brighteners, or enzymes incompatible with protein fibers — cause yellowing and fiber degradation"}
    ],
    "testFirst": [
      {"name": "Dry-cleaning solvent (perchloroethylene)", "note": "Safe on most cashmere but certain print and hand-dyed cashmeres use solvent-sensitive dyes — test before treating embellished pieces"},
      {"name": "Diluted dish soap (Dawn 1:10 in water)", "note": "pH of neat Dawn (~7) is safe, but some formulations contain optical brighteners or enzymes — test diluted solution on inner seam first"}
    ],
    "phRange": "4.5 – 6.5",
    "temperatureMax": "86°F / 30°C",
    "warnings": [
      "Never hang wet cashmere — the water weight stretches the fiber permanently; always dry flat on a clean towel",
      "Pilling on cashmere is caused by fiber breakage from abrasion — avoid scrubbing; blot only",
      "Cashmere should be stored in breathable cotton bags, never plastic — trapped moisture accelerates moth damage and fiber weakening",
      "Even lukewarm water (>86°F) combined with slight agitation will felt cashmere — temperature discipline is critical"
    ],
    "proTip": "The hand feel of cashmere comes from the fiber's intact scale structure. Once you've stripped it with alkaline cleaners or bleach, no amount of fabric softener restores it — the scales are permanently raised and damaged. For customers asking why their cashmere 'isn't soft anymore after washing,' this is always the answer: pH damage. The only partial fix is a high-quality conditioner rinse and very careful blocking — but it's never back to new."
  },

  {
    "id": "cotton",
    "material": "Cotton",
    "materialClass": "Cellulose Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Oxygen bleach (OxiClean, sodium percarbonate)", "note": "Oxidizes chromophores in stains safely on cellulose; cotton has no protein structure to damage — effective on organics, wine, coffee, and blood"},
      {"name": "Chlorine bleach (sodium hypochlorite) — WHITE cotton only", "note": "Cotton is cellulose and withstands hypochlorite well at proper dilution (1:10); destroys chromophores — DO NOT use on colored cotton"},
      {"name": "Alkaline detergents (Tide, Persil, washing soda)", "note": "Cotton is alkali-stable — pH up to 12 does not damage cellulose; alkaline conditions improve surfactant action and stain lift"},
      {"name": "Enzyme cleaners (protease, amylase, lipase)", "note": "Cotton has no protein — protease is safe; amylase attacks starch stains (grass, food), lipase handles grease — full enzyme spectrum is appropriate"},
      {"name": "Hydrogen peroxide (3%)", "note": "Safe bleaching alternative to chlorine; oxidizes color bodies in stains without the chlorine residue that causes yellowing over time"},
      {"name": "Rubbing alcohol (isopropyl 70%)", "note": "Safe solvent for ink, grease, and adhesive removal on cotton; cellulose is resistant to alcohol at standard concentrations"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach on colored cotton", "note": "Hypochlorite destroys reactive and direct dyes used on cotton — causes immediate and irreversible bleaching"},
      {"name": "Acetone (on acetate-cotton blends)", "note": "If acetate fiber is present in the blend, acetone dissolves it — always verify fiber content before using"},
      {"name": "Strong acid (pH <3, e.g., undiluted vinegar, muriatic acid)", "note": "Cellulose hydrolyzes under strong acid — causes fiber embrittlement and 'tendering' where the fabric disintegrates in the wash"},
      {"name": "Chlorine bleach on elastic/spandex blended cotton", "note": "Bleach rapidly degrades spandex/elastane in stretch cotton — causes immediate loss of stretch recovery"},
      {"name": "High-heat dry on certain cotton finishes", "note": "Wrinkle-resistant (DP) cotton contains resin finishes — heat above 150°F can cause resin yellowing"}
    ],
    "testFirst": [
      {"name": "Chlorine bleach on off-white or cream cotton", "note": "Optical brighteners and bluing agents in 'white' fabrics can react unexpectedly — test before full bleach treatment"},
      {"name": "Acetone on printed cotton", "note": "Screen-print and transfer inks are solvent-based — acetone can lift or smear the print; test on edge of design"}
    ],
    "phRange": "6.0 – 10.0",
    "temperatureMax": "140°F / 60°C (hot wash); 212°F / 100°C (boil-proof for white cotton)",
    "warnings": [
      "Never apply chlorine bleach to colored cotton — the dye destruction is instantaneous and irreversible",
      "Cotton shrinks up to 5–10% in hot water — pre-shrink before spot treating if garment fit matters",
      "Acid-based removers (some rust removers, certain stain sticks) can tender cotton over time — always rinse thoroughly"
    ],
    "proTip": "Cotton is forgiving but 'acid tendering' is a real failure mode that beginners miss entirely. Certain commercial stain treatments and rust removers contain oxalic or hydrofluoric acid — these work perfectly on the stain but leave the fiber chemically weakened. The fabric looks fine when it leaves your shop and falls apart on the customer's first wash. Always use pH test strips on unknown spotting chemicals before applying to cotton, and rinse treated areas with a mild alkaline solution to neutralize acid residue."
  },

  {
    "id": "linen",
    "material": "Linen",
    "materialClass": "Cellulose Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Oxygen bleach (OxiClean, sodium percarbonate)", "note": "Safe on linen cellulose; effective on tannin stains (tea, coffee, wine) common on linen tablecloths and napkins"},
      {"name": "Alkaline detergents (Tide, Persil)", "note": "Linen (bast fiber from flax) is highly alkali-stable — pH up to 12 does not damage the cellulose structure"},
      {"name": "Hydrogen peroxide (3–6%)", "note": "Effective bleaching agent for white and natural linen; oxidizes chromophores without chlorine residue"},
      {"name": "White vinegar (diluted 1:3)", "note": "Good for neutralizing alkaline stains and brightening natural-colored linen; also reduces mineral deposits from hard water"},
      {"name": "Enzyme cleaners (full spectrum)", "note": "Linen has no protein — all enzyme types safe; amylase is particularly effective on starch residues from heavy-starch finishing common in fine linen"},
      {"name": "Chlorine bleach (white linen only)", "note": "Linen tolerates hypochlorite at standard dilutions; historically boil-washed and bleached in sunlight — cellulose structure is durable"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach on colored or natural linen", "note": "Destroys fiber-reactive dyes used on linen — causes permanent bleaching; natural 'ecru' linen can also over-whiten unevenly"},
      {"name": "Strong mineral acids (sulfuric, hydrochloric)", "note": "Linen cellulose is more acid-sensitive than cotton due to shorter polymer chain length — acid tendering occurs faster"},
      {"name": "Acetone on linen blends with acetate", "note": "Linen is often blended with viscose or acetate — verify fiber content; acetone destroys acetate"},
      {"name": "Prolonged heat above 250°F (iron setting)", "note": "Linen scorches and yellows permanently at high heat — use steam iron on appropriate setting"},
      {"name": "Bleach on rust-stained linen", "note": "Chlorine bleach oxidizes iron (Fe²⁺ → Fe³⁺), intensifying rust stains instead of removing them; use oxalic acid (Bar Keepers Friend) instead"}
    ],
    "testFirst": [
      {"name": "Rubbing alcohol (isopropyl)", "note": "Most linen dyes are stable to alcohol but some piece-dyed linens use fugitive dyes — test on hem or interior seam"},
      {"name": "Chlorine bleach on 'white' linen", "note": "Natural ecru fibers in linen can bleach unevenly — some sections may go brilliant white while others retain yellow tone"}
    ],
    "phRange": "6.0 – 10.0",
    "temperatureMax": "140°F / 60°C (colored); 212°F / 100°C (white)",
    "warnings": [
      "Linen wrinkles permanently if dried with creases in place — smooth and hang immediately after washing",
      "Never use bleach on rust stains on linen — use oxalic acid (Bar Keepers Friend) instead; bleach sets rust permanently",
      "Linen loses strength when wet — do not wring or twist; roll in a towel to remove moisture"
    ],
    "proTip": "Fine linen tablecloths from estate sales or high-end restaurants are often 'weighted' with starch and sizing that has built up over decades. What looks like yellowing stain is often oxidized starch, not fiber damage. A hot water soak with oxygen bleach and a textile enzyme will strip 30 years of starch buildup and restore brilliant white. Don't let customers assume their heirloom linen is ruined until you've done a full enzyme + OxiClean soak."
  },

  {
    "id": "rayon",
    "material": "Rayon (Viscose)",
    "materialClass": "Regenerated Cellulose Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Cool distilled water", "note": "Rayon is regenerated cellulose that is far weaker when wet — cool water minimizes fiber swelling and distortion"},
      {"name": "pH-neutral detergent (Woolite, Ivory)", "note": "pH 6–7 is ideal; rayon is more sensitive to alkaline conditions than cotton despite both being cellulose-based"},
      {"name": "White wine vinegar (diluted 1:4)", "note": "Mild acid helps neutralize alkaline residue and reduce swelling; safe rinse for rayon"},
      {"name": "Glycerin (neat, then rinse)", "note": "Safe for loosening dried stains on rayon without solvent or mechanical stress — rehydrates the stain for gentle removal"},
      {"name": "Dry-cleaning solvent (perchloroethylene)", "note": "Rayon cleans well with dry-cleaning solvents since they don't swell or weaken the wet fiber; preferred method for delicate rayon garments"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (sodium hypochlorite)", "note": "Severely degrades regenerated cellulose — rayon is less crystalline than cotton and oxidizes more rapidly, causing yellowing and fiber dissolution"},
      {"name": "Oxygen bleach (OxiClean) on colored rayon", "note": "Rayon is dyed with reactive dyes but the dye-fiber bond is weaker than in cotton — OxiClean can strip color while damaging the loosely structured fiber"},
      {"name": "Hot water (>85°F / 29°C)", "note": "Heat causes massive fiber swelling and structural collapse; rayon loses up to 50% of its tensile strength when wet and warm — permanent distortion"},
      {"name": "Mechanical agitation while wet", "note": "Wet rayon fiber is extremely fragile — washing machine agitation causes permanent elongation, distortion, and fiber breakdown"},
      {"name": "Alkaline cleaners (pH >8)", "note": "Rayon's loose cellulose structure is more alkali-sensitive than cotton — alkaline hydrolysis occurs at lower concentrations"},
      {"name": "Acetone", "note": "Although rayon is cellulose, acetone attacks rayon's weaker amorphous fiber regions and can cause surface damage and dye stripping"}
    ],
    "testFirst": [
      {"name": "Rubbing alcohol (isopropyl)", "note": "Rayon is often dyed with fugitive dyes — alcohol can strip color on dark or bright rayon; always test on seam allowance"},
      {"name": "Enzyme spot cleaners (Biz, Zout)", "note": "Check enzyme type — protease is safe on rayon (cellulose, not protein) but some formulations include other actives that can damage the loose fiber structure"}
    ],
    "phRange": "5.5 – 7.5",
    "temperatureMax": "85°F / 29°C",
    "warnings": [
      "Never wring, twist, or agitate wet rayon — it is structurally 50% weaker when wet and will permanently distort",
      "Rayon stretches under its own wet weight — lay flat to dry on a clean towel; never hang",
      "Many 'dry-clean only' labels on rayon exist because water-based cleaning causes shrinkage and distortion, not just dye sensitivity"
    ],
    "proTip": "Rayon's biggest hidden problem is that it absorbs water so readily that a seemingly dry garment brought in for cleaning can have moisture-set stains that look like dye fading or water marks. Before doing any spotting, examine the garment under UV/black light — rayon fluoresces differently in water-affected areas and you can map the original stain boundary before any chemistry disturbs it. This prevents the customer claiming you caused the ring."
  },

  {
    "id": "polyester",
    "material": "Polyester",
    "materialClass": "Synthetic Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Oxygen bleach (OxiClean, sodium percarbonate)", "note": "Safe on polyester's ester linkages at standard concentrations; effective on organic stains — excellent for sweat, food, and biological stains"},
      {"name": "Enzyme cleaners (full spectrum)", "note": "All enzyme types are safe — polyester has no protein or cellulose to degrade; enzymes target only the stain substrate"},
      {"name": "Rubbing alcohol (isopropyl 70%)", "note": "Effective on grease, ink, and many oily stains; polyester's hydrophobic structure is not damaged by alcohols at standard concentrations"},
      {"name": "Alkaline detergents (Tide, Persil, washing soda)", "note": "Polyester is stable to alkaline pH up to ~11; standard laundry detergents are fully appropriate"},
      {"name": "Hydrogen peroxide (3–10%)", "note": "Safe bleaching agent for polyester; effective on dye transfer stains and organic yellowing"},
      {"name": "Dish soap (Dawn)", "note": "Excellent degreaser for oil-based stains on polyester; the fiber's hydrophobic nature traps oil — dish soap's lipase-like action breaks the bond"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone", "note": "Polyester is a polyester resin — acetone partially dissolves the fiber surface, causing permanent dulling, pilling, and structural damage"},
      {"name": "Strong solvents (MEK, paint thinner, toluene)", "note": "Polyester is solvent-sensitive at high concentrations — these solvents can dissolve or severely damage the fiber surface"},
      {"name": "Chlorine bleach on colored polyester", "note": "Hypochlorite doesn't destroy polyester fiber but attacks disperse dyes used on polyester — causes irreversible color loss and uneven bleaching"},
      {"name": "High heat (ironing, dryer >120°F)", "note": "Polyester's glass transition temperature is ~140–170°F — heat causes permanent fiber deformation, glazing, and shiny spots on fabric surface"},
      {"name": "Strong mineral acids (pH <2)", "note": "Concentrated acids hydrolyze ester linkages in polyester, reducing tensile strength and causing gradual fiber embrittlement"}
    ],
    "testFirst": [
      {"name": "Dry-cleaning solvent (perchloroethylene)", "note": "Perc is generally safe on polyester but some performance finishes (moisture-wicking, DWR coatings) can be damaged — test first"},
      {"name": "Chlorine bleach (white polyester)", "note": "Polyester cellulose resists bleach structurally but some white polyesters contain fluorescent brighteners that react adversely — test on hidden area"}
    ],
    "phRange": "5.0 – 11.0",
    "temperatureMax": "120°F / 49°C",
    "warnings": [
      "Polyester retains oily stains due to its hydrophobic structure — 'ghost stains' appear after drying because oil wasn't fully removed; re-treat while wet",
      "Never iron polyester above the 'synthetic' setting — heat glazing is permanent and cannot be restored",
      "Polyester microfiber (see microfiber profile) has different chemistry than woven polyester — check weave structure"
    ],
    "proTip": "Polyester's biggest spotting trap is oily stain 'reappearance' — the stain seems gone wet, then returns as a grey shadow once dry. This is because surfactants emulsify the oil but don't fully remove it from the hydrophobic fiber. The fix is a second treatment with a lipase enzyme cleaner AFTER the first rinse while the fabric is still damp, then a hot rinse cycle to fully flush the emulsified oil. If the ghost returns after the second treatment, the oil has likely polymerized into the fiber — use a dry-cleaning solvent approach."
  },

  {
    "id": "nylon",
    "material": "Nylon (Polyamide)",
    "materialClass": "Synthetic Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Mild detergent (Woolite, Ivory, pH-neutral)", "note": "Nylon's amide bonds are slightly more pH-sensitive than polyester — neutral to mildly alkaline cleaners are safest for routine cleaning"},
      {"name": "Oxygen bleach (OxiClean) — light use", "note": "Safe in dilute concentrations for short contact times; nylon is more vulnerable than polyester to extended oxidizer exposure"},
      {"name": "Enzyme cleaners (protease-safe formulations)", "note": "Nylon is polyamide, not protein — protease is safe; useful for organic stains on nylon carpets and upholstery"},
      {"name": "Dish soap (Dawn, diluted)", "note": "Effective for grease and oil on nylon; pH ~7 is safe on the fiber and dye system"},
      {"name": "Rubbing alcohol (isopropyl, diluted 50%)", "note": "Safe at dilute concentrations on nylon; effective for ink and adhesive removal"},
      {"name": "White vinegar (diluted 1:4)", "note": "Mild acid; safe for neutralizing alkaline residues and reducing static on nylon hosiery and performance fabrics"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (sodium hypochlorite)", "note": "Attacks nylon's amide bonds — causes irreversible yellowing, fiber embrittlement, and loss of tensile strength; nylon is far more bleach-sensitive than polyester"},
      {"name": "Strong acids (pH <3, e.g., undiluted vinegar, rust removers)", "note": "Nylon amide bonds are hydrolyzed by strong acids — fiber loses strength and becomes brittle"},
      {"name": "Concentrated alkaline solutions (pH >10)", "note": "Also hydrolyzes amide bonds in nylon — both strong acid and strong alkali attack the same amide linkage from opposite directions"},
      {"name": "Acetone / nail polish remover", "note": "Swells and partially dissolves nylon fiber surface — causes dulling, weakening, and dye loss"},
      {"name": "Strong oxidizing agents (permanganate, peroxide >10%)", "note": "Oxidizes nylon's amide structure leading to yellowing and fiber weakening — nylon is more oxidation-sensitive than polyester"},
      {"name": "Prolonged heat (dryer on high)", "note": "Nylon's melting point (~420°F) is higher than polyester but heat above 150°F causes shrinkage and deformation in fine deniers"}
    ],
    "testFirst": [
      {"name": "Hydrogen peroxide (3%)", "note": "Dilute H₂O₂ is usually safe but some nylon stockings and fine deniers yellow with even brief exposure — test on a hidden area"},
      {"name": "Dry-cleaning solvents", "note": "Most nylon tolerates perc and other solvents, but nylon-spandex blends and certain dyed nylons may have issues — test first"}
    ],
    "phRange": "5.0 – 9.0",
    "temperatureMax": "104°F / 40°C",
    "warnings": [
      "Never bleach nylon — chlorine bleach causes irreversible yellowing even on white nylon",
      "Nylon is photosensitive — UV light causes gradual yellowing; store nylon items away from direct sunlight",
      "Nylon absorbs dyes readily — keep away from colored garments when wet to prevent dye transfer"
    ],
    "proTip": "White nylon has a peculiar problem called 'graying' that isn't actually a staining issue — it's dye transfer from adjacent items in the laundry, plus soil redeposition from insufficient rinse. But the industry's instinct is to reach for chlorine bleach, which instantly yellows nylon. The real fix is an oxygen bleach soak (OxiClean free, no dye/perfume version) at 100°F for 30–60 minutes followed by a full cool rinse cycle. Works reliably without the bleach damage, and you should document this outcome for the customer."
  },

  {
    "id": "spandex",
    "material": "Spandex (Elastane / Lycra)",
    "materialClass": "Synthetic Elastic Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Cool water with mild detergent (Woolite, pH-neutral)", "note": "Spandex is a segmented polyurethane — cool water and neutral pH preserve elasticity and prevent chain scission in the soft-segment domains"},
      {"name": "Dish soap (Dawn, diluted)", "note": "pH ~7, surfactant-only formula; effective on sweat and body oil stains which are the most common soil type on spandex activewear"},
      {"name": "Enzyme cleaners (amylase, lipase only)", "note": "Amylase and lipase are safe; the fiber is not protein or cellulose so targeted protease and cellulase are unnecessary but not harmful"},
      {"name": "White vinegar (diluted 1:4) as rinse", "note": "Neutralizes alkaline detergent residue that causes elastomer chain stiffening over time; regular use extends spandex garment life"},
      {"name": "Oxygen bleach (OxiClean — very dilute, short contact)", "note": "Can be used cautiously at low concentration on spandex blends for stain treatment; avoid extended soak as polyurethane is oxidation-sensitive"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (sodium hypochlorite)", "note": "Rapidly degrades polyurethane chain structure — causes immediate and permanent loss of elasticity; even one wash with chlorinated pool water can destroy spandex fibers"},
      {"name": "Perchloroethylene (perc, dry-cleaning solvent)", "note": "Swells polyurethane soft segments and causes irreversible loss of elastic recovery — spandex cannot be dry-cleaned"},
      {"name": "Petroleum-based solvents (naphtha, mineral spirits)", "note": "Dissolve the polyurethane binder in spandex fibers — catastrophic elastic failure"},
      {"name": "Acetone", "note": "Dissolves polyurethane — direct contact causes immediate fiber dissolution and loss of stretch"},
      {"name": "Alkaline detergents (pH >9, Tide original)", "note": "High alkalinity causes hydrolysis of urethane linkages over repeated washing — cumulative loss of elasticity and elastic recovery"},
      {"name": "Heat (dryer above 120°F, hot iron)", "note": "Polyurethane glass transition is low — heat above ~130°F causes permanent deformation of the elastic segments; never use heat on spandex"}
    ],
    "testFirst": [
      {"name": "Hydrogen peroxide (3%)", "note": "Oxidizer; short contact at low concentration usually tolerable but extended soak can begin polyurethane chain breakdown — test contact time"},
      {"name": "Rubbing alcohol (isopropyl)", "note": "Most spandex blends tolerate dilute alcohol for ink removal, but high concentrations on 100% spandex can affect surface finish — test"}
    ],
    "phRange": "5.0 – 8.0",
    "temperatureMax": "86°F / 30°C",
    "warnings": [
      "Never use chlorine bleach on any garment containing spandex — even trace amounts cause progressive elasticity loss",
      "Pool chlorine exposure destroys spandex — rinse swimwear immediately after pool use with fresh water",
      "Dry-cleaning destroys spandex — always flag spandex-containing garments before sending to conventional dry cleaning"
    ],
    "proTip": "The single most common spandex failure mode in professional cleaning is undisclosed blend content — a garment tagged '95% cotton, 5% spandex' sent through a normal chlorine-bleach laundry cycle comes back with the cotton fine and the spandex brittle and broken. You can't see the damage until the customer puts it on and the waistband sags or the seat bags out permanently. Train your counter staff to check every garment with any stretch for spandex before routing to bleach-cycle cleaning."
  },

  {
    "id": "acetate",
    "material": "Acetate",
    "materialClass": "Semi-Synthetic Fiber",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Dry-cleaning solvent (perchloroethylene)", "note": "Acetate's ester linkages are solvent-stable — perc is the preferred cleaning method and works without the water swelling that distorts the fiber"},
      {"name": "Cool distilled water (minimal exposure)", "note": "Brief cool water contact is tolerable for emergency spotting; acetate swells when wet but recovers if not agitated"},
      {"name": "Mild pH-neutral soap (Woolite), used sparingly", "note": "pH 6–7 minimal residue formula; rinse thoroughly — alkaline or soap residue is more damaging than the brief water contact"},
      {"name": "Glycerin (to soften dried stains before dry-cleaning)", "note": "Rehydrates dried stains for easier dry-cleaning solvent removal; does not itself damage acetate"},
      {"name": "White vinegar (diluted 1:6, minimal use)", "note": "Mild acid can neutralize alkaline stains safely; rinse immediately and dry quickly to minimize wet-fiber swelling"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone (nail polish remover)", "note": "CRITICAL: Acetone dissolves acetate fiber — this is a total destruction event, not a damage scenario; one drop on acetate fabric creates an immediate hole"},
      {"name": "Nail polish remover (any formulation)", "note": "Even 'acetone-free' formulas often contain other solvents (ethyl acetate, MEK) that dissolve acetate — always verify solvent before use"},
      {"name": "Chlorine bleach", "note": "Degrades acetate ester linkages and destroys the dye system — immediate yellowing and fiber weakening"},
      {"name": "Alkaline cleaners (pH >8)", "note": "Hydrolyzes acetate ester bonds — the fiber literally de-acetylates back toward regenerated cellulose, losing its characteristic drape and sheen"},
      {"name": "Oxygen bleach (OxiClean)", "note": "Oxidizes acetate's modified cellulose structure — causes yellowing and fiber weakening; avoid on acetate entirely"},
      {"name": "Prolonged water immersion", "note": "Acetate swells significantly when wet — extended immersion causes permanent dimensional distortion, especially in woven structures"}
    ],
    "testFirst": [
      {"name": "Rubbing alcohol (isopropyl)", "note": "Dilute alcohol is usually safe but certain acetate finishes and dyes are alcohol-sensitive — test on seam allowance before use on acetate linings"},
      {"name": "Any spot cleaner or stain remover", "note": "Acetate is uniquely solvent-sensitive — ALWAYS test unknown chemistry on hidden area; the risk of dissolution or dye damage is high"}
    ],
    "phRange": "5.5 – 7.0",
    "temperatureMax": "82°F / 28°C",
    "warnings": [
      "NEVER let acetone or nail polish remover contact acetate — it will dissolve the fabric instantly and irreversibly",
      "Acetate softens and deforms under heat — always use the lowest iron setting and a pressing cloth",
      "Many satin linings in suits and formal wear are acetate — check before any spotting treatment"
    ],
    "proTip": "Acetate is the silent liability fiber in high-end fashion. Dress linings, cocktail gowns, and vintage formal wear are frequently acetate satin. Customers bring these in with 'clear liquid stains' that are actually cologne or perfume solvent splash — the solvent in perfume partially dissolves the acetate, creating a permanent, irreversible dull patch that looks exactly like a water stain. Once you understand the mechanism, you stop trying to 'treat' these stains and instead have an honest conversation about the fiber's exposure history."
  },

  {
    "id": "denim",
    "material": "Denim",
    "materialClass": "Woven Cotton Twill",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Cold water only (first wash)", "note": "Indigo dye in denim is poorly bonded to cotton (mechanical attachment, not covalent) — cold water dramatically reduces dye bleed in initial washes"},
      {"name": "Oxygen bleach (OxiClean Free — unscented)", "note": "Safe for spot treating stains on dark denim without the aggressive dye stripping of chlorine bleach — use sparingly and rinse thoroughly"},
      {"name": "Enzyme cleaners (Zout, Biz)", "note": "Safe on denim cotton fiber; effective on the protein stains (blood, sweat) and food stains common on workwear denim"},
      {"name": "Dish soap (Dawn) for grease", "note": "Effective on machine grease and automotive oil stains on work denim; apply neat to dry stain before washing"},
      {"name": "Hydrogen peroxide (3%)", "note": "Can be used for targeted bleaching on white-stitched denim or light stains without full fabric bleaching — apply only to stain"},
      {"name": "White vinegar rinse (1:4)", "note": "Helps set indigo dye in new denim by closing fiber cuticles; reduces bleed in first several washes if used as a soak before initial wash"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (on indigo/dark denim)", "note": "Destroys the surface-bonded indigo dye — causes orange-toned bleaching spots that cannot be reversed or overdyed evenly"},
      {"name": "Acetone on stretch denim", "note": "Most modern denim contains 1–5% spandex for stretch — acetone destroys both the spandex and can affect surface finishes"},
      {"name": "Alkaline spot treatments left to dry", "note": "Concentrated alkaline cleaners left without thorough rinsing cause cumulative fiber weakening at the application point"},
      {"name": "Hot water on raw/unwashed denim", "note": "Unsanforized denim can shrink 8–10% in hot water — the first hot wash also causes irreversible fading of surface-applied indigo"},
      {"name": "Fabric softeners on performance denim", "note": "DWR-treated denim (used in outdoor/workwear) loses water repellency when coated with cationic fabric softener"}
    ],
    "testFirst": [
      {"name": "Oxygen bleach (on dark or raw denim)", "note": "Even oxygen bleach can strip indigo surface dye faster than expected on heavily saturated dark denim — test on back pocket lining"},
      {"name": "Rubbing alcohol on colored/coated denim", "note": "Waxed, coated, or artificially aged denim may have solvent-sensitive surface treatments — test before using alcohol-based spotters"}
    ],
    "phRange": "6.0 – 9.0",
    "temperatureMax": "86°F / 30°C (dark/raw denim); 140°F / 60°C (light wash denim)",
    "warnings": [
      "Denim dye crocking (transferring wet dye to other surfaces) is highest in the first 5 washes — treat and wash separately",
      "Never use chlorine bleach on indigo denim — the resulting orange staining cannot be removed",
      "Stretch denim contains spandex — apply all spandex restrictions to any denim with more than 1–2% stretch"
    ],
    "proTip": "Indigo dye on denim exists in two forms: the surface 'ring-spun' indigo on the yarn surface and any over-dye applied after construction. The surface indigo is what creates the distressed, faded look customers pay premium prices for. When you spot-treat stains on premium selvedge or raw denim, you are competing with the intentional patina. The most expensive denim customers will actually request you preserve ANY unintentional fading that has occurred — get explicit direction before attempting to even out the color. The customer's definition of 'clean' and your definition may be completely different."
  },

  {
    "id": "velvet",
    "material": "Velvet",
    "materialClass": "Cut-Pile Woven Fabric",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Steam (indirect)", "note": "Steam is the primary tool for velvet — used to raise crushed pile and suspend loose stains for blotting without contact-damage to the pile"},
      {"name": "Dry-cleaning solvent (perchloroethylene) — for solvent-compatible fiber types", "note": "Silk velvet: dry-clean solvent preferred; cotton/polyester velvet: verify fiber first; solvent doesn't crush pile like water"},
      {"name": "Distilled water (minimal, misted)", "note": "A fine mist of distilled water followed by immediate steam can help lift water-soluble stains without the pile-flattening of direct water application"},
      {"name": "Enzyme cleaner (diluted, blot method)", "note": "Applied with extreme care via blotting cloth (never rubbed); effective on protein and food stains; must be thoroughly rinsed via blotting"},
      {"name": "Soft brush with dry cleaning powder (e.g., Host)", "note": "Absorbent compound can be worked very gently into pile direction for dry stain absorption without pile damage"}
    ],
    "unsafeChemicals": [
      {"name": "Direct water contact (rubbing)", "note": "Rubbing wet velvet crushes and mats the pile permanently — water alone is not harmful, but mechanical action while wet causes irreversible pile distortion"},
      {"name": "Chlorine bleach", "note": "Destroys the dye system in all velvet types; on silk velvet, also destroys the protein fiber — catastrophic double damage"},
      {"name": "Stain sprays applied directly (Resolve, Shout)", "note": "Spray application on velvet crushes pile at the point of impact from the liquid stream; the wet chemistry compounds the mechanical damage"},
      {"name": "Alkaline cleaners on silk velvet", "note": "Silk pile velvet (the most valuable type) is destroyed by alkaline chemistry — applies all silk restrictions to silk velvet pile"},
      {"name": "Iron contact (direct)", "note": "Direct iron contact permanently crushes velvet pile into permanent glossy track marks — ironing on pile side is always wrong"},
      {"name": "Aggressive brushing against pile direction", "note": "Breaks pile fiber at the root — causes permanent thinning and fiber loss that cannot be reversed"}
    ],
    "testFirst": [
      {"name": "Any water-based cleaner on silk velvet", "note": "Silk velvet is extraordinarily sensitive to water — even a small amount causes shrinkage and pile crushing; test steam response on hidden seam first"},
      {"name": "Enzyme cleaner on embossed or patterned velvet", "note": "Crushed-velvet patterns and embossed designs can be affected by chemistry that alters the pile — test on back before treating patterned area"}
    ],
    "phRange": "5.0 – 8.0",
    "temperatureMax": "Steam only — no direct heat; fabric-dependent (silk velvet: max 212°F steam indirect)",
    "warnings": [
      "Never rub velvet — brush ONLY in pile direction with a very soft brush",
      "Direct water droplets on velvet create permanent water spots from pile crushing at the drop boundary",
      "Velvet pile direction must be maintained — always check and restore pile direction after any treatment"
    ],
    "proTip": "Velvet pile rings — the halo-shaped marks left by water drops or overspray — look like stains but are actually pile distortion, not chemistry. Beginners try to clean these with more water, which compounds the problem. The fix is a steam wand held 2–3 inches from the surface while using a velvet brush or needle board to support the pile upright. The steam relaxes the flattened fibers and the brush/needle support holds them erect while they dry. Master this one technique and you'll recover 80% of 'ruined' velvet the customer assumes is gone."
  },

  {
    "id": "chenille",
    "material": "Chenille",
    "materialClass": "Cut-Pile Yarn Construction",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Cool water with mild detergent (pH-neutral)", "note": "Chenille is typically cotton or rayon core with cut pile — cool water and neutral detergent are safe for both fiber types"},
      {"name": "Dish soap (Dawn, diluted 1:10)", "note": "Gentle degreaser effective on food and body oil stains common on chenille upholstery and throws"},
      {"name": "Oxygen bleach (on white/light cotton chenille)", "note": "Safe on cotton core and pile; effective for brightening dulled white chenille throws and upholstery"},
      {"name": "Enzyme cleaners (protease-free for rayon chenille)", "note": "Cotton chenille: full enzyme spectrum safe. Rayon chenille: safe for amylase/lipase; protease technically safe but gentle formula preferred"},
      {"name": "Dry-cleaning solvent (for solvent-tolerant fibers)", "note": "Avoids the pile-matting risk of water-based cleaners on upholstery chenille; confirm fiber content before using"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach on colored chenille", "note": "Destroys cotton/rayon reactive dyes — causes immediate bleaching; the dense pile structure makes thorough rinsing of bleach residue extremely difficult"},
      {"name": "Rubbing while wet", "note": "Chenille pile is mechanically attached to a twisted core yarn — rubbing while wet dislodges pile fibers from the core, creating permanent bald patches"},
      {"name": "Hot water on rayon chenille", "note": "Rayon core and pile weakens severely when wet; hot water accelerates fiber swelling and pile shedding"},
      {"name": "Agitation in washing machine (top-loader)", "note": "Agitator action on chenille in a top-load washer removes pile fibers from the core and causes permanent shedding and bald patches"},
      {"name": "Steam directly on certain rayon chenille", "note": "High steam on fine-denier rayon chenille can cause pile to separate from core if the twist binding yarn is weak — test steam distance first"}
    ],
    "testFirst": [
      {"name": "Enzyme cleaner on vintage/antique chenille", "note": "Old chenille may have cotton, rayon, or even silk pile — verify fiber; vintage dyes may also be sensitive to enzyme actives"},
      {"name": "Hydrogen peroxide on chenille upholstery", "note": "Furniture chenille often has undisclosed fiber blends or specialty finishes — test on back panel or under cushion before treating visible areas"}
    ],
    "phRange": "5.5 – 8.5",
    "temperatureMax": "86°F / 30°C (rayon chenille); 104°F / 40°C (cotton chenille)",
    "warnings": [
      "Never rub chenille when wet — blot only; pile dislodges permanently from core under wet friction",
      "Chenille upholstery is especially prone to permanent pile matting from sitting — this is wear, not a stain",
      "Always check chenille for fiber content — rayon and cotton chenille have very different tolerances"
    ],
    "proTip": "Chenille's construction vulnerability is the twisted core yarn that locks the pile in place. In cheap chenille (common in mass-market throws), this core yarn is often cotton or polyester with minimal twist — the pile falls out under any stress when wet. In quality chenille (e.g., Pottery Barn upholstery grade), the core is high-twist and far more durable. Before treating a customer's 'shedding' complaint, determine whether the pile loss occurred during the stain incident (mechanical) or during prior handling — this changes both your treatment approach and your liability conversation."
  },

  {
    "id": "microfiber",
    "material": "Microfiber",
    "materialClass": "Ultra-Fine Synthetic Woven/Knit",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Warm water (no detergent) — for cleaning cloths", "note": "Microfiber's cleaning action comes from its split-fiber structure mechanically trapping soil — detergent residue actually clogs the splits and reduces cleaning performance"},
      {"name": "Mild detergent (minimal, for garment microfiber)", "note": "For apparel microfiber, use a tiny amount of pH-neutral liquid detergent; residue from powder detergents clogs microfiber pores"},
      {"name": "Enzyme cleaners (diluted) for upholstery", "note": "Polyester microfiber upholstery (labeled 'M' or 'W' code) responds well to enzyme cleaners for organic stains — check the cleaning code first"},
      {"name": "Rubbing alcohol (isopropyl) for 'S-code' microfiber", "note": "Solvent-only ('S' code) microfiber upholstery requires alcohol or dry-cleaning solvent — water causes water rings"},
      {"name": "Dish soap (Dawn, minimal) for grease stains", "note": "Polyester microfiber traps oil in the fiber splits — dish soap's degreasing action is effective when used sparingly with thorough rinsing"}
    ],
    "unsafeChemicals": [
      {"name": "Fabric softener (liquid or dryer sheet)", "note": "Coats and permanently clogs microfiber's split-fiber structure — destroys absorbency and cleaning performance permanently"},
      {"name": "Chlorine bleach", "note": "Damages polyester microfiber at elevated concentrations and destroys nylon microfiber's amide structure — fuses the split fibers together"},
      {"name": "Hot dryer (high heat)", "note": "Synthetic microfiber fuses at high heat — splits fuse back together permanently, eliminating the microscopic fiber separation that gives microfiber its properties"},
      {"name": "Heavy powder detergents", "note": "Residue from undissolved powder detergent particles lodges in microfiber splits, causing stiffness and permanent reduction in absorbency"},
      {"name": "Water on S-code microfiber upholstery", "note": "S-code (solvent-only) microfiber upholstery shows permanent water rings with any water-based treatment — use isopropyl alcohol only"}
    ],
    "testFirst": [
      {"name": "Any liquid cleaner on microfiber upholstery", "note": "Always check the furniture cleaning code tag (W=water, S=solvent, WS=both, X=vacuum only) before applying any chemistry"},
      {"name": "Oxygen bleach on microfiber clothing", "note": "Wicking and moisture-management finishes on performance microfiber clothing may be affected by oxidizers — test on inner seam"}
    ],
    "phRange": "5.0 – 10.0",
    "temperatureMax": "104°F / 40°C (garments); air dry preferred for cleaning cloths",
    "warnings": [
      "NEVER use fabric softener on microfiber — it permanently destroys the fiber's cleaning and wicking properties",
      "Check upholstery cleaning code before any treatment — S-code microfiber looks identical to W-code but is completely incompatible with water",
      "Microfiber cleaning cloths washed with cotton in the same load pick up cotton lint that clogs the fiber splits — wash microfiber separately"
    ],
    "proTip": "The 'W' and 'S' cleaning codes on microfiber furniture are not just guidelines — they reflect how the manufacturer applied the stain-resistant finish. 'S-code' microfiber has a solvent-based finish that water disrupts at a molecular level, causing the finish to reactivate unevenly as it dries, leaving permanent water rings. Customers bring in 'water stain' complaints on microfiber sofas that were caused by their own spot-cleaning with water. The treatment for these rings is counterintuitive: wet the ENTIRE panel uniformly with alcohol so it dries evenly — not just the ring."
  },

  {
    "id": "gore-tex",
    "material": "Gore-Tex (ePTFE Membrane)",
    "materialClass": "Laminated Technical Membrane",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Warm water (100–104°F / 38–40°C)", "note": "Warm water is essential for reactivating DWR (Durable Water Repellent) treatment — cold water doesn't melt the DWR polymer enough to redistribute it"},
      {"name": "Nikwax Tech Wash (purpose-formulated)", "note": "pH-neutral, residue-free formula designed specifically for DWR-coated technical fabrics; does not contaminate pores in the ePTFE membrane"},
      {"name": "Grangers Performance Wash", "note": "Another pH-neutral formulation for technical fabrics; surfactants chosen to not leave residue that blocks ePTFE pores or degrades DWR coating"},
      {"name": "Tumble dry on low heat (to reactivate DWR)", "note": "Low heat in a dryer reactivates the DWR coating by melting and redistributing the fluoropolymer layer — essential step after washing for waterproofing restoration"},
      {"name": "Nikwax TX.Direct Wash-In (DWR replenishment)", "note": "Replenishes depleted DWR coating during the wash cycle; safe on ePTFE membrane and all technical outer shell fabrics"}
    ],
    "unsafeChemicals": [
      {"name": "Fabric softener / conditioner", "note": "Coats the ePTFE membrane's microscopic pores with cationic surfactant residue — blocks breathability permanently; one application can destroy Gore-Tex performance"},
      {"name": "Detergent with optical brighteners (most Tide, Persil)", "note": "Optical brighteners and certain surfactants deposit on the DWR layer, reducing water repellency; use only purpose-formulated technical wash"},
      {"name": "Chlorine bleach", "note": "PTFE membrane is chemically resistant but bleach attacks the face fabric, DWR coating, and any polyurethane adhesive in the laminate construction"},
      {"name": "Dry-cleaning solvents (perchloroethylene)", "note": "Perc attacks the adhesive layer bonding the ePTFE membrane to face and liner fabrics — causes membrane delamination"},
      {"name": "High heat (above 140°F in dryer)", "note": "Melts the adhesive laminating layers in Gore-Tex construction — causes bubbling, delamination, and destruction of the membrane seal"},
      {"name": "Petroleum-based solvents", "note": "Dissolve the polyurethane laminates and DWR fluoropolymer coating — avoid any petroleum-based stain removers"}
    ],
    "testFirst": [
      {"name": "Any stain remover spray (Shout, Resolve)", "note": "Most commercial stain removers contain surfactants and optical brighteners incompatible with DWR chemistry — test on interior hem before using on exterior"},
      {"name": "Hydrogen peroxide for blood/protein stains", "note": "Dilute H₂O₂ is usually safe on face fabrics but test on a hidden area — some Gore-Tex Pro face fabrics have sensitive treatments"}
    ],
    "phRange": "5.0 – 8.0",
    "temperatureMax": "104°F / 40°C (wash); 140°F / 60°C (dryer on low for DWR reactivation)",
    "warnings": [
      "NEVER use fabric softener on Gore-Tex — it permanently destroys breathability",
      "DWR failure (water 'wetting out' instead of beading) looks like the membrane leaking — restore DWR before assuming the membrane is damaged",
      "Dry-cleaning with perc destroys the laminate adhesive — do not send Gore-Tex garments to conventional dry cleaners"
    ],
    "proTip": "The most common Gore-Tex complaint — 'my jacket is leaking' — is usually DWR failure, not membrane failure. The ePTFE membrane itself almost never leaks under normal use; what happens is the face fabric saturates when DWR fails, which creates a cold/clammy feeling that customers interpret as interior leaking. The fix is not re-seam-sealing: it's washing with Nikwax Tech Wash and then tumble drying on low to reactivate the DWR. Teach this to customers and they'll stop assuming their $500 jacket is ruined."
  },

  {
    "id": "down",
    "material": "Down (Fill)",
    "materialClass": "Natural Protein Insulation",
    "category": "fibers",
    "emoji": "🧵",
    "safeChemicals": [
      {"name": "Down-specific wash (Nikwax Down Wash Direct, Granger's Down Wash)", "note": "Formulated to clean down without stripping the natural oils that allow clusters to loft properly; standard detergents over-strip and destroy loft"},
      {"name": "Warm water (100°F / 38°C)", "note": "Warm water dissolves body oils and water-soluble soils in down fills without damaging the feather protein structure"},
      {"name": "Mild pH-neutral soap (Dawn — very sparingly, emergency only)", "note": "Can be used in very small amounts for emergency spot cleaning on outer shell; rinse thoroughly — any residue in fill prevents lofting"},
      {"name": "Nikwax Down Proof (DWR treatment for down)", "note": "Water-repellent treatment for hydrophobic down — restores or enhances the water-resistant coating on treated down fills"},
      {"name": "Tumble dry on low with tennis balls / dryer balls", "note": "Physical agitation from dryer balls breaks up wet down clusters and restores loft; essential for full fill recovery after washing"}
    ],
    "unsafeChemicals": [
      {"name": "Standard laundry detergent (Tide, Persil, etc.)", "note": "Strips the natural oils from down quill shafts and barbs — clusters clump, lose cohesion, and never fully re-loft; destroys insulation value"},
      {"name": "Fabric softener / conditioner", "note": "Coats down barbules with surfactant film — prevents individual fibers from spreading and interlocking, permanently reducing loft and insulation"},
      {"name": "Chlorine bleach", "note": "Destroys the protein keratin in down feathers just as it destroys wool — causes feather disintegration and catastrophic loss of fill power"},
      {"name": "Dry-cleaning solvents (perc, hydrocarbon)", "note": "Perchloroethylene strips every trace of down's natural oils — causes extreme clumping and loft failure that cannot be reversed with washing"},
      {"name": "Concentrated enzyme cleaners (protease)", "note": "Down is pure feather protein — protease enzymes digest it directly; avoid any enzyme cleaner with significant protease concentration on down fills"},
      {"name": "High-heat drying", "note": "Damages down quill structure and can melt any synthetic baffling or shell fabric; low-heat drying for extended periods (2–3 cycles) is correct"}
    ],
    "testFirst": [
      {"name": "Hydrogen peroxide for blood on outer shell", "note": "Test on shell fabric — ePTFE or treated shells may be sensitive; down fill itself should not contact H₂O₂ as it's a protein"},
      {"name": "Enzyme spotters on down garment outer fabric", "note": "The outer shell may be nylon, polyester, or Gore-Tex — enzyme safety depends on shell fiber; the fill itself should never contact enzyme cleaners"}
    ],
    "phRange": "5.0 – 7.0 (for fill protein)",
    "temperatureMax": "104°F / 40°C (wash); low dryer heat for drying (multiple cycles)",
    "warnings": [
      "Never compress or wring wet down — wet clusters are extremely fragile and mechanical stress causes permanent clumping",
      "Down takes 2–4 full dryer cycles at low heat to completely dry — partially dried down mildews within 24 hours",
      "Never use dry-cleaning solvents on down-filled items — total loft destruction"
    ],
    "proTip": "Down garments that have been dry-cleaned with perc or other solvents almost always present as flat, non-lofting shells with greasy-feeling fill. Customers think the fill is gone but it's still there — just completely oil-stripped and clumped. You can often recover 70–80% of original loft by washing 3–4 times with Nikwax Down Wash Direct and running 6+ dryer cycles at low heat with tennis balls. The remaining 20–30% loft loss is permanent oil-strip damage. Set this expectation before attempting recovery — it's better than billing for full cleaning and delivering a garment that's improved but not perfect."
  },

  // ─── LEATHER ─────────────────────────────────────────────────────────────

  {
    "id": "aniline-leather",
    "material": "Aniline Leather",
    "materialClass": "Full-Grain Uncoated Leather",
    "category": "leather",
    "emoji": "👜",
    "safeChemicals": [
      {"name": "Distilled water (minimal, misted)", "note": "Aniline leather has no protective coating — any water used must be distilled (minerals cause permanent tide marks) and used sparingly"},
      {"name": "Leather-specific cleaner (Leather Honey, Leather Master Pure Cleaner)", "note": "pH-matched, non-aqueous formulas that lift soil from the surface without penetrating and disrupting the uncoated grain structure"},
      {"name": "Lexol Leather Conditioner (after cleaning)", "note": "Lanolin-based conditioner replenishes the natural oils that aniline leather loses rapidly due to its uncoated, porous surface — essential after any cleaning"},
      {"name": "Dry-cleaning of surface soil (soft lint-free cloth, dry)", "note": "Surface dust and light soils should always be addressed dry first — mechanical action before chemistry on aniline leather"},
      {"name": "Specialized aniline leather cleaner (Colourlock, Leather Master aniline-specific)", "note": "pH-balanced for uncoated leather; contains no water or minimal water; designed specifically for the extreme porosity and vulnerability of aniline surfaces"}
    ],
    "unsafeChemicals": [
      {"name": "Soap and water (dish soap, hand soap)", "note": "Alkaline soap at any pH penetrates the uncoated grain, strips natural oils, and causes permanent dark staining and stiffness — no coating to keep soap out"},
      {"name": "Household cleaners (409, Simple Green, Windex)", "note": "All contain surfactants and pH outside 6–7 range — permanently darken and damage uncoated grain; pH >8 causes irreversible protein hydrolysis in collagen fibers"},
      {"name": "Alcohol-based cleaners", "note": "Isopropyl alcohol strips aniline dyes (which are surface-bonded only, unlike pigmented leather) — causes immediate, permanent color stripping"},
      {"name": "Solvent-based cleaners (acetone, nail polish remover)", "note": "Dissolve aniline surface dyes and strip tanning oils — catastrophic color loss and leather drying"},
      {"name": "Water (excess)", "note": "Aniline leather water-stains permanently — any excess moisture causes tide marks where the water boundary evaporates; the mark is caused by mineral and dye migration"},
      {"name": "Chlorine bleach / OxiClean", "note": "Oxidizes aniline dyes and destroys collagen protein structure — total, irreversible color destruction and fiber damage"}
    ],
    "testFirst": [
      {"name": "Any leather cleaner — including leather-specific brands", "note": "Aniline leather varies dramatically in tanning chemistry, dye depth, and oil content — even 'safe' products can cause darkening or blotching on specific hides; test on underside flap"},
      {"name": "Leather conditioner (any brand)", "note": "Over-conditioning aniline leather darkens it permanently (oil saturation) — test on hidden area and apply sparingly to observe color change before full treatment"}
    ],
    "phRange": "4.5 – 6.5",
    "temperatureMax": "77°F / 25°C ambient; avoid direct heat sources which dry and crack aniline leather",
    "warnings": [
      "Aniline leather stains permanently from almost any liquid — body oils, water, ink, and food penetrate instantly with no barrier coating",
      "NEVER use wet cloths or spray bottles directly on aniline leather — always blot, never rub",
      "Color fading on aniline leather from sun exposure is permanent — there is no product that fully reverses UV-induced color loss"
    ],
    "proTip": "Aniline leather is the most honest surface in the industry — it shows everything. A master's approach is to set expectations BEFORE touching it: photograph every scratch, water mark, and fade variation in high-res lighting before treatment starts. Customers with aniline furniture frequently don't know they have aniline leather — they just know it's 'the expensive Italian sofa.' When you show them the material type and explain why a 'clean' won't look like new, you're not giving bad news — you're demonstrating expertise and protecting yourself from liability for pre-existing conditions."
  },

  {
    "id": "pigmented-leather",
    "material": "Pigmented Leather",
    "materialClass": "Coated / Protected Leather",
    "category": "leather",
    "emoji": "👜",
    "safeChemicals": [
      {"name": "Mild dish soap solution (Dawn 1:10 in water)", "note": "Pigmented leather's polyurethane or acrylic topcoat tolerates gentle surfactants; pH ~7 removes surface soil without attacking the coating"},
      {"name": "Leather cleaner (Lexol pH Cleaner, Leather Honey Cleaner)", "note": "Formulated for coated leathers; surfactant blend lifts soil from the pigment coat without softening or dissolving the protective layer"},
      {"name": "Isopropyl alcohol (diluted 30% max)", "note": "Effective for ink, dye transfer, and adhesive marks on pigmented leather's coating; the polyurethane/acrylic coating tolerates dilute alcohol where aniline does not"},
      {"name": "Lexol Conditioner (after cleaning)", "note": "Even coated leather needs conditioning — the coating is breathable and leather still desiccates beneath it; conditioning prevents cracking and coat delamination"},
      {"name": "Magic Eraser (melamine foam — very light pressure)", "note": "Micro-abrasive removes embedded surface soils and scuffs from pigmented topcoat without chemistry; use only on smooth, unworn pigmented surfaces with minimal pressure"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone / nail polish remover", "note": "Dissolves the polyurethane or acrylic pigment coat — removes protective layer and color simultaneously; leaves raw tanned leather exposed"},
      {"name": "Chlorine bleach", "note": "Oxidizes and destroys pigment coat; underlying leather protein also destroyed — complete surface failure"},
      {"name": "Petroleum-based solvents (naphtha, mineral spirits)", "note": "Dissolve polyurethane binder in pigment coating — causes delamination and color lifting"},
      {"name": "Heavy-duty degreasers (409, Lestoil) at full strength", "note": "pH and solvent components in concentrated degreasers strip the soft-coating finishes used on modern pigmented leather"},
      {"name": "Alcohol at concentration >50%", "note": "Concentrated isopropyl alcohol softens and swells polyurethane pigment coat — causes permanent dullness, tackiness, and eventual coating delamination"},
      {"name": "Pressure washing / excessive water", "note": "Forces water under the pigment coat through any micro-fractures — causes bubbling, delamination, and white water marks when dry"}
    ],
    "testFirst": [
      {"name": "Isopropyl alcohol (any concentration)", "note": "Pigmented leathers vary significantly in topcoat type and hardness — test alcohol on a hidden area before using on ink or dye stains to verify coating tolerance"},
      {"name": "Magic Eraser / melamine foam", "note": "Micro-abrasive removes not just soil but also soft top-coat finishes — test aggressively on a hidden panel before treating visible surfaces; never use on matte or suede-effect pigmented leather"}
    ],
    "phRange": "5.0 – 8.0",
    "temperatureMax": "95°F / 35°C ambient; direct heat dries and cracks the coating",
    "warnings": [
      "Pigmented leather can be refinished — but each refinishing cycle removes a small amount of the topcoat and eventually raw leather is exposed",
      "Pen/ink marks on pigmented leather can be successfully treated with dilute alcohol — do this BEFORE attempting any other treatment",
      "Over-moisturizing with wrong conditioner can soften the pigment coat and cause it to pick up soil more readily"
    ],
    "proTip": "Pigmented leather hides its wear in a very specific pattern: the coating wears off first on the seat crown, armrest edges, and head/back contact points while the sides look perfect. Customers see this as 'staining' but it's coating abrasion — the color underneath is exposed raw leather. No cleaner fixes this; it requires leather re-pigmentation and topcoat application. The diagnostic is simple: rub a clean white cloth firmly on the worn area — if color comes off, the coating is gone. Knowing this saves you from spending hours on a 'cleaning' job that requires refinishing."
  },

  {
    "id": "suede",
    "material": "Suede",
    "materialClass": "Split-Grain Napped Leather",
    "category": "leather",
    "emoji": "👜",
    "safeChemicals": [
      {"name": "Suede brush (dry) — rubber and brass bristle", "note": "Primary tool for suede; lifts flattened nap, removes dry surface soil, and restores texture without any chemistry risk"},
      {"name": "Suede eraser (dry)", "note": "Vulcanized rubber eraser designed for suede — removes scuffs, light soils, and surface marks by mechanical crumbling action; safe and highly effective"},
      {"name": "Suede-specific cleaner spray (Kiwi Suede & Nubuck, Colourlock Suede)", "note": "Purpose-formulated water-free or minimal-water cleaners that lift oil and water stains without disturbing the nap structure"},
      {"name": "White vinegar (diluted 1:2, applied with cloth and dried)", "note": "Can treat water stains on suede by re-wetting the entire panel uniformly so it dries without a tide mark; also works on salt stains"},
      {"name": "Cornstarch / talcum powder (for fresh oil stains)", "note": "Absorbs fresh oil from suede nap before it migrates deeper — apply liberally, let sit 8+ hours, brush off; most effective within 30 minutes of stain"},
      {"name": "Steam (indirect, held at distance)", "note": "Very brief indirect steam can raise flattened nap and help loosen dry soils for brushing; use cautiously and brush immediately"}
    ],
    "unsafeChemicals": [
      {"name": "Water (direct application)", "note": "Direct water on suede causes immediate nap-flattening and, upon drying, leaves permanent tide marks from mineral deposits and tannin migration"},
      {"name": "Soap and water", "note": "Soap alkalinity combined with water penetration causes nap flattening, leather swelling, and compound tide-marking that is extremely difficult to reverse"},
      {"name": "Silicone-based protectors on already-soiled suede", "note": "Silicone locks soil permanently into the nap — always clean before protecting; silicone also prevents future re-dyeing or spot repair"},
      {"name": "Acetone / nail polish remover", "note": "Strips tannins and surface dyes from suede — causes permanent pale or white spots that cannot be re-dyed evenly"},
      {"name": "Chlorine bleach", "note": "Destroys suede's surface dye and underlying tannins simultaneously — causes irreversible white patches and fiber damage"},
      {"name": "Heat (hair dryer, direct sunlight)", "note": "Direct heat desiccates suede rapidly — causes stiffening, cracking, and permanent shrinkage of the leather fibers"}
    ],
    "testFirst": [
      {"name": "White vinegar for water stains", "note": "Works on most suede colors but can darken certain tannage types when dry — test on an inconspicuous panel before treating full water-stained area"},
      {"name": "Suede-specific cleaner (any brand)", "note": "Even purpose-made suede cleaners can cause temporary darkening on light suede — test on interior panel and allow to fully dry before evaluating"}
    ],
    "phRange": "4.0 – 6.0",
    "temperatureMax": "Room temperature only — no direct heat or UV",
    "warnings": [
      "Water causes immediate nap flattening and tide marks — always treat suede dry first",
      "Never apply protector spray to soiled suede — locks the soil in permanently",
      "Salt stains from road salt or sweat are among the most damaging compounds for suede — treat immediately before salt crystals cut the nap fibers"
    ],
    "proTip": "The secret weapon on set oil stains in suede that most beginners don't know: dry-cleaning fluid applied with a feather-touch blot, working from the outside edge of the stain inward. The solvent dissolves oil without wetting the leather, and because suede's surface is open nap rather than sealed, the solvent evaporates without a tide mark IF you work in a cool, well-ventilated environment and never over-saturate. The amateur mistake is using too much fluid and creating a new, larger ring from the solvent boundary."
  },

  {
    "id": "nubuck",
    "material": "Nubuck",
    "materialClass": "Top-Grain Buffed Leather",
    "category": "leather",
    "emoji": "👜",
    "safeChemicals": [
      {"name": "Nubuck brush (soft crepe rubber)", "note": "Nubuck's buffed top-grain surface requires a softer touch than suede's nap — crepe rubber brush lifts surface soil and restores the fine nap without harsh abrasion"},
      {"name": "Nubuck eraser (specialized)", "note": "Fine-grit eraser formulated for top-grain nubuck — more delicate than suede erasers due to the finer fiber structure of buffed top grain"},
      {"name": "Suede/nubuck cleaner spray (Colourlock, Leather Master Nubuck Cleaner)", "note": "Minimal-water formula designed for the fine open surface of nubuck; lifts soil without causing nap matting or water staining"},
      {"name": "Dry-cleaning solvent (very light application)", "note": "Effective for oil stains on nubuck; solvent method avoids water staining; must be applied with extreme light touch due to fine nap structure"},
      {"name": "Absorbent powder (cornstarch) for fresh oil", "note": "Apply immediately to oil spills on nubuck — the fine, dense nap structure of nubuck traps oil more rapidly than suede; act within minutes for best results"}
    ],
    "unsafeChemicals": [
      {"name": "Direct water application", "note": "Nubuck's top-grain surface is even more prone to water marking than suede — the finer buffed nap is more easily flattened and more susceptible to tide mark formation"},
      {"name": "Soap solutions (any)", "note": "Alkaline soap penetrates the fine open surface, causes nap matting and compound tide marking; extremely difficult to reverse on top-grain nubuck"},
      {"name": "Standard leather conditioner (Lexol, Leather Honey)", "note": "Oil-based conditioners for smooth leather saturate nubuck's open nap, turning it permanently dark and glossy — destroys the characteristic matte appearance"},
      {"name": "Silicone-based protectors (on unclean surface)", "note": "Seals soil into the nap permanently — always clean before any protective treatment; silicone prevents future repair or re-dyeing"},
      {"name": "Acetone", "note": "Strips top-grain dyes and surface tannins — permanent color damage on buffed top-grain surface"},
      {"name": "Dark-colored cloths or dyes near wet nubuck", "note": "Wet nubuck is highly susceptible to dye transfer — keep away from any colored materials when treating"}
    ],
    "testFirst": [
      {"name": "Any cleaner — nubuck or suede specific", "note": "Nubuck varies significantly in tannage, dye depth, and finish — what works perfectly on one hide may darken another; always test on tongue or concealed panel"},
      {"name": "Dry-cleaning solvent on colored nubuck", "note": "Solvents can affect surface dye on nubuck differently than on suede due to the top-grain (vs split-grain) base — test before full application"}
    ],
    "phRange": "4.0 – 6.0",
    "temperatureMax": "Room temperature; avoid direct heat or sunlight",
    "warnings": [
      "Nubuck is frequently confused with suede by customers — explain the difference (top-grain vs split-grain) as it affects treatment and value conversation",
      "Never use smooth-leather conditioners on nubuck — they will permanently alter the surface texture",
      "Standard waterproofing sprays designed for smooth leather will darken and alter nubuck texture — use only nubuck/suede specific protector"
    ],
    "proTip": "Nubuck wears differently than suede — the buffed top-grain surface develops a characteristic gloss on high-friction areas (toe cap, heel) while the low-friction areas remain matte. This is not a stain or soiling pattern; it's mechanical smoothing of the buffed nap. Customers bring in nubuck shoes 'with staining' that is actually this differential wear. A nubuck brush can temporarily restore some uniformity but the polished areas will re-gloss quickly. The real fix is professional re-buffing, which restores uniform nap across the entire surface — this is a different service conversation than spot cleaning."
  },

  {
    "id": "patent-leather",
    "material": "Patent Leather",
    "materialClass": "High-Gloss Lacquered Leather",
    "category": "leather",
    "emoji": "👜",
    "safeChemicals": [
      {"name": "Distilled water with soft lint-free cloth", "note": "Patent leather's lacquer coating is impermeable — most surface soils are on top of the coating and lift with distilled water and light wiping"},
      {"name": "Petroleum jelly (Vaseline) — for scuffs and color transfer", "note": "Dissolves light color-transfer marks and scuffs on patent leather's lacquer surface; apply, allow to penetrate briefly, wipe clean with lint-free cloth"},
      {"name": "Mild dish soap (Dawn 1:20 in water)", "note": "Very dilute, pH-neutral soap solution removes surface grime without attacking the lacquer coating; wipe dry immediately"},
      {"name": "Isopropyl alcohol (diluted 20–30%, for stubborn marks)", "note": "Light alcohol can remove ink and adhesive residue from patent lacquer; use sparingly and wipe dry immediately to prevent lacquer hazing"},
      {"name": "Patent leather cleaner/shiner (Cadillac, Kiwi patent leather)", "note": "Specifically formulated to clean and restore shine to lacquer coating without chemical attack; contains plasticizers that prevent lacquer cracking"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone / nail polish remover", "note": "Dissolves patent leather's lacquer or polyurethane coating entirely — instantaneous, irreversible destruction of the high-gloss surface"},
      {"name": "Concentrated isopropyl alcohol (>50%)", "note": "At high concentration, alcohol softens and clouds patent lacquer coating — causes permanent hazing, cloudiness, and eventual cracking"},
      {"name": "Solvent-based stain removers", "note": "Any petroleum or ether-based solvent attacks the lacquer binder — causes softening, surface distortion, and loss of high-gloss finish"},
      {"name": "Shoe polish (standard wax or cream)", "note": "Wax polishes block patent lacquer's sheen — the wax cannot be buffed to patent-level gloss and smears the characteristic mirror finish"},
      {"name": "Chlorine bleach", "note": "Destroys lacquer coating and underlying leather simultaneously — complete surface failure"},
      {"name": "Prolonged sunlight / heat exposure", "note": "Patent lacquer becomes brittle and cracks under UV and heat — the plasticizer degrades and the coating crazes irreversibly"}
    ],
    "testFirst": [
      {"name": "Isopropyl alcohol (any dilution)", "note": "Patent lacquer formulations vary — some are polyurethane (more alcohol-tolerant), some are acrylic or traditional lacquer (very alcohol-sensitive); test on heel edge"},
      {"name": "Any solvent-based product", "note": "Always test on an inconspicuous area first — the risk of immediate, irreversible lacquer dissolution is high with any solvent chemistry"}
    ],
    "phRange": "5.0 – 7.0",
    "temperatureMax": "77°F / 25°C ambient; heat and UV cause lacquer cracking",
    "warnings": [
      "NEVER use acetone or nail polish remover near patent leather — total surface destruction",
      "Patent leather stored touching other patent leather pieces will bond and transfer color — store with cloth separators",
      "Cold temperatures cause patent lacquer to crack — never store patent leather in cold environments"
    ],
    "proTip": "The most common patent leather 'damage' that isn't damage: color transfer from dark clothing or bags onto light-colored patent leather, particularly from dark denim. Customers assume it's a permanent stain but it's surface dye on top of the lacquer — not in it. Petroleum jelly applied and left for 10–15 minutes, then wiped with a clean lint-free cloth, dissolves and removes denim dye transfer reliably on 90% of patent surfaces. It's one of the most satisfying quick wins in leather care and it builds instant customer trust."
  },

  {
    "id": "synthetic-leather",
    "material": "Synthetic Leather (PU / Vegan Leather)",
    "materialClass": "Polyurethane-Coated Fabric",
    "category": "leather",
    "emoji": "👜",
    "safeChemicals": [
      {"name": "Mild dish soap solution (Dawn 1:10)", "note": "Polyurethane surface coating tolerates gentle surfactants at near-neutral pH; effective for surface soils, food, and body oils"},
      {"name": "Isopropyl alcohol (diluted 50%)", "note": "Effective on ink, dye transfer, and adhesive marks on PU coating; the polyurethane topcoat tolerates moderate alcohol where genuine uncoated leather does not"},
      {"name": "Baby wipes (unscented, alcohol-free)", "note": "Convenient, safe, and effective for routine maintenance cleaning of synthetic leather surfaces — pH-balanced formulation with gentle surfactants"},
      {"name": "White vinegar (diluted 1:4)", "note": "Effective for mold/mildew on synthetic leather (a common failure mode) and for neutralizing alkaline residue"},
      {"name": "Hydrogen peroxide (3%)", "note": "Effective for mold stains on synthetic leather surfaces; PU coating tolerates 3% H₂O₂ without damage"},
      {"name": "Magic Eraser (light pressure on smooth PU)", "note": "Micro-abrasive effectively removes embedded surface marks from hard PU coatings; use only on smooth, unembossed surfaces with minimal pressure"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone", "note": "Dissolves polyurethane coating — instantaneous surface destruction; leaves bare fabric substrate exposed"},
      {"name": "Concentrated isopropyl alcohol (>70%)", "note": "Softens and swells polyurethane binder — causes surface hazing, tackiness, and eventual delamination of coating from substrate fabric"},
      {"name": "Chlorine bleach", "note": "Destroys polyurethane coating and causes severe substrate fabric discoloration — total surface failure"},
      {"name": "Petroleum-based solvents (naphtha, mineral spirits)", "note": "Dissolve polyurethane binder — causes delamination and coating loss"},
      {"name": "Heat (hair dryer, direct sunlight)", "note": "Accelerates polyurethane hydrolysis — the primary failure mode of synthetic leather; heat causes the PU coating to crack, peel, and delaminate from substrate"},
      {"name": "Alkaline cleaners (pH >9, baking soda paste)", "note": "Alkaline conditions hydrolyze polyurethane ester linkages — accelerates the natural aging and cracking process; primary cause of 'peeling vegan leather'"}
    ],
    "testFirst": [
      {"name": "Isopropyl alcohol on matte-finish synthetic leather", "note": "Matte PU finishes often use surface texture agents that alcohol can partially dissolve — test before using alcohol on matte or textured synthetic leather"},
      {"name": "Any cleaner on flaking or peeling synthetic leather", "note": "Once PU delamination has started, any chemistry accelerates peeling — test shows whether the surface can survive treatment or whether it's already end-of-life"}
    ],
    "phRange": "5.0 – 8.0",
    "temperatureMax": "86°F / 30°C ambient; avoid heat which accelerates PU hydrolysis",
    "warnings": [
      "Synthetic leather has a finite lifespan — PU coating naturally hydrolyzes over 3–7 years regardless of care; flaking and peeling is often irreversible once it starts",
      "Heat and UV dramatically accelerate PU hydrolysis — keep synthetic leather away from heat sources and prolonged sun exposure",
      "Alkaline cleaning products applied regularly will halve the effective lifespan of PU synthetic leather"
    ],
    "proTip": "The most important thing to know about synthetic leather is how to recognize when it's beyond cleaning. The early signs of PU hydrolysis are a slightly tacky feel on the surface and micro-cracking visible under raking light — these precede visible peeling by months. When you see these signs, document them in photos before you touch the item, because any cleaning activity will accelerate the peeling and the customer will blame you. Have the conversation proactively: 'This material has begun to degrade naturally — I can clean the surface but I cannot stop or reverse the material breakdown.' This is not a failure of care; it's a material that has reached end of life."
  },

  {
    "id": "nylon-carpet",
    "material": "Nylon Carpet",
    "materialClass": "Synthetic Fiber Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Neutral detergent (pH 6–8)", "note": "Nylon is acid-dyeable — its dye sites are protonated; neutral pH preserves dye bond integrity while lifting soil"},
      {"name": "Encapsulation cleaners", "note": "Polymer-based encap products crystallize around soil and release during vacuuming without rewetting fiber — ideal for maintenance cleaning"},
      {"name": "Hot water extraction (HWE)", "note": "Nylon withstands temperatures up to 82°C / 180°F in extraction cleaning; heat improves detergent emulsification and soil release"},
      {"name": "Hydrogen peroxide (3–6% diluted)", "note": "Dilute H₂O₂ spot-treats organic stains; bleaching risk is low on solution-dyed variants but test on acid-dyed nylon first"},
      {"name": "Citrus-based spotters", "note": "d-Limonene and citrus solvents dissolve oil-based soils without damaging nylon's polymer backbone"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (sodium hypochlorite)", "note": "Oxidizes nylon's amide bonds, causing irreversible yellowing and fiber degradation even at low concentrations"},
      {"name": "Strongly alkaline cleaners (pH >10)", "note": "High alkalinity hydrolyzes nylon's peptide-like amide linkages, weakening tensile strength and causing dye bleeding"},
      {"name": "Acetone / nail polish remover", "note": "Dissolves nylon polymer at the molecular level; will destroy fiber structure on contact"},
      {"name": "Strong oxidizing spotters with chlorine", "note": "Products containing chlorine dioxide or sodium dichloroisocyanurate cause irreversible color loss in acid-dyed nylon"}
    ],
    "testFirst": [
      {"name": "Any oxidizing spotter", "note": "Even dilute oxidizers behave differently on acid-dyed versus solution-dyed nylon — always test in a closet corner first"},
      {"name": "High-alkaline prespray", "note": "Presprays above pH 9.5 can strip optical brighteners and shift acid dyes — test dwell time in hidden area before full application"}
    ],
    "phRange": "5.0–9.0 (optimal 6.0–8.0)",
    "temperatureMax": "82°C / 180°F (extraction water temp); 60°C / 140°F for bonnet or encap methods",
    "warnings": [
      "Nylon is highly susceptible to resoiling after cleaning if residue is left behind — always rinse thoroughly and extract to low moisture",
      "Acid dyes used in most residential nylon carpets are vulnerable to color transfer from food dyes (Kool-Aid, wine) — speed of response matters more than chemistry",
      "Over-wetting nylon carpet causes wicking: dissolved soil migrates up the fiber shaft as it dries, creating brown spots that reappear after cleaning"
    ],
    "proTip": "Nylon is the most forgiving synthetic carpet fiber to clean, but it has one trap professionals fall into: leaving alkaline residue in the fiber. Nylon has a positive charge attraction to anionic (negatively charged) soil — so if your detergent leaves an alkaline residue, it actually flips the fiber's charge and accelerates resoiling within weeks. Finish every nylon job with a fiber rinse at pH 5.5–6.5 to restore the natural charge balance, and your customers will notice their carpet stays cleaner longer than it ever did before."
  },

  {
    "id": "polyester-carpet",
    "material": "Polyester Carpet",
    "materialClass": "Synthetic Fiber Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Neutral to mildly alkaline detergent (pH 6–9)", "note": "Polyester is solution-dyed in most residential grades — color is locked into the fiber core, so moderate pH is safe for dye integrity"},
      {"name": "Encapsulation cleaners", "note": "Polyester's inherent stain resistance means encap often removes surface-adhered soil without aggressive chemistry"},
      {"name": "Enzyme prespray (protease/lipase)", "note": "Enzyme spotters break down protein and fat residues without chemical stress on polyester fibers — safe and effective for food spills"},
      {"name": "Isopropyl alcohol (IPA) diluted 50%", "note": "Effective solvent for adhesive residues and ink on polyester; evaporates cleanly without swelling fibers"},
      {"name": "Hot water extraction at moderate temp", "note": "Polyester softens at lower temperatures than nylon; HWE at 60°C / 140°F is optimal for soil release without fiber distortion"}
    ],
    "unsafeChemicals": [
      {"name": "Dry solvents (acetone, MEK, THF)", "note": "Ketone and ether solvents attack PET polyester at the molecular level — acetone can dissolve fiber surface coating on contact"},
      {"name": "Chlorine bleach", "note": "Degrades polyester's ester linkages and causes irreversible yellowing, especially on PET fiber"},
      {"name": "High-temperature steam (>80°C)", "note": "Polyester melts at relatively low temperatures (250°C) but loses dimensional stability above 80°C — excessive steam heat causes permanent pile crush"},
      {"name": "Strongly alkaline strippers (pH >11)", "note": "Saponification of polyester's ester bonds occurs under strongly alkaline conditions, weakening fiber tensile strength"}
    ],
    "testFirst": [
      {"name": "Optical brightener products", "note": "OBAs designed for nylon may fluoresce differently on polyester — test under UV light to check for uneven whitening"},
      {"name": "Any aromatic solvent blend", "note": "Some solvent spotters contain xylene or toluene derivatives that can soften polyester — test on hidden area before spot application"}
    ],
    "phRange": "5.0–9.5 (optimal 6.5–8.5)",
    "temperatureMax": "80°C / 176°F water temp; avoid sustained steam above this threshold",
    "warnings": [
      "Polyester carpet has a well-known tendency to 'oil-wick' — oily spills are absorbed deeply and resurface as dark spots as the carpet dries; multiple extraction passes required",
      "Polyester fibers crush and mat permanently more readily than nylon; avoid over-agitation and rotary scrubbing on residential polyester carpet",
      "Many budget polyester carpets use adhesive latex backings that are water-sensitive — over-wetting causes delamination and buckling"
    ],
    "proTip": "Polyester carpet's Achilles heel is oil. The fiber's hydrophobic nature that repels water-based spills makes it extremely receptive to oils and greases — they bond at the molecular level. When you encounter an oily wick-back spot on polyester, don't fight it with more water. Apply a dry solvent spotter (not acetone — use a petroleum-based dry solvent), let it dwell to break the oil bond, then extract. Repeat twice. The industry term is 'oleophilic fiber' and once you understand it, you'll stop puzzling over why water extraction alone won't clear those grey traffic-lane shadows."
  },

  {
    "id": "wool-carpet",
    "material": "Wool Carpet",
    "materialClass": "Natural Fiber Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Wool-safe neutral detergent (pH 5–7)", "note": "Wool's keratin protein structure is amphoteric but most stable in slightly acidic conditions — products formulated for wool maintain isoelectric point stability"},
      {"name": "Enzymatic cleaners (protease-free formula)", "note": "CRITICAL: must use lipase and amylase enzymes only — protease enzymes digest wool's keratin protein chains, causing permanent fiber damage"},
      {"name": "White wine vinegar rinse (diluted 1:10)", "note": "Acetic acid at low concentration neutralizes alkaline residue and restores wool's natural slightly acidic pH after cleaning"},
      {"name": "Cold or lukewarm water (below 40°C)", "note": "Wool felts irreversibly when agitated in warm water — cool water combined with gentle chemistry protects fiber scale structure"},
      {"name": "Dry foam cleaning", "note": "Low-moisture dry foam methods minimize water contact while effectively suspending soil — professional standard for premium wool carpet maintenance"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (sodium hypochlorite)", "note": "Destroys wool's disulfide bonds in cystine cross-links, causing complete fiber dissolution — even trace amounts cause irreversible yellowing and degradation"},
      {"name": "Alkaline cleaners (pH >8.5)", "note": "Wool undergoes saponification of peptide bonds in alkaline conditions — prolonged contact above pH 9 causes fiber to dissolve; yellowing begins above pH 8.5"},
      {"name": "Protease enzyme products", "note": "Protease specifically targets protein chains — it will digest wool fiber as efficiently as it digests a protein stain; always verify enzyme formula before use"},
      {"name": "Hydrogen peroxide (>3% concentration)", "note": "Concentrated peroxide oxidizes wool's sulfur-containing amino acids, causing irreversible yellowing known as 'wool bleach burn'"},
      {"name": "Hot water above 40°C with agitation", "note": "Heat + mechanical action causes wool scales to interlock irreversibly — this is the felting process, it permanently shrinks and mats the carpet"}
    ],
    "testFirst": [
      {"name": "Any oxidizing spotter", "note": "Wool's sulfur chemistry makes it uniquely reactive to oxidizers — even mild peroxide spotters can cause localized yellowing; test on underside binding first"},
      {"name": "Plant-based enzyme cleaners", "note": "Natural enzyme blends vary widely in protease content — many 'natural' cleaners contain protease; test confirms whether the formula is safe for protein fibers"}
    ],
    "phRange": "4.5–7.0 (optimal 5.0–6.5; never exceed pH 8.5)",
    "temperatureMax": "40°C / 104°F; cold water preferred for agitation steps",
    "warnings": [
      "Wool carpets are extremely susceptible to cellulosic browning (also called 'jute bleed') when over-wetted — the natural jute backing releases tannins that wick up through wool pile as it dries",
      "Wool carpets shrink when wet — always work in sections, minimize dwell time of wet chemistry, and ensure rapid drying with air movers",
      "Wool pile is naturally resistant to soiling due to the lanolin content, but once the fiber's cuticle scale is damaged, soil bonds permanently"
    ],
    "proTip": "The number one mistake professionals make on wool is leaving alkaline prespray residue in the fiber. Wool at pH 8+ begins yellowing within hours of drying — and that yellow doesn't come out without a reducing agent treatment that most techs don't carry. Build a two-bucket system: one with your wool-safe detergent at pH 6.5–7.0, one with a dilute white vinegar rinse at pH 4.5–5.0. Clean with the first, rinse with the second. You'll never have a wool yellowing callback again."
  },

  {
    "id": "olefin-carpet",
    "material": "Olefin/Polypropylene Carpet",
    "materialClass": "Synthetic Fiber Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Alkaline cleaners (pH up to 12)", "note": "Olefin is chemically inert to alkalinity — unlike nylon or wool, it tolerates high-pH degreasers, making it one of the few carpet fibers that can handle commercial alkaline prespray"},
      {"name": "Bleach-based spotters (diluted)", "note": "Solution-dyed olefin has colorant locked into the fiber core during extrusion — bleach cannot remove it; this is the only carpet fiber category where dilute bleach spot treatment is sometimes appropriate"},
      {"name": "Solvent degreasers", "note": "Commercial degreasing solvents handle olefin's primary liability (oil absorption) without attacking the polypropylene polymer structure"},
      {"name": "Hot water extraction", "note": "Olefin withstands aggressive hot-water extraction chemistry; the fiber's inertness means detergent selection matters less than with natural fibers"},
      {"name": "Encapsulation cleaners", "note": "Highly effective for commercial olefin carpet; the fiber's smooth surface allows encap polymers to release easily during vacuuming"}
    ],
    "unsafeChemicals": [
      {"name": "Aromatic solvents (xylene, toluene, benzene)", "note": "These dissolve polypropylene at the polymer level — aromatic hydrocarbons swell and destroy the fiber structure on contact"},
      {"name": "Chlorinated solvents (methylene chloride, TCE)", "note": "Chlorinated hydrocarbon solvents attack polypropylene; products like paint stripper containing these compounds will destroy olefin fiber immediately"},
      {"name": "High-temperature steam (sustained above 82°C)", "note": "Olefin has the lowest melting point of any carpet fiber (165°C) but begins losing dimensional stability at 82°C — steam wand contact causes permanent fiber glazing and pile distortion"},
      {"name": "Acetone at full concentration", "note": "Pure acetone swells polypropylene fibers; diluted acetone-based spotters are safer but aromatic-free alternatives are preferred"}
    ],
    "testFirst": [
      {"name": "Any solvent-based spotter", "note": "The solvent chemistry that's safe on nylon may contain aromatics that destroy olefin — always verify solvent type before application"},
      {"name": "Steam cleaning equipment", "note": "Test steam wand temperature on a hidden corner — olefin glazes and flattens permanently if steam tip contacts fiber at high temp for more than a few seconds"}
    ],
    "phRange": "4.0–12.0 (extremely wide pH tolerance due to chemical inertness)",
    "temperatureMax": "82°C / 180°F water temp; keep steam wand moving; never hold in one spot",
    "warnings": [
      "Olefin is oleophilic (oil-loving) — oil-based soils bond strongly to the polypropylene backbone and are very difficult to remove completely; traffic lanes in olefin carpet are often permanent",
      "Olefin carpet crushes and mats more easily than nylon due to lower resilience — avoid rotary brush agitation; use cylindrical brush or wand only",
      "Despite wide pH tolerance, olefin's oil-absorption problem means traffic-lane soil is chemically bonded — realistic expectation management with customers is essential"
    ],
    "proTip": "Olefin's chemical inertness is both its strength and its trap. Techs see the wide pH tolerance and go heavy with alkaline prespray — but alkaline chemistry doesn't solve olefin's core problem, which is oily soil absorption. The correct weapon is a strong emulsifying degreaser with a VLM (very low moisture) extraction pass, repeated twice. For extreme traffic-lane oily soil, apply a dry solvent carrier product, let it dwell 5 minutes to break the oil-polymer bond, then extract. Expect 60–70% improvement — not 100%. Olefin traffic lane soil is one of the few cases where you should underpromise before you start."
  },

  {
    "id": "berber-carpet",
    "material": "Berber Carpet",
    "materialClass": "Loop Pile Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Low-moisture encapsulation cleaner", "note": "Berber's loop pile traps water at the base — encap's crystallization mechanism removes soil with minimal moisture, preventing wicking and backing saturation"},
      {"name": "Neutral detergent spotter (pH 6–8)", "note": "Gentle chemistry suited to both wool and synthetic Berber variants; neutral pH won't stress either fiber type"},
      {"name": "Enzyme spotter (fiber-appropriate formula)", "note": "Select enzyme blend based on fiber content — protease-free for wool Berber, standard blend for nylon or olefin Berber"},
      {"name": "Dry foam application", "note": "Dry foam methods deliver chemistry to the fiber surface while leaving minimal moisture in the loop structure — the industry standard for Berber maintenance cleaning"},
      {"name": "Controlled-flow extraction wand", "note": "Slow, controlled extraction passes allow thorough rinsing without over-wetting the deep loop base — tool selection matters as much as chemistry for Berber"}
    ],
    "unsafeChemicals": [
      {"name": "Rotary brush agitation tools", "note": "Cylindrical or rotary brushes snag loop pile — a single caught loop unravels a run across the carpet; never use aggressive mechanical agitation on Berber"},
      {"name": "High-pressure spray application", "note": "High-pressure spraying saturates the loop base and latex backing; Berber wicks severely as moisture migrates up through the dense loop structure during drying"},
      {"name": "Bleach-based spotters (on dyed Berber)", "note": "Most Berber carpet uses acid or disperse dyes applied in patterns — bleach spotting creates permanent de-colored halos that are not repairable"},
      {"name": "Strongly alkaline prespray on wool Berber", "note": "Wool Berber is common in premium interiors — alkaline prespray above pH 9 on wool causes yellowing and fiber degradation same as any wool carpet"}
    ],
    "testFirst": [
      {"name": "Any spotter on patterned Berber", "note": "Berber's characteristic fleck pattern uses different dye lots — test spotters at pattern intersections since different colors may react differently to the same chemistry"},
      {"name": "Moisture level with any cleaning method", "note": "Test your moisture extraction efficiency in a hidden corner before full cleaning — Berber backing saturation is invisible until catastrophic wicking begins 30 minutes into drying"}
    ],
    "phRange": "5.5–8.5 (varies by fiber content; verify fiber type before selecting chemistry)",
    "temperatureMax": "60°C / 140°F for synthetic Berber; 40°C / 104°F for wool Berber variants",
    "warnings": [
      "Loop pile snag risk is the #1 liability with Berber — one snagged loop runs like a ladder in a stocking; inspect for loose loops before applying any tool that contacts the pile",
      "Berber wicking is severe and often delayed — a seemingly dry carpet 20 minutes after cleaning can show significant brown wicking 4–6 hours later as moisture migrates from backing to pile",
      "Natural fiber Berber (wool or cotton) and synthetic Berber require completely different chemistry protocols — always identify fiber content before selecting products"
    ],
    "proTip": "Berber is the carpet type that generates the most callbacks in professional cleaning — not because it's hard to clean, but because it wicks. The fix is counterintuitive: use less chemistry and less water, not more. My standard Berber protocol is dry chemistry encap only, two slow extraction passes with a low-flow wand, then 30 minutes of air movers before the customer sees it. If a spill has soaked into the backing, you need to accept that some browning may appear during drying and plan a follow-up neutralizing rinse visit. Set that expectation upfront and you eliminate 90% of your Berber callbacks."
  },

  {
    "id": "jute-rug",
    "material": "Jute Rug",
    "materialClass": "Natural Plant Fiber Rug",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Dry cleaning powder / HOST system", "note": "Dry absorbent compound methods avoid water entirely — jute's extreme water sensitivity makes waterless cleaning the preferred method for maintenance"},
      {"name": "Dry solvent spotter (petroleum-based)", "note": "Petroleum dry solvents lift oil-based soils without introducing water — volatile carriers evaporate cleanly before moisture can reach jute fibers"},
      {"name": "Minimal foam spotter (pH 6–7 only)", "note": "If liquid chemistry is unavoidable, use extremely small amounts of neutral foam and blot immediately — never scrub, never saturate"},
      {"name": "Clean club soda (carbonation only)", "note": "Carbonation creates mild physical lift on fresh spills; CO₂ bubbles help release surface soil before it penetrates, and the liquid volume is minimal"}
    ],
    "unsafeChemicals": [
      {"name": "Water (in quantity)", "note": "Jute fiber is extremely hydrophilic — water penetration causes immediate cellulosic browning (oxidation of lignin compounds) that produces permanent brown discoloration"},
      {"name": "Alkaline cleaners", "note": "Alkalis accelerate lignin oxidation in cellulosic fibers; even mild alkaline chemistry causes rapid browning in jute"},
      {"name": "Bleach or oxidizing spotters", "note": "Jute's lignin and cellulose structure is destroyed by oxidizers — bleach causes irreversible disintegration of fiber structure and severe browning"},
      {"name": "Steam cleaning", "note": "Steam introduces sustained heat and moisture — both catastrophic for jute; causes immediate severe browning and potential fiber shrinkage and distortion"}
    ],
    "testFirst": [
      {"name": "Any liquid spotter", "note": "Blot a tiny amount on the back of the rug and observe for 10 minutes — browning begins within minutes if the formula is too wet or too alkaline for this fiber"},
      {"name": "Dry cleaning powder dwell time", "note": "Test dry compound on a small hidden area for the recommended dwell time — jute occasionally reacts to certain powder carrier chemicals; verify no discoloration before full application"}
    ],
    "phRange": "6.0–7.5 (strictly neutral; any deviation toward alkalinity causes browning)",
    "temperatureMax": "Ambient / room temperature only; no heat application",
    "warnings": [
      "Jute browning from water exposure is often irreversible — if a jute rug has been significantly wet, brown discoloration may be a permanent outcome regardless of treatment",
      "Jute rugs used in humid environments or placed on damp floors will brown from ambient moisture over time — this is a care and placement issue, not a cleaning failure",
      "Jute is a structural backing material in many area rugs — even if the pile fiber is synthetic, the jute backing is vulnerable to all the same water-browning issues"
    ],
    "proTip": "Jute is the material that separates experienced rug cleaners from everyone else. The single most important thing to understand is that browning in jute is a chemical process (lignin oxidation), not a dirt problem — water triggers it, not soil. When a customer brings in a jute rug with a fresh spill, your first move is to limit moisture migration, not introduce more chemistry. Blot aggressively to extract the spill liquid, apply a dry absorbent compound immediately, and use a cool air mover to accelerate drying. If browning does appear, a mild oxalic acid browning treatment (after complete drying) can reduce it — but prevention is infinitely easier than reversal."
  },

  {
    "id": "sisal-rug",
    "material": "Sisal Rug",
    "materialClass": "Natural Plant Fiber Rug",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Dry cleaning compound (HOST or equivalent)", "note": "Waterless dry cleaning is strongly preferred for sisal — dry absorbent compounds lift soil without water contact that causes permanent staining"},
      {"name": "Dry solvent spotter", "note": "Petroleum-based dry solvents address oil-based soils safely; volatile carrier evaporates before moisture can penetrate the fiber's porous surface"},
      {"name": "Minimal neutral foam (pH 6.5–7)", "note": "If liquid chemistry is required, use the minimum possible amount of neutral foam spotter, applied with a damp (not wet) cloth using blotting only — no rubbing"},
      {"name": "Cornstarch or baking soda (dry absorption)", "note": "Dry mineral and starch absorbers pull fresh liquid spills out of the fiber surface before they can fully penetrate — effective first-response tool for homeowners"}
    ],
    "unsafeChemicals": [
      {"name": "Water", "note": "Sisal is a hygroscopic plant fiber that absorbs water readily and PERMANENTLY — water causes tide marks, shrinkage, and texture distortion that are essentially irreversible once dry"},
      {"name": "Any liquid spotter in quantity", "note": "The water carrier in liquid spotters causes the same permanent tide-mark damage as plain water — the harm is from the liquid, not the active ingredient"},
      {"name": "Alkaline cleaners", "note": "Alkalis damage sisal's cellulose structure and dramatically accelerate water-related discoloration; never use alkaline chemistry on any natural plant fiber rug"},
      {"name": "Vinegar or acid spotters", "note": "Acidic spotters may help with some spill chemistry but still introduce liquid; even acetic acid solutions cause the same tide-ring discoloration as water if used in quantity"}
    ],
    "testFirst": [
      {"name": "Water blot test on hidden corner", "note": "Wet a cotton cloth with plain water and blot a coin-sized area in a hidden corner — if a tide mark forms within 5 minutes of drying, the rug is highly water-reactive and liquid chemistry must be avoided entirely"},
      {"name": "Dry compound compatibility", "note": "Test dry cleaning compound on the back of the rug for 30 minutes — some sisal has latex backing that can be discolored by certain compound carrier chemicals"}
    ],
    "phRange": "6.5–7.5 (strictly neutral; minimize all liquid contact regardless of pH)",
    "temperatureMax": "Ambient temperature only; no heat, no steam, no heated extraction",
    "warnings": [
      "Sisal water marks are permanent — there is no reliable method to remove tide rings once the fiber has dried with a water mark; prevention is the only option",
      "Sisal rugs shrink and distort significantly when wet — a sisal rug that is thoroughly saturated during cleaning may not return to its original dimensions",
      "Sisal is not appropriate for high-traffic or spill-prone areas — its maintenance limitations should be communicated clearly to customers before any cleaning attempt"
    ],
    "proTip": "When a customer calls about spilling red wine on their sisal rug, the first words out of your mouth should be a realistic expectation statement — not a price quote. Sisal water marks from the clean-up attempt are often worse than the original spill. The professional move on a fresh sisal spill is immediate dry-blot to pull up as much liquid as possible, then dry compound application within 30 seconds, then cool air movers. Do not use any liquid chemistry unless you're prepared to treat the entire visible field to prevent tide rings — and even then, sisal may still mark. Know when to manage expectations rather than chase perfection."
  },

  {
    "id": "seagrass-rug",
    "material": "Seagrass Rug",
    "materialClass": "Natural Plant Fiber Rug",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Dry vacuuming (primary maintenance)", "note": "Seagrass's natural waxy coating provides inherent soil resistance — regular dry vacuuming is the most effective and safest maintenance approach"},
      {"name": "Dry cleaning compound", "note": "Absorbent compound methods work with seagrass's natural characteristics; dry cleaning maintains the protective waxy surface coating"},
      {"name": "Minimal damp cloth blotting (plain water)", "note": "Unlike sisal, seagrass's natural waxy coating provides some water resistance — small amounts of water applied and immediately blotted cause less damage than on sisal, but still minimize"},
      {"name": "Dry solvent spotter (petroleum-based)", "note": "For oil-based spills, dry petroleum solvents lift the soil without compromising seagrass's natural protective coating"}
    ],
    "unsafeChemicals": [
      {"name": "Alkaline detergents", "note": "Alkalis strip seagrass's natural waxy protective coating, permanently compromising the fiber's inherent stain resistance and exposing the raw cellulose to moisture damage"},
      {"name": "Enzyme cleaners", "note": "Biological enzyme products degrade the organic compounds in seagrass's natural wax coating, stripping the protective surface that gives seagrass its characteristic durability"},
      {"name": "Bleach or oxidizing agents", "note": "Oxidizers destroy seagrass's cell wall structure; bleach causes color loss and fiber breakdown in this naturally unpigmented material"},
      {"name": "Steam cleaning", "note": "High-temperature steam strips the wax coating, introduces damaging moisture, and can cause shrinkage and distortion of the woven structure"}
    ],
    "testFirst": [
      {"name": "Any cleaning product on the weave surface", "note": "Seagrass varies by harvest region and weave type — test any chemistry on the back edge binding to confirm it doesn't discolor or strip the surface coating"},
      {"name": "Moisture level in backing", "note": "Seagrass rugs typically have a latex or cotton backing — check moisture sensitivity of the backing material separately from the seagrass fiber itself"}
    ],
    "phRange": "6.5–7.5 (neutral only; avoid all alkalinity to protect natural wax coating)",
    "temperatureMax": "Ambient temperature; cool air drying only",
    "warnings": [
      "Seagrass's natural wax coating is its primary defense against staining — any cleaning chemistry that strips this coating permanently degrades the rug's performance and appearance",
      "Seagrass is not color-fast — it naturally yellows and changes tone over time with UV exposure and age; cleaning cannot reverse natural patination",
      "Seagrass rugs placed in humid environments or near exterior doors absorb ambient moisture and can develop mold on the backing without visible surface evidence"
    ],
    "proTip": "Seagrass is one of the most misunderstood natural fiber rugs because customers think its stain resistance means it's easy to clean — it's actually resistant because of a protective wax coating, and that coating is what you must preserve at all costs. The moment you apply alkaline chemistry or steam, you strip that coating and convert a naturally stain-resistant material into an aggressively stain-absorbing one. Treat seagrass like a waxed wood floor: dry clean first, use minimal neutral liquid only when necessary, and your goal is always to maintain the surface coating, not to deep-clean through it."
  },

  {
    "id": "sunbrella",
    "material": "Sunbrella/Solution-Dyed Acrylic",
    "materialClass": "Marine & Outdoor Fabric",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Bleach solution (1 cup per gallon water) + mild soap", "note": "Glen Raven (Sunbrella's manufacturer) explicitly recommends dilute bleach for mold/mildew — solution-dyed acrylic locks colorant inside the fiber during extrusion, so bleach cannot reach the dye sites"},
      {"name": "Mild dish soap (pH 6–8)", "note": "Surfactant cleaning removes salt, sunscreen, and general soiling without affecting the UV-stabilized acrylic fiber structure"},
      {"name": "303 Fabric Guard or equivalent fluoropolymer repellent", "note": "After cleaning, reapplying DWR (durable water repellent) restores the factory water-beading treatment that Sunbrella relies on for practical waterproofing"},
      {"name": "Pressure washer at low setting", "note": "Sunbrella withstands low-pressure washing (under 40 PSI) to remove heavy salt deposits and marine growth — high pressure can damage thread and seams"},
      {"name": "OxiClean or sodium percarbonate solution", "note": "Oxygen bleach addresses organic staining and mildew without the odor of chlorine bleach; particularly effective on stubborn mildew hyphae embedded in the weave"}
    ],
    "unsafeChemicals": [
      {"name": "Dry-cleaning solvents", "note": "Solvent-based dry cleaning products attack acrylic fiber, causing surface dulling, fiber swelling, and permanent texture changes to the woven structure"},
      {"name": "Undiluted bleach", "note": "While dilute bleach is safe for solution-dyed acrylic, full-strength bleach degrades the acrylic polymer and weakens seam thread (especially polyester thread common in marine canvas construction)"},
      {"name": "Heat drying (dryer or heat gun)", "note": "Acrylic fibers shrink and distort at elevated temperatures; always air-dry Sunbrella away from direct heat sources"},
      {"name": "Abrasive scrubbing compounds", "note": "Mechanical abrasion damages Sunbrella's tight weave structure, permanently pilling the surface and compromising water repellency by breaking the surface yarn geometry"}
    ],
    "testFirst": [
      {"name": "Bleach solution on non-original Sunbrella", "note": "Aftermarket fabrics marketed as 'Sunbrella-type' or 'acrylic canvas' may be stock-dyed rather than solution-dyed — test bleach tolerance on a hidden seam before full application"},
      {"name": "Fluoropolymer repellent on aged canvas", "note": "Heavily weathered Sunbrella may have compromised fiber integrity — test DWR spray on a small area to verify even absorption and no discoloration before treating the full canvas"}
    ],
    "phRange": "4.0–11.0 (wide tolerance; solution-dyed acrylic is chemically robust)",
    "temperatureMax": "60°C / 140°F wash temp; air dry only; do not machine dry",
    "warnings": [
      "Mildew on Sunbrella grows ON the fabric surface (feeding on dirt, pollen, and organic deposits), not INTO the fiber — this means bleach treatment is effective and mildew removal is achievable if treated promptly",
      "Sunbrella's water repellency is a surface DWR treatment, not an inherent fiber property — it wears off with UV exposure and washing; regular DWR reapplication is essential maintenance",
      "UV damage to Sunbrella manifests as thread weakening before visible fading — inspect seams and stress points on aged canvas even when the fabric color looks acceptable"
    ],
    "proTip": "The insight that changes how you approach Sunbrella: mildew doesn't grow inside the fiber, it grows on the surface residue — salt, sunscreen, pollen, bird droppings. That's why Glen Raven recommends washing Sunbrella with soap and water every 2–3 months even when it looks clean. You're removing the mildew's food source, not just treating visible growth. When a customer brings in badly mildewed Sunbrella cushion covers, do the bleach treatment, then educate them: the maintenance schedule is the product. A Sunbrella cover cleaned 4x per year will outlast a neglected one by a decade."
  },

  {
    "id": "marine-vinyl",
    "material": "Marine Vinyl",
    "materialClass": "Marine Upholstery",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Marine vinyl cleaner (pH neutral, no alcohol)", "note": "Purpose-formulated marine vinyl cleaners like Star Brite Marine Vinyl Cleaner balance effective surfactant cleaning with plasticizer preservation — critical for preventing brittleness"},
      {"name": "Mild soap and water solution", "note": "Basic surfactant cleaning removes salt, fish blood, sunscreen, and surface soil without attacking the PVC compound or plasticizer system"},
      {"name": "303 Aerospace Protectant", "note": "UV protectant specifically formulated for vinyl/rubber; restores plasticizer flexibility and provides UV blocking that prevents the #1 cause of marine vinyl failure — solar degradation"},
      {"name": "Isopropyl alcohol (diluted 30% max for spot use)", "note": "Dilute IPA spot-treats stubborn stains like sunscreen or fish blood; use sparingly since alcohol slowly depletes plasticizers with repeated use"},
      {"name": "Hydrogen peroxide 3% for mold/mildew", "note": "Mild oxidizer addresses surface mildew without the harshness of bleach; effective on mold that accumulates in stitching seams and textured vinyl surfaces"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone or MEK", "note": "These ketone solvents dissolve PVC's plasticizer system on contact, causing immediate permanent whitening, hardening, and brittleness of the vinyl surface"},
      {"name": "Concentrated bleach", "note": "Strong hypochlorite solutions strip plasticizers from PVC and cause chalking, cracking, and loss of UV inhibitors — the vinyl will harden and crack within one season"},
      {"name": "Petroleum-based solvents (mineral spirits, naphtha)", "note": "Petroleum solvents leach plasticizers from PVC compound, accelerating the embrittlement that causes marine vinyl to crack and split"},
      {"name": "Silicone-based protectants", "note": "Silicone products create a slippery, water-repellent surface that prevents future cleaning products from penetrating and maintaining the vinyl — creates a detailing trap that compounds over time"},
      {"name": "Abrasive cleaners or Scotch-Brite pads", "note": "Abrasion damages the embossed texture surface of marine vinyl, permanently dulling the appearance and creating micro-scratches that trap dirt and accelerate UV degradation"}
    ],
    "testFirst": [
      {"name": "Any stain remover on colored or two-tone vinyl", "note": "Marine vinyl is available in many formulations from different manufacturers — test spotters on underside or hidden seam area to verify no color change or surface dulling"},
      {"name": "Mold treatment on stitched seams", "note": "Thread used in marine upholstery seams is often a different material than the vinyl face; test any mold treatment on a seam area to confirm thread color-fastness"}
    ],
    "phRange": "5.5–8.5 (neutral; avoid both strong acid and strong alkaline extremes)",
    "temperatureMax": "Surface temp: avoid prolonged contact above 60°C / 140°F; protect from direct sustained UV exposure",
    "warnings": [
      "Plasticizer migration is the primary aging mechanism of marine vinyl — plasticizers continuously volatilize from PVC over time, especially under UV and heat; regular protectant application is not cosmetic, it's preventive maintenance",
      "Marine vinyl in low-maintenance boats develops a chalky, powdery surface residue — this is oxidized plasticizer, and it's a warning sign that the vinyl is approaching end-of-life; cleaning and protectant can slow but not reverse the process",
      "Salt spray is a long-term crystalline abrasive threat to marine vinyl — salt crystals caught in textured surfaces grind against the vinyl surface with every flexure; rinse with fresh water after every saltwater outing"
    ],
    "proTip": "The single most profitable conversation you can have with a marine vinyl customer is about plasticizer maintenance. Most boat owners think vinyl care is cleaning — they have no idea that the protectant step is what keeps vinyl soft and flexible. Show them the difference between UV-exposed untreated vinyl and maintained vinyl by pressing a thumbnail into each: soft and flexible vs. hard and cracking. When they see that, the conversation about regular detailing packages sells itself. A marine vinyl interior that's treated with 303 Protectant every 90 days will outlast an untreated one by 5–7 years."
  },

  {
    "id": "marine-canvas",
    "material": "Marine Canvas",
    "materialClass": "Marine & Outdoor Fabric",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Mild soap + water (cold or lukewarm)", "note": "Basic surfactant cleaning removes salt, mildew surface deposits, and organic soiling without stripping the factory water repellent treatment (typically fluoropolymer DWR)"},
      {"name": "Dilute bleach solution (1:10 with water) for mildew", "note": "Marine canvas is mildew-prone due to constant moisture exposure — dilute bleach treats active mildew growth; test first as some canvas dyes are bleach-sensitive"},
      {"name": "Star Brite Mildew Stain Remover or equivalent", "note": "Commercial marine mildew removers formulate chemistry specifically for marine canvas and Sunbrella — balance mildew treatment with fabric and thread protection"},
      {"name": "Fluoropolymer DWR spray (PTFE-based)", "note": "Reapplying water repellent treatment after cleaning is critical for marine canvas — the factory DWR degrades with UV and washing; annual reapplication maintains performance"},
      {"name": "303 Fabric Guard", "note": "Premium DWR treatment that also provides UV protection; extends canvas life significantly in marine environments with constant solar exposure"}
    ],
    "unsafeChemicals": [
      {"name": "Detergent with optical brighteners", "note": "OBAs deposit on canvas fibers and break down in UV light, causing yellowing and uneven discoloration across large canvas surfaces — use OBA-free marine soap only"},
      {"name": "Petroleum solvents", "note": "Petroleum-based cleaners strip the DWR coating and can dissolve the PVC or urethane backing used on many marine canvas products, causing delamination"},
      {"name": "High-pressure washing above 60 PSI", "note": "High-pressure washing damages canvas weave structure, drives water into seams, and can strip stitching — always use low-pressure application with soft brush agitation"},
      {"name": "Machine washing in hot water", "note": "Hot machine washing shrinks canvas, damages DWR treatment, and stresses zipper and snap hardware; hand wash or low-temperature machine wash only"}
    ],
    "testFirst": [
      {"name": "Bleach solution on dyed canvas", "note": "Canvas boat covers use a variety of dye systems — some are bleach-fast, others are not; test dilute bleach on a hidden hem before mildew treatment on any non-white canvas"},
      {"name": "DWR spray over cleaned canvas", "note": "Ensure canvas is fully dry (24–48 hours after cleaning) before applying DWR — applying protectant to damp canvas traps moisture and can encourage mildew under the coating"}
    ],
    "phRange": "5.5–9.0 (mildly alkaline acceptable for mildew treatment; rinse thoroughly after)",
    "temperatureMax": "40°C / 104°F wash temp; air dry fully before storage or folding",
    "warnings": [
      "Marine canvas stored while damp or folded against itself is the primary cause of mildew — proper drying and storage protocol is as important as cleaning chemistry",
      "Thread on marine canvas (typically polyester V-69 or V-138 bonded thread) degrades with UV exposure before the canvas fabric itself fails — inspect seams on aged canvas; re-stitching extends life significantly",
      "Canvas left over winter without cleaning retains salt and organic deposits that attract mildew during storage — pre-storage cleaning is mandatory maintenance, not optional"
    ],
    "proTip": "Marine canvas care is 80% about drying and 20% about chemistry. The mildew that plagues boat owners isn't a cleaning problem — it's a moisture management problem. Mildew requires three things: moisture, warmth, and organic food (salt, pollen, bird droppings). Remove any one of them and mildew can't grow. The professional move is to clean the canvas thoroughly (removing the organic food source), treat active mildew growth, reapply DWR to reduce moisture absorption, and then educate the customer: 'Your canvas needs to be completely dry before it's snapped or zipped closed every single time.' That conversation prevents more mildew than any chemistry you can apply."
  },

  {
    "id": "sail-cloth",
    "material": "Sail Cloth/Dacron",
    "materialClass": "Marine Sail Fabric",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Mild soap and fresh water rinse", "note": "Dacron (polyester) sail cloth is primarily maintained by rinsing salt and removing surface soil — saltwater crystallization is the primary mechanical degradation mechanism"},
      {"name": "Dilute oxygen bleach (sodium percarbonate)", "note": "Oxygen bleach addresses mildew staining on sail cloth without the harshness of chlorine bleach; effective for the dark mildew spots common where sails stack on furlers"},
      {"name": "Sail cleaner (Starbrite, Neil Pryde formulas)", "note": "Purpose-formulated sail cleaners address the specific soiling types in sailing (salt, diesel exhaust, fish/bait) without damaging laminate films or structural resin treatments"},
      {"name": "Fresh water soak for salt removal", "note": "Extended fresh water soak (2–4 hours) dissolves and removes salt crystals that have penetrated the weave — mechanical salt damage occurs as crystals flex during sail use"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach at full strength", "note": "Degrades polyester fiber over time and attacks the adhesive laminate used in laminated sail panels; single-use treatment at high concentration can cause permanent film delamination"},
      {"name": "Acetone or MEK (on laminated sails)", "note": "Ketone solvents dissolve the polyester film (Mylar/PET film) used in laminated sails and attack the adhesive bonding the film layers — catastrophic and irreversible on performance sails"},
      {"name": "Petroleum solvents on laminated sail cloth", "note": "Petroleum solvents loosen the adhesive bonding in laminate sail panels, causing delamination bubbles and compromising structural integrity at the worst possible moment"},
      {"name": "Hot water washing above 60°C", "note": "Heat distorts polyester dimensional stability and can cause permanent shape changes in sail cloth panels — shape is everything for sail performance; always use cool water"}
    ],
    "testFirst": [
      {"name": "Any stain treatment on laminated sails", "note": "Woven Dacron versus laminated Mylar-film sails require completely different chemistry — identify sail construction before applying any chemistry; laminated sails need extreme gentleness"},
      {"name": "Bleach treatment on colored or logo areas", "note": "Sail numbers, logos, and insignia use different dyes than the base sail cloth — test bleach on a small area near a logo edge to verify color-fastness before treating the full sail"}
    ],
    "phRange": "5.0–9.5 (woven Dacron); 6.0–8.0 (laminated film sails — far more restricted)",
    "temperatureMax": "60°C / 140°F for woven Dacron; 40°C / 104°F for laminated sails; always air dry",
    "warnings": [
      "UV degradation is the primary killer of sail cloth — Dacron loses tensile strength with cumulative UV exposure regardless of care; a sail used 200+ days per year will fail mechanically before it looks visually degraded",
      "Mildew on sail cloth grows in the dark, folded interior of furled sails — cleaning the exterior that's visible when the sail is set misses the mildew colonies growing inside the furl",
      "Laminated sail panels (Mylar/Spectra/carbon film laminates) delaminate with age and have no repair path — once delamination begins, chemistry cannot reverse it and the panel must be replaced"
    ],
    "proTip": "The most important salt-removal technique for sail cloth is time, not chemistry. After every saltwater outing, a 2-hour fresh water soak does more to extend sail life than any cleaner. Salt crystals that are just sitting in the weave are dissolved and flushed away. Salt crystals that have been left to dry crystallize and act like microscopic knives as the sail flexes — every tack and gybe mechanically cuts the fiber. Experienced sail loft techs can estimate a sail's age within a few seasons just by feeling the stiffness of the Dacron — that stiffness is accumulated salt and UV damage. Rinsing is not optional; it's structural maintenance."
  },

  {
    "id": "gelcoat",
    "material": "Gelcoat/Polyester Resin",
    "materialClass": "Marine Hull Surface",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Marine wash soap (pH 6–8, non-abrasive)", "note": "Star Brite Sea Safe, West Marine, or equivalent marine-formulated soap removes salt, fish residue, and surface soil without stripping wax or oxidizing fresh gelcoat"},
      {"name": "Oxidation remover / light compound (e.g., 3M Marine Compound)", "note": "Oxidized gelcoat requires abrasive compounding to remove the chalky oxidized layer and expose fresh resin below — this is the correct treatment for chalky hull above the waterline"},
      {"name": "Marine polish (finishing polish post-compound)", "note": "After compounding, finishing polish fills micro-scratches and prepares the surface for wax application — the compound-polish-wax sequence is industry standard for gelcoat restoration"},
      {"name": "Carnauba or PTFE marine wax", "note": "Wax provides UV protection and water-beading that directly slows gelcoat oxidation; re-application every 3–6 months is maintenance, not cosmetic"},
      {"name": "Bar Keepers Friend (oxalic acid) for rust stains", "note": "Oxalic acid chelates iron and manganese rust stains from hardware run-off without damaging the gelcoat surface — the professional standard for waterline rust streaks"}
    ],
    "unsafeChemicals": [
      {"name": "Ammonia-based cleaners", "note": "Ammonia attacks the polyester resin matrix in gelcoat, causing microscopic surface crazing and stripping protective wax — never use ammonia or ammonia-glass cleaners on gelcoat or fiberglass"},
      {"name": "Acetone (except for spot prep only)", "note": "Acetone dissolves polyester resin — brief spot use for adhesive removal is acceptable on sound gelcoat, but prolonged contact or use on aged/thin gelcoat causes irreversible etching"},
      {"name": "Abrasive cleanser (Comet, Ajax)", "note": "Powder cleansers leave permanent scratches in gelcoat's relatively soft surface (2–3 Mohs); scratches trap salt and UV-oxidize faster than surrounding areas"},
      {"name": "Muriatic acid (except bilge/waterline use with extreme care)", "note": "Hydrochloric acid dissolves the calcium carbonate deposits but aggressively attacks polyester resin — strong acid use on gelcoat above waterline causes immediate surface etching and color damage"}
    ],
    "testFirst": [
      {"name": "Cutting compound on production gelcoat", "note": "Test compound aggressiveness on a hidden area — some older or thinner gelcoat areas (near waterline, high-stress points) may compound through to the fiberglass laminate below"},
      {"name": "Stain remover on colored gelcoat", "note": "Gelcoat pigmentation varies by age and manufacturer — some colored gelcoats are more sensitive to acid-based stain treatments; test on hidden area before treating visible topsides"}
    ],
    "phRange": "5.0–9.0 (neutral maintenance preferred; avoid strong acid or strong alkaline chemistry)",
    "temperatureMax": "Surface temp: avoid chemical application in direct sun above 35°C — rapid evaporation causes streaking and chemical concentration; work in shade or during cooler hours",
    "warnings": [
      "Gelcoat is typically only 0.5–1.0mm thick over the fiberglass laminate — repeated aggressive compounding on the same areas removes material permanently; track compound passes and avoid over-compounding thin areas",
      "Osmotic blistering (gelcoat blisters below waterline) is a moisture intrusion issue, not a cleaning problem — blisters require barrier coat repair, not chemical treatment",
      "Crazing (fine surface cracks in gelcoat) indicates UV and age degradation in the resin cross-link structure — crazing cannot be chemically repaired; only filling and repainting addresses structural crazing"
    ],
    "proTip": "Professional marine detailers know that the compound-polish-wax sequence is not three optional steps — it's one system, and skipping the wax step is the most expensive mistake you can make. After compounding, you've removed the oxidized surface and exposed fresh polyester resin that is more UV-reactive than the oxidized layer you removed. If you don't wax within 24–48 hours, you'll have a beautifully shiny hull that oxidizes faster than before you started. The wax is the UV barrier that makes the compounding last. Quote the full system to your customer, not individual steps."
  },

  // ─── CARPET ──────────────────────────────────────────────────────────────

  {
    "id": "nylon-carpet",
    "material": "Nylon Carpet",
    "materialClass": "Synthetic Fiber Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Hot water extraction detergent (Bridgepoint Flex Ice, Prochem All Fiber Rinse)", "note": "Nylon tolerates mildly acidic to neutral carpet chemistry well; rinse agents help neutralize alkaline presprays and prevent resoiling"},
      {"name": "Hydrogen peroxide 3% spotter", "note": "Useful for organic stain oxidation on solution-dyed or stable nylon when used briefly; lower oxidation risk than hypochlorite"},
      {"name": "Enzyme spotter (BioKleen Bac-Out, Bridgepoint Bio-Modifier)", "note": "Protease, amylase, and lipase are fiber-safe on nylon and effective on food, urine, and protein contamination"},
      {"name": "Woolite Carpet & Upholstery foam", "note": "Low-residue surfactant system is generally safe for routine maintenance spotting on nylon face fibers"},
      {"name": "Acid rinse (Prochem All Fiber Rinse, diluted white vinegar)", "note": "Nylon carries static and alkaline residue easily; acidic rinse resets pH and improves hand while reducing browning risk"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach (Clorox, sodium hypochlorite)", "note": "Oxidizes nylon's polyamide chain, causing yellowing, brittleness, and irreversible dye loss"},
      {"name": "Strong alkaline prespray (pH >10.5, Zep High Traffic, ammonia boosters)", "note": "High alkalinity hydrolyzes amide linkages over time and destabilizes acid dyes commonly used on nylon carpet"},
      {"name": "Acetone / lacquer thinner", "note": "Strong solvent can swell or dull nylon fiber surfaces and strip backing adhesives or printed pattern color"},
      {"name": "High heat steam at the wand", "note": "Excess heat can distort pile, cause texture change, and promote latex backing stress or seam delamination"},
      {"name": "Overuse of oxidizers (40 vol peroxide, sodium percarbonate paste)", "note": "Aggressive oxidation can bleach face yarn and create permanent light spots, especially on piece-dyed nylon"}
    ],
    "testFirst": [
      {"name": "Red stain remover / reducing agents", "note": "Heat-activated reducers can remove acid dyes along with the stain; test on hidden area before treating sports drink or Kool-Aid spots"},
      {"name": "Solvent gel spotters", "note": "Safe on some nylon carpets but can soften adhesive, seam sealer, or printed pattern coatings depending on construction"}
    ],
    "phRange": "5.0 – 10.0",
    "temperatureMax": "200°F / 93°C",
    "warnings": [
      "Nylon browns if overwet and left alkaline — always rinse extraction detergent thoroughly",
      "Avoid long dwell times with strong traffic-lane cleaners on older residential nylon",
      "Textured nylon can show tip bloom or distortion from aggressive bonnet agitation",
      "Watch for latex-backed installations where heat and overwetting can release seams"
    ],
    "proTip": "Most nylon carpet complaints after cleaning are not fiber damage — they're residue issues. If the carpet feels crunchy or resoils fast, you left alkaline prespray behind. Veteran cleaners neutralize nylon with an acid rinse even when the prespray label says it's optional."
  },

  {
    "id": "polyester-carpet",
    "material": "Polyester Carpet",
    "materialClass": "Synthetic Fiber Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Neutral carpet shampoo (Woolite Carpet Foam, Prochem Neutral Pro Spotter)", "note": "Polyester is chemically tolerant and responds well to low-residue neutral surfactants for routine spotting"},
      {"name": "Citrus gel degreaser used sparingly", "note": "Polyester is oleophilic and traps body oils; controlled solvent gel helps release oily binders before extraction"},
      {"name": "Hydrogen peroxide 3%", "note": "Useful for beverage and organic stain oxidation on many polyester carpets without the dye destruction of chlorine bleach"},
      {"name": "Enzyme cleaner (Nature's Miracle, Bio-Modifier)", "note": "Effective on food, pet, and body-fluid contamination; the fiber itself is not affected by enzymes"},
      {"name": "Dawn dish soap diluted for grease pre-treatment", "note": "Surfactant action helps break oily soil load that polyester tends to hold more than nylon"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach", "note": "May not dissolve polyester fiber quickly, but it attacks carpet dyes and can yellow backing or leave bright bleach spots"},
      {"name": "Acetone", "note": "Can soften or dull polyester fiber surfaces and damage secondary backing adhesives"},
      {"name": "High heat steam / iron transfer", "note": "Polyester pile can glaze or permanently deform under excessive heat, leaving shiny or crushed traffic areas"},
      {"name": "Strong solvent flooding", "note": "Heavy solvent use can wick into backing, loosen adhesives, and spread oily contamination deeper into the carpet"},
      {"name": "Powdered high-pH detergents left as residue", "note": "Polyester already resoils easily from oil attraction; alkaline residue compounds rapid resoiling and dull appearance"}
    ],
    "testFirst": [
      {"name": "Oxygen bleach boosters (OxiClean solution)", "note": "Usually fiber-safe, but test on dark or patterned carpets where disperse dye stability is uncertain"},
      {"name": "Solvent-based tar remover", "note": "Can help with asphalt or grease, but some installations use solvent-sensitive glue systems under the face yarn"}
    ],
    "phRange": "5.0 – 10.5",
    "temperatureMax": "180°F / 82°C",
    "warnings": [
      "Polyester loves oil — traffic lanes often need degreasing before normal extraction chemistry will work",
      "Do not overwet; wick-back from the backing is common on spills that penetrated the pad",
      "Heat distortion on polyester pile is permanent and often mistaken for 'stain shadowing'",
      "Low-cost polyester carpets can matte mechanically even when chemistry is correct"
    ],
    "proTip": "When polyester carpet looks clean wet but grey again when dry, that's usually oil shadowing — not soil you missed in the rinse. Experienced techs precondition traffic lanes with a dedicated grease cutter, groom it in, then extract twice instead of adding more general detergent."
  },

  {
    "id": "wool-carpet",
    "material": "Wool Carpet",
    "materialClass": "Protein Fiber Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "WoolSafe-approved detergent (Prochem Fiber & Fabric Rinse, WoolSafe products)", "note": "Formulated in the acidic-to-neutral range to protect keratin structure and wool dyes"},
      {"name": "Cool to warm water extraction", "note": "Moderate temperature prevents felting, shrinkage, and dye migration while still lifting soil"},
      {"name": "Acid rinse (acetic acid / WoolSafe rinse)", "note": "Neutralizes alkaline contamination and helps close the fiber cuticle, improving softness and color stability"},
      {"name": "Protein-safe solvent spotter", "note": "Dry-side spotting for grease avoids overwetting wool and minimizes browning risk"},
      {"name": "Lanolin-friendly mild soap (Woolite, specialty wool shampoo)", "note": "Gentle surfactants remove soil without stripping too much natural hand from the fiber"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach", "note": "Attacks wool keratin directly, causing yellowing, fiber dissolution, and irreversible weakness"},
      {"name": "Strong alkaline carpet prespray (pH >8.5)", "note": "Alkalinity raises scales, strips natural oils, and promotes felting and dye bleed in wool constructions"},
      {"name": "Protease-heavy stain removers (Biz, Zout)", "note": "Protease enzymes digest protein stains by breaking peptide bonds — wool is protein, so the fiber is at risk too"},
      {"name": "High heat / near-boiling extraction", "note": "Heat plus moisture can shrink wool, distort pile, and accelerate color bleeding"},
      {"name": "Ammonia-based spotters", "note": "Ammonia is strongly alkaline and can quickly damage wool's surface scales and dye system"}
    ],
    "testFirst": [
      {"name": "Hydrogen peroxide spotter", "note": "Mild peroxide can help with organics, but some wool dyes fade rapidly with oxidation — test hidden tuft first"},
      {"name": "Dry solvent spotters", "note": "Usually preferred for grease, but some tufted wool rugs use unstable backings, sizings, or fugitive dyes"}
    ],
    "phRange": "4.5 – 8.0",
    "temperatureMax": "150°F / 66°C",
    "warnings": [
      "Never treat wool carpet like synthetic carpet — the chemistry window is much narrower",
      "Overwetting wool can cause browning, cellulosic backing bleed, and shrinkage at seams or edges",
      "Agitation should be gentle; aggressive CRB or bonnet action can fuzz and distort the pile",
      "Pet urine on wool often needs odor treatment plus acid balancing, not stronger detergent"
    ],
    "proTip": "The real danger on wool carpet is not the spot you can see — it's the alkaline residue you leave behind. Wool can look fine on day one and then yellow, wick, or feel rough two days later. Skilled wool cleaners finish every corrective treatment with an acid rinse because wool remembers bad pH longer than synthetics do."
  },

  {
    "id": "olefin-carpet",
    "material": "Olefin Carpet",
    "materialClass": "Polypropylene Carpet",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Alkaline traffic-lane cleaner used correctly", "note": "Olefin is chemically tough and tolerates stronger detergents better than nylon or wool, making it responsive to alkaline builders"},
      {"name": "Citrus solvent gel", "note": "Olefin is highly oleophilic, so oily soils need solvent assistance to break their bond to the fiber"},
      {"name": "Enzyme cleaner", "note": "Effective for food, body fluid, and pet contamination; the fiber is not harmed by enzymatic chemistry"},
      {"name": "Hydrogen peroxide 3%", "note": "Can be used on many olefin carpets for organic discoloration with relatively low fiber risk"},
      {"name": "Dawn diluted degreasing pre-spotter", "note": "Useful on barbecue, body oil, and greasy traffic lane loading common on olefin berbers and rental-grade carpet"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach on installed carpet", "note": "Olefin fiber may resist bleach more than nylon, but the backing, adhesives, and surrounding dyes usually do not"},
      {"name": "Excessive heat", "note": "Polypropylene has a low melting point relative to many fibers; high heat can distort or fuse tips, especially during friction spotting"},
      {"name": "Solvent flooding", "note": "Heavy solvent use can migrate oily soils and soften adhesives or seam sealers beneath the face yarn"},
      {"name": "Iron-transfer stain removal on olefin", "note": "Heat used to remove wax or synthetic transfer can glaze or melt olefin pile quickly"},
      {"name": "Powder detergents left unrinsed", "note": "Olefin already attracts oily soil; detergent residue speeds traffic-lane resoiling and greying"}
    ],
    "testFirst": [
      {"name": "Reducing agents for beverage dye stains", "note": "Olefin itself is often solution-dyed, but patterned or blended constructions may still lose color under heat-activated reducers"},
      {"name": "Strong oxidizers", "note": "Fiber may tolerate them, but backing latex, seams, or adjacent accent yarns may not — test whole construction, not just tuft color"}
    ],
    "phRange": "6.0 – 11.0",
    "temperatureMax": "160°F / 71°C",
    "warnings": [
      "Olefin's biggest problem is oil attraction, not chemical fragility",
      "Do not assume a stain that remains after extraction needs more detergent — it may need solvent or dry-side work",
      "Low-cost olefin loops can fuzz mechanically under aggressive bonneting",
      "Heat damage on olefin looks like grey or shiny traffic lanes and cannot be cleaned back out"
    ],
    "proTip": "Olefin is the classic 'looks dirty forever' carpet because the fiber grabs oil like a magnet. Veteran cleaners know traffic lanes on olefin often need a solvent-emulsifier step first; otherwise you just rinse the water-soluble soil and leave the greasy shadow behind."
  },

  {
    "id": "berber-carpet",
    "material": "Berber Carpet",
    "materialClass": "Loop Pile Carpet Construction",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Low-moisture encapsulation detergent", "note": "Berber loop construction hides moisture and soils in the base; low-moisture methods reduce wick-back and backing stress"},
      {"name": "Neutral extraction rinse", "note": "A controlled rinse removes suspended soil without leaving sticky residue in dense loop rows"},
      {"name": "Enzyme spotter", "note": "Useful on food and pet incidents that settle deep between loops where surface spotting alone misses contamination"},
      {"name": "Citrus gel for grease spots", "note": "Targeted solvent work is often safer than saturating greasy spots with repeated water-based applications"},
      {"name": "Hydrogen peroxide 3% on stable color", "note": "Can brighten localized organic staining when applied carefully and extracted promptly"}
    ],
    "unsafeChemicals": [
      {"name": "Overwetting", "note": "Berber construction traps moisture at the base of loops, which leads to wick-back, odor, seam stress, and prolonged drying"},
      {"name": "Strong alkaline prespray left in the loops", "note": "Residue deep in the construction attracts soil and is hard to rinse out of dense loop pile"},
      {"name": "Aggressive rotary brushing", "note": "Loop yarns snag and bloom under harsh mechanical agitation, permanently roughening the surface"},
      {"name": "Chlorine bleach", "note": "Damages dyes, backings, and often reveals uneven spotting dramatically across loop constructions"},
      {"name": "High heat at seams", "note": "Latex-backed Berbers are especially prone to seam release and shrinkage when overwet or overheated"}
    ],
    "testFirst": [
      {"name": "Solvent spotter", "note": "Can be effective on oily loop-pile stains, but test for backing sensitivity and potential ring expansion in dense construction"},
      {"name": "Oxidizers on multicolor flecked Berber", "note": "Light fibers may brighten faster than dark flecks, creating a mottled repaired look if not tested first"}
    ],
    "phRange": "5.0 – 10.0",
    "temperatureMax": "180°F / 82°C",
    "warnings": [
      "Loop pile snags easily — never over-brush a Berber spot",
      "Drying time matters more on Berber than on many cut piles because moisture hides deep in the rows",
      "Wick-back from pad-level spills is common even when the face looks clean after extraction",
      "A 'Berber' may be wool, nylon, or olefin — always check fiber, not just construction name"
    ],
    "proTip": "Berber is a construction, not a fiber. The veteran move is identifying whether you're dealing with wool Berber, olefin Berber, or nylon Berber before you choose chemistry — because the loop structure causes the same symptoms while the fibers require totally different pH limits."
  },

  {
    "id": "jute-rug",
    "material": "Jute Rug",
    "materialClass": "Natural Cellulosic Plant Fiber",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Dry absorbent compound (Host dry cleaner)", "note": "Low-moisture absorbent cleaning is safest because jute darkens, browns, and distorts easily when wet"},
      {"name": "Vacuum-only maintenance", "note": "Mechanical dry soil removal is the primary safe care method for jute rugs"},
      {"name": "Minimal solvent spotter for grease", "note": "Dry-side spotting avoids the water browning that cellulosic bast fibers commonly show"},
      {"name": "Cornstarch or baking soda for fresh oil blotting", "note": "Absorbs oily contamination before it penetrates and oxidizes in the rough plant fiber"},
      {"name": "Barely damp distilled water blotting", "note": "Emergency use only for water-soluble spills; using distilled water limits mineral rings if kept extremely controlled"}
    ],
    "unsafeChemicals": [
      {"name": "Hot water extraction", "note": "Jute swells, browns, shrinks, and can delaminate or distort badly when saturated"},
      {"name": "Alkaline cleaners", "note": "High pH promotes lignin-related browning and weakens natural plant fiber structure"},
      {"name": "Chlorine bleach", "note": "Oxidizes cellulose and lignin aggressively, causing yellow-white damage and fiber brittleness"},
      {"name": "Hydrogen peroxide flooding", "note": "Even mild oxidizers can create uneven light spots and weaken natural color in untreated jute"},
      {"name": "Steam cleaning", "note": "Heat and moisture together distort weave tension, cause odor, and can trigger severe browning"}
    ],
    "testFirst": [
      {"name": "Any water-based spotter", "note": "Jute varies widely in dyeing and backing construction; even tiny water applications can leave expanding tide marks"},
      {"name": "Solvent stain remover", "note": "Usually safer than water, but some latex-backed or glued jute rugs react poorly to solvent migration"}
    ],
    "phRange": "6.0 – 7.5",
    "temperatureMax": "100°F / 38°C",
    "warnings": [
      "Jute is one of the least forgiving rug fibers when wet",
      "Browning after cleaning is usually fiber chemistry, not soil wicking",
      "Drying fans are essential after even a minor spill treatment",
      "Musty odor often means the jute core stayed damp too long"
    ],
    "proTip": "On jute, the best cleaner is often restraint. Experienced rug techs know that a 70% improvement with dry methods is better than a 95% improvement that comes with cellulosic browning, curl, and a callback."
  },

  {
    "id": "sisal-rug",
    "material": "Sisal Rug",
    "materialClass": "Natural Hard Plant Fiber",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Dry extraction compound", "note": "Sisal performs best with moisture-minimized cleaning because the hard plant fibers absorb water unevenly and stain easily"},
      {"name": "Vacuuming with suction only", "note": "Routine dry soil removal prevents abrasive grit without the wetting risks of shampooing"},
      {"name": "Solvent spotter for grease", "note": "Targeted dry-side treatment helps on oily spills without saturating the fiber bundle"},
      {"name": "Absorbent powder (cornstarch / dry baking soda) on fresh oil", "note": "Immediate absorption reduces the dark halo that sisal often develops around greasy incidents"},
      {"name": "Very light pH-neutral foam", "note": "Minimal-moisture foam can be used cautiously when dry methods alone are not enough"}
    ],
    "unsafeChemicals": [
      {"name": "Water flooding or extraction", "note": "Sisal stains, shrinks, and warps quickly when saturated; moisture also weakens glued and latex-backed constructions"},
      {"name": "Alkaline detergents", "note": "Promote browning and stiffness in lignin-containing plant fibers and leave visible residue on pale sisal"},
      {"name": "Chlorine bleach", "note": "Creates harsh light spots and rapidly degrades the natural fiber"},
      {"name": "Steam", "note": "Heat plus moisture drives warping and edge curl while deepening natural browning tones"},
      {"name": "Peroxide overuse", "note": "Can create pale patches on natural straw shades and weaken the outer fiber surface"}
    ],
    "testFirst": [
      {"name": "Foaming upholstery cleaner", "note": "If used, test in a hidden area to confirm the foam does not leave a water line or darkening ring"},
      {"name": "Solvent gel", "note": "May be safe for grease, but test any backing or border tape for adhesive sensitivity"}
    ],
    "phRange": "6.0 – 7.5",
    "temperatureMax": "100°F / 38°C",
    "warnings": [
      "Sisal darkens from even clean water if the wet edge dries unevenly",
      "Do not scrub — the rough fiber surface fuzzes and pills fast",
      "Bound edges and latex backings often fail before the sisal face does",
      "Spill response must be immediate because sisal absorbs and oxidizes quickly"
    ],
    "proTip": "The trick with sisal is controlling the edge of moisture. Pros don't just blot the spill — they feather the boundary and dry it immediately so you don't create the classic dark ring that customers think is leftover stain but is really differential wetting."
  },

  {
    "id": "seagrass-rug",
    "material": "Seagrass Rug",
    "materialClass": "Natural Waxy Plant Fiber",
    "category": "carpet",
    "emoji": "🏠",
    "safeChemicals": [
      {"name": "Vacuum-only routine care", "note": "Seagrass has a naturally waxy surface that releases dry soil well without wet cleaning"},
      {"name": "Dry absorbent cleaning compound", "note": "Best general cleaning option because it avoids the mold and odor issues that trapped moisture can create"},
      {"name": "Solvent spotter for oil/tar", "note": "The waxy surface resists water but can still hold oily contamination that benefits from dry-side spotting"},
      {"name": "Cornstarch on fresh grease", "note": "Absorbs oily spills before they settle into the woven intersections"},
      {"name": "Barely damp cloth with distilled water", "note": "Used only for emergency blotting of sugary spills; the low absorbency of seagrass helps if moisture is kept extremely light"}
    ],
    "unsafeChemicals": [
      {"name": "Hot water extraction", "note": "Even though seagrass is more water-resistant than sisal or jute, saturation can still cause mildew, shrinkage, and backing problems"},
      {"name": "Alkaline detergents", "note": "Can strip natural surface waxes, leaving the fiber duller, rougher, and more prone to future soiling"},
      {"name": "Chlorine bleach", "note": "Bleaches natural color unevenly and weakens plant fiber over time"},
      {"name": "Steam cleaning", "note": "Drives moisture into the weave and backing where it dries slowly and can produce odor or warping"},
      {"name": "Heavy brushing", "note": "Can fray the coarse weave and roughen the naturally smooth waxy finish"}
    ],
    "testFirst": [
      {"name": "Water-based spotter", "note": "Seagrass may resist spotting better than sisal, but bound edges, backings, and dye accents can still react badly"},
      {"name": "Solvent adhesive remover", "note": "Can help on gummy contamination, but test border adhesives and any rug finish before use"}
    ],
    "phRange": "6.0 – 8.0",
    "temperatureMax": "110°F / 43°C",
    "warnings": [
      "Seagrass is more water-resistant, not water-proof",
      "Moisture trapped beneath the rug can create mildew even if the face looks fine",
      "Avoid over-cleaning; many seagrass rugs respond best to maintenance rather than restoration",
      "Drying both face and floor underneath matters after any spill event"
    ],
    "proTip": "Seagrass' waxy finish is why people think it's 'easy.' It is — until someone floods it. Veterans treat seagrass more like a woven hard surface than a carpet: dry soil removal first, localized spot work second, and almost never a full wet clean."
  },

  // ─── MARINE ──────────────────────────────────────────────────────────────

  {
    "id": "sunbrella",
    "material": "Sunbrella",
    "materialClass": "Solution-Dyed Acrylic Marine Fabric",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Sunbrella Clean Multi-Purpose Fabric Cleaner", "note": "Designed for solution-dyed acrylic and safe on the finish package used in marine applications"},
      {"name": "Mild soap (Dawn, Woolite) with lukewarm water", "note": "Routine maintenance chemistry is usually enough because solution-dyed acrylic releases most soil well"},
      {"name": "303 Marine Fabric Guard", "note": "Restores water repellency after cleaning without harming the acrylic fiber"},
      {"name": "Diluted bleach for mold per manufacturer guidance", "note": "Solution-dyed acrylic tolerates controlled bleach use better than many textiles because color runs through the fiber, not just on the surface"},
      {"name": "Isopropyl alcohol for localized adhesive/ink marks", "note": "Generally safe on the acrylic face when used briefly and blotted rather than flooded"}
    ],
    "unsafeChemicals": [
      {"name": "High-solvent degreasers", "note": "Can strip factory-applied repellency and damage stitching, windows, or surrounding vinyl trim"},
      {"name": "Harsh alkaline cleaners (Purple Power, Zep Purple)", "note": "Strong alkalinity strips finish chemistry and can accelerate seam-thread degradation"},
      {"name": "Pressure washer at close range", "note": "Mechanical damage to weave, seams, and water-repellent finish is more likely than true chemical damage"},
      {"name": "Undiluted chlorine bleach", "note": "Even though the acrylic can tolerate some bleach, full-strength bleach attacks threads, coatings, and nearby materials"},
      {"name": "High heat drying / heat gun use", "note": "Can shrink seam areas, distort clear vinyl panels, and degrade binding tape or thread before the fabric itself fails"}
    ],
    "testFirst": [
      {"name": "Bleach mold treatment", "note": "Test not just the fabric but stitching and surrounding trim; thread failure is the hidden risk on marine canvas assemblies"},
      {"name": "Solvent stain remover", "note": "Usually okay on acrylic fabric, but test any printed logos, seam sealers, or aftermarket waterproofing first"}
    ],
    "phRange": "6.0 – 10.0",
    "temperatureMax": "150°F / 66°C",
    "warnings": [
      "Sunbrella's color usually survives chemicals better than the stitching does",
      "Rinse salt thoroughly — salt crystals abrade fibers and trap moisture",
      "Reproofing after deep cleaning is often necessary for original beading performance",
      "Mildew often feeds on dirt trapped in the fabric, not on the acrylic itself"
    ],
    "proTip": "On Sunbrella, the smartest tech inspects the thread before recommending aggressive cleaning. The acrylic fabric may survive a bleach wash beautifully while the old polyester or cotton-wrapped thread fails six weeks later. The customer blames the cleaner, not the age of the seam."
  },

  {
    "id": "marine-vinyl",
    "material": "Marine Vinyl",
    "materialClass": "PVC Upholstery with Protective Topcoat",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Mild soap and water", "note": "Best general cleaner for marine vinyl because it removes salt, sunscreen, and body soil without attacking the topcoat"},
      {"name": "303 Marine Clear Vinyl / Aerospace Protectant", "note": "UV protectant helps slow topcoat chalking and plasticizer loss"},
      {"name": "VLR (vinyl-leather-rubber) cleaner", "note": "Purpose-made interior/marine vinyl cleaners are balanced to lift oil without stripping the finish"},
      {"name": "Isopropyl alcohol diluted 1:1", "note": "Can help on dye transfer or ink when used carefully and wiped off promptly"},
      {"name": "Hydrogen peroxide 3% for mildew staining", "note": "Useful on mildew discoloration when followed by a full rinse; lower risk than strong bleach on topcoated vinyl"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone / MEK / lacquer thinner", "note": "These solvents dissolve or soften the vinyl topcoat and extract plasticizers, causing cracking and tackiness"},
      {"name": "Harsh bleach mixtures", "note": "Strong hypochlorite can chalk the surface, weaken stitching, and accelerate topcoat breakdown"},
      {"name": "Abrasive powders (Bar Keepers Friend, Comet)", "note": "Mechanical abrasion removes the protective skin and leaves the vinyl porous and fast-soiling"},
      {"name": "High-pH degreasers", "note": "Strip protective coatings and can embrittle vinyl over time by pulling out plasticizer-rich surface components"},
      {"name": "Magic Eraser with heavy pressure", "note": "Melamine foam is abrasive and can create dull patches by sanding the sheen off the topcoat"}
    ],
    "testFirst": [
      {"name": "Isopropyl alcohol", "note": "Some marine vinyl topcoats tolerate it well, others lose gloss quickly — test hidden skirt area first"},
      {"name": "Mildew remover", "note": "Test both vinyl and thread because whitening or seam weakening often appears before visible vinyl damage"}
    ],
    "phRange": "6.0 – 8.5",
    "temperatureMax": "120°F / 49°C",
    "warnings": [
      "Marine vinyl failures usually start with topcoat damage, not the PVC base",
      "Sunscreen and body oils should be removed regularly because they soften and stain vinyl finishes",
      "Never confuse mildew on the surface with mildew inside the foam — the latter requires deeper correction",
      "UV plus harsh chemistry is what makes marine vinyl crack early"
    ],
    "proTip": "If marine vinyl feels sticky after cleaning, you didn't 'miss residue' — you likely softened the topcoat or dragged plasticizer to the surface. Pros stop immediately when the gloss changes because once that top layer is compromised, the seat starts a countdown to cracking."
  },

  {
    "id": "marine-canvas",
    "material": "Marine Canvas",
    "materialClass": "Coated or Treated Boat Canvas",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Mild soap solution", "note": "Routine marine canvas cleaning should start with gentle surfactants to preserve repellency and seam integrity"},
      {"name": "303 Fabric Guard", "note": "Restores water repellency after the canvas has been cleaned and fully dried"},
      {"name": "Soft-brush cleaner formulated for boat tops", "note": "Marine canvas cleaners lift salt, soot, and bird droppings while respecting coatings better than household degreasers"},
      {"name": "Isopropyl alcohol for tree sap or adhesive residue", "note": "Useful in localized work if kept off adjacent clear vinyl windows and trim"},
      {"name": "Hydrogen peroxide 3% on mildew spots", "note": "Gentler oxidizer option for localized mildew discoloration compared with concentrated bleach"}
    ],
    "unsafeChemicals": [
      {"name": "Undiluted bleach", "note": "Can destroy thread, strip coatings, and leave the canvas weaker and more water absorbent"},
      {"name": "Pressure washing", "note": "Blasts coatings, opens seam stitching, and can fuzz the fabric surface even though it seems effective short-term"},
      {"name": "Strong alkaline deck cleaners", "note": "These remove protective finishes and can cause rapid resoiling or waterlogging in future exposure"},
      {"name": "Petroleum solvents", "note": "Can degrade coatings, adhesive seam tapes, and surrounding plastics or eisenglass panels"},
      {"name": "Heat guns / aggressive machine drying", "note": "Excess heat stresses stitching and can distort fitted canvas assemblies"
      }
    ],
    "testFirst": [
      {"name": "Mildew treatment chemistry", "note": "Canvas fabric may survive while thread, window binding, or zipper tape does not — test the whole assembly"},
      {"name": "Solvent-based tar remover", "note": "Test for coating sensitivity and adjacent clear panel compatibility before using on mooring covers or enclosures"}
    ],
    "phRange": "6.0 – 9.0",
    "temperatureMax": "140°F / 60°C",
    "warnings": [
      "Salt retention cuts canvas life if not rinsed out regularly",
      "The stitching is usually the weak link on older marine canvas",
      "Never clean clear vinyl windows and canvas with the same aggressive chemistry by default",
      "Reproofing is a maintenance step, not an upsell gimmick, after heavy washing"
    ],
    "proTip": "Marine canvas jobs fail at the seams, literally. The veteran approach is to inspect thread, zipper tape, and window trim first, because the fabric may have years left while the assembly details are one aggressive cleaning away from coming apart."
  },

  {
    "id": "sail-cloth",
    "material": "Sail Cloth",
    "materialClass": "Dacron or Laminate Sail Fabric",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Mild soap with fresh water rinse", "note": "Best baseline cleaning for woven polyester sailcloth because it removes salt and grime without harming the resin finish"},
      {"name": "Soft brush agitation", "note": "Mechanical cleaning with a soft deck brush is often safer than stronger chemistry on sail finishes"},
      {"name": "Hydrogen peroxide 3% on mildew spotting", "note": "Controlled oxidation helps mildew discoloration with less finish damage than strong bleach"},
      {"name": "Isopropyl alcohol on adhesive marks", "note": "Useful for localized tape or transfer residue if the sail finish is stable"},
      {"name": "Fresh-water soak for salt loading", "note": "Salt is abrasive and hygroscopic; soaking and rinsing is essential maintenance chemistry-free cleaning"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach", "note": "Bleach attacks stitching, coatings, and laminate adhesives even if the polyester yarn survives"},
      {"name": "Strong alkaline cleaners", "note": "Can strip resin finishes that give sailcloth shape retention and handling characteristics"},
      {"name": "Pressure washing", "note": "Mechanical force damages stitching, seams, film laminates, and surface coatings"},
      {"name": "Petroleum solvents", "note": "May attack laminated sail films, adhesive joins, and insignia adhesives"},
      {"name": "High heat drying", "note": "Can warp laminate sails and stress seam construction or corner reinforcements"}
    ],
    "testFirst": [
      {"name": "Alcohol spot work", "note": "Test on laminate sails or printed insignia where coatings and adhesives may be solvent-sensitive"},
      {"name": "Peroxide mildew treatment", "note": "Stable on many woven sailcloths, but some laminate films or thread systems can react differently"}
    ],
    "phRange": "6.0 – 8.5",
    "temperatureMax": "120°F / 49°C",
    "warnings": [
      "Salt removal matters more to sail life than cosmetic brightening",
      "Sailcloth shape depends on finish chemistry — don't clean it like upholstery fabric",
      "Printed numbers, insignia, and repair tapes may be less tolerant than the cloth itself",
      "Laminate sails have different risks than woven Dacron and should be treated more conservatively"
    ],
    "proTip": "A sail can look filthy and still be structurally fine, or look bright and be chemically stripped of the finish that gives it shape. Experienced sail lofts care more about preserving hand and finish than chasing cosmetic perfection."
  },

  {
    "id": "gelcoat",
    "material": "Gelcoat",
    "materialClass": "Polyester Resin Marine Surface",
    "category": "marine",
    "emoji": "⛵",
    "safeChemicals": [
      {"name": "Boat soap (Meguiar's Marine Wash, Star brite Boat Wash)", "note": "pH-balanced wash soaps remove salt and grime without stripping wax or sealant layers"},
      {"name": "Oxalic acid hull cleaner used correctly", "note": "Effective on rust and yellow waterline staining because oxalic complexes iron and tannin discoloration without heavy abrasion"},
      {"name": "3M Marine Rubbing Compound / polish", "note": "Corrective polishing safely removes oxidation mechanically when used within gelcoat thickness limits"},
      {"name": "Isopropyl alcohol wipe before polishing", "note": "Useful for removing polishing oils or checking true defect removal prior to protection"},
      {"name": "Marine wax / sealant", "note": "Protects porous aging gelcoat from renewed oxidation and staining after cleaning or compounding"}
    ],
    "unsafeChemicals": [
      {"name": "Muriatic acid / hydrochloric acid", "note": "Can etch or stain gelcoat and aggressively attack nearby metal fittings or trailer components"},
      {"name": "Bleach-heavy cleaners left to dwell", "note": "Can discolor surrounding graphics, dry rubber, and create uneven surface appearance on older oxidized gelcoat"},
      {"name": "Abrasive powders (Comet, Bar Keepers Friend) used dry", "note": "Harsh uncontrolled abrasion scratches gelcoat and removes gloss much faster than marine compounds designed for the surface"},
      {"name": "Strong solvent flooding (acetone on large areas)", "note": "Acetone flashes fast but can smear graphics, damage adjacent sealants, and dry out repaired or painted sections"},
      {"name": "Aggressive wool compounding on thin aged gelcoat", "note": "Over-cutting removes finite gelcoat thickness and can expose fibers or create permanent dull patches"}
    ],
    "testFirst": [
      {"name": "Oxalic acid stain remover", "note": "Usually effective on rust and tannin, but test around decals, painted stripes, and metal trim before broad application"},
      {"name": "Compound / polish combo", "note": "Different boats and ages have wildly different gelcoat thickness and oxidation depth — test a small section before choosing cut level"}
    ],
    "phRange": "4.0 – 9.0",
    "temperatureMax": "140°F / 60°C surface",
    "warnings": [
      "Oxidized gelcoat is porous and absorbs stains faster than a healthy waxed surface",
      "Always rinse acids thoroughly around trailers and stainless hardware",
      "Compounding is corrective but also consumptive — every heavy cut removes life from the finish",
      "Heat from rotary polishing can distort or burn edges and raised body lines quickly"
    ],
    "proTip": "The rookie mistake on gelcoat is chasing oxidation with more compound than necessary. Veterans do a test spot, find the least aggressive system that clears the haze, then lock it in with protection. You can always polish more; you can never put gelcoat back."
  },

  // ─── AUTO ────────────────────────────────────────────────────────────────

  {
    "id": "auto-leather",
    "material": "Automotive Leather",
    "materialClass": "Pigmented Urethane-Coated Leather",
    "category": "auto",
    "emoji": "🚗",
    "safeChemicals": [
      {"name": "Leather cleaner (Lexol, Colourlock Mild, Griot's Leather Care)", "note": "Automotive leather is usually pigmented and topcoated, so purpose-made cleaners lift body oil without stripping the urethane finish"},
      {"name": "Diluted APC at interior-safe strength", "note": "A mild all-purpose cleaner can work on coated auto leather when diluted properly and followed by wipe-down"},
      {"name": "pH-balanced leather conditioner / protectant", "note": "Modern coated leather needs light conditioning and UV protection more than heavy oil feeding"},
      {"name": "Isopropyl alcohol diluted for dye transfer", "note": "Brief, careful use can help with denim transfer on robust OEM topcoats"},
      {"name": "Steam at low output with towel barrier", "note": "Controlled interior steam helps soften body oil and grime when kept moving and buffered by a towel"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone / lacquer thinner", "note": "These solvents dissolve or soften the automotive urethane topcoat and remove color instantly"},
      {"name": "Strong APC or degreaser left to dwell", "note": "High alkalinity strips matte topcoats and accelerates cracking or color wear on bolsters"},
      {"name": "Magic Eraser aggressive use", "note": "Melamine foam abrades coated leather and can remove the protective finish while seeming to 'clean' it"},
      {"name": "Silicone-heavy dressings", "note": "They leave slick residue, attract dust, and can alter the intended matte OEM leather look"},
      {"name": "High heat steam directly on seams or perforations", "note": "Too much heat or moisture can lift dye, soften glue, and stress perforated panels"}
    ],
    "testFirst": [
      {"name": "Isopropyl alcohol", "note": "Some OEM coatings tolerate alcohol, while softer luxury finishes can lose sheen — test seat skirt or hidden panel"},
      {"name": "Leather dye-transfer remover", "note": "Many strong transfer removers are borderline solvent systems; verify topcoat stability first"}
    ],
    "phRange": "5.0 – 8.0",
    "temperatureMax": "120°F / 49°C",
    "warnings": [
      "Most automotive leather is coated — treat the coating, not the raw hide fantasy",
      "Shiny driver bolsters are often body-oil buildup at first, then finish wear later",
      "Perforated seats should be cleaned low-moisture to avoid soaking foam beneath",
      "Aggressive correction on denim transfer can create a larger light spot than the stain itself"
    ],
    "proTip": "The best auto leather technicians know when a 'dirty' bolster is actually finish loss. If repeated cleaning doesn't reduce the shine or dark patch evenly, stop. Past that point you're not cleaning — you're refinishing."
  },

  {
    "id": "auto-cloth",
    "material": "Automotive Cloth Upholstery",
    "materialClass": "Synthetic or Blended Vehicle Fabric",
    "category": "auto",
    "emoji": "🚗",
    "safeChemicals": [
      {"name": "Fabric cleaner (Folex, P&S Carpet Bomber diluted, Woolite upholstery mix)", "note": "Low-residue upholstery-safe cleaners lift body soil and food spills without saturating seat foam"},
      {"name": "Enzyme cleaner", "note": "Effective on milk, vomit, food, and body fluid contamination common in car seats"},
      {"name": "Hydrogen peroxide 3%", "note": "Useful for organic stain oxidation on light upholstery when applied locally and blotted out"},
      {"name": "Steam with microfiber extraction towel", "note": "Controlled steam helps release embedded grime while keeping moisture load low"},
      {"name": "Diluted APC for synthetic cloth", "note": "A light all-purpose cleaner is often safe on durable automotive cloth when extracted thoroughly"}
    ],
    "unsafeChemicals": [
      {"name": "Overwetting", "note": "Seat foam holds moisture, leading to odor, mildew, wick-back, and long dry times"},
      {"name": "Chlorine bleach", "note": "Destroys color, weakens stitching, and can damage foam and backing adhesives"},
      {"name": "High-solvent spotters", "note": "Can dissolve foam, affect adhesives, or leave ring marks in the fabric face"},
      {"name": "Strong alkaline degreasers", "note": "May leave rapid-resoil residue and can strip dye from less stable patterned fabrics"},
      {"name": "Hard brushing", "note": "Aggressive agitation fuzzes automotive cloth and creates worn light patches that look like permanent stains"}
    ],
    "testFirst": [
      {"name": "Peroxide stain treatment", "note": "Some patterned seat fabrics or printed inserts can lighten unpredictably — test hidden edge"},
      {"name": "APC on older or sun-faded cloth", "note": "UV-weakened fabrics can lose color or texture faster under stronger cleaners; test first"}
    ],
    "phRange": "6.0 – 9.5",
    "temperatureMax": "180°F / 82°C",
    "warnings": [
      "Auto cloth failures usually come from too much water, not too little chemistry",
      "Drying the seat pad matters as much as cleaning the face fabric",
      "Milk and protein spills in cars often require odor treatment beyond visible stain removal",
      "Headrests and bolsters may have different foam density and dry at different rates"
    ],
    "proTip": "On automotive cloth, a seat that smells clean for 20 minutes and sour again tomorrow was over-wet and only cleaned at the surface. Skilled detailers treat the contamination path, not just the visible fabric face — especially with milk, coffee, and child-seat spills."
  },

  {
    "id": "auto-carpet",
    "material": "Automotive Carpet",
    "materialClass": "Needle-Punch or Tufted Synthetic Vehicle Carpet",
    "category": "auto",
    "emoji": "🚗",
    "safeChemicals": [
      {"name": "Carpet extractor detergent (P&S Carpet Bomber, Meguiar's Carpet & Upholstery)", "note": "Designed to cut automotive grease, road film, and beverage spills while rinsing cleaner than household carpet products"},
      {"name": "Enzyme cleaner", "note": "Great for food, urine, and organic spills in footwells and trunks"},
      {"name": "Citrus solvent / tar remover used locally", "note": "Useful for asphalt, gum, grease, and adhesive contamination common in vehicles"},
      {"name": "Steam plus towel extraction", "note": "Low-moisture steam helps release salt and grime packed into matted pile"},
      {"name": "Hydrogen peroxide 3% on light carpets", "note": "Can brighten coffee or organic staining when spot-used and rinsed out"}
    ],
    "unsafeChemicals": [
      {"name": "Overwet extraction", "note": "Automotive carpet has insulation and padding beneath that trap moisture and can create mildew or electronic issues"},
      {"name": "Chlorine bleach", "note": "Bleaches carpet face, weakens underlayment, and can corrode adjacent metal hardware"},
      {"name": "Strong solvent flooding", "note": "Can soften adhesives, dissolve sound-deadening materials, or spread contamination deeper into underpadding"},
      {"name": "Aggressive drill brushing", "note": "Fuzzes and shreds low-pile automotive carpet, especially in heel-wear zones"},
      {"name": "High-pH degreaser left unrinsed", "note": "Leaves sticky residue that attracts road soil rapidly and can irritate occupants via off-gassing"}
    ],
    "testFirst": [
      {"name": "Peroxide on dark carpet", "note": "Some black or charcoal automotive carpets show oxidation haze or color change — test under seat track area"},
      {"name": "Tar remover", "note": "Effective on asphalt and gum, but test any plastic trim, painted sill plates, or rubber nearby first"}
    ],
    "phRange": "6.0 – 10.5",
    "temperatureMax": "190°F / 88°C",
    "warnings": [
      "Auto carpet contamination often extends into the padding where visible cleaning won't solve odor",
      "Salt staining may need repeated dissolve-and-extract cycles rather than stronger detergent",
      "Drying with airflow is critical in closed cabins",
      "Watch for under-seat wiring before saturating any floor area"
    ],
    "proTip": "If auto carpet keeps wicking a stain after three cleanings, the problem is below the face yarn. Experienced detailers either lift the carpet edge or explain that pad contamination is driving the callback — not 'bad chemistry.'"
  },

  {
    "id": "vinyl-dashboard",
    "material": "Vinyl Dashboard & Trim",
    "materialClass": "Interior PVC / TPO / Coated Plastic",
    "category": "auto",
    "emoji": "🚗",
    "safeChemicals": [
      {"name": "Interior cleaner (P&S Xpress, Meguiar's Quik Interior Detailer)", "note": "Balanced cleaners remove skin oils, dust, and sunscreen without stripping OEM matte coatings"},
      {"name": "Mild APC diluted for interiors", "note": "Useful for heavier grime if kept at interior-safe dilution and wiped dry promptly"},
      {"name": "303 Aerospace Protectant", "note": "Adds UV protection without the greasy shine of older dashboard dressings"},
      {"name": "Isopropyl alcohol diluted 1:1", "note": "Can help remove adhesive residue or transfer marks when used carefully on stable trim"},
      {"name": "Steam at low output with towel", "note": "Good for vents, grain texture, and embedded grime without flooding electronics if controlled properly"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone / lacquer thinner", "note": "Can melt, haze, or permanently texture-change vinyl and plastic trim instantly"},
      {"name": "High-gloss silicone dressings", "note": "Create glare, attract dust, and can sling onto glass; they also leave a fake greasy finish customers often hate"},
      {"name": "Strong degreasers", "note": "Strip OEM low-sheen coatings and may cause whitening or stiffness in soft-touch surfaces"},
      {"name": "Abrasive scrubbing pads", "note": "Scratch textured grain and create shiny wear paths that cannot be reversed"},
      {"name": "Heavy liquid saturation around switches/screens", "note": "Moisture intrusion can damage electronics, adhesives, or printed icons"}
    ],
    "testFirst": [
      {"name": "Alcohol on soft-touch trim", "note": "Soft-touch coatings and piano-black plastics can haze or become tacky — test first"},
      {"name": "APC on aftermarket wraps or painted trim", "note": "Non-OEM finishes vary widely in chemical tolerance and may discolor or peel"}
    ],
    "phRange": "6.0 – 8.5",
    "temperatureMax": "120°F / 49°C",
    "warnings": [
      "Interior trim today is often layered coatings, not just bare vinyl",
      "Shine isn't the goal on dashboards — low-gloss OEM appearance is",
      "Always control moisture around infotainment systems and cluster seams",
      "Sunscreen residue is one of the biggest dashboard contamination sources and can mimic fading"
    ],
    "proTip": "Many 'faded' dashboards are actually sunscreen-bloomed. Before reaching for stronger chemicals, wipe with a proper interior cleaner and inspect the finish in even light. Veterans know that restoring OEM matte appearance is more valuable than making the dash look freshly slimed."
  },

  {
    "id": "clear-coat-paint",
    "material": "Automotive Clear Coat Paint",
    "materialClass": "2K Urethane Clear Over Basecoat",
    "category": "auto",
    "emoji": "🚗",
    "safeChemicals": [
      {"name": "pH-neutral car shampoo (Meguiar's Gold Class, Griot's, Optimum)", "note": "Routine wash chemistry lifts dirt without stripping waxes or stressing the clear coat"},
      {"name": "Isopropyl alcohol diluted for panel wipe", "note": "Useful for removing polishing oils and checking real correction without harming cured clear when used correctly"},
      {"name": "Iron remover (CarPro IronX, Gyeon Iron)", "note": "Chemically dissolves bonded ferrous fallout that standard washing cannot remove"},
      {"name": "Tar remover", "note": "Targeted solvent helps with asphalt and adhesive without aggressive compounding"},
      {"name": "Compound/polish system matched to defect level", "note": "Mechanical correction is the proper way to address oxidation, swirls, and etching when done within film-thickness limits"}
    ],
    "unsafeChemicals": [
      {"name": "Harsh alkaline truck wash / degreaser", "note": "Can strip protection quickly and dry out trim while accelerating water-spot etching on neglected paint"},
      {"name": "Acid wheel cleaner overspray", "note": "Strong acids can etch clear coat or stain trim if allowed to dwell on paint"},
      {"name": "Abrasive household powders", "note": "Scratch the clear coat heavily and create deeper defects than the stain or oxidation you were trying to remove"},
      {"name": "Dirty wash mitt / automatic brush wash", "note": "Mechanical abrasion creates swirl marks and marring far faster than chemistry usually does"},
      {"name": "Aggressive compounding on thin edges", "note": "Clear coat is finite; over-polishing edges and body lines leads to strike-through"}
    ],
    "testFirst": [
      {"name": "Water-spot remover acid", "note": "Test for repaint sensitivity, soft clear, or nearby bare-metal trim before broad use"},
      {"name": "Compound and pad combo", "note": "Always do a test spot because paint hardness and clear thickness vary by manufacturer and repair history"}
    ],
    "phRange": "4.0 – 10.0",
    "temperatureMax": "140°F / 60°C panel surface",
    "warnings": [
      "Bird droppings and bug remains etch chemically if left too long, regardless of wash routine",
      "Heat and sun speed chemical reaction on paint — work cool panels whenever possible",
      "Not every stain is removable without measurable paint removal",
      "Repainted panels often react differently than factory finishes"
    ],
    "proTip": "The smartest paint correction techs are ruthless about test spots because every car lies. Factory Honda soft paint, hard German clear, and body-shop respray can all live on the same vehicle. The correction plan should come from the paint, not the product label."
  },

  {
    "id": "rubber-floor-mats",
    "material": "Rubber Floor Mats",
    "materialClass": "Synthetic Rubber / TPE Vehicle Mat",
    "category": "auto",
    "emoji": "🚗",
    "safeChemicals": [
      {"name": "APC diluted appropriately", "note": "Rubber and TPE mats handle stronger cleaners well, which helps remove embedded road film, salt, and grease"},
      {"name": "Brush agitation with soap", "note": "Mechanical scrubbing is usually necessary because contamination sits in textured grooves"},
      {"name": "Citrus degreaser for oil spots", "note": "Useful on petroleum or greasy contamination when rinsed thoroughly"},
      {"name": "Steam cleaning", "note": "Helps release packed grime from channels without harming most automotive rubber mats"},
      {"name": "303 Protectant on TPE or vinylized mats", "note": "Restores a clean low-sheen appearance and adds some UV protection without leaving them dangerously slick if wiped dry"}
    ],
    "unsafeChemicals": [
      {"name": "Solvent flooding (gasoline, lacquer thinner)", "note": "Can swell, soften, or permanently distort rubber compounds and printed logos"},
      {"name": "Silicone-heavy tire shine", "note": "Leaves mats slippery, unsafe underfoot, and unnaturally greasy"},
      {"name": "Bleach left to dwell", "note": "Can whiten some rubber/TPE blends and weaken embedded fabric or logo inlays"},
      {"name": "Abrasive powders", "note": "Scratch the surface, trap more dirt, and dull the molded finish"},
      {"name": "Pressure washer too close", "note": "Can lift decals, fuzz backing, or cut softer TPE formulations at the edges"}
    ],
    "testFirst": [
      {"name": "Strong APC on aftermarket colored mats", "note": "Dyed or printed aftermarket mats may fade or streak more easily than OEM black rubber"},
      {"name": "Protectant dressing", "note": "Test slip level and finish — some products leave mats too slick for safe use"}
    ],
    "phRange": "6.0 – 11.0",
    "temperatureMax": "180°F / 82°C",
    "warnings": [
      "A clean mat that is slippery is a bad detail job",
      "Salt crystallization can keep bleeding white until fully flushed from channels and edges",
      "Dry mats fully before reinstalling to prevent trapped floor moisture",
      "TPE mats often prefer a low-sheen look rather than glossy dressing"
    ],
    "proTip": "The best-looking rubber mat finish is usually no visible dressing at all — just fully cleaned texture with a dry satin look. Veterans know the customer wants 'new,' but the driver needs traction."
  },

  {
    "id": "cloth-headliner",
    "material": "Cloth Headliner",
    "materialClass": "Foam-Backed Fabric on Adhesive Board",
    "category": "auto",
    "emoji": "🚗",
    "safeChemicals": [
      {"name": "Foaming upholstery cleaner", "note": "Foam limits liquid saturation and is safer for the fragile glue and foam behind the headliner fabric"},
      {"name": "Folex or low-moisture fabric spotter", "note": "Useful for localized stains when applied to a towel first rather than sprayed heavily overhead"},
      {"name": "Hydrogen peroxide 3% on organic spots", "note": "Can help lightly with coffee or light organic staining when carefully blotted"},
      {"name": "Steam at distance with towel", "note": "Very controlled steam can release smoke film or hand marks without soaking the adhesive layer"},
      {"name": "Dry microfiber wiping for maintenance", "note": "Many headliner soils are loose dust or transfer and should be approached dry first"}
    ],
    "unsafeChemicals": [
      {"name": "Overwet spraying", "note": "Liquid penetrates the fabric and attacks the foam and glue, leading to sagging headliners"},
      {"name": "Aggressive scrubbing", "note": "The face fabric pills and separates from the degraded foam backing easily"},
      {"name": "Strong APC or degreaser", "note": "Can stain the fabric, weaken dye, and accelerate adhesive failure"},
      {"name": "Solvent spotters", "note": "May dissolve adhesive, bleed through, or leave rings on the thin headliner fabric"},
      {"name": "Heat concentrated in one area", "note": "Can soften old adhesive and create bubbles or sagging panels"}
    ],
    "testFirst": [
      {"name": "Peroxide spot treatment", "note": "Test because thin light fabrics can show a cleaned halo or slight lightening around the treated area"},
      {"name": "Foaming cleaner", "note": "Even foam can liquefy into the substrate on aged headliners with failing adhesive — test hidden edge first"}
    ],
    "phRange": "6.0 – 8.0",
    "temperatureMax": "140°F / 60°C",
    "warnings": [
      "Headliners are adhesive systems first and fabrics second",
      "If the liner is already drooping, cleaning may accelerate inevitable failure",
      "Smoke, body oil, and soda splash on headliners should be treated minimally and locally",
      "Never chase perfection on an old headliner if sagging risk is rising"
    ],
    "proTip": "The best headliner cleaner knows when to stop at 'better.' A perfect stain removal that triggers a sagging panel is a total loss. Veteran detailers clean headliners with the chemistry on the towel, not on the ceiling."
  },

  // ─── HARD SURFACES ───────────────────────────────────────────────────────

  {
    "id": "marble",
    "material": "Marble",
    "materialClass": "Calcium Carbonate Natural Stone",
    "category": "hard_surfaces",
    "emoji": "🪨",
    "safeChemicals": [
      {"name": "pH-neutral stone cleaner (StoneTech, Granite Gold Daily Cleaner)", "note": "Neutral cleaners remove soil without reacting with calcium carbonate"},
      {"name": "Mild dish soap diluted", "note": "Acceptable for occasional cleaning if residue is rinsed away and no acidic additives are present"},
      {"name": "Hydrogen peroxide 3% for organic stains", "note": "Useful on coffee, tea, or food stains on light marble because oxidation occurs without acid etching"},
      {"name": "Baking soda poultice", "note": "A poultice can draw oil or organic staining from porous marble when used with moisture control rather than scrubbing"},
      {"name": "Stone sealer after cleaning", "note": "Protection step reduces future staining though it does not prevent etching from acids"}
    ],
    "unsafeChemicals": [
      {"name": "Vinegar / lemon / acidic cleaners", "note": "Acid reacts with calcium carbonate, dissolving the surface and causing etching and dull spots"},
      {"name": "Bar Keepers Friend", "note": "Oxalic acid and abrasives can etch polished marble and alter gloss immediately"},
      {"name": "Bleach mixed with acids or harsh cleaners", "note": "Besides safety hazards, aggressive chemistry can damage sealers and create uneven dullness"},
      {"name": "Abrasive pads or powders", "note": "Scratch polished marble and leave the finish hazy or visibly swirled"},
      {"name": "High-alkaline degreasers", "note": "Can strip sealers and leave the stone more vulnerable to staining even if they don't etch like acids"}
    ],
    "testFirst": [
      {"name": "Peroxide poultice", "note": "Test on darker marble because prolonged oxidation can create a lightened patch or halo"},
      {"name": "Baking soda paste", "note": "Usually safe chemically, but test polish-sensitive finishes where even light mechanical action can alter gloss"}
    ],
    "phRange": "7.0 – 8.5",
    "temperatureMax": "140°F / 60°C",
    "warnings": [
      "Staining and etching are different problems and need different explanations",
      "A sealer helps with stain resistance, not acid resistance",
      "Polished marble shows etch marks faster than honed marble",
      "Hard water can leave deposits that need stone-safe treatment, not vinegar shortcuts"
    ],
    "proTip": "Most customers call every marble defect a stain. Pros separate the diagnosis immediately: if the surface is rougher or duller, it's etching; if the polish is intact but color changed, it's staining. If you confuse the two, you'll prescribe the wrong fix and lose credibility fast."
  },

  {
    "id": "granite",
    "material": "Granite",
    "materialClass": "Silicate Natural Stone",
    "category": "hard_surfaces",
    "emoji": "🪨",
    "safeChemicals": [
      {"name": "pH-neutral stone cleaner", "note": "Best routine choice because granite is durable but sealers and polished finishes still benefit from neutral maintenance"},
      {"name": "Mild dish soap diluted", "note": "Safe for occasional washing if film is rinsed fully and not allowed to build up"},
      {"name": "Isopropyl alcohol diluted", "note": "Good for sanitizing and evaporates cleanly on dense sealed granite surfaces"},
      {"name": "Hydrogen peroxide 3% for organics", "note": "Useful for light organic discoloration on sealed or light-colored granite"},
      {"name": "Stone sealer", "note": "Maintains stain resistance on more porous granite varieties and high-use counters"}
    ],
    "unsafeChemicals": [
      {"name": "Acidic descalers on polished granite", "note": "Granite resists acid better than marble, but some feldspar-rich or resin-treated granites can dull or suffer sealer damage"},
      {"name": "Bleach overuse", "note": "Can degrade sealer, lighten dyed granite, or leave uneven residue streaking on dark surfaces"},
      {"name": "Abrasive powders and scouring pads", "note": "Scratch polish and create micro-haze even on hard stone"},
      {"name": "Oil soaps or waxy cleaners", "note": "Leave film and make granite look smeary or attract more grime"},
      {"name": "Bar Keepers Friend on polished surfaces", "note": "The acid/abrasive combo can dull resin-treated or softer mineral inclusions and damage shine"}
    ],
    "testFirst": [
      {"name": "Peroxide poultice", "note": "Test dark granite for potential light haloing, especially on stones enhanced with color darkeners"},
      {"name": "Alcohol cleaner on dyed or enhanced granite", "note": "Some enhanced stones or topical color treatments are more solvent-sensitive than raw granite itself"}
    ],
    "phRange": "6.0 – 9.0",
    "temperatureMax": "180°F / 82°C",
    "warnings": [
      "Not all 'granite' counters are equally dense or equally sealed",
      "Dark polished granite often shows residue more than true damage",
      "Resin-filled slabs and leathered finishes can have different chemical tolerance than polished raw stone",
      "Heat shock is still a concern around seams and resin repairs even when the stone itself is heat tolerant"
    ],
    "proTip": "Granite's reputation for being bombproof makes people careless. The stone might be fine, but the sealer, resin fill, edge lamination, or dye enhancement often isn't. Experienced stone techs always identify whether they're cleaning stone chemistry or finish chemistry."
  },

  {
    "id": "hardwood-floor",
    "material": "Hardwood Floor",
    "materialClass": "Finished Wood Surface",
    "category": "hard_surfaces",
    "emoji": "🪨",
    "safeChemicals": [
      {"name": "Wood floor cleaner (Bona, Pallmann, Basic Coatings)", "note": "Designed to clean polyurethane or factory-finished wood without leaving residue or excess moisture"},
      {"name": "Microfiber damp mopping", "note": "Low-moisture cleaning is safer than wet mopping because wood and seams react to water before finish visibly fails"},
      {"name": "pH-neutral cleaner", "note": "Neutral chemistry protects finish films and minimizes dulling or residue"},
      {"name": "Mineral spirits for isolated tar/adhesive on cured finish", "note": "Carefully used on a cloth, it can remove stubborn sticky residue without flooding the wood"},
      {"name": "Hydrogen peroxide spot treatment on raw or lightly stained organic marks", "note": "Can help on black water/organic stains in some cases when used surgically and evaluated carefully"}
    ],
    "unsafeChemicals": [
      {"name": "Vinegar and water routine mopping", "note": "Acid can dull some finishes over time and extra water drives swelling at joints and edges"},
      {"name": "Steam mops", "note": "Heat and vapor force moisture through seams and finish micro-cracks, causing cupping and finish failure"},
      {"name": "Murphy Oil Soap buildup", "note": "Traditional oil soap can leave residue film that interferes with future recoating and attracts soil"},
      {"name": "Bleach flooding", "note": "Can discolor wood, weaken stain color, and damage finish or filler"},
      {"name": "Ammonia or high-pH degreasers", "note": "Can soften or dull finishes and create cloudy patches, especially on older polyurethane coatings"}
    ],
    "testFirst": [
      {"name": "Mineral spirits", "note": "Usually safe on cured polyurethane, but test satin/oiled/waxed floors because finish systems vary widely"},
      {"name": "Peroxide spot treatment", "note": "Can lighten surrounding wood or stain, so test hidden area before treating visible dark marks"}
    ],
    "phRange": "6.0 – 8.0",
    "temperatureMax": "120°F / 49°C",
    "warnings": [
      "Wood movement from water is often worse than the stain you were trying to remove",
      "Always identify whether the floor is polyurethane, waxed, oiled, or site-finished before choosing chemistry",
      "Black stains in wood may be tannin/metal or water damage and are not always surface-cleanable",
      "A floor can look dry on top while seams still hold damaging moisture below"
    ],
    "proTip": "The veteran hardwood cleaner uses as little liquid as possible and spends more effort on identification than chemistry. The wrong cleaner usually doesn't ruin the wood itself first — it ruins the finish, then the owner thinks the whole floor needs sanding."
  },

  {
    "id": "porcelain-tile",
    "material": "Porcelain Tile",
    "materialClass": "Dense Fired Ceramic Surface",
    "category": "hard_surfaces",
    "emoji": "🪨",
    "safeChemicals": [
      {"name": "pH-neutral tile cleaner", "note": "Great for routine maintenance without leaving film on dense porcelain"},
      {"name": "Alkaline degreaser for kitchen soil", "note": "Porcelain itself is highly chemical-resistant and often benefits from alkalinity on greasy buildup"},
      {"name": "Acid cleaner for mineral haze when appropriate", "note": "Porcelain usually tolerates acid well, making it effective for grout haze or hard water deposits if grout/sealer compatibility is considered"},
      {"name": "Steam cleaning", "note": "Porcelain handles heat well and steam helps loosen grout-line soil and textured-surface grime"},
      {"name": "Hydrogen peroxide for grout-line organics", "note": "Useful for mold or food staining around grout joints without heavy odor"}
    ],
    "unsafeChemicals": [
      {"name": "Oil soaps / waxes", "note": "Porcelain doesn't need oily coatings; they leave slippery film and trap dirt"},
      {"name": "Hydrofluoric acid products", "note": "Extremely hazardous and can etch some glazed surfaces while posing severe human safety risk"},
      {"name": "Abrasive pads on polished porcelain", "note": "Can scratch polished or lapped finishes even though the tile body is hard"},
      {"name": "Bleach overuse on grout and nearby finishes", "note": "Tile may survive, but grout color sealers, trim metals, and surrounding materials may not"},
      {"name": "High-residue detergents", "note": "Film on porcelain makes the floor look dirtier and more slippery than before cleaning"}
    ],
    "testFirst": [
      {"name": "Acid grout-haze remover", "note": "Test around natural-stone inserts, metal trims, and colored grout before broad application"},
      {"name": "Strong alkaline degreaser", "note": "Usually safe on tile, but test if factory-applied anti-slip coatings or specialty finishes are present"}
    ],
    "phRange": "4.0 – 11.0",
    "temperatureMax": "212°F / 100°C",
    "warnings": [
      "On porcelain floors, the grout and sealer are usually the vulnerable components, not the tile",
      "Textured porcelain holds soil in the surface relief and may need mechanical scrubbing more than stronger chemistry",
      "Residue is a more common problem than damage on porcelain",
      "Polished porcelain can scratch despite the tile body's hardness"
    ],
    "proTip": "Porcelain almost never has a chemistry problem by itself — it has a residue problem, a grout problem, or a texture problem. Experts clean the installation as a system, not just the tile face."
  },

  {
    "id": "concrete",
    "material": "Concrete",
    "materialClass": "Cementitious Hard Surface",
    "category": "hard_surfaces",
    "emoji": "🪨",
    "safeChemicals": [
      {"name": "Alkaline degreaser", "note": "Concrete is alkaline and generally responds well to degreasers for oil, soot, and garage contamination"},
      {"name": "TSP substitute / heavy-duty cleaner", "note": "Effective for smoke film, dirt, and general embedded grime on unfinished or shop concrete"},
      {"name": "Hydrogen peroxide or oxygen bleach", "note": "Useful for organic stains, mildew, and tannin discoloration without introducing chlorides"},
      {"name": "Degreasing poultice", "note": "Pulls oil from porous concrete rather than just cleaning the surface"},
      {"name": "Mild acid wash when appropriate", "note": "Can remove efflorescence or mineral film from unsealed concrete if used carefully and neutralized fully"}
    ],
    "unsafeChemicals": [
      {"name": "Acid on polished or sealed concrete", "note": "Etches cement paste and can destroy gloss or topical sealers"},
      {"name": "Chlorine bleach overuse", "note": "Can leave salts, fade dyed concrete, and corrode nearby metals while doing little for deep oil contamination"},
      {"name": "Muratic acid used carelessly", "note": "Too aggressive for many decorative concretes and can open the surface unevenly or create permanent etch patterns"},
      {"name": "Oil-based coatings over dirty concrete", "note": "Not a cleaner, but sealing contamination in place guarantees adhesion and staining problems later"},
      {"name": "Pressure washing sealed decorative concrete too aggressively", "note": "Can stripe coatings, force water into cracks, and remove color hardener or topical stain layers"}
    ],
    "testFirst": [
      {"name": "Acid treatment", "note": "Always test because decorative, stained, polished, and sealed concretes react very differently from plain broom-finished slabs"},
      {"name": "Degreaser strength", "note": "Test on dyed or sealed concrete so the cleaner doesn't lift color or dull the finish"}
    ],
    "phRange": "7.0 – 12.0",
    "temperatureMax": "212°F / 100°C",
    "warnings": [
      "Concrete is porous, so deep stains often require dwell time or poultice, not just stronger chemistry",
      "Plain concrete and decorative sealed concrete are different cleaning jobs entirely",
      "Acid opens concrete if misused, making future staining worse",
      "Efflorescence and oil are opposite chemistry problems and need opposite approaches"
    ],
    "proTip": "Concrete can take a beating chemically, but the finish on top often can't. The pro question isn't 'Is this concrete?' — it's 'What has been done to this concrete?' Once you know that, the chemistry choice gets much easier."
  },

  // ─── SNEAKER ─────────────────────────────────────────────────────────────

  {
    "id": "canvas-sneaker",
    "material": "Canvas Sneaker",
    "materialClass": "Cotton or Cotton-Blend Canvas Footwear",
    "category": "sneaker",
    "emoji": "👟",
    "safeChemicals": [
      {"name": "Jason Markk / Reshoevn8r sneaker cleaner", "note": "Purpose-made surfactant blends clean canvas without the harshness of laundry bleach shortcuts"},
      {"name": "Mild dish soap diluted", "note": "Works well for general soil on canvas uppers if brushed gently and rinsed with control"},
      {"name": "Oxygen bleach (OxiClean Free) on white canvas", "note": "Safer whitening option than chlorine bleach for white or lightly colored canvas uppers"},
      {"name": "Hydrogen peroxide 3%", "note": "Useful for spot brightening on white rubber foxing and some white canvas stains"},
      {"name": "Magic Eraser on rubber midsoles only", "note": "Excellent on vulcanized rubber sidewalls where abrasion is appropriate, not on the canvas upper"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach", "note": "Can yellow canvas, destroy colored prints, weaken cotton fibers, and leave rubber foxing oxidized yellow"},
      {"name": "Machine drying / high heat", "note": "Heat can shrink canvas, warp midsoles, and weaken glue at foxing and toe cap joints"},
      {"name": "Over-saturation", "note": "Soaks footbed, lining, and adhesives, leading to odor and glue failure rather than cleaner shoes"},
      {"name": "Harsh solvent stain removers", "note": "Can strip prints, soften glue, and damage rubber sidewall finishes"},
      {"name": "Aggressive scrubbing", "note": "Frays canvas weave and creates fuzzy worn spots that never return to factory texture"}
    ],
    "testFirst": [
      {"name": "Oxygen bleach on colored canvas", "note": "Often safer than chlorine, but still test bright prints or dyed panels for lightening"},
      {"name": "Peroxide on vintage off-white shoes", "note": "Can create a cleaner halo that makes the rest of the aged canvas look yellower by comparison"}
    ],
    "phRange": "6.0 – 9.5",
    "temperatureMax": "100°F / 38°C",
    "warnings": [
      "Canvas shoes fail at glue and shape before the fabric itself usually fails",
      "White rubber foxing and white canvas often need different chemistry and agitation levels",
      "Air drying with shape support is critical after cleaning",
      "A perfectly white patch on aged canvas can look worse than a slightly toned but even result"
    ],
    "proTip": "On canvas sneakers, the veteran goal is uniformity, not maximum whiteness. A hyper-bright toe box next to aged quarters screams spot-clean job. Pros often clean the whole upper lightly once they know the stain is moving, just to keep the final look balanced."
  },

  {
    "id": "mesh-knit-sneaker",
    "material": "Mesh/Knit Sneaker",
    "materialClass": "Engineered Synthetic Mesh or Knit Upper",
    "category": "sneaker",
    "emoji": "👟",
    "safeChemicals": [
      {"name": "Sneaker cleaner foam", "note": "Foam limits saturation and is ideal for knit and mesh uppers that trap water in the lining and glue layers"},
      {"name": "Mild detergent diluted", "note": "Gentle surfactants remove soil and body oil from polyester/nylon knits without excessive residue"},
      {"name": "Soft-bristle brush", "note": "Mechanical action should be light because open mesh can snag, fuzz, or lose structure quickly"},
      {"name": "Hydrogen peroxide 3% on white mesh", "note": "Can help on organic or sweat yellowing on white performance uppers when used carefully"},
      {"name": "Microfiber towel blotting", "note": "Key low-moisture technique for lifting soil without collapsing knit structure or soaking the foam collar"}
    ],
    "unsafeChemicals": [
      {"name": "Chlorine bleach", "note": "Bleaches synthetic yarn, yellows foam, and weakens adhesives and printed overlays"},
      {"name": "Heat gun / machine dryer", "note": "Can warp midsoles, shrink knit tension, and detach hot-melt overlays"},
      {"name": "Hard bristle scrubbing", "note": "Snags knit loops, raises fuzz, and permanently roughens engineered mesh texture"},
      {"name": "Solvent spotters", "note": "Can dissolve printed logos, TPU films, and glue used in lightweight athletic construction"},
      {"name": "Over-wetting the upper", "note": "Traps moisture in foam and under overlays, leading to odor, delamination, and dry-time issues"}
    ],
    "testFirst": [
      {"name": "Peroxide on dyed knit", "note": "Test colored performance yarns because some fluorescents and neons shift quickly under oxidation"},
      {"name": "APC on printed overlays", "note": "Some synthetic overlays and graphics have weak print chemistry and can dull or lift"}
    ],
    "phRange": "6.0 – 8.5",
    "temperatureMax": "95°F / 35°C",
    "warnings": [
      "The glue and overlays in athletic shoes are often less tolerant than the mesh itself",
      "Mesh can look clean on top and still smell because padding stayed wet",
      "White knit shoes show yellowing from oxidation, sweat salts, and detergent residue differently",
      "Brush direction matters on knit patterns if you want the cleaned panel to look uniform"
    ],
    "proTip": "Lightweight performance shoes are built like layered composites, not simple fabric shoes. Experienced sneaker cleaners respect the adhesives, films, and foam as much as the knit. If you soak a modern runner to clean the upper, you've already made the wrong move."
  },

  {
    "id": "leather-sneaker",
    "material": "Leather Sneaker",
    "materialClass": "Finished Leather Athletic Footwear",
    "category": "sneaker",
    "emoji": "👟",
    "safeChemicals": [
      {"name": "Sneaker leather cleaner (Jason Markk, Reshoevn8r, Leather Honey cleaner)", "note": "Designed to remove grime from coated sneaker leather without over-drying or stripping finish"},
      {"name": "Mild soap diluted", "note": "Generally safe on finished sneaker leather for routine cleaning if wiped dry and followed with conditioner when needed"},
      {"name": "Leather conditioner light application", "note": "Useful on smooth leather panels after cleaning, especially older retro sneakers that dry out at flex points"},
      {"name": "Magic Eraser on rubber midsoles only", "note": "Great for restoring sidewalls and foxing while keeping abrasion away from leather panels"},
      {"name": "Isopropyl alcohol diluted for dye transfer", "note": "Can help with transfer marks on robust topcoated leather if tested first and used sparingly"}
    ],
    "unsafeChemicals": [
      {"name": "Acetone / nail polish remover", "note": "Removes finish, color, and factory topcoat from leather panels and can attack glue and painted edges"},
      {"name": "Chlorine bleach", "note": "Oxidizes leather finish and surrounding textiles while yellowing glues and midsoles"},
      {"name": "Heavy soaking", "note": "Water intrusion swells leather, loosens board and glue, and distorts shoe shape during drying"},
      {"name": "Aggressive brushing on painted leather", "note": "Scuffs finish and removes edge paint or topcoat on fashion and basketball sneakers"},
      {"name": "High heat drying", "note": "Stiffens leather, weakens cemented construction, and can warp midsoles or heel counters"}
    ],
    "testFirst": [
      {"name": "Alcohol on colored leather panels", "note": "Some sneaker finishes are thin or fashion-oriented and can lose pigment quickly — test hidden tongue edge"},
      {"name": "Conditioner on matte leather", "note": "Conditioners can darken or increase sheen on matte-finish sneaker leather; test before full application"}
    ],
    "phRange": "5.0 – 7.5",
    "temperatureMax": "95°F / 35°C",
    "warnings": [
      "Sneaker leather is usually finished and topcoated, not raw luxury leather",
      "Midsoles, edge paint, mesh tongues, and suede accents may all need different chemistry on the same pair",
      "Uniform sheen matters — over-conditioning one panel makes the repair obvious",
      "Vintage retros often have weaker glue than their leather condition suggests"
    ],
    "proTip": "The best leather sneaker work is panel-aware. Veterans don't clean 'the shoe' with one method — they clean smooth leather, rubber midsole, mesh tongue, and painted edge as four different materials. That's why their results look factory, not homemade."
  }

];
window.SAFETY_PROFILES = SAFETY_PROFILES;
})();
