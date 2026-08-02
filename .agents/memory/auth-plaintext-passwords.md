---
name: Auth accepts plaintext passwords
description: Login path compares plaintext when the stored value isn't bcrypt, so any seeded/imported user must have an unguessable password.
---

The login path (server/auth.ts) compares the submitted password directly when the
stored value is not a bcrypt hash. This means **any user row you insert directly
(seeds, imports, restored historical records) is loginable** if its password is
known or guessable.

**Why:** A bulk restore once inserted display-only competitor accounts with a
shared placeholder password and predictable emails — that made all of them
impersonatable by anyone who guessed the email format + password.

**How to apply:** When inserting users via SQL for display-only/historical
purposes, set a unique, unguessable password per row (e.g.
`md5(random()::text || clock_timestamp()::text || id::text) || md5(random()::text || id::text)`)
so interactive login is effectively disabled. Never use a shared/static password
string for batch-inserted accounts.
