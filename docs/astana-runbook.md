# Viber Astana — September 30, 2026

Venue: Nur Alem Pavilion, fifth floor, Network School. With Superteam Kazakhstan.
Format: 60 minutes to build, 60 seconds to pitch. Business challenges at minutes 10, 20, 30, 40 and 50.

## Release

This branch adds the event flow; it does not deploy itself. Use the existing Viber app hosting and its existing admin accounts.

1. Install dependencies with `npm ci`.
2. Verify `npm run test:astana`, `npm run check`, and `npm run build`.
3. In the authorized app environment, with its existing `NEON_DATABASE_URL` or `DATABASE_URL`, run `npm run db:astana`. This executes the additive `scripts/astana.sql` inside one transaction. It creates the event only if absent, allocates a free edition, and preserves historical data. Do not run `db:push`.
4. Deploy this branch through the app's existing hosting workflow. Runtime command remains `npm start`; Node 20+ recommended.
5. Open `/astana`, `/astana/join`, and `/admin/astana` on the deployed hostname. Confirm the organizer route requires the existing admin login. Check public winners are unrevealed.
6. Display the QR generated on the deployed `/admin/astana` page. Its printed URL must match the deployed hostname, never localhost. Test with a real phone before opening the doors.

## Event links

- Event hub: `/astana`
- QR check-in: `/astana/join`
- Team and project form: `/astana/team`
- Public launchpad: `/astana/launchpad`
- Public top three: `/astana/winners`
- Private operations and judging: `/admin/astana`
- Existing wheel: `/admin/wheel-of-destiny`
- Existing clock controls: `/admin/dashboard`
- Existing public arena: `/dashboard`

## At the door

Participants enter name and email, open the Twitter follow link, and self-confirm following. This does not verify a follow through the X API. Names appear with their team; email remains private. The browser receives a seven-day event session. No Discord, NS membership, password, payment, or email delivery is needed.

Keep the same browser, especially when the QR opens inside another app. If a participant loses access, verify them in person, use Restore access in the organizer roster, and share the one-use link privately. It lasts ten minutes and invalidates old sessions when redeemed. The same email cannot be used to impersonate an existing participant or legacy account.

## Teams and challenges

After check-in, randomize teams. Pairs are the default; an odd roster ends in a trio. A late participant waits unassigned until the organizer moves them to a team or chooses New team. Full rerandomization is disabled once any team has submitted a project. Use transfers or swaps instead. A transfer cannot empty an existing team.

Connect Astana to the arena from the organizer page, then start the clock in timer controls. The arena is the existing shared live display, not a separate simultaneous arena per event. Linking it changes the displayed event; it does not delete previous event catalog entries or submissions.

Spin the wheel at the five ten-minute intervals. The existing business outcomes include founder dispute, copyright strike, server crash, lawsuit, and a safe round. A dispute rotates one selected member of two or three affected teams; with one team there is no swap. The same membership controls project edits. An old project form rejects a save if its builder has moved teams.

## Submissions and ratings

Each team submits one app with a title, publicly hosted HTTP(S) URL, and a direct thumbnail image URL. Postimages' direct image link works; its album/share-page URL will not render as an image. Description and social-post URL are optional. Current teammates share editing rights. A stale edit is rejected rather than silently overwriting another teammate's work; copy any edits needed before loading the latest saved version.

Anyone can try apps and rate 1–5 stars. A browser receives one updatable vote per project. Per-visitor rate limits allow the venue's shared Wi-Fi; a generous IP ceiling limits abuse. Participants cannot vote for their own current team while signed into that guest session. Clearing cookies or changing browsers can evade visitor identity, so ratings are an audience signal rather than a verified-person election. Judges control official placements.

## Judges and reveal

Judges use the existing admin login and the Projects & judges section. At least three projects are required. Select three distinct projects in order and save a private draft. Publish winners explicitly when ready. Editing a draft after publication does not change public results until another publish. Opening the public winners page before publication exposes no draft picks.

## Local rehearsal

`npm run build` then `node --import tsx scripts/preview-astana.ts` starts http://127.0.0.1:4173/astana with an ephemeral PostgreSQL database and five synthetic participants. The local preview grants local organizer access for testing; it is not imported into production and refuses production mode. It binds only to loopback and never uses a database URL. The preview simulates the legacy arena transport; database/API tests exercise the real Astana store and routes.

Rehearse a sixth check-in, randomization into three teams, a late arrival, two-member swap, app submission, visitor voting, and winner publication. Tests run the additive migration twice and assert historical fixture preservation, session recovery, duplicate email protection, team revisions, stale project edits, integer/duplicate votes, and private drafts.

## Rollback

Redeploy the previous app version and remove Astana navigation if necessary. Leave the added tables and captured event data intact. Do not drop tables or reset the shared database. The migration does not switch the arena; the organizer can select the previous event in the existing clock controls.

## Verification record

- Eight automated cases run against ephemeral PostgreSQL and HTTP routes; all pass.
- TypeScript check and production build pass (Vite reports the existing large-bundle advisory).
- Independent review completed; fixed late-arrival New team, stale roster selections, and historical arena projection preservation with regression tests.
- Browser rehearsal verified registration, three teams, a two-member swap, submission with social link, voting, private draft and public top-three reveal. Participant form inspected at 390×844.
- Physical phone QR scanning, live Neon transport/cookies, and hosting rollout require deployment verification. No production migration was performed during development.
- Minor retained behavior: with only one team in a wheel draw, the legacy result copy mentions a swap, but no swap dialog opens and no membership changes.
