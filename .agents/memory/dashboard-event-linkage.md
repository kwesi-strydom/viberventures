---
name: Live dashboard event linkage
description: How the arena dashboard connects to a competition and where its roster comes from
---
The live arena is plug-and-play per competition: `event_state.linked_event_id` points at an `events` row (null = current edition's event). Roster resolution: prefer the linked event's `event_participations` (role=competitor, team_name set); fall back to edition-based `users.team_name` when participations carry no team names. The Wheel of Destiny reads its team list from `/api/dashboard` teams so spins always target the board's roster.

Timer actions on `/api/admin/dashboard/event`: `reset` = clock only (history kept), `restart` = clock to zero + running with timeline/feed wiped, `set-event` links a competition, `set-duration` editable any time (min 60s).

**Why:** future/parallel competitions must reuse the dashboard without code changes, and the timeline is driven by wheel spins — not the timer — so clock resets must not wipe events.
**How to apply:** any new dashboard/wheel feature should resolve teams via the linked event, never via CURRENT_EDITION directly.
