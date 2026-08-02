---
name: Two parallel design systems
description: The homepage and the rest of the app use separate CSS + font stacks; harmonizing one means editing the right file.
---

# Two parallel design systems

Route `/` renders `client/src/pages/LandingPage.tsx`, which injects raw `landing.html` (`?raw`) styled by `client/src/pages/landing.css` — a **self-contained** design system scoped under `.viber-landing`. `HomePage.tsx` (`/welcome`) and every other app page use the global `client/src/index.css` design system instead.

These two stacks historically diverged:
- `landing.css`: Bricolage Grotesque (display) / Inter (body) / JetBrains Mono.
- `index.css`: was Archivo Expanded / Archivo / Space Mono.

**Why this matters:** when a user says "match the home page" they almost always mean the LandingPage (`/`) look. To harmonize the rest of the app with it, change the `--font-display` / `--font-ui` / `--font-mono` tokens in `index.css` (and import the families in both `client/index.html` and `index.css`) — do NOT edit `landing.css`. The homepage's signature card style is `.surface`: a background `<img>` + `linear-gradient(180deg, rgba(5,5,9,0.74), rgba(5,5,9,0.99))` overlay + big `.num`.

**How to apply:** Bricolage ships weights up to 800 — keep `.display`/heading weights ≤ 800 to avoid synthetic bold. Homepage color tokens: bg `#050509`, yellow `#F9CE32`, coral `#F25C5C`, purple `#8B3FC4`, teal `#2FC4C4`.
