# Viber Astana — proposed event flow

Status: proposed design for review; implementation has not started.
Source reviewed: kwesi-strydom/viberventures, commit fc65b92aecc74ce0ea92dc520cf11f7230bede3f.

## Outcome

Run Viber Astana with Superteam Kazakhstan on September 30, 2026, at the Nur Alem Pavilion, Network School floor (5th floor). The user's message supersedes the PDF's September 26 date, lobby venue, solo format, and proposed prize allocations. Display the event date without inventing a start time. Format: 60 minutes to build, 60 seconds to pitch, founder-life challenges every 10 minutes.

## Approach

Recommended: an event-specific guest flow within the existing React/Express/PostgreSQL app, sharing the arena and visual components. This keeps tonight's experience simple while preserving historical events and existing account authentication.

Alternatives: adapting all account and edition flows would require broader changes under a short deadline; a separate app would duplicate the wheel, dashboard, and deployment work.

## Participant and audience experience

- `/astana`: event hub with entry, team status, launchpad, and results links; link it from the home page and event listing.
- `/astana/join`: QR destination, name and email only, prominent https://x.com/viberventures follow link and self-confirmation. Following is not represented as API-verified.
- Registration issues a cryptographically random, HTTP-only event-session cookie. Guest identity remains separate from existing admin and NS accounts. Email alone never restores or grants access to an existing identity. Same-browser retries are idempotent; lost-session recovery is handled by the organizer.
- `/astana/team`: waiting state until assigned; then teammates and the team's shared project form. Default to pairs, with one trio for an odd roster. Operator can accommodate late arrivals without rerandomizing everyone.
- One submission per event team, editable by current members: project name, hosted app URL, thumbnail URL, optional social-post URL; description optional. Require HTTP(S) URLs and explain that Postimages must provide a direct image URL.
- `/astana/launchpad`: public project cards with app, social-post, and rating actions. Audience ratings use a server-issued visitor identity, integer 1–5 scores, one updatable rating per visitor/project, and rate limiting compatible with shared venue Wi-Fi. These are audience signals, not verified-person ballots. Authenticated team members cannot rate their own project.
- `/astana/winners`: unpublished state until the organizer reveals first, second, and third place.

## Organizer experience

- `/admin/astana` remains behind existing server-side admin authorization. Include entry QR, roster, team assignment, late-arrival handling, project overview, and judging.
- Store event memberships and team IDs explicitly; validate and save assignments atomically. Do not clear global teams or overwrite previous editions. Freeze re-randomization after submissions begin; deliberate member transfers remain possible.
- The existing wheel and live dashboard resolve the linked Astana event's teams. Founder disputes update the same membership records used for submission authorization. Lawsuits and other wheel outcomes reference stable teams.
- Keep the 60-minute timer and operator-triggered wheel; show 10-minute challenge cues. Use business challenges only. Do not automatically interrupt presentations or impose physical tasks.
- Judges work in the admin area and collectively select three distinct submitted projects. Save a private draft, then use an explicit publish action. Public APIs must not expose draft results. Audience rankings remain distinct from judges' placements.

## Implementation boundaries and data

Likely touchpoints: shared/schema.ts; focused Astana server routes/storage; server/routes.ts arena integration; App.tsx and CompetitorGuard; Astana pages; navigation and event listing; WheelOfDestinyPage and dashboard controls where needed.

Use additive tables/columns and a repeatable migration. Repository notes state that development and production share Neon and that unmodeled live columns exist: do not use drizzle-kit push. Prepare and verify migration separately before applying it to the live database. Resolve the event by its slug and allocate a nonconflicting edition during migration; do not assume edition 6 is free.

Keep emails and session tokens out of public roster/project responses. Validate ownership, event identity, admin authorization, and URLs on the server. Handle duplicate registrations, malformed input, expired sessions, unavailable database, and save failures explicitly in the UI.

## Verification and release

Test registration/retry and duplicate-email isolation; admin and team authorization; even/odd randomization; late arrivals; preservation of earlier events; transfers changing edit access; concurrent project writes; vote validation/deduplication; draft privacy and atomic winner publishing.

Run TypeScript checks and production build, distinguishing baseline failures from introduced failures. Browser-test mobile entry, team waiting/assigned states, submissions, public voting, and judge-to-winners flow using isolated test data. Verify QR destination before delivery.

Release requires the hosting deployment path and authorized database connection to be available. No database mutation or deployment has been performed during this review.
