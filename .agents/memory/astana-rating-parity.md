---
name: Astana rating parity
description: Visual parity with VIBER game cards without changing Astana's voting contract
---

Astana project cards use the original VIBER game-card presentation, including five full/half/empty stars and a numeric average. A partial star reflects the average only; clicking a star submits its whole-number score.

**Why:** Astana's rating API intentionally accepts only integers from 1 to 5, while the older VIBER card can submit a half-star. Copying that interaction verbatim would cause failed Astana votes.

**How to apply:** Keep the visual average and the submitted vote separate. Preserve the own-team voting restriction and don't broaden the Astana API to half-star votes merely for visual parity.