---
name: Unlayered CSS overrides beat Tailwind utilities
description: How index.css forces design-system styles to win over Tailwind utility classes on the same element
---

# Unlayered CSS to override Tailwind utilities

In `client/src/index.css`, the design-system classes (`.display/.h1/.h2/.h3/.h4`,
`.btn`, `.card`, `.reveal`, etc.) live inside `@layer base`/`@layer components`.
Tailwind's utilities (`uppercase`, `tracking-wide`, `transition`, ...) live in
`@layer utilities`, which **always wins over base/components** regardless of source
order or specificity.

**Rule:** to make a design-system declaration beat a Tailwind utility sitting on the
SAME element, write that declaration as plain **unlayered** CSS (NOT inside any
`@layer`), appended at the end of `index.css`. Unlayered styles outrank every
`@layer`, so they win without `!important`.

**Why:** this is how app-wide sentence-case Bricolage headings are enforced over the
many `className="... uppercase tracking-wide"` heading usages, and how `.reveal`'s
0.7s scroll-reveal timing survives elements that also carry Tailwind's `transition`
utility (which would otherwise clamp it to 150ms).

**How to apply:**
- Heading parity + `.reveal` timing are intentionally unlayered at the bottom of
  `index.css`. Keep new "must-win" overrides there too.
- `.reveal` must keep `border-color` in its `transition` shorthand, because once it
  wins over Tailwind's `transition`, card hover-border animations rely on it.
- Inline `style={{ transitionDelay }}` (used for stagger) always wins, so stagger is
  safe regardless of layering.
- Do NOT put `.reveal` and `.lift` on the same element — both define the `transition`
  shorthand and collide. Use grayscale-image hover for reveal cards instead.
