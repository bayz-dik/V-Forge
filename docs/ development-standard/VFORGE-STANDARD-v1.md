# V-Forge Development Standard v1.0

## 1. Purpose

Use this standard as the normative engineering contract for V-Forge. Preserve stable behavior, prevent regression accumulation, keep ownership clear, and require evidence before release promotion.

## 2. Instruction and Policy Precedence

Follow explicit human instructions first, then `AGENTS.md`, Superpowers process workflow, this standard, `ANTISLOP-VFORGE.md` for UI/UX, the approved task-specific spec/plan, and finally the release checklist. Resolve contradictions before implementation rather than improvising around them.

## 3. Superpowers Workflow Contract

Use Superpowers for non-trivial engineering work. Bug fixes begin with systematic debugging and, when practical, a failing regression test. New functionality and design changes begin with brainstorming, an approved design spec, and a written implementation plan. Execute work in an isolated workspace. Use TDD where the plan requires it. Use verification-before-completion before claiming a fix, completion, Candidate, Release Candidate, or Stable status.

Known blocker regressions must be fixed before unrelated feature expansion.

## 4. Anti-Slop Integration

Treat Anti-Slop as a craftsmanship and evidence layer, not a replacement for Superpowers. Apply the V-Forge-specific adaptations in `ANTISLOP-VFORGE.md`. Preserve deliberate V-Forge identity instead of replacing it with generic dashboard styling.

## 5. V-Forge UI and Layout Contract

The app shell may use Light Mode or Dark Mode. The Video Editor remains a dark creative workspace in both modes unless an approved redesign changes that contract. Lime and purple remain intentional brand accents. Blur/glass is allowed selectively when it serves hierarchy, depth, branding, state, or media presentation.

The mobile editor layout has one authoritative geometry contract, in this order:

```text
HEADER
PREVIEW
TIMELINE
TOOL SCROLLER
DOCK
```

Keep Preview and Timeline reachable. The Tool Sheet/TOOL SCROLLER is the intended vertical editor-tool scroller. Respect mobile safe areas, viewport resize/orientation recovery, portrait priority, and supported landscape/tablet/desktop layouts.

## 6. V-Forge Architecture Rules

- **VF-A01 Single ownership:** one behavior has one authoritative controller or source owner.
- **VF-A02 No stacked hotfix layers:** do not accumulate inline versioned patches as architecture.
- **VF-A03 DOM readiness:** a controller must not initialize before every required DOM target exists.
- **VF-A04 Preserve stable global contracts:** do not rename public DOM hooks or stable globals merely for version aesthetics.
- **VF-A05 Dependency order is testable:** script/style order that affects behavior must be covered by a structural test.
- **VF-A06 Dead code removal requires proof:** remove legacy assets only after proving no active reference or runtime dependency remains.
- **VF-A07 Source owner over symptom patch:** fix the authoritative source instead of layering a symptom override when the source is available.

Do not ship or require string-replacement patch scripts as runtime architecture. Temporary editing utilities may be used only as development tooling when the final repository contains clean maintainable source.

## 7. Permanent Regression Registry

Every blocker-class regression that has been fixed should receive a durable regression ID and a permanent guard when automation is practical.

- **REG-SHOWCASE-001 — Showcase bootstrap order:** `v93-showcase.js` must execute only after required Showcase DOM and CTA targets exist.
- **REG-THEME-001 — Light-theme editor leakage:** Light Mode must not recolor editor-internal dark tool surfaces.
- **REG-LAYOUT-001 — Competing editor layout owners:** legacy V9.1.3 layout ownership must not reactivate alongside the V9.3 editor contract.
- **REG-NAV-001 — Showcase navigation isolation:** bottom navigation is hidden/inert while Showcase is open and restored after close.
- **REG-PICKER-001 — Picker cancel recovery:** Android picker cancellation must recover to a valid source page/showcase state without duplicate behavior.

## 8. Testing Architecture

Organize tests by intent:

- `tests/static/` — document presence, syntax/structure, duplicate IDs/modules, dependency order, non-runtime governance checks.
- `tests/regression/` — permanent guards for historical blocker regressions.
- `tests/release/` — Protected Core integrity, release terminology, required gate coverage, and governance completeness.

Use Node.js built-in `node:test` and `node:assert` for this standard. Do not add a package dependency merely to enforce governance.

Static verification alone never establishes Stable status.

## 9. Protected Core

Treat these files as Protected Core by default:

- `js/auth.js`
- `js/firebase-config.js`
- `firestore.rules.txt`
- `js/processor.js`
- `service-worker.js`

Do not modify Protected Core incidentally. A task that changes Protected Core must explicitly name the file in the approved spec, explain risk, add targeted verification, and compare it with a known baseline. Governance-only work must leave Protected Core unchanged.

## 10. Release Lifecycle

Use the following lifecycle truthfully:

```text
Development -> Candidate -> Release Candidate -> Stable
```

- **Development:** implementation is in progress or verification is incomplete.
- **Candidate:** scoped implementation and fresh automated/structural tests pass; real-device acceptance may still be pending.
- **Release Candidate:** Candidate gates pass and required Android/desktop real-device flows have passed with evidence; final observation remains.
- **Stable:** Release Candidate gates pass, required real-device evidence exists for the exact release, no blocker regression remains unresolved, and deployment health is confirmed.

A successful deployment alone is not proof of stability.

## 11. Failure Handling and Fix-Before-Feature

Treat a defect as a release blocker when it breaks a core flow, creates data/security risk, makes primary UI unreachable, violates the theme/layout contract, or reintroduces a registered critical regression.

Fix known blocker regressions before unrelated feature expansion.

For each blocker fix, record the observed symptom, root cause, owning source/component, regression test or reason automation is impractical, and fresh verification evidence. Stop release promotion when a required gate fails.

## 12. Definition of Done

A V-Forge engineering task is Done only when all applicable requirements are true:

1. Approved requirements are implemented.
2. Relevant tests are written or updated.
3. Fresh automated verification passes.
4. No duplicate active controller or DOM ID is introduced.
5. Architecture ownership remains clear.
6. Light Mode and Dark Mode behavior is correct for affected surfaces, including editor theme isolation.
7. Responsive behavior is verified for affected breakpoints.
8. Protected Core remains unchanged unless explicitly scoped.
9. Known regressions remain guarded.
10. User-facing behavior matches the approved design.
11. Real-device acceptance is complete when required for the claimed release status.
12. The release is labeled Development, Candidate, Release Candidate, or Stable truthfully.

## 13. Governance and Standard Versioning

`AGENTS.md` owns the concise repository entry policy. This file owns normative engineering governance. `ANTISLOP-VFORGE.md` owns UI/UX craftsmanship adaptations. `RELEASE-CHECKLIST.md` owns operational release evidence. Task-specific specs/plans own scoped requirements and implementation steps.

Material changes to process, Protected Core definitions, release gates, or brand policy require their own approved design/plan. Small wording corrections that do not alter meaning may be reviewed directly.

This standard begins at **v1.0**. Increment the major version when governance meaning changes incompatibly. Minor revisions may add regression IDs, clarify checks, or add non-breaking quality gates.
