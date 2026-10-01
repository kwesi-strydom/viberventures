---
name: Wheel round durability
description: Why wheel progress needs its own atomic persisted state rather than reconstruction from timeline rows
---

Wheel progression must be stored with the successful spin outcome, scoped to the linked event, and survive reloads or server restarts. A failed save must not consume a round; a retry must not duplicate it.

**Why:** Astana on 2026-09-30 repeatedly returned to Founders Dispute after page refresh because the counter was browser-local. Timeline rows cannot reconstruct the counter: one spin can affect several teams, and a Safe round has no challenge timeline entry.

**How to apply:** Treat committed wheel progress as authoritative rather than browser counters or timeline counts. Bind follow-on dispute actions to the original committed teams and reset generation, so delayed dialogs cannot change a later or reset-away round.