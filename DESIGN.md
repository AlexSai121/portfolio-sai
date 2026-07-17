---
version: 1.0
name: Sai-portfolio-design-system
description: |
  A premium-minimalist editorial system on a true-black canvas with white
  "sheet" sections that curtain over it on rounded 22px corners. One serif
  voice (Instrument Serif 400, upright, never italic) carries all display
  type; Inter carries UI; Geist Mono carries labels and the terminal. Depth
  comes from translucent-white hairlines, not shadows. Color is dynamic:
  a single tint derived at runtime from the chosen hero backdrop drives a
  low-opacity atmospheric glow on every section, drifting slowly through
  nearby hues. Motion is spring-based — reveals, letters, and hovers
  overshoot slightly and settle.

colors:
  canvas-dark: "#000000"
  canvas-light: "#ffffff"
  ink-on-dark: "#fcfdff"
  ink-on-light: "#212121"
  muted-on-dark: "rgba(252,253,255,0.62)"
  muted-on-light: "#616161"
  slate: "#93939f"
  hairline-dark: "rgba(255,255,255,0.08)"
  hairline-dark-strong: "rgba(255,255,255,0.16)"
  hairline-light: "#e5e7eb"
  stone: "#eeece7"
  surface-card-dark: "#17171c"
  surface-elevated: "#101012"
  surface-panel: "#0a0a0c"
  surface-deep: "#06060a"
  accent-coral: "#ff7759"
  tint-dynamic: "var(--tint) — runtime RGB triple derived from hero media; fallback 99,140,255"
  status-green: "#11ff99"
  terminal-red: "#ff2047"
  terminal-yellow: "#ffc53d"

typography:
  display-hero:
    fontFamily: Instrument Serif
    fontSize: 13.5vw (wordmark) / clamp(44px, 7vw, 96px) (section headings)
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: -0.015em
    fontStyle: normal — italics are banned system-wide
  display-feature:
    fontFamily: Instrument Serif
    fontSize: clamp(38px, 6.4vw, 112px)
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: -0.015em
  display-card:
    fontFamily: Instrument Serif
    fontSize: clamp(40px, 5vw, 76px)
    fontWeight: 400
    lineHeight: 1.0
  statement:
    fontFamily: Instrument Serif
    fontSize: clamp(26px, 2.6vw, 34px)
    fontWeight: 400
    letterSpacing: -0.01em
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: Inter
    fontSize: 13-14px
    fontWeight: 400
    lineHeight: 1.5
  ui-strong:
    fontFamily: Inter
    fontSize: 13-15px
    fontWeight: 500
  mono-label:
    fontFamily: Geist Mono
    fontSize: 11-12px
    fontWeight: 400
    letterSpacing: 0.06-0.08em
    textTransform: uppercase
  code:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6

rounded:
  sm: 8px          # buttons, inputs, small chips
  lg: 12px         # cards, media, code windows, books
  xl: 22px         # signature media + sheet top corners
  pill: 999px      # tags, year markers, status dots

spacing:
  section: 120px 40px (desktop) / 80px 24px (mobile)
  container: 1280px max, centered
  card-padding: 32-48px
  label-gap: 16px below the numbered section marker

motion:
  bounce: cubic-bezier(0.34, 1.56, 0.64, 1)        # back-out overshoot — menus, letters, hovers
  bounce-soft: cubic-bezier(0.33, 1.27, 0.55, 1)   # gentle spring — reveals, slider snap, magnetic return
  ease-out: cubic-bezier(0.22, 0.7, 0.1, 1)        # long media drifts
  ease-inout: cubic-bezier(0.65, 0.05, 0.36, 1)    # masks and seams
  scroll: hand-rolled wheel lerp, factor 0.09; touch/keyboard/scrollbar stay native
  hue-drift: 26s ease-in-out infinite, hue-rotate 0→48° on all glows, phase-offset per section
  reveal: opacity 0.7s ease + translateY(26px) 0.9s bounce-soft
  reduced-motion: every animation gated behind prefers-reduced-motion

components:
  button-primary:
    backgroundColor: "{colors.ink-on-dark}"
    textColor: "#000000"
    typography: "{typography.ui-strong}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
    note: the brightest pixel on the canvas; inverts to #17171c on light sections
  section-marker:
    typography: "{typography.mono-label}"
    content: two-digit number ("01") + full-width hairline at 18% opacity
    note: encodes reading order; the nav indicator mirrors it ("03 — experience")
  sheet-section:
    backgroundColor: "{colors.canvas-light}"
    rounded: "22px 22px 0 0"
    boxShadow: "0 -32px 70px rgba(0,0,0,0.45)"
    note: light sheets curtain over pinned dark sections on scroll
  atmosphere-glow:
    background: "radial-gradient(~800px 480px at section top, rgba(var(--tint), 0.10-0.20), transparent 70%)"
    note: one per section, position alternates (16% / 50% / 84%); never a solid surface
  media-card:
    rounded: "{rounded.lg}" to "{rounded.xl}"
    treatment: darkened cover (brightness 0.5) + bottom gradient for text; parallax + hover drift
  tag-pill:
    backgroundColor: "rgba(0,0,0,0.35) + blur(6px)"
    border: "1px solid rgba(255,255,255,0.28)"
    typography: "{typography.mono-label}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
  stone-chip:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink-on-light}"
    rounded: "{rounded.sm}"
    padding: 6px 14px
    note: metric callouts on light sections ("PUB.", "FULL MERIT")
  timeline-card:
    backgroundColor: "{colors.surface-card-dark}" (solid) / white + hairline (ghost)
    rounded: "{rounded.lg}"
    padding: 15px 18px
  year-pill:
    rounded: "{rounded.pill}"
    border: "1px solid rgba(0,0,0,0.3)"
    note: the current year fills with coral + dark text + pulse ring — the only coral surface
  code-window:
    backgroundColor: "{colors.surface-deep}"
    border: "1px solid {colors.hairline-dark-strong}"
    rounded: "{rounded.lg}"
    chrome: "#0a0a0c title bar + red/yellow/green traffic dots"
    typography: "{typography.code}"
  status-line:
    dot: "8px {colors.status-green} circle, glow shadow, 2.8s breathe"
    typography: "{typography.mono-label}"
    note: footer availability marker — the only solid green pixels on the page
  liquid-cursor:
    size: 84px circle
    treatment: "rgba(255,255,255,0.1) + blur(8px) + 1px 40% border"
    label: mono lowercase verb naming the affordance ("view", "drag")
    motion: spring scale-in with overshoot; squashes along travel direction
---

## Overview

The system reads as a developer-tool brand with the typography of a print
editorial — true black, one serif voice, and hairline structure — but it has
one trick neither parent system has: **the page's color is not fixed**. A
single RGB tint is sampled at runtime from the hero backdrop the visitor
selects, saturation-stretched, and injected as `--tint`. Every section's
atmospheric glow, the seam highlight, and the pale washes on white sections
all derive from it, and all of them drift ±48° of hue on a slow 26-second
cycle. Change the backdrop; the whole site re-colors. Nothing else about the
UI shell moves — the chrome stays black, white, and hairline.

Page rhythm: black hero (ASCII-rendered media, giant serif wordmark) → white
sheet sections that curtain over pinned dark sections with 22px rounded top
corners and a long soft shadow → black again for the close. The alternation
is the elevation system; there are almost no drop shadows on components.

**Key characteristics:**
- True black `#000000` canvas — never near-black — with faintly cool off-white ink `#fcfdff`.
- One serif (Instrument Serif 400, upright only) for every display size; hierarchy comes from scale, never weight or italics.
- Numbered mono section markers (`01` + hairline) encode the reading order; the nav mirrors the current one with a scramble-decode effect.
- Depth = surface alternation + translucent-white hairlines (8% / 16%). Shadows appear only under the big section sheets.
- Dynamic tint glows: one radial wash per section, 10–20% opacity, alternating anchor positions, hue-drifting.
- Coral `#ff7759` is the only fixed accent and it is scarce: slide indices, the active counter digit, and the "now" pill.
- Spring motion everywhere: `cubic-bezier(0.34, 1.56, 0.64, 1)` and its softer sibling; things overshoot a little and settle.

## Colors

**Canvas & ink.** `#000000` is the resting state of the page. Light sections
are pure `#ffffff` with `#212121` ink. On dark, body copy drops to
`rgba(252,253,255,0.62)`; metadata uses `#93939f` on light.

**Surfaces (dark ladder).** Four steps, all near-black, separated by
luminance not shadow: `#06060a` (code well) → `#0a0a0c` (panel/bar) →
`#101012` (elevated) → `#17171c` (solid card on light sections).

**Hairlines.** `rgba(255,255,255,0.08)` for quiet rules, `0.16` for
structural borders on dark; `#e5e7eb` on light. These replace shadows.

**Dynamic tint.** `--tint` is an RGB triple (e.g. `99,140,255`) set by JS
from the average color of the hero media, brightened to ~200 peak and
saturation-stretched ×2.1. Used only inside `rgba(var(--tint), α)` at α ≤
0.20 — it is an atmosphere, never a surface, never text.

**Fixed accents.** Coral `#ff7759` for tiny fixed markers. Terminal
red/yellow/green (`#ff2047` / `#ffc53d` / `#11ff99`) live only in the code
window chrome, error/success lines, and the status dot.

## Typography

Three families, strict lanes:

| Role | Face | Notes |
|---|---|---|
| All display | Instrument Serif 400 | Upright only. lh 1.0, ls −0.015em. Weight never changes. |
| Body & UI | Inter 400/500 | 15px base; 500 only for buttons and card titles. |
| Labels & code | Geist Mono 400 | 11–13px, uppercase labels at +0.06–0.08em tracking. |

Rules: one oversized headline per section; hierarchy by size and family
change, never bold-bumping; **no italics anywhere**; mono labels are the
system's connective tissue (section markers, nav indicator, tags, captions,
counters).

## Layout

- 1280px centered container; sections at 120px/40px padding (80/24 mobile).
- Sticky-scroll storytelling: the hero and projects sections pin; the
  following white sheet slides over them (rounded top corners + shadow).
- The giant wordmark is `position: sticky; bottom` — it rides the viewport
  bottom until the next section pushes it up.
- Grids: research uses a 3-column fold (word — image — word) that closes
  inward; timeline is 4 columns on a center line; skills is a horizontal
  flex shelf where the active item grows.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 | flat canvas | hero, dark sections |
| 1 | hairline border, 8–16% white | chips, arrows, inputs, books |
| 2 | luminance step (surface ladder) | cards, terminal bar, elevated tiers |
| 3 | tint glow, ≤20% opacity radial | one per section, top-anchored |
| 4 | sheet shadow `0 -32px 70px rgba(0,0,0,0.45)` | only under curtaining sections |

## Motion

The signature feel is **springy restraint**: nearly everything animates, but
only transform and opacity, and almost everything settles with a small
overshoot.

- Reveals: rise 26px, `bounce-soft`, staggered by DOM order.
- Hero wordmark: per-letter rise with 45ms stagger on `--bounce`.
- Headings: clip-path mask rise (mask eases `ease-inout`, transform springs).
- Hovers: magnetic controls lean toward the cursor and spring back; media
  breathes (3.5% scale over 1.4s); arrows squash on press (`scale 0.88`).
- Scroll: wheel-only inertial lerp (0.09) — touch and keyboard stay native;
  headings trail scroll velocity slightly ("scroll mass").
- Micro-signatures: scramble-decode on changing mono labels; blinking block
  caret in the terminal; status-dot breathe; 26s hue drift on all glows.
- Everything honors `prefers-reduced-motion`.

## Do's and Don'ts

### Do
- Keep the canvas true black and let white sheets do the sectioning.
- Derive atmosphere color from content (media sampling) instead of hardcoding section colors.
- Use one serif at 400 for all display sizes; change size, not weight.
- Use mono uppercase micro-labels as wayfinding (numbers, counters, captions).
- Reserve coral for a handful of fixed marks; reserve green for status.
- Give interactive things a spring; give masks and seams a clean ease.

### Don't
- No italics, ever.
- No drop shadows on components — hairlines carry structure.
- No solid fills from the tint or accent colors; glows stay ≤20% opacity.
- No mid-page color-scheme switches (a colored feature band breaks the system).
- No weight-based emphasis in body copy; restructure the sentence instead.
- No decorative animation that doesn't respect reduced-motion.

## Responsive

- Breakpoint at 800px: single-column folds and timeline, vertical book
  shelf, stacked footer; nav trims to links-only under 520px.
- Display type is vw-clamped everywhere; the wordmark stays one line.
- Inputs ≥16px on mobile (iOS zoom); touch targets ≥38px; drag/swipe on the
  slider replaces hover affordances.
