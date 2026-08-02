---
name: Viber events & edition model
description: How events map to the integer `edition` column, the edition-0 FIFA case, and why team names don't identify an event.
---

Each row in `events` has an integer `edition`. The roster/apps pages filter by
edition via `?edition=N` deep links from the event detail page's Explore tiles.

- The "Viber FIFA World Cup" is a **distinct past event** (its own `events` row,
  `edition = 0`), NOT the same as "Viber 4" (edition 4). They are separate NS
  events with different recap URLs.
- `/api/competitors` validates the edition param and originally rejected anything
  `< 1`, silently falling back to CURRENT_EDITION. To surface an edition-0 (or any
  non-standard) event's roster, that bound must allow the value. GamesPage/RosterPage
  read the param with `Number.isFinite`, so 0 works client-side; the gate is server-side.
- `EDITION_LABELS` maps edition number → display name in both GamesPage and RosterPage.

**Why this matters:** Team names (AlphaQ, nikkiLAUDA, Team 3–18, etc.) and the
`teams`/`dashboard_teams` tables **recur across editions** — the same community
teams compete in multiple events. So matching team names between an app's `creator`
and a roster does NOT prove the app and roster belong to the same event. Identify an
event by the `edition`/event row, not by team-name overlap.

**Admin onboarding roster source (snapshot vs live):** the admin Onboarding tab shows
the CURRENT edition from live `users` (`/api/admin/users` filtered by edition), and past
editions from frozen `onboardings` snapshots (`/api/admin/onboardings/:edition`, read-only).
But snapshots only exist for editions that were frozen (currently only edition 4). Editions
that have live `users` rows but no snapshot (e.g. FIFA = edition 0) must fall back to live
users, else the roster shows empty. Gate the snapshot path on `isPast && (pastLoading ||
pastRows.length > 0)` — include `pastLoading` so a snapshot-backed edition doesn't briefly
flash the live editable roster while its query resolves.

**Surfacing edition 0 in tabs:** GamesPage builds its edition tabs from a length-based loop;
it must use `CURRENT_EDITION + 1` (not `CURRENT_EDITION`) to include edition 0. AdminPage's
onboarding edition buttons are a hardcoded array — add 0 there and use an `editionName()`
helper since `Viber 0` is wrong (edition 0 → "FIFA World Cup").

**Recovery sources** for lost past-event data live in git history (pre-rollback
commits): competitor rosters as `.xlsx` attachments, and app lists embedded in the
agent transcript CSVs. Some restored apps only had title+creator (no URL/thumbnail).
