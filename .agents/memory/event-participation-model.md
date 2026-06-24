---
name: event participation & payment model
description: How per-event roles, competitor onboarding reuse, and entry-fee payment enforcement fit together
---

# Per-event participation model

Roles are per-event via `event_participations` (role competitor/spectator, paymentStatus). The legacy global `users` columns (`userType`, `edition`, `teamName`, `onboarded`) were NOT replaced — a competitor join intentionally mutates them to reuse the existing single-active-event onboarding/team flow.

**Why:** The whole competitor/team/app-submission flow keys off `users.edition`/`teamName`/`userType`. Rewriting it to derive purely from participations was out of scope and risky. The platform runs one active edition at a time (`CURRENT_EDITION`), so mutating the global row on join is acceptable.

**How to apply:** Spectator join does NOT touch the global user row. Only competitor join sets `userType=competitor`, `edition`, `teamName`, `onboarded=false`. If multi-event-simultaneous support is ever needed, this coupling must be revisited.

## Entry-fee enforcement
Competitor privileges (onboarding, app/game creation) are gated by `hasUnpaidEntryFee()` in routes.ts — returns 402 if the participation for the user's current edition is competitor + fee>0 + not paid. Do not remove these gates; they are the server-side enforcement (UI alone is bypassable).

## Stripe verify must bind the session
`/api/events/:slug/pay/verify` MUST validate `session.metadata.{participationId,userId,eventId}` (+ client_reference_id) and amount/currency against the event before marking paid. Without this, a paid session can be replayed against any participation. The checkout endpoint sets that metadata — keep them in lockstep.
