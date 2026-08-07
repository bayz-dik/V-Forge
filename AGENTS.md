# V-Forge Agent Instructions

## Instruction precedence

For V-Forge engineering work, follow this order:

1. Explicit human request.
2. This `AGENTS.md` entry point.
3. Superpowers process workflow.
4. `docs/development-standard/VFORGE-STANDARD-v1.md`.
5. `docs/development-standard/ANTISLOP-VFORGE.md` for UI/UX work.
6. The approved task-specific spec and implementation plan.
7. `docs/development-standard/RELEASE-CHECKLIST.md` before release promotion.

Resolve conflicts in the task specification before implementation. Do not silently improvise around conflicting requirements.

## Required workflow

Use Superpowers for non-trivial engineering changes. Bug fixes start with systematic debugging and a reproducible regression test when practical. New functionality and design changes start with brainstorming, then an approved design spec and implementation plan. Use verification-before-completion before claiming work is fixed, passing, complete, RC, or Stable.

## V-Forge UI contract

The app shell may use Light or Dark Mode. The Video Editor remains a dark creative workspace in both modes unless an approved redesign explicitly changes that contract. Lime and purple are intentional V-Forge brand accents. Blur/glass is allowed selectively when it serves hierarchy, depth, branding, state, or media presentation.

Do not introduce stacked inline hotfix layers. Fix the authoritative source owner. One behavior has one authoritative controller. A controller must not initialize before its required DOM exists.

## Protected Core

The following files are Protected Core by default:

- `js/auth.js`
- `js/firebase-config.js`
- `firestore.rules.txt`
- `js/processor.js`
- `service-worker.js`

Do not modify Protected Core incidentally. A task that legitimately changes one of these files must name it in the approved spec, define the risk, add targeted verification, and compare against a known baseline.

## Release truthfulness

Development, Candidate, Release Candidate, and Stable are distinct states. Automated tests can establish Candidate readiness, but real-device acceptance is required before RC/Stable claims. A successful deployment alone is not proof of stability. Known blocker regressions are fixed before unrelated feature expansion.
