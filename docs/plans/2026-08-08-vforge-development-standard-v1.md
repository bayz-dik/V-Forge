# V-Forge Development Standard v1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add V-Forge Development Standard v1.0 as a repository-level engineering contract with Superpowers workflow, Anti-Slop V-Forge Edition, permanent regression guards, Protected Core release checks, and explicit Candidate/RC/Stable gates without changing V9.3.2 runtime behavior.

**Architecture:** `AGENTS.md` is the compact entry point, while normative policy lives under `docs/development-standard/`. Tests are split by purpose into `tests/static/`, `tests/regression/`, and `tests/release/`. Existing production HTML/CSS/JS and Protected Core files remain byte-for-byte unchanged during this task; the new tests observe the current V9.3.2 runtime rather than modifying it.

**Tech Stack:** Markdown, Node.js built-in `node:test` + `node:assert`, Git, existing V-Forge HTML/CSS/JavaScript.

## Global Constraints

- Baseline application release is **V-Forge V9.3.2**.
- Baseline Git commit for Protected Core comparison is `b7dd1743fab052525cf71b8f297692171aa95725`.
- This task changes governance/documentation/testing only; it must not intentionally change production behavior.
- Do not modify `index.html`, `css/v93-editor.css`, `css/v93-showcase.css`, `js/v93-editor.js`, or `js/v93-showcase.js` in this task.
- Protected Core files are `js/auth.js`, `js/firebase-config.js`, `firestore.rules.txt`, `js/processor.js`, and `service-worker.js`.
- Protected Core files must remain unchanged relative to baseline commit `b7dd1743fab052525cf71b8f297692171aa95725`.
- The Video Editor remains a dark creative workspace even when the surrounding application uses Light Mode.
- Lime and purple remain intentional V-Forge brand accents.
- Selective blur/glass is allowed when it serves hierarchy, depth, branding, state, or media presentation.
- Do not introduce stacked inline hotfix architecture.
- Do not ship or require string-replacement patch scripts as runtime architecture.
- Known blocker regressions are fixed before unrelated feature expansion.
- Static verification alone never promotes a build to Stable; real-device acceptance is required for RC/Stable claims.
- Existing public DOM hooks and stable globals are not renamed merely for version aesthetics.
- Use Node built-in test tooling only; this governance task adds no package dependency.

---

## File Map

**Create:**
- `AGENTS.md` — short repository entry point and instruction precedence.
- `docs/development-standard/VFORGE-STANDARD-v1.md` — normative engineering and release governance.
- `docs/development-standard/ANTISLOP-VFORGE.md` — Anti-Slop adaptation and V-Forge brand overrides.
- `docs/development-standard/RELEASE-CHECKLIST.md` — operational Candidate/RC/Stable checklist.
- `docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md` — approved design specification.
- `docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md` — this implementation plan.
- `tests/static/development-standard-docs.test.mjs` — document presence, precedence, structure, and no-runtime-loading guards.
- `tests/regression/vforge-regressions.test.mjs` — permanent guards for `REG-SHOWCASE-001`, `REG-THEME-001`, `REG-LAYOUT-001`, `REG-NAV-001`, and `REG-PICKER-001`.
- `tests/release/protected-core.test.mjs` — Protected Core diff gate against the V9.3.2 baseline.
- `tests/release/release-governance.test.mjs` — release terminology and checklist completeness gate.

**Must remain unchanged:**
- `index.html`
- `css/v93-editor.css`
- `css/v93-showcase.css`
- `js/v93-editor.js`
- `js/v93-showcase.js`
- `js/auth.js`
- `js/firebase-config.js`
- `firestore.rules.txt`
- `js/processor.js`
- `service-worker.js`

---

### Task 1: Freeze V9.3.2 baseline and install the approved design spec

**Files:**
- Create: `docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md`
- Create: `docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md`
- Verify only: Protected Core files listed in Global Constraints

**Interfaces:**
- Consumes: Git baseline commit `b7dd1743fab052525cf71b8f297692171aa95725`.
- Produces: an auditable approved spec and plan in their canonical Superpowers paths; no runtime interface changes.

- [ ] **Step 1: Verify the working baseline before adding governance files**

Run:

```bash
git status --short
git rev-parse HEAD
git show -s --format='%H %s' b7dd1743fab052525cf71b8f297692171aa95725
```

Expected:
- working tree is clean before this task begins;
- baseline commit resolves and its message is `Fix light theme editor colors V9.3.2.` or the same V9.3.2 hotfix commit in history.

- [ ] **Step 2: Record a Protected Core pre-change diff gate**

Run:

```bash
git diff --exit-code b7dd1743fab052525cf71b8f297692171aa95725 -- \
  js/auth.js \
  js/firebase-config.js \
  firestore.rules.txt \
  js/processor.js \
  service-worker.js
```

Expected: exit code `0` and no diff output.

- [ ] **Step 3: Create the canonical Superpowers directories and place the approved spec/plan**

Run:

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
```

Copy the already-approved design spec exactly to:

```text
docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md
```

Save this implementation plan exactly to:

```text
docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md
```

Do not alter runtime source while doing this.

- [ ] **Step 4: Verify both Superpowers documents exist and contain the expected identity**

Run:

```bash
grep -F 'V-Forge Development Standard v1.0' docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md
grep -F 'V-Forge Development Standard v1.0 Implementation Plan' docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md
```

Expected: both commands print one matching heading.

- [ ] **Step 5: Commit the approved design and plan**

```bash
git add docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md \
        docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md
git commit -m "docs: add V-Forge development standard design and plan"
```

---

### Task 2: Add `AGENTS.md` and the normative V-Forge engineering standard

**Files:**
- Create: `AGENTS.md`
- Create: `docs/development-standard/VFORGE-STANDARD-v1.md`
- Create: `tests/static/development-standard-docs.test.mjs`

**Interfaces:**
- Consumes: approved design spec from Task 1.
- Produces: repository instruction entry point plus normative engineering policy; test file becomes the static governance test entry point.

- [ ] **Step 1: Write the failing static governance test**

Create `tests/static/development-standard-docs.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const requiredDocs = [
  'AGENTS.md',
  'docs/development-standard/VFORGE-STANDARD-v1.md',
  'docs/development-standard/ANTISLOP-VFORGE.md',
  'docs/development-standard/RELEASE-CHECKLIST.md',
  'docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md',
  'docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md'
];

test('development standard repository documents exist', () => {
  for (const path of requiredDocs) {
    assert.equal(existsSync(path), true, `missing ${path}`);
  }
});

test('AGENTS is a compact entry point with the required precedence and protected core', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /Superpowers/);
  assert.match(agents, /VFORGE-STANDARD-v1\.md/);
  assert.match(agents, /ANTISLOP-VFORGE\.md/);
  assert.match(agents, /RELEASE-CHECKLIST\.md/);
  assert.match(agents, /js\/auth\.js/);
  assert.match(agents, /js\/firebase-config\.js/);
  assert.match(agents, /firestore\.rules\.txt/);
  assert.match(agents, /js\/processor\.js/);
  assert.match(agents, /service-worker\.js/);
  assert.ok(agents.split(/\r?\n/).length <= 100, 'AGENTS.md must stay compact');
});

test('normative standard contains workflow, architecture, regression, protected core and release lifecycle', () => {
  const standard = read('docs/development-standard/VFORGE-STANDARD-v1.md');
  for (const phrase of [
    'Superpowers Workflow Contract',
    'Protected Core',
    'Permanent Regression Registry',
    'HEADER',
    'PREVIEW',
    'TIMELINE',
    'TOOL SCROLLER',
    'DOCK',
    'Candidate',
    'Release Candidate',
    'Stable',
    'Definition of Done',
    'REG-SHOWCASE-001',
    'REG-THEME-001',
    'REG-LAYOUT-001',
    'REG-NAV-001',
    'REG-PICKER-001'
  ]) {
    assert.equal(standard.includes(phrase), true, `standard missing ${phrase}`);
  }
});

test('governance files are documentation only and are not loaded by production index', () => {
  const index = read('index.html');
  for (const path of requiredDocs) {
    assert.equal(index.includes(path), false, `${path} must not be a runtime dependency`);
  }
});
```

- [ ] **Step 2: Run the static governance test and verify it fails for missing documents**

Run:

```bash
node --test tests/static/development-standard-docs.test.mjs
```

Expected: FAIL because `AGENTS.md` and the detailed development-standard documents do not all exist yet.

- [ ] **Step 3: Create compact `AGENTS.md`**

Create `AGENTS.md` with this exact policy:

```markdown
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
```

- [ ] **Step 4: Create normative `VFORGE-STANDARD-v1.md`**

Create `docs/development-standard/VFORGE-STANDARD-v1.md` by converting the approved design spec into normative project policy. It must use imperative language and contain these exact sections in this order:

```markdown
# V-Forge Development Standard v1.0

## 1. Purpose
## 2. Instruction and Policy Precedence
## 3. Superpowers Workflow Contract
## 4. Anti-Slop Integration
## 5. V-Forge UI and Layout Contract
## 6. V-Forge Architecture Rules
## 7. Permanent Regression Registry
## 8. Testing Architecture
## 9. Protected Core
## 10. Release Lifecycle
## 11. Failure Handling and Fix-Before-Feature
## 12. Definition of Done
## 13. Governance and Standard Versioning
```

The file must explicitly preserve all of these rules from the design spec:

```text
VF-A01 Single ownership
VF-A02 No stacked hotfix layers
VF-A03 DOM readiness
VF-A04 Preserve stable global contracts
VF-A05 Dependency order is testable
VF-A06 Dead code removal requires proof
VF-A07 Source owner over symptom patch

REG-SHOWCASE-001 Showcase bootstrap order
REG-THEME-001 Light-theme editor leakage
REG-LAYOUT-001 Competing editor layout owners
REG-NAV-001 Showcase navigation isolation
REG-PICKER-001 Picker cancel recovery
```

It must also explicitly define the editor mobile contract as:

```text
HEADER
PREVIEW
TIMELINE
TOOL SCROLLER
DOCK
```

And it must define release state truthfully:

```text
Development -> Candidate -> Release Candidate -> Stable
```

- [ ] **Step 5: Re-run the targeted test to verify Task 2 content now passes except for documents intentionally created in later tasks**

Run:

```bash
node --test --test-name-pattern='AGENTS|normative standard|runtime dependency' tests/static/development-standard-docs.test.mjs
```

Expected: PASS for the three selected tests.

- [ ] **Step 6: Commit the entry point, normative standard, and static test**

```bash
git add AGENTS.md \
        docs/development-standard/VFORGE-STANDARD-v1.md \
        tests/static/development-standard-docs.test.mjs
git commit -m "docs: establish V-Forge engineering governance"
```

---

### Task 3: Add Anti-Slop V-Forge Edition

**Files:**
- Create: `docs/development-standard/ANTISLOP-VFORGE.md`
- Modify: `tests/static/development-standard-docs.test.mjs`

**Interfaces:**
- Consumes: V-Forge brand and architecture contracts in `VFORGE-STANDARD-v1.md`.
- Produces: UI/UX craftsmanship policy that cannot erase deliberate V-Forge identity.

- [ ] **Step 1: Add a failing Anti-Slop adaptation test**

Append to `tests/static/development-standard-docs.test.mjs`:

```js
test('Anti-Slop adaptation preserves craftsmanship and explicit V-Forge overrides', () => {
  const antiSlop = read('docs/development-standard/ANTISLOP-VFORGE.md');

  for (const phrase of [
    'Intentionality',
    'Functional completeness',
    'Content-driven composition',
    'Robustness',
    'Evidence over claims',
    'dark creative workspace',
    'lime',
    'purple',
    'blur/glass',
    'R-33',
    'runtime dependency',
    'Light Mode',
    'Dark Mode'
  ]) {
    assert.equal(antiSlop.includes(phrase), true, `Anti-Slop adaptation missing ${phrase}`);
  }

  assert.match(antiSlop, /not banned absolutely/i);
  assert.match(antiSlop, /final repository contains clean source/i);
});
```

- [ ] **Step 2: Run the Anti-Slop test and verify it fails**

Run:

```bash
node --test --test-name-pattern='Anti-Slop adaptation' tests/static/development-standard-docs.test.mjs
```

Expected: FAIL because `docs/development-standard/ANTISLOP-VFORGE.md` does not exist yet.

- [ ] **Step 3: Create `ANTISLOP-VFORGE.md`**

Create `docs/development-standard/ANTISLOP-VFORGE.md` with these exact sections and rules:

```markdown
# Anti-Slop — V-Forge Edition

## Purpose
Use Anti-Slop as a craftsmanship and evidence gate for V-Forge UI/UX work. It supplements Superpowers and `VFORGE-STANDARD-v1.md`; it does not replace either.

## Five craftsmanship principles
- **Intentionality:** every visual treatment must have a product reason.
- **Functional completeness:** visible interactive controls must work or be explicitly labeled unavailable/coming soon.
- **Content-driven composition:** layout follows editing tasks and media hierarchy instead of generic dashboard patterns.
- **Robustness:** responsive states, themes, loading/error states, and real-device behavior are part of the design.
- **Evidence over claims:** verify before saying an implementation is complete, fixed, RC, or Stable.

## V-Forge brand overrides
- The Video Editor is a **dark creative workspace** in both app themes unless an approved redesign changes that contract.
- **lime** and **purple** are intentional V-Forge brand accents.
- **blur/glass** is allowed selectively for hierarchy, depth, branding, state, or media presentation.
- Gradient, glow, and glass are **not banned absolutely**; they are rejected when used as generic defaults without a V-Forge-specific role.
- Premium Showcase motion and automotive visual language may be expressive when they support product identity.

## Light Mode and Dark Mode
- App-shell Light Mode and Dark Mode must both remain usable.
- Light Mode must not recolor editor-internal dark surfaces.
- UI changes affecting shared tokens must be tested against both app themes and the editor theme boundary.

## R-33 adaptation — patching source via scripts
V-Forge follows the spirit of Anti-Slop **R-33**. A shipped feature must not depend on a patch script that rewrites HTML/CSS/JS with string replacement, and patch scripts must not remain a runtime dependency.

Temporary automated editing utilities are allowed only when:
1. they are development tooling rather than a runtime dependency;
2. the final repository contains clean source as if edited directly;
3. application startup does not require the editing utility;
4. tests validate final source rather than the patch mechanism;
5. no stacked hotfix architecture is introduced.

## V-Forge delivery gate
For affected UI, verify responsive behavior, accessibility/focus, functional controls, Light Mode, Dark Mode, editor theme isolation, loading/disabled/error states where relevant, and real-device behavior before release promotion.
```

- [ ] **Step 4: Run the Anti-Slop test and verify it passes**

Run:

```bash
node --test --test-name-pattern='Anti-Slop adaptation' tests/static/development-standard-docs.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the Anti-Slop adaptation**

```bash
git add docs/development-standard/ANTISLOP-VFORGE.md tests/static/development-standard-docs.test.mjs
git commit -m "docs: add Anti-Slop V-Forge edition"
```

---

### Task 4: Add the operational Candidate/RC/Stable release checklist

**Files:**
- Create: `docs/development-standard/RELEASE-CHECKLIST.md`
- Modify: `tests/static/development-standard-docs.test.mjs`
- Create: `tests/release/release-governance.test.mjs`

**Interfaces:**
- Consumes: release states and Definition of Done from `VFORGE-STANDARD-v1.md`.
- Produces: a checkable evidence template and automated governance gate.

- [ ] **Step 1: Add the failing release checklist test**

Create `tests/release/release-governance.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const checklist = readFileSync('docs/development-standard/RELEASE-CHECKLIST.md', 'utf8');
const standard = readFileSync('docs/development-standard/VFORGE-STANDARD-v1.md', 'utf8');

test('release lifecycle names are defined consistently', () => {
  for (const state of ['Development', 'Candidate', 'Release Candidate', 'Stable']) {
    assert.equal(standard.includes(state), true, `standard missing ${state}`);
    assert.equal(checklist.includes(state), true, `checklist missing ${state}`);
  }
});

test('release checklist covers architecture, themes, responsive, editor and showcase gates', () => {
  for (const phrase of [
    'HTML structure',
    'JavaScript syntax',
    'CSS integrity',
    'duplicate IDs',
    'Protected Core',
    'Light Mode',
    'Dark Mode',
    'Android portrait',
    'Android landscape',
    'desktop',
    'Preview',
    'Timeline',
    'Tool Sheet',
    'Audio',
    'Text',
    'Overlay',
    'Effects',
    'Adjust',
    'zoom',
    'Premium Showcase',
    'picker cancel',
    'picker selection',
    'real-device evidence'
  ]) {
    assert.equal(checklist.includes(phrase), true, `checklist missing ${phrase}`);
  }
});

test('Stable requires real-device evidence and no blockers', () => {
  assert.match(checklist, /Stable[\s\S]*real-device evidence/i);
  assert.match(checklist, /Stable[\s\S]*blocker/i);
  assert.match(checklist, /deployment[^\n]*not[^\n]*stability/i);
});
```

- [ ] **Step 2: Run the release governance test and verify it fails**

Run:

```bash
node --test tests/release/release-governance.test.mjs
```

Expected: FAIL because `RELEASE-CHECKLIST.md` does not exist yet.

- [ ] **Step 3: Create `RELEASE-CHECKLIST.md` as an evidence template**

Create `docs/development-standard/RELEASE-CHECKLIST.md` with this structure:

```markdown
# V-Forge Release Checklist

**Release:** ____________________
**Commit:** ____________________
**Tester/device:** ____________________
**Browser:** ____________________
**Date:** ____________________
**Target state:** Candidate / Release Candidate / Stable

## Candidate gate — automated and structural
- [ ] HTML structure parses successfully.
- [ ] JavaScript syntax passes for active V-Forge modules.
- [ ] CSS integrity checks pass.
- [ ] No duplicate IDs are present.
- [ ] Dependency order checks pass.
- [ ] No forbidden legacy runtime asset is active.
- [ ] Protected Core is unchanged unless explicitly scoped and independently verified.
- [ ] All static and regression tests pass.
- [ ] No known blocker regression remains open.

## Theme and UI gate
- [ ] Light Mode app shell is usable.
- [ ] Dark Mode app shell is usable.
- [ ] Video Editor remains a dark creative workspace in both app themes.
- [ ] Contrast and focus visibility are acceptable for affected controls.
- [ ] Loading, disabled, empty, and error states relevant to the change are usable.

## Responsive gate
- [ ] Android portrait passes.
- [ ] Android landscape passes where the feature supports landscape.
- [ ] Tablet-width layout has no blocker overlap or unreachable primary action.
- [ ] desktop layout has no blocker overlap or unreachable primary action.
- [ ] Viewport resize/orientation recovery passes.
- [ ] Safe-area/system inset behavior keeps primary actions reachable.

## Editor gate
- [ ] Preview remains visible and usable.
- [ ] Timeline remains visible and usable.
- [ ] Tool Sheet is the intended vertical tool scroller.
- [ ] Audio tool and preview toggle work.
- [ ] Text controls remain reachable and correctly themed.
- [ ] Overlay controls remain reachable and correctly themed.
- [ ] Effects controls work for the supported preview behavior.
- [ ] Adjust controls remain reachable and correctly themed.
- [ ] Preview zoom/pan/reset works for the supported range.
- [ ] Timeline zoom works.
- [ ] Export entry path remains reachable.

## Premium Showcase gate
- [ ] Premium Showcase opens and closes correctly.
- [ ] Three-slide state is preserved.
- [ ] Swipe works.
- [ ] Arrows work.
- [ ] Dots work.
- [ ] Autoplay works while visible.
- [ ] Bottom navigation is hidden/inert while Showcase is open and restored after close.
- [ ] CTA opens the intended video-picker/editor transition.
- [ ] picker cancel recovers to a valid state.
- [ ] picker selection reaches the editor.
- [ ] Return and re-entry work without duplicate click behavior.

## Release Candidate gate — real-device evidence
- [ ] Candidate gate is fully PASS.
- [ ] Required Android real-device flow is PASS.
- [ ] Required desktop flow is PASS.
- [ ] Screenshots/video/log evidence is recorded for blocker-prone flows.

## Stable gate
- [ ] Release Candidate gate is fully PASS.
- [ ] Confirmed real-device evidence exists for the release being promoted.
- [ ] No blocker regression remains unresolved.
- [ ] Deployment is healthy; successful deployment alone is not proof of stability.
- [ ] Protected Core changes, if any, were explicitly scoped and independently verified.

## Evidence
Record concise PASS/FAIL evidence, device/browser, reproduction notes for failures, and links or filenames for screenshots/video/logs used during acceptance.
```

- [ ] **Step 4: Run the release governance test and verify it passes**

Run:

```bash
node --test tests/release/release-governance.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run all document tests**

Run:

```bash
node --test tests/static/development-standard-docs.test.mjs tests/release/release-governance.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the release checklist and governance tests**

```bash
git add docs/development-standard/RELEASE-CHECKLIST.md \
        tests/static/development-standard-docs.test.mjs \
        tests/release/release-governance.test.mjs
git commit -m "test: codify V-Forge release gates"
```

---

### Task 5: Add permanent regression guards for the V9.3.x failures

**Files:**
- Create: `tests/regression/vforge-regressions.test.mjs`
- Read only: `index.html`
- Read only: `css/v93-editor.css`
- Read only: `js/v93-showcase.js`

**Interfaces:**
- Consumes: current stable V9.3.2 source and permanent `REG-*` identifiers from the standard.
- Produces: automated guards for known V9.3.x failures without changing runtime source.

- [ ] **Step 1: Create the regression test file**

Create `tests/regression/vforge-regressions.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync('index.html', 'utf8');
const editorCss = readFileSync('css/v93-editor.css', 'utf8');
const showcaseJs = readFileSync('js/v93-showcase.js', 'utf8');

function indexOfOrFail(source, needle, label) {
  const offset = source.indexOf(needle);
  assert.notEqual(offset, -1, `missing ${label}: ${needle}`);
  return offset;
}

test('REG-SHOWCASE-001: Showcase controller loads after required Showcase DOM', () => {
  const workshop = indexOfOrFail(index, 'id="vf926-workshop"', 'Showcase root');
  const cta = indexOfOrFail(index, 'id="vf926-select-video"', 'Showcase CTA');
  const controller = indexOfOrFail(index, 'js/v93-showcase.js?v=9.3.1', 'Showcase controller');
  assert.ok(controller > workshop, 'Showcase controller must load after Showcase root');
  assert.ok(controller > cta, 'Showcase controller must load after Showcase CTA');
});

test('REG-THEME-001: light app theme cannot recolor the dark editor tool surfaces', () => {
  for (const selector of [
    'html[data-theme="light"] #page-video-workspace .workspace-audio-toggle',
    'html[data-theme="light"] #page-video-workspace .workspace-audio-quality',
    'html[data-theme="light"] #page-video-workspace .v82-coming-card',
    'html[data-theme="light"] #page-video-workspace .v82-placeholder-grid button',
    'html[data-theme="light"] #page-video-workspace .workspace-premium-access',
    'html[data-theme="light"] #page-video-workspace .workspace-select-grid label',
    'html[data-theme="light"] #page-video-workspace .workspace-scope-note',
    'html[data-theme="light"] #page-video-workspace .processor-card'
  ]) {
    assert.equal(editorCss.includes(selector), true, `missing editor theme shield: ${selector}`);
  }
  assert.match(editorCss, /--vf932-tool-surface:\s*#17171d/);
  assert.match(editorCss, /--vf932-tool-input:\s*#1a1a20/);
});

test('REG-LAYOUT-001: only V9.3 editor layout contract is active', () => {
  assert.equal(index.includes('css/v913-layout.css'), false);
  assert.equal(index.includes('js/v913-layout.js'), false);
  assert.equal(index.includes('js/v915-startup-guard.js'), false);
  assert.equal(index.includes('css/v93-editor.css?v=9.3.2'), true);
  assert.match(editorCss, /--vf93-page-h/);
  assert.match(editorCss, /--vf93-header-h/);
  assert.match(editorCss, /--vf93-dock-h/);
  assert.equal(editorCss.includes('clamp(500px, 66dvh, 680px)'), false);
});

test('REG-NAV-001: Showcase owns bottom-navigation isolation', () => {
  assert.match(showcaseJs, /classList\.toggle\('vf926-workshop-open', state\.open\)/);
  assert.match(showcaseJs, /navigation\.setAttribute\('aria-hidden', String\(state\.open\)\)/);
  assert.match(showcaseJs, /navigation\.setAttribute\('inert', ''\)/);
  assert.match(showcaseJs, /navigation\.removeAttribute\('inert'\)/);
});

test('REG-PICKER-001: Android picker cancellation has an explicit recovery path', () => {
  assert.match(showcaseJs, /function recoverPickerCancel\(\)/);
  assert.match(showcaseJs, /state\.pickerPending/);
  assert.match(showcaseJs, /!state\.fileSelected/);
  assert.match(showcaseJs, /window\.setTimeout\(recoverPickerCancel, 420\)/);
  assert.match(showcaseJs, /window\.goToPage\(state\.sourcePage, navIndex\(state\.sourcePage\)\)/);
});
```

- [ ] **Step 2: Run the new regression suite against V9.3.2**

Run:

```bash
node --test tests/regression/vforge-regressions.test.mjs
```

Expected: all five `REG-*` tests PASS on the current V9.3.2 runtime. If one fails, do not modify runtime in this governance task; first determine whether the test expectation differs from the actual approved V9.3.2 source and correct the test only when the existing runtime behavior is demonstrably the accepted behavior.

- [ ] **Step 3: Verify regression IDs are documented and implemented one-to-one**

Run:

```bash
for id in REG-SHOWCASE-001 REG-THEME-001 REG-LAYOUT-001 REG-NAV-001 REG-PICKER-001; do
  grep -F "$id" docs/development-standard/VFORGE-STANDARD-v1.md
  grep -F "$id" tests/regression/vforge-regressions.test.mjs
done
```

Expected: each identifier appears in both the normative standard and regression test file.

- [ ] **Step 4: Commit the permanent regression guards**

```bash
git add tests/regression/vforge-regressions.test.mjs
git commit -m "test: preserve V9.3 regression fixes"
```

---

### Task 6: Add Protected Core and release integrity gates

**Files:**
- Create: `tests/release/protected-core.test.mjs`
- Modify: `tests/release/release-governance.test.mjs`
- Read only: Protected Core files
- Read only: production runtime files listed in Global Constraints

**Interfaces:**
- Consumes: baseline commit `b7dd1743fab052525cf71b8f297692171aa95725` and current Git repository.
- Produces: a machine-enforced release failure when governance-only work touches Protected Core or production runtime files.

- [ ] **Step 1: Write the Protected Core test**

Create `tests/release/protected-core.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const baseline = 'b7dd1743fab052525cf71b8f297692171aa95725';
const protectedCore = [
  'js/auth.js',
  'js/firebase-config.js',
  'firestore.rules.txt',
  'js/processor.js',
  'service-worker.js'
];
const runtimeFilesFrozenForThisTask = [
  'index.html',
  'css/v93-editor.css',
  'css/v93-showcase.css',
  'js/v93-editor.js',
  'js/v93-showcase.js'
];

function changedFiles(paths) {
  const output = execFileSync(
    'git',
    ['diff', '--name-only', baseline, '--', ...paths],
    { encoding: 'utf8' }
  );
  return output.trim().split(/\r?\n/).filter(Boolean);
}

test('Protected Core is unchanged from the V9.3.2 baseline', () => {
  assert.deepEqual(changedFiles(protectedCore), []);
});

test('governance standard implementation does not alter production V9.3.2 runtime files', () => {
  assert.deepEqual(changedFiles(runtimeFilesFrozenForThisTask), []);
});
```

- [ ] **Step 2: Run the Protected Core release test**

Run:

```bash
node --test tests/release/protected-core.test.mjs
```

Expected: both tests PASS.

- [ ] **Step 3: Add the release-suite presence gate**

Append to `tests/release/release-governance.test.mjs`:

```js
import { existsSync } from 'node:fs';

test('required release-standard tests are present', () => {
  for (const path of [
    'tests/static/development-standard-docs.test.mjs',
    'tests/regression/vforge-regressions.test.mjs',
    'tests/release/protected-core.test.mjs',
    'tests/release/release-governance.test.mjs'
  ]) {
    assert.equal(existsSync(path), true, `missing ${path}`);
  }
});
```

Ensure the existing first import from `node:fs` is consolidated so the file has a single valid `node:fs` import, for example:

```js
import { existsSync, readFileSync } from 'node:fs';
```

- [ ] **Step 4: Run all release tests**

Run:

```bash
node --test tests/release/protected-core.test.mjs tests/release/release-governance.test.mjs
```

Expected: all release tests PASS.

- [ ] **Step 5: Commit the integrity gates**

```bash
git add tests/release/protected-core.test.mjs tests/release/release-governance.test.mjs
git commit -m "test: protect V-Forge core and runtime baseline"
```

---

### Task 7: Run the full governance gate and prepare the implementation package

**Files:**
- Verify: all files created in Tasks 1–6
- Verify unchanged: all production and Protected Core files in Global Constraints

**Interfaces:**
- Consumes: all governance documents and tests from previous tasks.
- Produces: a verified Candidate-quality repository-governance change set ready for manual GitHub upload or PR; does not promote the V-Forge application itself to a new runtime release.

- [ ] **Step 1: Run every governance test in one fresh command**

Run:

```bash
node --test \
  tests/static/development-standard-docs.test.mjs \
  tests/regression/vforge-regressions.test.mjs \
  tests/release/protected-core.test.mjs \
  tests/release/release-governance.test.mjs
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run syntax checks for the new test modules**

Run:

```bash
node --check tests/static/development-standard-docs.test.mjs
node --check tests/regression/vforge-regressions.test.mjs
node --check tests/release/protected-core.test.mjs
node --check tests/release/release-governance.test.mjs
```

Expected: all commands exit `0` with no syntax errors.

- [ ] **Step 3: Re-run Protected Core and frozen-runtime diff gates directly**

Run:

```bash
git diff --exit-code b7dd1743fab052525cf71b8f297692171aa95725 -- \
  js/auth.js \
  js/firebase-config.js \
  firestore.rules.txt \
  js/processor.js \
  service-worker.js \
  index.html \
  css/v93-editor.css \
  css/v93-showcase.css \
  js/v93-editor.js \
  js/v93-showcase.js
```

Expected: exit code `0` and no diff output.

- [ ] **Step 4: Verify the final change set contains governance files only**

Run:

```bash
git diff --name-only b7dd1743fab052525cf71b8f297692171aa95725..HEAD | sort
```

Expected changed paths are limited to:

```text
AGENTS.md
docs/development-standard/ANTISLOP-VFORGE.md
docs/development-standard/RELEASE-CHECKLIST.md
docs/development-standard/VFORGE-STANDARD-v1.md
docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md
docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md
tests/regression/vforge-regressions.test.mjs
tests/release/protected-core.test.mjs
tests/release/release-governance.test.mjs
tests/static/development-standard-docs.test.mjs
```

If any production file appears, stop and remove the unintended runtime change before continuing.

- [ ] **Step 5: Verify repository state is clean after all intended commits**

Run:

```bash
git status --short
git log --oneline --decorate -8
```

Expected: clean working tree and the governance commits from Tasks 1–6 visible above the V9.3.2 baseline.

- [ ] **Step 6: Prepare an upload-only package when direct GitHub write remains unavailable**

Package exactly these paths while preserving directories:

```text
AGENTS.md
docs/development-standard/ANTISLOP-VFORGE.md
docs/development-standard/RELEASE-CHECKLIST.md
docs/development-standard/VFORGE-STANDARD-v1.md
docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md
docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md
tests/regression/vforge-regressions.test.mjs
tests/release/protected-core.test.mjs
tests/release/release-governance.test.mjs
tests/static/development-standard-docs.test.mjs
```

Do not include replacement copies of `index.html`, production CSS/JS, Firebase/Auth, Firestore rules, processor, or service worker because this governance task does not change them.

- [ ] **Step 7: Final commit only if packaging metadata is intentionally tracked**

If no package metadata belongs in the repository, do not create an empty commit. The implementation is ready once Tasks 1–6 commits are clean and Task 7 verification passes.

---

## Implementation Exit Criteria

Implementation is successful only when all of the following are true:

1. `AGENTS.md` exists and stays compact.
2. The three development-standard documents exist and are internally consistent.
3. The approved spec and this plan exist in canonical Superpowers paths.
4. Static, regression, and release test directories each contain an active test suite.
5. All five initial `REG-*` identifiers have permanent automated guards.
6. Protected Core and V9.3.2 runtime files are unchanged relative to `b7dd1743fab052525cf71b8f297692171aa95725`.
7. The full Node test command passes freshly.
8. No dependency is added.
9. No governance document is loaded by `index.html`.
10. The repository change set contains governance/docs/tests only.
11. This governance task is described as completed documentation/testing infrastructure, not as a new V-Forge Stable runtime release.
