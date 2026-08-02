---
name: Event currency can be non-ISO (crypto)
description: Why all currency formatting must guard against RangeError from Intl
---

Event `currency` values are NOT restricted to ISO 4217 codes — they can be crypto/non-ISO codes like `usdc`.

**Why:** Viber events use crypto entry fees (e.g. USDC). `Number.prototype.toLocaleString(undefined, { style: 'currency', currency: 'USDC' })` throws `RangeError: Invalid currency code`. When this runs during render (fee labels on EventsPage / EventDetailPage), the thrown error crashes the whole page → users saw a blank/dark screen after the loading spinner. This is a render-time crash, not a CSS issue.

**How to apply:** Any place that formats an event fee must wrap the Intl currency call in try/catch and fall back to `"<amount> <CODE>"` for non-ISO codes. If a shared money formatter is introduced, it must keep this guard. Symptom to recognize: "page goes dark/blank after load" on a page that displays an entry fee.
