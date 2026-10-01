# Viber Astana — September 30, 2026

Venue: Nur Alem Pavilion, fifth floor, Network School. With Superteam Kazakhstan.
Original event format: 60 minutes to build, 60 seconds to pitch. Operators now choose timer durations and challenge timing manually; no automatic schedule is enforced.

## Release

This branch adds the event flow; it does not deploy itself. Use the existing Viber app hosting and its existing admin accounts.

1. Install dependencies with `npm ci`.
2. Verify `npm run test:event-reliability`, `npm run check`, and `npm run build`.
3. In the authorized app environment, with its existing `NEON_DATABASE_URL` or `DATABASE_URL`, run `npm run db:astana`. This executes the additive `scripts/astana.sql` inside one transaction. It creates the event only if absent, allocates a free edition, and preserves historical data. Do not run `db:push`.
   For an already-established event database, the wheel/device-sign-in reliability update uses `npm run db:event-reliability` instead: it creates only the reviewed persistence tables and outcome-association columns, without re-seeding the event or changing captured records.
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

New participants enter name and email, open the Twitter follow link, and self-confirm following. This does not verify a follow through the X API. Names appear with their team; email remains private. The browser receives a seven-day event session. No Discord, NS membership, password, payment, or email delivery is needed.

To add another device, keep the signed-in phone and open **My team → Sign in on another device → Generate sign-in code**. On the new laptop or browser, open `/astana/join`, enter that code under **Already checked in?**, and choose **Add this device**. Codes contain 80 bits of randomness, are displayed only on the signed-in device, expire after ten minutes, and work once. Generating another code invalidates the previous unused code. The new device receives its own seven-day session; pairing never signs the source phone out and does not create another guest, alter team membership, or expose the participant's email. Limit generation to five codes per participant per 15 minutes; attempts from one IP are rate limited.

Name and email are for new check-in, never proof of identity for an existing participant. If the signed-in device is lost, an organizer must verify the person in person, use **Restore access** in the organizer roster, and share the one-use link privately. Organizer recovery lasts ten minutes and intentionally invalidates all previous sessions for that participant. This is a stronger recovery action than adding a paired device. Never share a sign-in or recovery code publicly or in a team chat.

## Teams and challenges

After check-in, randomize teams. Pairs are the default; an odd roster ends in a trio. A late participant waits unassigned until the organizer moves them to a team or chooses New team. Full rerandomization is disabled once any team has submitted a project. Use transfers or swaps instead. A transfer cannot empty an existing team.

Connect Astana to the arena from the organizer page. Linking changes only the displayed roster/event, not the timer. The arena is the existing shared live display, not a separate simultaneous arena per event; it does not delete previous event catalog entries or submissions.

In `/admin/dashboard`, use the standalone **Manual Timer**: choose 60, 10, or 5 minutes, or enter any whole-minute duration from 1 to 10,080. **Start/Resume** runs the clock, **Stop** pauses it, and **Reset** returns to the full configured duration without starting. These controls never reset projects, teams, wheel rounds, timeline, or feed. When time reaches zero, manually reset it to start another countdown. There are no timer-driven challenge or pitch prompts.

Spin the wheel whenever the operator chooses. The sequence is Founders Dispute, Copyright Strike, Server Crash, Lawsuit, then Safe. Each successful spin and its next-challenge position are saved together per linked event; reloading or a server restart resumes that progress. If saving fails, retry the same result rather than drawing again. Wheel reset requires confirmation and clears only its tagged outcomes, not the timer or unrelated history. A dispute rotates one selected member of two or three affected teams; with one team there is no swap. The same membership controls project edits. An old project form rejects a save if its builder has moved teams.

## Submissions and ratings

Each team submits one app with a title, publicly hosted HTTP(S) URL, and a direct thumbnail image URL. Postimages' direct image link works; its album/share-page URL will not render as an image. Description and social-post URL are optional. Current teammates share editing rights. A stale edit is rejected rather than silently overwriting another teammate's work; copy any edits needed before loading the latest saved version.

Anyone can try apps and rate 1–5 stars. A browser receives one updatable vote per project. Per-visitor rate limits allow the venue's shared Wi-Fi; a generous IP ceiling limits abuse. Participants cannot vote for their own current team while signed into that guest session. Clearing cookies or changing browsers can evade visitor identity, so ratings are an audience signal rather than a verified-person election. Judges control official placements.

## Judges and reveal

Judges use the existing admin login and the Projects & judges section. At least three projects are required. Select three distinct projects in order and save a private draft. Publish winners explicitly when ready. Editing a draft after publication does not change public results until another publish. Opening the public winners page before publication exposes no draft picks.

## Local rehearsal

`npm run build` then `node --import tsx scripts/preview-astana.ts` starts http://127.0.0.1:4173/astana with an ephemeral PostgreSQL database and five synthetic participants. The local preview grants local organizer access for testing; it is not imported into production and refuses production mode. It binds only to loopback and never uses a database URL. The preview simulates the legacy arena transport; database/API tests exercise the real Astana store and routes.

Rehearse a sixth check-in, randomization into three teams, a late arrival, two-member swap, app submission, visitor voting, and winner publication. Also pair a laptop from a signed-in phone and verify both devices still show the same participant/team. Tests run the additive migration twice and assert historical fixture preservation, one-use/expired device codes, concurrent redemption, preserved source sessions, organizer recovery, duplicate-email protection, team revisions, stale project edits, integer/duplicate votes, and private drafts. The additive `astana_device_codes` table is defined in `scripts/astana.sql`; before applying this change to the event database, an authorized operator must verify the connection and current schema read-only, then run only the reviewed additive migration in the authorized environment. Never run `db:push` or perform a production migration during rehearsal.

## Rollback

Redeploy the previous app version and remove Astana navigation if necessary. Leave the added tables and captured event data intact. Do not drop tables or reset the shared database. The migration does not switch the arena; the organizer can select the previous event in the existing clock controls.

## Verification record

- Automated cases run against ephemeral PostgreSQL and HTTP routes, covering participant workflows, multi-device access, persisted wheel order/retries, and independent manual timer controls.
- TypeScript check and production build pass (Vite reports the existing large-bundle advisory).
- Independent review completed; fixed late-arrival New team, stale roster selections, and historical arena projection preservation with regression tests.
- Browser rehearsal verified registration, three teams, a two-member swap, submission with social link, voting, private draft and public top-three reveal. Participant form inspected at 390×844.
- Physical phone QR scanning, real-device cookie behavior, and the published rollout still require deployment verification. The reliability update's reviewed additive migration was applied to the established database, with existing participant, team, project, outcome, and feed counts unchanged.
- Minor retained behavior: with only one team in a wheel draw, the legacy result copy mentions a swap, but no swap dialog opens and no membership changes.

## Canceled V5 and navigation

Astana replaces canceled V5 promotions on the homepage. The main `/launchpad` opens Astana; the previous founders-track page remains at `/launchpad/archive`, and past apps remain at `/games`. V5 event detail links lead to the Astana hub, and `/v5/waiting-room` and `/v5/my-team` lead to the Astana team page. Astana has a Back to Viber link. The catalog labels V5 canceled instead of promoting registration.

V5 users, event participations, and payment records are retained without being copied to Astana. Existing admin participant tools remain available. New V5 event joins and checkout/crypto submissions are rejected; historical payment verification is preserved. No database change is needed for this navigation update. A regression test runs the Astana migration twice with V5 participant/payment fixtures and checks they remain identical and no Astana guests are created.

The homepage shows the confirmed date and venue rather than a countdown to an unconfirmed start time. External NS event pages and previously issued third-party payment links are not modified by this app change.
