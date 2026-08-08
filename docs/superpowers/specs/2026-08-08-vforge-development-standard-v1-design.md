# V-Forge Development Standard v1.0 — Design Specification

**Status:** Approved  
**Date:** 2026-08-08  
**Baseline:** V-Forge V9.3.2  
**Scope:** Development governance, documentation, testing architecture, UI quality gates, and release discipline.  
**Runtime impact:** None. This specification does not change production behavior by itself.

## 1. Purpose

V-Forge Development Standard v1.0 establishes one shared engineering contract for all future V-Forge work. It combines:

1. **Superpowers** for process discipline: brainstorming, specifications, planning, TDD, systematic debugging, implementation, and verification.
2. **Anti-Slop V-Forge Edition** for UI/UX craftsmanship and delivery quality.
3. **V-Forge-specific architectural rules** derived from regressions already found in V9.3.x.
4. **Release gates** that distinguish Candidate, Release Candidate, and Stable builds.

The standard exists to prevent repeated regression patterns such as overlapping editor zones, duplicated controllers, theme leakage, DOM initialization-order failures, stacked inline hotfixes, and releases being called stable before real-device verification.

## 2. Non-Goals

This project does **not**:

- redesign the V-Forge UI;
- change Firebase configuration;
- change authentication behavior;
- change Firestore security rules;
- change local video processing behavior;
- change the service worker;
- add runtime JavaScript or CSS solely to enforce governance;
- automatically convert V-Forge to Kotlin or another framework.

The standard governs future work; it is not itself a feature release.

## 3. Repository Architecture

The intended repository structure is:

```text
V-Forge/
├── AGENTS.md
├── docs/
│   ├── development-standard/
│   │   ├── VFORGE-STANDARD-v1.md
│   │   ├── ANTISLOP-VFORGE.md
│   │   └── RELEASE-CHECKLIST.md
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── tests/
│   ├── static/
│   ├── regression/
│   └── release/
├── css/
├── js/
└── index.html
```

### 3.1 `AGENTS.md`

`AGENTS.md` is the compact entry point for coding agents and contributors. It must remain short enough to read at session start.

Its responsibilities are to:

- point to the authoritative development standard;
- require Superpowers workflow for engineering changes;
- require Anti-Slop V-Forge Edition for UI/UX changes;
- define Protected Core files;
- define release terminology;
- forbid bypassing verification gates.

It must not duplicate the full content of the detailed standards.

### 3.2 `VFORGE-STANDARD-v1.md`

This is the normative engineering policy. It defines process, architecture boundaries, Protected Core handling, version states, and Definition of Done.

### 3.3 `ANTISLOP-VFORGE.md`

This is the V-Forge adaptation of Anti-Slop 1.0.0. It preserves the upstream craftsmanship intent while documenting deliberate V-Forge brand overrides.

### 3.4 `RELEASE-CHECKLIST.md`

This is the operational gate used before Candidate, RC, and Stable promotion. It is designed to be checked, not merely read.

## 4. Instruction and Policy Precedence

For project work, the intended precedence is:

```text
Explicit human request
↓
Repository AGENTS.md
↓
Superpowers process workflow
↓
VFORGE-STANDARD-v1.md
↓
ANTISLOP-VFORGE.md
↓
Task-specific spec and plan
↓
Release checklist
```

A lower-level document must not silently override a higher-level explicit requirement.

If two rules conflict, the conflict must be resolved in the task specification before implementation rather than being improvised during coding.

## 5. Superpowers Workflow Contract

Every non-trivial V-Forge engineering change follows this lifecycle:

```text
Request
→ Brainstorming
→ Design Spec
→ Implementation Plan
→ TDD / Regression Test
→ Implementation
→ Anti-Slop Audit
→ Automated Verification
→ Real-Device Acceptance
→ Release Decision
```

### 5.1 Bug fixes

Bug fixes use **Systematic Debugging** before implementation. The root cause must be identified before patching symptoms.

A reproducible regression test is required when the failure can reasonably be captured automatically.

### 5.2 New functionality or design changes

New functionality or visual changes use **Brainstorming** first. Implementation begins only after an approved design and implementation plan exist.

### 5.3 Completion claims

A task must not be described as complete, fixed, stable, or passing until fresh verification evidence exists.

Static tests alone do not establish real-device stability.

## 6. Anti-Slop V-Forge Edition

The V-Forge adaptation uses Anti-Slop's five craftsmanship principles as its foundation:

- intentionality;
- functional completeness;
- content-driven composition;
- robustness;
- evidence over claims.

The following upstream rules are especially important for V-Forge:

- responsive mobile behavior;
- deliberate visual identity;
- keyboard/accessibility behavior;
- functional interactive elements;
- complete UI states;
- working light/dark themes;
- verification before delivery.

### 6.1 Brand overrides

Anti-Slop is a quality constraint, not permission to erase V-Forge's existing identity.

The following V-Forge decisions are explicitly intentional:

- the Video Editor is a **dark creative workspace** even when the surrounding app uses Light Mode;
- lime and purple are valid V-Forge brand accents;
- blur/glass treatment is allowed selectively where it establishes hierarchy or depth;
- premium showcase motion and automotive visual language may be expressive when tied to product identity;
- dark UI is justified for the editor because it is a creative tool, not because “dark looks technical.”

### 6.2 Gradient, glow, and glass rules

Gradient, glow, and glass are not banned absolutely. They are banned as generic defaults without a V-Forge-specific reason.

Every such treatment must have a documented role such as branding, focus, hierarchy, state, or media presentation.

### 6.3 Upstream R-33 adaptation: patching source via scripts

The V-Forge policy follows the spirit of Anti-Slop R-33: **a shipped feature must not depend on a patch script that rewrites CSS/HTML/JS with string replacement, and patch scripts must not remain as architectural dependencies in the repository.**

For development tooling, automated file-editing utilities may be used only when all of the following are true:

1. they are used as a temporary editing mechanism, not a runtime dependency;
2. the final repository contains clean source as if it had been edited directly;
3. no patch script is required to reproduce the feature at application runtime;
4. tests validate the final source rather than the patching mechanism;
5. no stacked hotfix architecture is introduced.

This V-Forge clarification is an explicit project override to a literal reading of upstream R-33.

## 7. V-Forge UI and Layout Contract

### 7.1 Editor theme isolation

The application shell may support Light and Dark themes.

The Video Editor remains a dark workspace in both modes. Global light-theme surface tokens must not recolor editor-internal components unless a task explicitly redesigns the editor theme.

The theme boundary includes, at minimum:

- Preview;
- Timeline;
- Tool Sheet;
- Audio;
- Text;
- Overlay;
- Effects;
- Adjust;
- Export/processor surfaces;
- premium-gated editor controls.

### 7.2 Editor layout ownership

The editor mobile layout has one authoritative contract:

```text
HEADER
PREVIEW
TIMELINE
TOOL SCROLLER
DOCK
```

There must not be two active CSS systems independently controlling these zones.

The Tool Sheet is the primary vertical scroller for editor tools. Preview, Timeline, and Dock must not disappear because another layer takes over scrolling.

### 7.3 Safe areas and viewport behavior

The editor must respect mobile viewport changes, browser chrome, orientation, and device safe areas.

Primary actions must remain reachable and must not be covered by navigation or system insets.

## 8. V-Forge Architecture Rules

### VF-A01 — Single ownership

One behavior has one authoritative controller. Multiple listeners or observers may exist only when they serve distinct responsibilities.

### VF-A02 — No stacked hotfix layers

Do not solve regressions by accumulating versioned inline patches over earlier patches. Fix the source owner or consolidate the architecture.

### VF-A03 — DOM readiness

A controller must not initialize before all required DOM targets exist.

If script placement cannot guarantee this, initialization must explicitly wait for a safe lifecycle event.

### VF-A04 — Preserve stable global contracts

Existing public functions and DOM hooks used by stable modules must not be renamed or removed merely for aesthetic version cleanup unless migration is part of the approved spec.

### VF-A05 — Dependency order is testable

The order of CSS and JavaScript dependencies must be represented by automated tests where incorrect ordering can break startup behavior.

### VF-A06 — Dead code removal requires proof

Before deleting legacy files, prove they are not referenced by active source or runtime dependencies and retain a recoverable baseline through version control.

### VF-A07 — Source owner over symptom patch

When a bug can be fixed in the component that owns the behavior, do not add a downstream workaround in an unrelated file.

## 9. Permanent Regression Registry

Every material regression that reaches a testable build receives a stable identifier and a permanent regression guard when practical.

Initial registry:

### REG-SHOWCASE-001 — Showcase bootstrap order

`v93-showcase.js` or its successor must not initialize before the Showcase DOM and CTA exist.

### REG-THEME-001 — Light-theme editor leakage

Light Mode must not recolor dark editor surfaces such as Audio, Text, Overlay, Premium, or Export controls.

### REG-LAYOUT-001 — Competing editor layout owners

Only one active mobile layout system may control Preview, Timeline, Tool Sheet, and Dock.

### REG-NAV-001 — Showcase navigation isolation

Bottom navigation must be hidden/inert while the Premium Showcase is open and restored on close.

### REG-PICKER-001 — Picker cancel recovery

Canceling Android file selection must not leave the app trapped on a broken editor route or an invisible Showcase state.

Regression IDs remain stable even if implementation filenames change.

## 10. Testing Architecture

Tests are organized by purpose rather than by release number alone.

### 10.1 `tests/static/`

Static tests validate source invariants such as:

- JavaScript syntax;
- HTML parseability;
- duplicate DOM IDs;
- duplicate module loading;
- expected dependency order;
- forbidden legacy references;
- version consistency;
- CSS structural integrity.

### 10.2 `tests/regression/`

Regression tests encode known failures. They are permanent unless the relevant feature is intentionally removed.

Each regression test should reference its `REG-*` identifier.

### 10.3 `tests/release/`

Release tests validate governance concerns such as:

- Protected Core integrity;
- required module presence;
- release version consistency;
- no known blocker markers;
- documentation/checklist presence where required.

### 10.4 Real-device tests

Some failures are fundamentally interaction- or browser-specific. These are tracked in `RELEASE-CHECKLIST.md` rather than falsely represented as complete automated coverage.

Real-device tests must record PASS/FAIL evidence for the relevant release candidate.

## 11. Protected Core

The following files are Protected Core by default:

```text
js/auth.js
js/firebase-config.js
firestore.rules.txt
js/processor.js
service-worker.js
```

A UI/layout task must not modify these files unless the approved task scope explicitly requires it.

### 11.1 Protected Core change protocol

If a future task legitimately requires a Protected Core change:

1. name the file in the design spec;
2. state why the change is necessary;
3. define security/runtime risks;
4. add targeted tests;
5. record baseline hashes or diffs before editing;
6. verify the file independently before release.

Protected status does not mean “never change”; it means “never change incidentally.”

## 12. Release Lifecycle

V-Forge uses explicit release states.

### 12.1 Development

Work is incomplete and may contain failing tests while TDD is in progress.

### 12.2 Candidate

A build may be called **Candidate** only when:

- implementation for the scoped task is complete;
- relevant automated tests pass;
- syntax/structural verification passes;
- known blocker regressions are not present in automated checks.

Candidate does **not** imply device stability.

### 12.3 Release Candidate (RC)

A Candidate may be promoted to **RC** only after the required real-device acceptance flow passes on the target mobile browser/device class and required desktop flow passes.

### 12.4 Stable

A release may be called **Stable** only when:

- all required Release Checklist items pass;
- no blocker regression remains open;
- real-device evidence is confirmed;
- no unresolved deployment failure is affecting the tested release;
- Protected Core changes, if any, were explicitly verified.

A successful GitHub Pages deployment alone is not evidence of stability.

## 13. Release Checklist Domains

The release checklist covers, at minimum:

### Structure and architecture

- HTML structure;
- JavaScript syntax;
- CSS integrity;
- duplicate IDs;
- duplicate controllers/listeners where detectable;
- dependency ordering;
- dead/legacy active assets;
- Protected Core integrity.

### Theme and UI

- Light Mode shell;
- Dark Mode shell;
- dark editor isolation in both modes;
- typography and contrast;
- focus visibility;
- disabled/loading/empty/error states where relevant.

### Responsive behavior

- Android portrait;
- Android landscape where supported;
- tablet-width layout;
- desktop layout;
- viewport resize/orientation recovery;
- safe-area behavior.

### Editor flow

- Preview visibility;
- Timeline visibility;
- tool switching;
- Tool Sheet scrolling;
- Audio preview toggle;
- Text/Overlay controls;
- Effects/Adjust;
- preview zoom/pan/reset;
- timeline zoom;
- export entry path.

### Showcase flow

- open/close;
- 3-slide state;
- swipe;
- arrows;
- dots;
- autoplay;
- bottom-navigation isolation;
- CTA;
- picker cancel;
- picker selection;
- return/re-entry;
- no duplicate click behavior.

## 14. Failure Handling and Bug Policy

### 14.1 Blocker regressions

A bug is a release blocker when it prevents a core flow, causes data/security risk, makes primary UI unreachable, breaks theme/layout contract, or reintroduces a registered critical regression.

### 14.2 Fix-before-feature rule

Known blocker bugs are fixed before unrelated feature expansion.

This prevents bug accumulation across versions.

### 14.3 Root-cause requirement

A bug fix must state:

- observed symptom;
- root cause;
- owning source/component;
- regression test or reason automation is impractical;
- verification evidence.

## 15. Definition of Done

A scoped V-Forge engineering task is Done only when all applicable conditions are true:

1. approved requirements are implemented;
2. relevant tests were written or updated;
3. fresh automated verification passes;
4. no duplicate active controller or DOM ID was introduced;
5. architecture ownership remains clear;
6. Light/Dark behavior is correct for affected surfaces;
7. responsive behavior is verified for affected breakpoints;
8. Protected Core remained unchanged unless explicitly scoped;
9. known regressions remain guarded;
10. user-facing behavior matches the approved design;
11. real-device acceptance is complete when required for the claimed release status;
12. the release is labeled Candidate, RC, or Stable truthfully.

## 16. Governance Rules

### 16.1 Document ownership

- `AGENTS.md`: entry-point policy.
- `VFORGE-STANDARD-v1.md`: engineering governance.
- `ANTISLOP-VFORGE.md`: UI/UX craftsmanship rules.
- `RELEASE-CHECKLIST.md`: operational release evidence.
- task specs/plans: task-specific requirements and implementation steps.

### 16.2 Changing the standard

Changes to this standard require their own design/plan when they materially alter process, Protected Core definitions, release gates, or brand policy.

Small wording corrections that do not change meaning may be made directly with review.

### 16.3 Versioning the standard

This document begins at **v1.0**.

A major standard version changes when governance meaning changes incompatibly. Minor revisions may add new regression IDs, clarify checks, or add non-breaking quality gates.

## 17. Acceptance Criteria for Implementing This Standard

The implementation of Development Standard v1.0 is accepted when:

- `AGENTS.md` exists and is concise;
- the three development-standard documents exist in the intended paths;
- the Superpowers `specs/` and `plans/` directories are established;
- test directories are established without requiring fake placeholder tests;
- existing V9.3.x regression tests are reorganized or referenced without losing coverage;
- REG-SHOWCASE-001 and REG-THEME-001 are explicitly represented;
- Protected Core is documented and remains unchanged during this governance-only implementation;
- no runtime module is added to `index.html` for governance purposes;
- application behavior remains 1:1 with the current V9.3.2 baseline;
- documentation contains no unresolved placeholders or contradictory rules.

## 18. Implementation Boundary

The implementation phase for this specification creates governance files, organizes tests/documentation, and adds non-runtime checks only.

It must **not** bundle unrelated V9.4 feature work.

Future V9.4 feature development begins only after this standard is implemented and accepted.
