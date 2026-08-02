---
name: auth architecture
description: How auth works in this repo and why; constraints for adding new login providers.
---

# Auth architecture & constraints

This app uses a **custom session system**, NOT a Replit Auth / Firebase / Clerk integration.
- `sessions` table + random `sessionId` cookie (httpOnly:false, secure:false, sameSite:lax, 24h).
- Email signup/login in `server/auth.ts`; OAuth providers implemented manually in `server/routes.ts`.
- NS login = Discord OAuth + NS membership verify (`/api/auth/discord*`). Google = plain OAuth, no NS check (`/api/auth/google*`), matches/creates users by email.

**How to add a new OAuth provider:** mirror the manual Discord flow (auth redirect → code exchange → profile fetch → find/create user by email → create session → set cookie → redirect). Do NOT pull in a first-party auth integration — there is no first-party Google OAuth connector, and the integration-based ones (Replit Auth/Clerk/Auth0) would replace this custom session system.

**Why the cookie flags are httpOnly:false / secure:false:** intentional, app-wide, for mobile debugging (see comments in `server/auth.ts`). Don't unilaterally "harden" these — it affects every existing login path and is a deliberate choice. Treat any cookie/CSRF/state hardening as a broad, sign-off-required change, not part of a single-provider task.

**OAuth `state` param** carries only the role string ("competitor"/"audience"), not a CSRF nonce — consistent across Discord, Google, and GitHub. Same caveat as above before changing.

**Providers now include GitHub** (`/api/auth/github*`), mirroring the manual flow. GitHub may not return a public email, so the callback fetches `/user/emails` and must accept **only a verified** address (primary+verified, else any verified) — never fall back to an unverified email (account-takeover vector). Apply the same verified-only rule to any future provider exposing an emails list.
