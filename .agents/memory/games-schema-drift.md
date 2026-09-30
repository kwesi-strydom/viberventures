---
name: Live Neon database migration safety
description: Why the shared Neon database needs reviewed additive migrations rather than schema push
---

The published site and workspace use the same external Neon database. Replit's managed
production database query can report that no production database exists even when the
site is published; it does not read this external Neon database.

**Rule:** Never run `npm run db:push` / `drizzle-kit push` on the live Neon database.

**Why:** The live schema includes columns not modeled in Drizzle, so a schema push
would offer to drop or misidentify live fields. Publish does not migrate this external
database, and the managed production query cannot verify it.

**How to apply:** Confirm the Neon connection points to the existing event/registration
data with read-only queries before writes. Apply only reviewed additive DDL or an
idempotent project migration against that connection, and verify historical records
remain unchanged.
