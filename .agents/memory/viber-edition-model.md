---
name: Viber edition / events data model
description: Which edition is "current", past vs upcoming, and how old sample data is archived (not deleted).
---

# Viber edition model

- `CURRENT_EDITION` (shared/schema.ts) = the **upcoming / active** edition visitors register for — NOT a finished one. As of 2026-06 it is **5 = Viber 5**, status `upcoming`, dated 2026-07-24, location Network School, free entry, with an NS `registration_url`.
- Past editions: 1 (Viber 1), 2 (Viber 2), 3 (Viber Halloween), 4 (Viber 4) — hold the historical apps/games and results.
- **There is no Viber 6.** A placeholder existed and is gone; do not reintroduce a speculative next edition unless asked.

## Archiving old/sample event data (reversible, non-destructive)
- To retire an event's data WITHOUT deleting it: move the event row (and its games/competitor users if any) to **sentinel edition 99** and set the event `status='archived'`.
- `status='archived'` is hidden everywhere public: EventsPage filters upcoming=`upcoming|live`, past=`past`, so archived shows in neither. The admin Competitions tab lists ALL statuses so archived events stay reachable/editable.
- Do this via `executeSql` ALTER/UPDATE — **never drizzle push** (see games-schema-drift.md).

**Why:** The Competition page is for visitors to register for the next event. An upcoming event must not show submitted apps, results, or a roster. The user wants old sample data preserved, not deleted.

**How to apply (event detail page):**
- The "Explore this competition" tiles AND the Leaderboard/Results section are both hidden when `status === 'upcoming'`.
- Spectator registration records a participation, then redirects to the event's `registration_url` (NS venue) with a reminder to also register on NS.
- `/winners` is static Viber-5 content, intentionally not linked while edition 5 is upcoming.

## Admin content management
- `events.registration_url` (text) holds the external NS registration page for upcoming events. Settable via admin Competitions tab.
- Admin Competitions tab → `/api/admin/events` (POST/PATCH). Admin Workshops tab → `/api/admin/workshops` (POST/PATCH/DELETE). Both require admin.
