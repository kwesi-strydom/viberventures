---
name: Live dashboard event linkage
description: How the arena dashboard connects to a competition and where its roster comes from
---
The arena is one shared display linked to the selected competition, not a separate simultaneous arena for each event. The wheel must target that same competition's roster; a current-edition fallback is only for the deliberate legacy/unlinked mode, never a replacement for an empty Astana roster.

The operator timer is deliberately manual and independent: set a duration, Start/Resume, Stop, Reset. Linking an event must not configure or reset the clock; time reaching zero must not trigger challenges, phase prompts, roster changes, or launchpad transitions. Legacy competition-reset APIs are not timer controls.

**Why:** future/parallel competitions must reuse the dashboard without code changes, and the timeline is driven by wheel spins — not the timer — so clock resets must not wipe events. After Astana on 2026-09-30, the organizer reported avoiding the timer because its schedule felt too constraining; manual, independent controls are the intentional product direction.
**How to apply:** Keep dashboard and wheel roster scope aligned with the selected competition, and keep manual timer operations separate from linking or resetting that competition.
