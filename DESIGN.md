---
version: alpha
name: GONR
description: Mobile-first stain intelligence UI for textile care professionals and serious home users.
colors:
  bg-light: "#F5F7FA"
  surface-light: "#FFFFFF"
  surface-light-muted: "#EEF1F6"
  bg-dark: "#05070B"
  surface-dark: "#0E131B"
  surface-dark-muted: "#131926"
  text-primary-light: "#2D3748"
  text-secondary-light: "#718096"
  text-primary-dark: "#F4F4F6"
  text-secondary-dark: "#8A94A6"
  primary: "#22C55E"
  primary-strong: "#15803D"
  primary-soft: "#DCFCE7"
  primary-soft-dark: "#052E16"
  gold: "#D4A853"
  danger: "#DC2626"
  danger-dark: "#EF4444"
  purple: "#7E22CE"
  border-light: "#E5E7EB"
  border-dark: "#2A3140"
typography:
  display:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.2
  h1:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: 700
    lineHeight: 1.3
  h2:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.35
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.06em
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  page-x: 16px
components:
  app-shell:
    backgroundColor: "{colors.bg-light}"
    textColor: "{colors.text-primary-light}"
  card:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.md}"
    padding: 16px
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.md}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary-strong}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    typography: "{typography.h2}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.md}"
    typography: "{typography.h2}"
    padding: 12px
  chip:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.pill}"
    typography: "{typography.body-sm}"
    padding: 8px
  chip-active:
    backgroundColor: "{colors.primary-strong}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    typography: "{typography.body-sm}"
    padding: 8px
  chip-expanded:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
    rounded: "{rounded.pill}"
    typography: "{typography.body-sm}"
    padding: 8px
  chemistry-callout:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.md}"
    padding: 12px
  tier-badge-verified:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
    padding: 4px
  tier-badge-ai:
    backgroundColor: "{colors.purple}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
    padding: 4px
---

## Overview

GONR should feel like professional stain intelligence, not a generic SaaS dashboard. The product needs clean-shop credibility: fast, calm, direct, and trustworthy under pressure. Visual noise is the enemy. The interface exists to get a cleaner or operator to the next correct action fast.

The brand center is **expert green on quiet neutrals**. Green means confidence, safe forward motion, and practical success. Gold is a restrained premium accent, not a second CTA system. Purple is reserved for AI labeling only.

The app is mobile-first. Screens should feel deliberate at thumb distance: large hit targets, compact but readable cards, and clear hierarchy without decorative clutter.

## Colors

The palette is split into quiet surfaces and semantic accents.

- **Primary (`#22C55E`)**: the action color. Use for active chips, primary buttons, confirmations, and positive guidance.
- **Gold (`#D4A853`)**: premium accent for featured moments and subtle highlights, never the main interaction language.
- **Purple (`#A855F7`)**: reserved for AI-origin labels and AI-specific affordances.
- **Danger (`#DC2626` / `#EF4444`)**: warnings, irreversible mistakes, and high-risk stain guidance.
- **Light surfaces** should stay airy and neutral.
- **Dark surfaces** should feel premium and controlled, not neon or gamer-styled.

Contrast should stay strong enough to feel authoritative and readable in shop conditions.

## Typography

Typography should feel modern, practical, and premium without becoming editorial or playful. Inter is the system voice.

- Headlines: compact, bold, decisive.
- Body: readable at small mobile sizes.
- Labels: uppercase or tracking-expanded only when they clarify structure.
- Avoid oversized display type except for simple hero moments.

## Layout

Use a narrow mobile content column with generous vertical rhythm and compact horizontal padding.

- Default page width should remain phone-first.
- Cards stack with clear spacing and minimal nesting.
- Every primary tap target should comfortably meet mobile hit-area expectations.
- Information hierarchy should prefer separation, spacing, and weight before borders and fills.

## Elevation & Depth

Depth should be subtle. Use soft borders, restrained shadows, and occasional blur only where it helps hierarchy.

- Default cards: light border, minimal shadow.
- Active or important states: stronger border or soft glow in green.
- Avoid heavy layered shadows, glassmorphism excess, or ornamental gradients except in rare hero moments.

## Shapes

GONR uses rounded rectangles and pill chips to feel modern and approachable without losing seriousness.

- Cards and inputs: 12px radius is the default.
- Small badges: 8px radius.
- Chips: full pill radius.
- Rounded shapes should feel consistent across states; avoid random radius changes.

## Components

### Chips

Chips are one of the core brand patterns. They must feel crisp, readable, and operational.

- Surface chips and stain chips are **text-only**.
- Do **not** prepend emojis or forced icons to chip labels.
- Active chips use solid green with white text.
- Expanded-but-not-selected states can use soft green backgrounds.
- Chip interactions should feel quick and tactile, with light motion and no gimmicks.

### Result Cards

Result cards are the trust engine of the product.

- Lead with the answer, not decoration.
- Use collapsible sections to manage depth.
- Icons belong where semantics are obvious: warnings, actions, chemistry, escalation, household vs pro sections.
- Verified and AI states must be visually distinct at a glance.

### Buttons

Primary buttons should feel confident and simple.

- Green is the main action color.
- Full-width mobile buttons are preferred for key actions.
- Hover/focus states can intensify slightly, but should not jump or feel flashy.

### Inputs

Inputs should feel clean, quiet, and supportive.

- Border-first styling beats heavy fills.
- Focus state should turn toward green.
- Placeholder text should stay secondary and never compete with entered content.

## Do's and Don'ts

### Do

- Design for speed, trust, and clarity.
- Keep interaction patterns repeatable so agent-generated UI stays coherent.
- Use iconography selectively where meaning is immediate.
- Preserve a premium-but-practical feel in both light and dark themes.
- Make verified information feel grounded and distinct from AI help.

### Don't

- Do not use emoji as default UI chrome.
- Do not add decorative icons where users have to guess meaning.
- Do not use multiple competing accent colors for primary actions.
- Do not make the UI feel like consumer wellness, crypto, gaming, or generic startup SaaS.
- Do not surface numeric dwell times in routine protocol presentation.
- Do not overload cards with nested boxes, excessive dividers, or ornamental effects.
