---
name: Autoscale cost controls
description: Why client polling/WebSocket behavior is deliberately throttled; don't reintroduce chatty patterns or the hosting bill explodes.
---

# Autoscale cost controls

The live site runs on an Autoscale deployment (pay-per-use, user's hard budget: $20/month). A previous config (4 vCPU / 8 GiB / 3 machines) plus a 24/7-open notification WebSocket and 3–5s polling kept the server awake nonstop and burned ~$47 in 2 days. Now downsized to 1 vCPU / 2 GiB / 1 machine (~18 units/sec ceiling).

**Rules:**
- The notification WebSocket intentionally disconnects when the tab is hidden and reconnects on visibility, with a 15s (not 3s) retry. Do not "fix" this back to an always-on connection.
- Client `refetchInterval`s are deliberately slow (15–30s). Real-time dashboard updates arrive via WebSocket push invalidation, so slow polls are just a fallback — do not shorten them.
- Anything that keeps a request/connection open around the clock defeats Autoscale's sleep-when-idle billing and blows the budget.

**Why:** Autoscale bills whenever any instance is awake; an idle-but-connected client keeps it awake at full rate.

**How to apply:** When adding live/refresh features, prefer WebSocket push invalidation over polling, honor `document.hidden`, and keep fallback polls ≥15s. Deployment type can only be changed by the user in the Publishing UI; converting to Reserved VM requires deleting and republishing the deployment.
