---
name: GitHub history alignment
description: How to sync an older Replit checkout with the snapshot-based GitHub main branch
---
The correct remote is `https://github.com/kwesi-strydom/viberventures.git`.
GitHub main follows a clean snapshot lineage, not the original long Replit history.

**Why:** The old local history included a missing object that blocked large pushes.
Publishing a clean snapshot changed the remote ancestry; blindly pulling or rebasing
an old checkout against it can replay hundreds of commits and wedge the Git pane.

**How to apply:** Before syncing an old checkout, check for uncommitted changes and
compare its tree with the remote snapshot's tree. If they match, preserve the old
branch under a backup ref, then align the checkout to fetched GitHub main. If they
differ, reconcile the changes before moving branch pointers. Never force-push to
solve a local checkout divergence.
