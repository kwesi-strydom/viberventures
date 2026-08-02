---
name: GitHub push to viberventures
description: State and pitfalls of pushing this repl to GitHub (kwesi-strydom/viberventures)
---
The correct remote is `https://github.com/kwesi-strydom/viberventures.git` (NOT Nassaramuto/VIBER-Platform — that account has no access).
**Why:** the user's connected GitHub account is kwesi-strydom; pushes to the old remote fail UNAUTHENTICATED.
Remote's original one-commit snapshot (f50fb69) was merged into local main with `-s ours --allow-unrelated-histories` (merge c6d2582), so pushes are plain fast-forwards — never force-push or rebase onto the snapshot.
**How to apply:** if the Git pane reports "middle of a rebase", it likely tried rebasing 522 commits onto the snapshot — `git rebase --quit`, restore main to the merge lineage, `git reset --hard`. Agent-side gitPush auth is intermittent (worked once, mostly UNAUTHENTICATED); repo pack is ~193 MB and large pushes may also fail. Pane push spawned a stuck git-lfs push + askpass prompts once; kill them and remove .git/index.lock.
