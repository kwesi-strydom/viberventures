---
name: CompetitorGuard hook-order black screen
description: Why route-guard hooks must run before any early return, and how a blank/black screen traces back to a Rules-of-Hooks violation
---

CompetitorGuard wraps ALL routes (it sits outside `<Routes>`), so it re-renders on every navigation. It has public-route short-circuits (PUBLIC_PATHS + PUBLIC_PREFIXES). Every hook — especially the `/api/my-team` `useQuery` — MUST run before those early returns.

**Why:** A `useQuery` placed *after* the public-path early return means the hook is skipped on public routes but called on non-public routes. Navigating between the two changes the hook count → React throws "Rendered more/fewer hooks than expected" → the whole tree unmounts. Because the app background is black, the user just sees a **black/blank screen** (not an error page). Reported symptom: OAuth login → click "Register now" (public `/events` → non-public `/competition/:slug`) → dark screen; logo click to `/` → black screen.

**How to apply:** In any guard/wrapper that toggles behavior by route, compute `isPublic` first, call every hook unconditionally, then branch. Use `enabled: isCompetitor && !isPublic` to avoid needless fetches on public routes rather than skipping the hook. When symptom is "black/blank screen on navigation" (not on first load), suspect a conditional hook in a route-level wrapper before suspecting CSS or data crashes. Note: event routes exist under BOTH `/events/:slug` and `/competition/:slug`; keep both in PUBLIC_PREFIXES (EventsPage links to `/competition/:slug`).
