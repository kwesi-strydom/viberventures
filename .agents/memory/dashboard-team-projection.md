---
name: Live dashboard team projection
description: How dashboard_teams mirrors platform rosters and how to keep display attrs across renames
---

The live dashboard's `dashboardTeams` table is a **projection** of the real platform rosters, not an independently editable list. It is reconciled by `syncDashboardTeams(computeDesiredTeamNames())`, which runs on every `GET /api/dashboard` poll and after any roster mutation (assign/rotate/swap, admin user team edits, team rename).

**Reconciliation keys on team NAME.** Sync dedupes by name, drops rows whose name is no longer a desired platform team, and inserts missing names with a default colour from the palette.

**Rule:** any operation that renames a team must rename the matching `dashboardTeams` row (old name → new name) BEFORE calling sync. Otherwise sync drops the old row and recreates a fresh one, losing the team's display attributes (colour, rank, shields). This is handled in the `PATCH /api/teams/:slug/rename` route.

**Why:** the task required display attributes to survive roster changes/renames, and a disconnected snapshot was explicitly out of scope. Name-keyed projection keeps it consistent without a schema/identity change.

**How to apply:** the operator console (`/admin/dashboard`) only edits display attrs (colour/rank/shields) via `PATCH /api/admin/dashboard/teams/:id`. There is intentionally NO manual seed/create/delete of dashboard teams — those routes were removed. Add/remove/rename teams only through `/admin` (platform users + team rename), and the dashboard follows automatically. Mutations that change rosters should also `createFeedEvent(...)` + `broadcast({type:'dashboard_update'})` so changes surface in the live feed.
