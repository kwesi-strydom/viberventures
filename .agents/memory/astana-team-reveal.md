---
name: Astana team reveal
description: Why the organizer's VIBER-style card animation must use the saved Astana assignment result
---

Astana's organizer draw should show the VIBER builder-card shuffle and sequential reveal, but reveal only teams returned by Astana's successful server-side assignment. On reload, show the already-saved teams as cards rather than replaying a fictional draw.

**Why:** Astana's server enforces roster revision checks, project locks, random pairing, and an odd-roster trio. A client-side shuffle can disagree with the persisted teams or appear successful when the server rejects the draw.

**How to apply:** Keep the server authoritative for membership and team names. The visual shuffle may run while the request is pending; on error, stop and show the error without revealing guessed teams. Manual late-arrival and swap controls can remain secondary to the card presentation.