---
name: Public builder profile policy
description: Visibility rules for /builders/:handle public profiles and where they must be enforced
---

The public builder endpoint (`/api/builders/:handle`, accepts username or numeric id) must return 404 unless the user is a competitor AND `profile_public` is not false AND they belong to Viber 5 or later (via `users.edition` or an event participation with edition >= 5 — pre-Viber-5 data is incomplete, per user decision July 2026). Never expose email or payment fields there.

**Why:** `profile_public` defaults true for everyone, so without the competitor gate the endpoint becomes an enumeration path exposing spectators by numeric id. A public team endpoint once spread whole user rows minus only passwords, exposing email and payment details despite the safe builder endpoint.

**How to apply:** Project explicit safe fields in every public user list; never spread a user row into a public response. Opt-outs may still appear by name/team in a roster, but suppress their optional photo, tagline, social handles and username as well as the profile link. Client "view my public profile" links should only render for competitors with a public profile. The default query fetcher only fetches `queryKey[0]` — build the full path into the first key segment.
