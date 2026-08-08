# V-Forge V9.4 A1 — Core Editor Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build V-Forge V9.4 A1 as a stable, non-destructive, single-source timeline editor with split-derived clips, trim, delete, fixed-center scrubbing/playback, pinch and button zoom, undo/redo, and safe empty states without changing Protected Core.

**Architecture:** V9.4 introduces one authoritative Timeline State Engine and moves active timeline ownership away from the legacy V9.1 timeline runtime. Pure state/history modules own deterministic editing transitions; a browser controller bridges those transitions to the existing V-Forge preview; a focused view module renders the timeline; and a gesture module arbitrates trim > pinch > scrub. Existing V9.1 preview/fullscreen compatibility remains available, but V9.1/V9.3 may not remain second timeline state or zoom owners when V9.4 is active.

**Tech Stack:** Browser HTML/CSS/JavaScript, plain IIFE/UMD modules, Node.js built-in `node:test` + `node:assert`, Git, existing V-Forge V9.3.2 editor shell.

## Global Constraints

- Baseline product release is **V-Forge V9.3.2 + Development Standard v1.0**.
- Approved design spec: `docs/superpowers/specs/2026-08-08-v94-core-editor-foundation-design.md`.
- One source video per editor session.
- Split may create multiple derived clips from that same source.
- Clip order remains original; no reorder.
- Timeline is always gapless.
- Minimum valid clip duration is exactly **0.1 seconds**.
- Selected clip uses large mobile trim handles.
- Scrub updates preview in real time.
- Split occurs at the playhead, keeps the playhead at the split point, and auto-selects the right clip.
- Trim preview follows the active trim boundary in real time.
- Undo/Redo covers Split, Trim, and Delete; ordinary selection/playhead/zoom changes do not create history entries.
- Timeline zoom supports pinch plus `- / +` buttons and changes scale only.
- Playhead is fixed at timeline center; timeline content moves beneath it.
- Playback auto-scrolls beneath the fixed-center playhead.
- Touching/scrubbing timeline while playing pauses playback first.
- Gesture priority is **Trim handle drag → Pinch zoom → Timeline scrub**.
- Mobile portrait is the primary runtime target; landscape/tablet/desktop must remain usable without blocker overlap.
- The Video Editor remains a dark creative workspace in Light and Dark app themes.
- No stacked runtime hotfix layer and no second active timeline controller.
- Existing V9.3 Showcase/theme/layout/navigation/picker regression guards remain active.
- Protected Core must remain unchanged:
  - `js/auth.js`
  - `js/firebase-config.js`
  - `firestore.rules.txt`
  - `js/processor.js`
  - `service-worker.js`
- Protected Core comparison baseline remains `b7dd1743fab052525cf71b8f297692171aa95725` unless an explicit scope amendment is approved.
- No new package dependency is allowed for V9.4 A1 tests.
- Explicitly out of scope: multiple source videos, reorder, multi-track, editable audio tracks, overlay tracks, transitions, keyframes, speed ramps, text animation, export-pipeline redesign, Kotlin migration.

## Locked File Map

**Create:**
- `js/v94-timeline-state.js` — pure authoritative timeline state engine, invariants, mapping, structural transitions.
- `js/v94-timeline-history.js` — pure structural snapshot history for Undo/Redo.
- `js/v94-timeline-view.js` — V9.4 timeline DOM, structural render, fixed-center geometry, empty/invalid presentation.
- `js/v94-timeline-controller.js` — browser orchestration, preview/media bridge, commands, playback, workspace sync.
- `js/v94-timeline-gestures.js` — pointer arbitration, trim drag, pinch zoom, horizontal scrub.
- `css/v94-timeline.css` — V9.4 timeline-only styling and responsive interaction states.
- `tests/regression/v94-timeline-state.test.mjs` — pure state regression coverage.
- `tests/regression/v94-timeline-history.test.mjs` — history regression coverage.
- `tests/regression/v94-timeline-controller.test.mjs` — controller/media bridge regression coverage.
- `tests/regression/v94-timeline-gestures.test.mjs` — gesture priority and scale/scrub regression coverage.
- `tests/static/v94-timeline-architecture.test.mjs` — script/style order, one-owner, DOM dependency and legacy compatibility guards.
- `tests/release/v94-release-gates.test.mjs` — V9.4 release checklist/Protected Core/version gates.

**Modify:**
- `index.html` — add V9.4 stylesheet/scripts in dependency-safe order and one preview-empty target.
- `js/v91-editor.js` — enter V9.4 compatibility mode: preserve preview Fit/Fill/fullscreen/navigation/preview controls while yielding timeline state, structural commands, timeline media time ownership and timeline DOM to V9.4.
- `js/v93-editor.js` — stop legacy timeline zoom enhancement from retrying/intercepting when V9.4 timeline is active; preserve preview zoom/layout responsibilities.
- `docs/development-standard/VFORGE-STANDARD-v1.md` — register `REG-TIMELINE-001` through `REG-TIMELINE-010` as non-breaking registry additions.
- `docs/development-standard/RELEASE-CHECKLIST.md` — add V9.4 A1 core timeline real-device acceptance items.
- `tests/release/protected-core.test.mjs` — retain Protected Core baseline gate but remove the obsolete governance-only assertion that V9.3 runtime files can never change.
- `tests/release/release-governance.test.mjs` — require V9.4 timeline acceptance terms without changing Candidate/RC/Stable semantics.

**Must not modify:**
- `js/auth.js`
- `js/firebase-config.js`
- `firestore.rules.txt`
- `js/processor.js`
- `service-worker.js`

---

### Task 1: Build the pure V9.4 Timeline State Engine

**Files:**
- Create: `js/v94-timeline-state.js`
- Create: `tests/regression/v94-timeline-state.test.mjs`

**Interfaces:**
- Consumes: no browser DOM; only numbers, clip objects, and an optional ID factory.
- Produces global/CommonJS API `VForgeTimelineState94` with exact exports:
  - `VERSION`
  - `MIN_CLIP_SECONDS`
  - `MIN_PX_PER_SECOND`
  - `MAX_PX_PER_SECOND`
  - `DEFAULT_PX_PER_SECOND`
  - `createEmptyState()`
  - `createInitialState(duration, idFactory?)`
  - `cloneState(state)`
  - `structuralSnapshot(state)`
  - `restoreStructuralSnapshot(state, snapshot)`
  - `clipDuration(clip)`
  - `projectDuration(state)`
  - `recomputeTimeline(clips)`
  - `sequenceToSource(state, sequenceTime)`
  - `sourceToSequence(state, sourceTime, preferredClipId?)`
  - `selectClip(state, clipId)`
  - `setPlayhead(state, sequenceTime)`
  - `setZoom(state, pxPerSecond)`
  - `splitAtPlayhead(state, idFactory?)`
  - `beginTrim(state, clipId, edge)`
  - `updateTrim(state, sourceTime)`
  - `commitTrim(state)`
  - `cancelTrim(state)`
  - `deleteSelectedClip(state)`
- Every mutating transition returns `{ ok, state, reason }` and never mutates its input object.

- [ ] **Step 1: Write failing state tests for initial state, mapping, and constants**

Create `tests/regression/v94-timeline-state.test.mjs` beginning with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Engine = require('../../js/v94-timeline-state.js');

const ids = (...values) => {
  let index = 0;
  return () => values[index++] || `clip-${index}`;
};

test('V9.4 constants lock the approved clip and zoom limits', () => {
  assert.equal(Engine.VERSION, '9.4.0');
  assert.equal(Engine.MIN_CLIP_SECONDS, 0.1);
  assert.equal(Engine.MIN_PX_PER_SECOND, 22);
  assert.equal(Engine.MAX_PX_PER_SECOND, 110);
  assert.equal(Engine.DEFAULT_PX_PER_SECOND, 44);
});

test('initial source becomes one ready, gapless clip', () => {
  const state = Engine.createInitialState(10, ids('clip-a'));
  assert.equal(state.status, 'ready');
  assert.equal(state.sourceDuration, 10);
  assert.equal(state.selectedClipId, 'clip-a');
  assert.equal(state.playheadTime, 0);
  assert.equal(state.zoom, 44);
  assert.deepEqual(state.clips, [{
    id: 'clip-a',
    sourceStart: 0,
    sourceEnd: 10,
    timelineStart: 0,
    timelineEnd: 10
  }]);
});

test('sequence/source mapping is deterministic across trimmed source gaps', () => {
  const state = {
    ...Engine.createInitialState(12, ids('a')),
    clips: Engine.recomputeTimeline([
      { id: 'a', sourceStart: 0, sourceEnd: 4 },
      { id: 'b', sourceStart: 6, sourceEnd: 10 }
    ])
  };
  assert.deepEqual(Engine.sequenceToSource(state, 5), {
    clipId: 'b', clipIndex: 1, sequenceTime: 5, sourceTime: 7
  });
  assert.equal(Engine.sourceToSequence(state, 7, 'b'), 5);
});
```

- [ ] **Step 2: Run the state test and verify RED**

Run:

```bash
node --test tests/regression/v94-timeline-state.test.mjs
```

Expected: FAIL because `js/v94-timeline-state.js` does not exist.

- [ ] **Step 3: Create the UMD state-engine shell and exact state shape**

Create `js/v94-timeline-state.js` with this module wrapper and constants:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VForgeTimelineState94 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '9.4.0';
  const MIN_CLIP_SECONDS = 0.1;
  const MIN_PX_PER_SECOND = 22;
  const MAX_PX_PER_SECOND = 110;
  const DEFAULT_PX_PER_SECOND = 44;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const defaultIdFactory = () => `vf94-clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  function createEmptyState() {
    return {
      version: VERSION,
      status: 'empty',
      sourceDuration: 0,
      clips: [],
      selectedClipId: '',
      playheadTime: 0,
      zoom: DEFAULT_PX_PER_SECOND,
      isPlaying: false,
      trimSession: null
    };
  }

  function clipDuration(clip) {
    return Math.max(0, finite(clip?.sourceEnd) - finite(clip?.sourceStart));
  }

  function recomputeTimeline(clips) {
    let cursor = 0;
    return (clips || []).map((clip) => {
      const sourceStart = Math.max(0, finite(clip.sourceStart));
      const sourceEnd = Math.max(sourceStart, finite(clip.sourceEnd));
      const length = sourceEnd - sourceStart;
      const next = {
        id: String(clip.id || ''),
        sourceStart,
        sourceEnd,
        timelineStart: cursor,
        timelineEnd: cursor + length
      };
      cursor += length;
      return next;
    });
  }

  function createInitialState(duration, idFactory = defaultIdFactory) {
    const safeDuration = finite(duration, 0);
    if (!(safeDuration > 0)) return { ...createEmptyState(), status: 'invalid' };
    const clip = {
      id: idFactory(),
      sourceStart: 0,
      sourceEnd: safeDuration
    };
    return {
      ...createEmptyState(),
      status: 'ready',
      sourceDuration: safeDuration,
      clips: recomputeTimeline([clip]),
      selectedClipId: clip.id
    };
  }
```

Continue in the same file with these immutable helpers; `structuralSnapshot()` intentionally excludes zoom/playback so Undo after a zoom does not unexpectedly change zoom:

```js
function cloneState(state) {
  return {
    ...state,
    clips: (state.clips || []).map((clip) => ({ ...clip })),
    trimSession: state.trimSession ? {
      ...state.trimSession,
      originalClip: { ...state.trimSession.originalClip }
    } : null
  };
}

function projectDuration(state) {
  const clips = state?.clips || [];
  return clips.length ? finite(clips[clips.length - 1].timelineEnd) : 0;
}

function structuralSnapshot(state) {
  return {
    clips: (state.clips || []).map((clip) => ({ ...clip })),
    selectedClipId: String(state.selectedClipId || ''),
    playheadTime: finite(state.playheadTime)
  };
}

function restoreStructuralSnapshot(state, snapshot) {
  const clips = recomputeTimeline((snapshot?.clips || []).map((clip) => ({ ...clip })));
  const selectedClipId = clips.some((clip) => clip.id === snapshot?.selectedClipId)
    ? snapshot.selectedClipId
    : clips[0]?.id || '';
  return {
    ...cloneState(state),
    status: clips.length ? 'ready' : 'empty',
    clips,
    selectedClipId,
    playheadTime: clamp(finite(snapshot?.playheadTime), 0, clips.length ? clips[clips.length - 1].timelineEnd : 0),
    isPlaying: false,
    trimSession: null
  };
}
```

Return all named exports at the bottom of the factory.

- [ ] **Step 4: Add failing regression tests for Split, invalid Split, Trim, Delete, and Zoom**

Append tests that encode the permanent IDs:

```js
test('REG-TIMELINE-001: Split produces two valid same-source ranges and selects the right clip', () => {
  let state = Engine.createInitialState(10, ids('left'));
  state = Engine.setPlayhead(state, 4).state;
  const result = Engine.splitAtPlayhead(state, ids('right'));
  assert.equal(result.ok, true);
  assert.equal(result.state.playheadTime, 4);
  assert.equal(result.state.selectedClipId, 'right');
  assert.deepEqual(result.state.clips.map(({ id, sourceStart, sourceEnd, timelineStart, timelineEnd }) => ({ id, sourceStart, sourceEnd, timelineStart, timelineEnd })), [
    { id: 'left', sourceStart: 0, sourceEnd: 4, timelineStart: 0, timelineEnd: 4 },
    { id: 'right', sourceStart: 4, sourceEnd: 10, timelineStart: 4, timelineEnd: 10 }
  ]);
});

test('REG-TIMELINE-008: boundary Split is rejected without mutation', () => {
  let state = Engine.createInitialState(10, ids('a'));
  state = Engine.setPlayhead(state, 0.05).state;
  const before = Engine.cloneState(state);
  const result = Engine.splitAtPlayhead(state, ids('b'));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'MIN_DURATION');
  assert.deepEqual(result.state, before);
});

test('REG-TIMELINE-002: Trim cannot produce a clip below 0.1 seconds', () => {
  let state = Engine.createInitialState(2, ids('a'));
  state = Engine.beginTrim(state, 'a', 'left').state;
  const result = Engine.updateTrim(state, 1.95);
  assert.equal(result.ok, true);
  const clip = result.state.clips[0];
  assert.ok(clip.sourceEnd - clip.sourceStart >= 0.1 - 1e-9);
});

test('REG-TIMELINE-003: Delete recomputes downstream positions gaplessly', () => {
  let state = Engine.createInitialState(9, ids('a'));
  state = Engine.setPlayhead(state, 3).state;
  state = Engine.splitAtPlayhead(state, ids('b')).state;
  state = Engine.setPlayhead(state, 6).state;
  state = Engine.splitAtPlayhead(state, ids('c')).state;
  state = Engine.selectClip(state, 'b').state;
  const result = Engine.deleteSelectedClip(state);
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.clips.map((clip) => [clip.timelineStart, clip.timelineEnd]), [[0, 3], [3, 6]]);
});

test('REG-TIMELINE-009: deleting final clip enters No Clips safely', () => {
  const state = Engine.createInitialState(5, ids('a'));
  const result = Engine.deleteSelectedClip(state);
  assert.equal(result.ok, true);
  assert.equal(result.state.status, 'empty');
  assert.deepEqual(result.state.clips, []);
  assert.equal(result.state.selectedClipId, '');
  assert.equal(result.state.playheadTime, 0);
});

test('REG-TIMELINE-006: Zoom changes scale only', () => {
  const state = Engine.createInitialState(8, ids('a'));
  const beforeClips = state.clips.map((clip) => ({ ...clip }));
  const result = Engine.setZoom(state, 110);
  assert.equal(result.state.zoom, 110);
  assert.deepEqual(result.state.clips, beforeClips);
  assert.equal(Engine.projectDuration(result.state), 8);
});
```

- [ ] **Step 5: Implement exact transition rules**

Implement these rules in `js/v94-timeline-state.js`:

```text
setPlayhead:
  clamp to [0, projectDuration]

setZoom:
  clamp to [22, 110]

splitAtPlayhead:
  locate clip under sequence playhead
  map sequence playhead to source time
  require left duration >= 0.1
  require right duration >= 0.1
  keep original clip id on the left
  create one new id for the right
  keep playheadTime unchanged
  select the right clip
  recompute timeline positions

trim left allowable source range:
  min = previous clip.sourceEnd, or 0 for first clip
  max = current clip.sourceEnd - 0.1

trim right allowable source range:
  min = current clip.sourceStart + 0.1
  max = next clip.sourceStart, or sourceDuration for final clip

updateTrim:
  clamp to the allowable range
  recompute timeline positions after every preview update
  never overlap neighboring source ranges

commitTrim:
  clear trimSession, keep the current trimmed clip values

cancelTrim:
  restore the original clip captured by beginTrim
  recompute timeline positions

deleteSelectedClip:
  remove selected clip
  choose same index if it still exists, otherwise previous index
  preserve playheadTime but clamp it to new project duration
  final deletion => status empty, selectedClipId '', playheadTime 0
```

Use `reason` codes exactly: `INVALID_STATE`, `NO_SELECTION`, `INVALID_CLIP`, `MIN_DURATION`, `NO_CHANGE`.

- [ ] **Step 6: Run state regression tests GREEN**

Run:

```bash
node --test tests/regression/v94-timeline-state.test.mjs
```

Expected: all state tests PASS with 0 failures.

- [ ] **Step 7: Commit Task 1**

```bash
git add js/v94-timeline-state.js tests/regression/v94-timeline-state.test.mjs
git commit -m "feat: add V9.4 timeline state engine"
```

---

### Task 2: Add deterministic structural Undo/Redo history

**Files:**
- Create: `js/v94-timeline-history.js`
- Create: `tests/regression/v94-timeline-history.test.mjs`

**Interfaces:**
- Consumes structural snapshots created by `VForgeTimelineState94.structuralSnapshot(state)`.
- Produces `VForgeTimelineHistory94.createHistory(limit?)`.
- History instance exact methods: `record(snapshot)`, `undo(currentSnapshot)`, `redo(currentSnapshot)`, `clear()`, `canUndo()`, `canRedo()`, `size()`.
- `undo()` / `redo()` return `{ ok, snapshot }`.

- [ ] **Step 1: Write failing REG-TIMELINE-004 history tests**

Create `tests/regression/v94-timeline-history.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const History = require('../../js/v94-timeline-history.js');

const snap = (value) => ({ clips: [{ id: value }], selectedClipId: value, playheadTime: 1 });

test('REG-TIMELINE-004: Undo/Redo restores snapshots deterministically', () => {
  const history = History.createHistory(50);
  history.record(snap('before-split'));
  const undone = history.undo(snap('after-split'));
  assert.equal(undone.ok, true);
  assert.deepEqual(undone.snapshot, snap('before-split'));
  const redone = history.redo(snap('before-split'));
  assert.equal(redone.ok, true);
  assert.deepEqual(redone.snapshot, snap('after-split'));
});

test('new structural edit after Undo clears Redo branch', () => {
  const history = History.createHistory();
  history.record(snap('a'));
  history.undo(snap('b'));
  assert.equal(history.canRedo(), true);
  history.record(snap('c'));
  assert.equal(history.canRedo(), false);
});

test('history limit keeps the newest snapshots only', () => {
  const history = History.createHistory(2);
  history.record(snap('a'));
  history.record(snap('b'));
  history.record(snap('c'));
  assert.deepEqual(history.undo(snap('d')).snapshot, snap('c'));
  assert.deepEqual(history.undo(snap('c')).snapshot, snap('b'));
  assert.equal(history.undo(snap('b')).ok, false);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/regression/v94-timeline-history.test.mjs
```

Expected: FAIL because history module does not exist.

- [ ] **Step 3: Implement the history module**

Use a UMD wrapper identical in shape to Task 1. `record(snapshot)` must deep-clone the supplied snapshot, append it to `past`, trim `past` to the configured limit, and set `future = []`. `undo(currentSnapshot)` pushes a clone of current into `future` then pops from `past`. `redo(currentSnapshot)` pushes a clone of current into `past` then pops from `future`. Never expose mutable internal arrays.

- [ ] **Step 4: Run GREEN**

```bash
node --test tests/regression/v94-timeline-history.test.mjs
```

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit Task 2**

```bash
git add js/v94-timeline-history.js tests/regression/v94-timeline-history.test.mjs
git commit -m "feat: add V9.4 timeline undo redo history"
```

---

### Task 3: Build the V9.4 timeline view and fixed-center geometry

**Files:**
- Create: `js/v94-timeline-view.js`
- Create: `css/v94-timeline.css`
- Create: `tests/static/v94-timeline-architecture.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes V9.4 state objects and structural UI flags from the controller.
- Produces `VForgeTimelineView94.createView(options)`.
- View exact methods: `mount()`, `refs()`, `renderStructure(state, ui)`, `renderPlayback(state)`, `renderHistory({canUndo, canRedo})`, `renderMediaStatus(state)`, `scrollToPlayhead(sequenceTime, zoom, behavior?)`, `sequenceTimeFromScroll(zoom)`, `setThumbnails(thumbnails)`, `destroy()`.
- `options` exact keys: `{ timelineRoot, editPanel, previewFrame, onAction }`.
- `onAction(action)` receives actions such as `{ type: 'split' }`, `{ type: 'delete' }`, `{ type: 'select', clipId }`, `{ type: 'zoom', direction }`, `{ type: 'undo' }`, `{ type: 'redo' }`, `{ type: 'replace-video' }`.

- [ ] **Step 1: Write failing static dependency and DOM-ownership tests**

Create `tests/static/v94-timeline-architecture.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync('index.html', 'utf8');
const css = readFileSync('css/v94-timeline.css', 'utf8');

function pos(needle) {
  const value = index.indexOf(needle);
  assert.notEqual(value, -1, `missing ${needle}`);
  return value;
}

test('V9.4 stylesheet is loaded after V9.3 editor CSS and owns only timeline classes', () => {
  assert.ok(pos('css/v94-timeline.css?v=9.4.0') > pos('css/v93-editor.css?v=9.3.2'));
  assert.match(css, /\.vf94-timeline-/);
  assert.equal(css.includes('#page-video-workspace .v82-editor-shell {'), false);
});

test('V9.4 script dependency order is state -> history -> view -> controller -> gestures -> V9.1 -> V9.3', () => {
  const ordered = [
    'js/v94-timeline-state.js?v=9.4.0',
    'js/v94-timeline-history.js?v=9.4.0',
    'js/v94-timeline-view.js?v=9.4.0',
    'js/v94-timeline-controller.js?v=9.4.0',
    'js/v94-timeline-gestures.js?v=9.4.0',
    'js/v91-editor.js?v=9.4.0-compat',
    'js/v93-editor.js?v=9.4.0-compat'
  ].map(pos);
  assert.deepEqual([...ordered].sort((a, b) => a - b), ordered);
});

test('existing timeline root remains the single mount target', () => {
  assert.equal((index.match(/id="studio-mini-timeline"/g) || []).length, 1);
  assert.equal((index.match(/id="workspace-video"/g) || []).length, 1);
  assert.equal((index.match(/id="vf94-preview-empty"/g) || []).length, 1);
});
```

The script-order test is expected to fail until Task 6 modifies V9.1/V9.3 script URLs; during Task 3 run only the stylesheet/root subset with `--test-name-pattern`.

- [ ] **Step 2: Add V9.4 CSS and preview-empty target to `index.html`**

In `<head>`, immediately after `css/v93-editor.css?v=9.3.2`, add:

```html
<link data-vforge-v94-timeline="9.4.0" href="css/v94-timeline.css?v=9.4.0" rel="stylesheet"/>
```

Inside `#workspace-video-frame`, immediately after `#workspace-video`, add exactly:

```html
<div aria-live="polite" class="vf94-preview-empty" hidden id="vf94-preview-empty">
  <span class="material-icons-round">video_library</span>
  <strong>Timeline kosong</strong>
  <small>Tambahkan video untuk mulai mengedit.</small>
</div>
```

Do not add a second timeline root.

- [ ] **Step 3: Implement the view shell with unique V9.4 IDs/classes**

`mount()` must replace only the contents of `#studio-mini-timeline` and insert one quick-tool section after the Edit panel heading. Use this exact timeline skeleton:

```html
<div class="vf94-timeline-header">
  <div class="vf94-history-controls">
    <button id="vf94-undo" type="button" aria-label="Urungkan" disabled><span class="material-icons-round">undo</span></button>
    <button id="vf94-redo" type="button" aria-label="Ulangi" disabled><span class="material-icons-round">redo</span></button>
  </div>
  <div class="vf94-timeline-title"><strong>Timeline</strong><small id="vf94-clip-summary">Belum ada klip</small></div>
  <div class="vf94-zoom-controls" role="group" aria-label="Zoom timeline">
    <button id="vf94-zoom-out" type="button" aria-label="Perkecil timeline"><span class="material-icons-round">remove</span></button>
    <span id="vf94-zoom-label">100%</span>
    <button id="vf94-zoom-in" type="button" aria-label="Perbesar timeline"><span class="material-icons-round">add</span></button>
  </div>
</div>
<div class="vf94-timeline-viewport" id="vf94-timeline-viewport">
  <div class="vf94-timeline-canvas" id="vf94-timeline-canvas">
    <div class="vf94-ruler" id="vf94-ruler"></div>
    <div class="vf94-clip-row" id="vf94-clip-row"></div>
  </div>
</div>
<div aria-hidden="true" class="vf94-fixed-playhead" id="vf94-fixed-playhead"><span></span></div>
```

Quick tools exact skeleton:

```html
<section aria-label="Alat edit klip" class="vf94-quick-tools" id="vf94-quick-tools">
  <div class="vf94-quick-title">
    <span><small>KLIP AKTIF</small><strong id="vf94-selected-clip-label">Belum ada klip</strong></span>
    <em id="vf94-selected-range">00:00.0 – 00:00.0</em>
  </div>
  <div class="vf94-quick-grid">
    <button id="vf94-split" type="button"><span class="material-icons-round">call_split</span><small>Split</small></button>
    <button class="danger" id="vf94-delete" type="button"><span class="material-icons-round">delete_outline</span><small>Hapus</small></button>
  </div>
</section>
```

Do not recreate Duplicate or Reset in A1.

- [ ] **Step 4: Implement fixed-center scroll geometry**

The view must maintain `--vf94-edge-pad` equal to half the timeline viewport width. Canvas width is:

```text
edgePad + projectDuration * zoom + edgePad
```

Clip/ruler content starts after `edgePad`. Therefore:

```js
scrollToPlayhead(sequenceTime, zoom, behavior = 'auto') {
  const viewport = refs.viewport;
  if (!viewport) return;
  const left = Math.max(0, Number(sequenceTime || 0) * Number(zoom || 44));
  viewport.scrollTo({ left, behavior });
}

sequenceTimeFromScroll(zoom) {
  const viewport = refs.viewport;
  if (!viewport) return 0;
  return Math.max(0, viewport.scrollLeft / Math.max(1, Number(zoom || 44)));
}
```

The playhead itself is an overlay at `left: 50%`; never animate its horizontal position.

- [ ] **Step 5: Render selected clips and large trim handles**

Each clip button uses `data-vf94-clip-id`. Width must equal `clipDuration * state.zoom` without an artificial minimum that corrupts timeline geometry. Selected clips render:

```html
<span class="vf94-trim-handle left" data-vf94-trim="left" aria-label="Trim awal"></span>
<span class="vf94-trim-handle right" data-vf94-trim="right" aria-label="Trim akhir"></span>
```

The visible handle may be narrow, but CSS touch target must be at least `28px` wide through the actual positioned element/pseudo content.

- [ ] **Step 6: Style the timeline without becoming a second global layout owner**

`css/v94-timeline.css` must:

```text
scope all timeline rules below #page-video-workspace and .vf94-* classes
retain dark editor surfaces in both app themes
fit inside the existing V9.3 grid-row 2 timeline zone
use overflow hidden on root and horizontal scrolling only on .vf94-timeline-viewport
place fixed playhead at 50%
make trim handles >= 28px touch width
show selected clip with clear lime/purple-accented outline
show disabled controls with visibly reduced opacity and pointer affordance
support pointer/coarse targets on mobile
avoid redefining .v82-editor-shell, header, dock, preview, or tool-sheet geometry
```

- [ ] **Step 7: Run targeted view/static tests**

Run:

```bash
node --test --test-name-pattern='stylesheet|single mount target' tests/static/v94-timeline-architecture.test.mjs
```

Expected: targeted tests PASS. Script-order test may remain RED until Task 7.

- [ ] **Step 8: Commit Task 3**

```bash
git add index.html css/v94-timeline.css js/v94-timeline-view.js tests/static/v94-timeline-architecture.test.mjs
git commit -m "feat: add V9.4 fixed center timeline view"
```

---

### Task 4: Build the controller, structural commands, and single history path

**Files:**
- Create: `js/v94-timeline-controller.js`
- Create: `tests/regression/v94-timeline-controller.test.mjs`

**Interfaces:**
- Consumes `VForgeTimelineState94`, `VForgeTimelineHistory94`, `VForgeTimelineView94`.
- Produces factory `VForgeTimelineController94Factory.createController(deps)` for Node tests and browser boot.
- Browser boot publishes one runtime owner: `window.VForgeTimeline94`.
- Public runtime API exact methods:
  - `version`
  - `getState()`
  - `loadSource(duration, objectUrl?)`
  - `resetSource(reason?)`
  - `selectClip(clipId, options?)`
  - `setPlayhead(sequenceTime, options?)`
  - `splitAtPlayhead()`
  - `deleteSelectedClip()`
  - `beginTrim(clipId, edge)`
  - `updateTrim(sourceTime)`
  - `commitTrim()`
  - `cancelTrim()`
  - `setZoom(pxPerSecond)`
  - `zoomBy(direction)`
  - `undo()`
  - `redo()`
  - `pauseForInteraction()`
  - `togglePlayback()`
  - `seekByRatio(ratio)`
  - `syncPreviewControls()`
  - `canUndo()`
  - `canRedo()`
  - `handleViewAction(action)`
  - `bindVideo()`
  - `refresh()`

- [ ] **Step 1: Write failing controller tests for history semantics and structural commands**

Create a fake view and fake video so tests require no DOM library:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Engine = require('../../js/v94-timeline-state.js');
const History = require('../../js/v94-timeline-history.js');
const Factory = require('../../js/v94-timeline-controller.js');

function fakeView() {
  return {
    structures: 0,
    playback: 0,
    renderStructure() { this.structures += 1; },
    renderPlayback() { this.playback += 1; },
    renderHistory() {},
    renderMediaStatus() {},
    scrollToPlayhead() {},
    setThumbnails() {},
    mount() {},
    refs() { return {}; }
  };
}

function fakeVideo() {
  return {
    currentTime: 0,
    duration: 10,
    paused: true,
    ended: false,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; }
  };
}

test('Split records exactly one structural history entry', () => {
  const controller = Factory.createController({
    engine: Engine,
    history: History.createHistory(),
    view: fakeView(),
    getVideo: fakeVideo,
    idFactory: (() => { let i = 0; return () => `id-${++i}`; })()
  });
  controller.loadSource(10);
  controller.setPlayhead(4, { seekPreview: false });
  assert.equal(controller.splitAtPlayhead().ok, true);
  assert.equal(controller.canUndo(), true);
  controller.undo();
  assert.equal(controller.getState().clips.length, 1);
  controller.redo();
  assert.equal(controller.getState().clips.length, 2);
});

test('selection, playhead movement and zoom do not create history entries', () => {
  const history = History.createHistory();
  const controller = Factory.createController({ engine: Engine, history, view: fakeView(), getVideo: fakeVideo });
  controller.loadSource(10);
  controller.setPlayhead(2, { seekPreview: false });
  controller.setZoom(88);
  assert.equal(history.canUndo(), false);
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/regression/v94-timeline-controller.test.mjs
```

Expected: FAIL because controller module does not exist.

- [ ] **Step 3: Implement controller dependency injection, browser boot, and `applyStructural()`**

The controller must keep its mutable `state` private. The factory exports `createController(deps)`. In browser mode, register `bootBrowser()` before V9.1 registers its `DOMContentLoaded` handler so V9.4 ownership exists first. Use this exact boot shape (with a closure-safe controller reference):

```js
function bootBrowser() {
  if (window.VForgeTimeline94?.version === '9.4.0') return;

  let controller = null;
  const view = window.VForgeTimelineView94.createView({
    timelineRoot: document.getElementById('studio-mini-timeline'),
    editPanel: document.querySelector('#page-video-workspace [data-editor-panel="edit"]'),
    previewFrame: document.getElementById('workspace-video-frame'),
    onAction(action) { return controller?.handleViewAction(action); }
  });

  controller = createController({
    engine: window.VForgeTimelineState94,
    history: window.VForgeTimelineHistory94.createHistory(50),
    view,
    getVideo: () => document.getElementById('workspace-video')
  });

  view.mount();
  window.VForgeTimeline94 = controller;
  controller.bindVideo();

  const refs = view.refs();
  window.VForgeTimelineGestures94?.bind({
    viewport: refs.viewport,
    clipRow: refs.clipRow,
    controller
  });
  controller.refresh();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootBrowser, { once: true });
  } else {
    queueMicrotask(bootBrowser);
  }
}
```

The controller must use this exact pattern for Split/Delete:

```js
function applyStructural(transition) {
  const before = engine.structuralSnapshot(state);
  const result = transition(state);
  if (!result?.ok) return result;
  history.record(before);
  state = result.state;
  renderStructure();
  syncPreviewToPlayhead();
  return result;
}
```

`undo()` / `redo()` restore structural snapshots through `engine.restoreStructuralSnapshot(state, snapshot)` and must not change the current zoom.

- [ ] **Step 4: Implement one-entry Trim history**

`beginTrim()` captures `trimBefore = engine.structuralSnapshot(state)` but does not call `history.record()`. `updateTrim()` may run many times. `commitTrim()` records `trimBefore` exactly once only if the structural snapshot actually differs from the before snapshot. `cancelTrim()` restores the engine trim session and records nothing.

During `updateTrim()`:

```text
left edge preview => seek video.currentTime to selected clip.sourceStart
right edge preview => seek video.currentTime to min(sourceDuration, selected clip.sourceEnd - 0.001)
state.playheadTime itself does not change during trim preview
```

After `commitTrim()` / `cancelTrim()`, call `syncPreviewToPlayhead()` so preview returns to the fixed playhead position.

- [ ] **Step 5: Sync V9.4 timeline metadata into the existing workspace model**

When `window.videoWorkspaceState` exists, write:

```js
window.videoWorkspaceState.timeline = {
  version: '9.4.0',
  sourceDuration: state.sourceDuration,
  sequenceDuration: engine.projectDuration(state),
  selectedClipId: state.selectedClipId,
  playheadTime: state.playheadTime,
  zoom: state.zoom,
  clips: state.clips.map(({ id, sourceStart, sourceEnd, timelineStart, timelineEnd }) => ({
    id, sourceStart, sourceEnd, timelineStart, timelineEnd
  })),
  prototypeOnly: true
};
```

Do not modify `processor.js` or pretend V9.4 multi-clip metadata is already used by export.

- [ ] **Step 6: Add failing test that a new edit after Undo clears Redo**

Append:

```js
test('new structural edit after Undo clears controller Redo branch', () => {
  const history = History.createHistory();
  const controller = Factory.createController({ engine: Engine, history, view: fakeView(), getVideo: fakeVideo });
  controller.loadSource(10);
  controller.setPlayhead(4, { seekPreview: false });
  controller.splitAtPlayhead();
  controller.undo();
  controller.setPlayhead(3, { seekPreview: false });
  controller.splitAtPlayhead();
  assert.equal(controller.canRedo(), false);
});
```

- [ ] **Step 7: Run controller tests GREEN**

```bash
node --test tests/regression/v94-timeline-controller.test.mjs
```

Expected: PASS, 0 failures.

- [ ] **Step 8: Commit Task 4**

```bash
git add js/v94-timeline-controller.js tests/regression/v94-timeline-controller.test.mjs
git commit -m "feat: add V9.4 timeline controller commands"
```

---

### Task 5: Integrate source media, real-time preview, fixed-center playback, and thumbnails

**Files:**
- Modify: `js/v94-timeline-controller.js`
- Modify: `tests/regression/v94-timeline-controller.test.mjs`

**Interfaces:**
- Consumes existing `#workspace-video` element and view methods from Task 3.
- Produces one V9.4 media event owner for timeline timing; V9.1 compatibility mode must not also own timeline `loadedmetadata/timeupdate/emptied` state after Task 7.

- [ ] **Step 1: Add failing REG-TIMELINE-005 tests for preview/playhead synchronization**

Add fake-video behavior and tests:

```js
test('REG-TIMELINE-005: setPlayhead maps sequence time to source preview time', () => {
  const video = fakeVideo();
  const controller = Factory.createController({ engine: Engine, history: History.createHistory(), view: fakeView(), getVideo: () => video });
  controller.loadSource(10);
  controller.setPlayhead(4, { seekPreview: true });
  assert.equal(controller.getState().playheadTime, 4);
  assert.equal(video.currentTime, 4);
});

test('timeline interaction pauses playback before manual seeking', async () => {
  const video = fakeVideo();
  const controller = Factory.createController({ engine: Engine, history: History.createHistory(), view: fakeView(), getVideo: () => video });
  controller.loadSource(10);
  await controller.togglePlayback();
  assert.equal(video.paused, false);
  controller.pauseForInteraction();
  assert.equal(video.paused, true);
  assert.equal(controller.getState().isPlaying, false);
});
```

- [ ] **Step 2: Implement `bindVideo()` with V9.4-owned media lifecycle**

Browser boot must bind once using `video.dataset.vf94TimelineBound = 'true'` and these events:

```text
loadedmetadata -> validate finite positive duration -> loadSource(video.duration, video.currentSrc || video.src)
durationchange -> load only if state not ready and duration becomes valid
timeupdate -> enforce clip-end jump and update sequence playhead
play -> set isPlaying true and start playback RAF loop
pause/ended -> set isPlaying false and stop playback RAF loop
emptied/abort -> resetSource('empty')
error -> resetSource('invalid') and render recoverable feedback
```

Never set a V9.1 timeline-ready state from this binding.

- [ ] **Step 3: Implement gapless playback across trimmed source gaps**

Keep transient `activePlaybackClipId` in the controller, not in public timeline state. On play, map current `state.playheadTime` to source and seek to that source time before calling `video.play()`.

On media progress:

```text
if current source time reaches active clip.sourceEnd - 0.025:
  if next clip exists -> seek to next.sourceStart and continue
  else -> pause, set playheadTime to projectDuration
otherwise:
  map current source time to sequence time using active clip as preferred mapping
  update state.playheadTime
```

Use `requestAnimationFrame` while playing to call `view.renderPlayback(state)` and `view.scrollToPlayhead(state.playheadTime, state.zoom, 'auto')`. Use media events for correctness, RAF only for smooth visual updates.

- [ ] **Step 4: Implement real-time trim preview regression test**

Add:

```js
test('REG-TIMELINE-010: trim preview follows active boundary then returns to playhead', () => {
  const video = fakeVideo();
  const controller = Factory.createController({ engine: Engine, history: History.createHistory(), view: fakeView(), getVideo: () => video });
  controller.loadSource(10);
  controller.setPlayhead(5, { seekPreview: true });
  controller.beginTrim(controller.getState().selectedClipId, 'left');
  controller.updateTrim(2);
  assert.equal(video.currentTime, 2);
  controller.commitTrim();
  assert.equal(controller.getState().playheadTime, 5);
  assert.equal(video.currentTime, 7); // project 5s now maps to source 7s after removing 0..2 from sequence
});
```

If the exact mapping changes because the clip's new project duration clamps playhead, assert the engine-derived `sequenceToSource(controller.getState(), controller.getState().playheadTime).sourceTime` rather than a hard-coded value.

- [ ] **Step 5: Preserve thumbnail filmstrip behavior without making it a state invariant**

Migrate the existing browser thumbnail capture approach from V9.1 into a private controller helper:

```text
8 evenly spaced source captures
160x90 canvas
JPEG quality 0.6
abort stale generation with a monotonic token
on capture failure keep placeholder thumbnails
thumbnail cache is presentation-only and never stored in structural history
```

Call `view.setThumbnails(thumbnails)` as frames arrive. Do not make thumbnail success a release blocker.

- [ ] **Step 6: Run controller regressions**

```bash
node --test tests/regression/v94-timeline-controller.test.mjs
```

Expected: PASS including `REG-TIMELINE-005` and `REG-TIMELINE-010` automated portions.

- [ ] **Step 7: Commit Task 5**

```bash
git add js/v94-timeline-controller.js tests/regression/v94-timeline-controller.test.mjs
git commit -m "feat: sync V9.4 timeline with preview playback"
```

---

### Task 6: Add mobile-first gesture arbitration: Trim > Pinch > Scrub

**Files:**
- Create: `js/v94-timeline-gestures.js`
- Create: `tests/regression/v94-timeline-gestures.test.mjs`
- Modify: `js/v94-timeline-controller.js`

**Interfaces:**
- Consumes `window.VForgeTimeline94` and view refs.
- Produces `VForgeTimelineGestures94` with exact methods `bind({ viewport, clipRow, controller })`, `unbind()`, `chooseGestureMode(input)`.
- `chooseGestureMode({ trimActive, pointerCount })` returns `'trim'`, `'pinch'`, or `'scrub'` in approved priority.

- [ ] **Step 1: Write failing gesture priority tests**

Create:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Gestures = require('../../js/v94-timeline-gestures.js');

test('REG-TIMELINE-007: trim owns the gesture even if a second pointer appears', () => {
  assert.equal(Gestures.chooseGestureMode({ trimActive: true, pointerCount: 2 }), 'trim');
});

test('two pointers choose pinch when trim is not active', () => {
  assert.equal(Gestures.chooseGestureMode({ trimActive: false, pointerCount: 2 }), 'pinch');
});

test('one non-trim pointer chooses scrub', () => {
  assert.equal(Gestures.chooseGestureMode({ trimActive: false, pointerCount: 1 }), 'scrub');
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/regression/v94-timeline-gestures.test.mjs
```

Expected: FAIL because gesture module is missing.

- [ ] **Step 3: Implement pointer session state**

Use one private session:

```js
const session = {
  mode: 'idle',
  pointers: new Map(),
  trimClipId: '',
  trimEdge: '',
  startX: 0,
  startScrollLeft: 0,
  pinchStartDistance: 0,
  pinchStartZoom: 44
};
```

On any `pointerdown`, call `controller.pauseForInteraction()` before manual scrub/trim/pinch begins.

- [ ] **Step 4: Implement Trim drag with highest ownership**

When target matches `[data-vf94-trim]`:

```text
preventDefault + stopPropagation
set mode trim
capture pointer
controller.beginTrim(clipId, edge)
convert horizontal delta to source seconds using current zoom
controller.updateTrim(originalBoundary + deltaSeconds)
commit on pointerup
cancel on pointercancel/lost capture
```

Do not allow a second pointer to promote an active trim session to pinch.

- [ ] **Step 5: Implement Pinch zoom anchored to fixed playhead**

When two pointers are active and no trim is active:

```js
nextZoom = pinchStartZoom * (currentDistance / pinchStartDistance);
controller.setZoom(nextZoom);
```

Controller/view must re-render structure and immediately scroll the same `state.playheadTime` back under the fixed-center playhead. Pinch may not change source ranges or project duration.

- [ ] **Step 6: Implement timeline scrub by scrolling content under fixed playhead**

For one pointer on the viewport/canvas that is not a clip trim handle:

```text
pointerdown -> remember clientX and startScrollLeft
pointermove -> viewport.scrollLeft = startScrollLeft - (clientX - startX)
             controller.setPlayhead(viewport.scrollLeft / controller.getState().zoom, { seekPreview: true, renderStructure: false })
pointerup -> end session, keep current playhead
```

Tap on a clip selects it. A drag threshold of `4px` suppresses the following click so scrub does not accidentally change selection.

- [ ] **Step 7: Add wheel modifier zoom for desktop without expanding keyboard scope**

On `.vf94-timeline-viewport`, handle `ctrlKey || metaKey` wheel only:

```text
wheel up -> controller.zoomBy(+1)
wheel down -> controller.zoomBy(-1)
preventDefault only for the modifier zoom gesture
ordinary wheel/trackpad horizontal scrolling remains browser-native
```

- [ ] **Step 8: Run GREEN**

```bash
node --test tests/regression/v94-timeline-gestures.test.mjs tests/regression/v94-timeline-state.test.mjs
```

Expected: PASS, 0 failures.

- [ ] **Step 9: Commit Task 6**

```bash
git add js/v94-timeline-gestures.js js/v94-timeline-controller.js tests/regression/v94-timeline-gestures.test.mjs
git commit -m "feat: add V9.4 timeline touch gestures"
```

---

### Task 7: Migrate runtime ownership from V9.1/V9.3 to V9.4 without breaking preview contracts

**Files:**
- Modify: `index.html`
- Modify: `js/v91-editor.js`
- Modify: `js/v93-editor.js`
- Modify: `tests/static/v94-timeline-architecture.test.mjs`
- Modify: `tests/regression/vforge-regressions.test.mjs` only if an existing assertion references a deliberately changed version string.

**Interfaces:**
- V9.4 becomes the only active timeline state/command/media-time owner.
- V9.1 retains Fit/Fill, fullscreen, editor-nav isolation, and preview-control presentation as compatibility behavior.
- V9.3 retains editor geometry, tool scroller, live effects/audio preview, and preview zoom; it yields timeline zoom interception.

- [ ] **Step 1: Add the V9.4 scripts before V9.1/V9.3 in `index.html`**

Replace the tail editor script block with this order:

```html
<script src="js/v94-timeline-state.js?v=9.4.0"></script>
<script src="js/v94-timeline-history.js?v=9.4.0"></script>
<script src="js/v94-timeline-view.js?v=9.4.0"></script>
<script src="js/v94-timeline-controller.js?v=9.4.0"></script>
<script src="js/v94-timeline-gestures.js?v=9.4.0"></script>
<script src="js/v91-editor.js?v=9.4.0-compat"></script>
<script src="js/v93-editor.js?v=9.4.0-compat"></script>
```

Keep the Showcase controller after its required Showcase DOM exactly as the existing `REG-SHOWCASE-001` contract requires.

- [ ] **Step 2: Write a failing one-owner test before editing V9.1/V9.3**

Append to `tests/static/v94-timeline-architecture.test.mjs`:

```js
const v91 = readFileSync('js/v91-editor.js', 'utf8');
const v93 = readFileSync('js/v93-editor.js', 'utf8');

test('V9.1 explicitly yields active timeline ownership to V9.4', () => {
  assert.match(v91, /function getTimeline94\(\)/);
  assert.match(v91, /if \(getTimeline94\(\)\)/);
  assert.match(v91, /timeline94\.togglePlayback/);
  assert.match(v91, /timeline94\.undo/);
  assert.match(v91, /timeline94\.splitAtPlayhead/);
});

test('V9.3 timeline zoom enhancer becomes a no-op when V9.4 owns timeline zoom', () => {
  assert.match(v93, /window\.VForgeTimeline94/);
  assert.match(v93, /enhanceTimelineZoom/);
});
```

- [ ] **Step 3: Put V9.1 into explicit compatibility mode**

Add near V9.1 helpers:

```js
function getTimeline94() {
  return window.VForgeTimeline94 || null;
}
```

When V9.4 exists, `prepare()` and page re-entry must **not** call active V9.1 timeline ownership paths:

```text
skip createTimeline()
skip createQuickTools()
skip the V9.1 timeline loadedmetadata/timeupdate/emptied model binding
```

Preserve:

```text
createPreviewControls()
Fit/Fill
fullscreen
editor navigation isolation
patchPreviewSizer()
renderPlayButton()
```

Split video binding into compatibility-safe preview events and legacy timeline events rather than binding both and ignoring them afterward.

- [ ] **Step 4: Delegate existing V9.1 public/keyboard controls to V9.4**

Use wrappers, not duplicate state mutation:

```js
function handlePlaybackToggle() {
  const timeline94 = getTimeline94();
  return timeline94 ? timeline94.togglePlayback() : togglePlayback();
}

function handleCompatUndo() {
  const timeline94 = getTimeline94();
  return timeline94 ? timeline94.undo() : undo();
}

function handleCompatRedo() {
  const timeline94 = getTimeline94();
  return timeline94 ? timeline94.redo() : redo();
}

function handleCompatSplit() {
  const timeline94 = getTimeline94();
  return timeline94 ? timeline94.splitAtPlayhead() : splitAtPlayhead();
}
```

Bind Preview Play, Space, Ctrl/Cmd+Z, Ctrl/Cmd+Y, and existing `S` split to these wrappers. `v91-seek-range` input delegates to `timeline94.seekByRatio(value / 1000)` when V9.4 exists.

Expose `window.v91Undo` and `window.v91Redo` as compatibility wrappers, not direct old-state functions.

- [ ] **Step 5: Make V9.3 timeline zoom setup immediately succeed when V9.4 is active**

At the start of both legacy timeline zoom helpers:

```js
if (window.VForgeTimeline94?.version === '9.4.0') return true;
```

For `updateTimelineZoomButtons()`, simply `return` in V9.4 mode. This prevents the existing 40-attempt setup retry from treating missing `v91-zoom-*` controls as a failure and prevents click interception of V9.4 zoom controls.

Do not change V9.3 preview zoom functions.

- [ ] **Step 6: Run architecture and existing V9.3 regression tests**

```bash
node --test tests/static/v94-timeline-architecture.test.mjs tests/regression/vforge-regressions.test.mjs
```

Expected: PASS, including script order, one-owner compatibility guards, `REG-SHOWCASE-001`, `REG-THEME-001`, `REG-LAYOUT-001`, `REG-NAV-001`, `REG-PICKER-001`.

- [ ] **Step 7: Commit Task 7**

```bash
git add index.html js/v91-editor.js js/v93-editor.js tests/static/v94-timeline-architecture.test.mjs tests/regression/vforge-regressions.test.mjs
git commit -m "refactor: hand timeline ownership to V9.4"
```

---

### Task 8: Finish empty/loading/invalid states and responsive Anti-Slop behavior

**Files:**
- Modify: `js/v94-timeline-view.js`
- Modify: `js/v94-timeline-controller.js`
- Modify: `css/v94-timeline.css`
- Modify: `tests/regression/v94-timeline-controller.test.mjs`
- Modify: `tests/static/v94-timeline-architecture.test.mjs`

**Interfaces:**
- Consumes `state.status = 'empty' | 'ready' | 'invalid'` and controller readiness.
- Produces accessible visual state and correct control disablement.

- [ ] **Step 1: Add failing empty/invalid state tests**

Controller test:

```js
test('No Clips disables structural editing and remains recoverable', () => {
  const view = fakeView();
  const controller = Factory.createController({ engine: Engine, history: History.createHistory(), view, getVideo: fakeVideo });
  controller.loadSource(5);
  controller.deleteSelectedClip();
  assert.equal(controller.getState().status, 'empty');
  assert.equal(controller.splitAtPlayhead().ok, false);
  assert.equal(controller.deleteSelectedClip().ok, false);
});
```

Static/CSS test:

```js
test('V9.4 CSS contains selected, disabled, empty and coarse-pointer interaction states', () => {
  assert.match(css, /\.vf94-clip\.selected/);
  assert.match(css, /:disabled/);
  assert.match(css, /\.vf94-preview-empty/);
  assert.match(css, /pointer:\s*coarse/);
});
```

- [ ] **Step 2: Implement exact control-state matrix**

`renderStructure(state, ui)` disables:

```text
Split: disabled unless status ready, clips exist, and current playhead Split would be valid
Delete: disabled unless status ready and selected clip exists
Undo: disabled when !history.canUndo()
Redo: disabled when !history.canRedo()
Zoom out: disabled at <= 22
Zoom in: disabled at >= 110
Trim handles: rendered only on selected ready clip
```

- [ ] **Step 3: Implement No Clips preview recovery**

When status is `empty`:

```text
pause video
show #vf94-preview-empty
add body class vf94-timeline-empty
hide clip filmstrip content
show timeline empty CTA button "Tambahkan video"
CTA calls existing replaceWorkspaceVideo() when available; fallback calls openVideoPicker() when available
```

When status returns to ready, hide the empty overlay and remove the body class.

- [ ] **Step 4: Implement invalid/source-not-ready feedback**

Invalid media duration must never create `NaN`, negative widths, or a clip. Show concise status text in the timeline and leave structural controls disabled. Existing `workspace-preview-error` remains the primary media-error region; V9.4 must not create a second competing alert.

- [ ] **Step 5: Complete responsive CSS**

Required interaction targets:

```text
mobile portrait:
  history/zoom buttons >= 27px existing-density minimum
  trim touch targets >= 28px
  clip row usable inside existing 102–122px V9.3 timeline zone
  no vertical timeline scrolling
  no page-level horizontal overflow

coarse pointer:
  selected outline and handles remain visible
  touch-action configured so trim/pinch/scrub are captured only inside timeline viewport

landscape/tablet/desktop:
  timeline remains inside .v82-timeline layout zone
  controls do not overlap fixed playhead
  mouse cursor communicates grab/resize states
```

Do not alter V9.3 shell row ownership from `v94-timeline.css`.

- [ ] **Step 6: Run Task 8 tests**

```bash
node --test tests/regression/v94-timeline-controller.test.mjs tests/static/v94-timeline-architecture.test.mjs
```

Expected: PASS, 0 failures.

- [ ] **Step 7: Commit Task 8**

```bash
git add js/v94-timeline-view.js js/v94-timeline-controller.js css/v94-timeline.css tests/regression/v94-timeline-controller.test.mjs tests/static/v94-timeline-architecture.test.mjs
git commit -m "feat: finish V9.4 timeline interaction states"
```

---

### Task 9: Register V9.4 regressions and update release gates

**Files:**
- Modify: `docs/development-standard/VFORGE-STANDARD-v1.md`
- Modify: `docs/development-standard/RELEASE-CHECKLIST.md`
- Modify: `tests/release/protected-core.test.mjs`
- Modify: `tests/release/release-governance.test.mjs`
- Create: `tests/release/v94-release-gates.test.mjs`

**Interfaces:**
- Consumes completed runtime and regression tests.
- Produces truthful Candidate/RC/Stable gates for V9.4 A1.

- [ ] **Step 1: Fix the Protected Core release test so feature work may intentionally change runtime files**

Keep:

```js
const baseline = process.env.VFORGE_BASELINE || 'b7dd1743fab052525cf71b8f297692171aa95725';
const protectedCore = [
  'js/auth.js',
  'js/firebase-config.js',
  'firestore.rules.txt',
  'js/processor.js',
  'service-worker.js'
];
```

Keep the test asserting `changedFiles(protectedCore) === []`.

Remove the old governance-task assertion that `index.html`, V9.3 CSS/JS, and Showcase/editor runtime files must stay unchanged forever. That assertion was correct for the governance-only task but is intentionally incompatible with real V9.4 feature development.

- [ ] **Step 2: Register permanent regression IDs in the normative standard**

Under `Permanent Regression Registry`, add exactly:

```markdown
- **REG-TIMELINE-001 — Split validity:** Split produces two valid clips referencing the same source session.
- **REG-TIMELINE-002 — Minimum trim duration:** Trim cannot produce a clip shorter than 0.1 seconds.
- **REG-TIMELINE-003 — Gapless delete:** Delete recomputes downstream timeline positions without gaps.
- **REG-TIMELINE-004 — Deterministic history:** Undo/Redo restores structural state deterministically.
- **REG-TIMELINE-005 — Preview/playhead sync:** Fixed-center playhead remains synchronized with preview during scrub/playback.
- **REG-TIMELINE-006 — Zoom isolation:** Timeline zoom changes scale only, never source ranges or project duration.
- **REG-TIMELINE-007 — Gesture priority:** Active trim owns pointer interaction above pinch and scrub.
- **REG-TIMELINE-008 — Boundary split safety:** Invalid boundary Split is rejected without mutation.
- **REG-TIMELINE-009 — No Clips safety:** Deleting the final clip enters a safe empty state.
- **REG-TIMELINE-010 — Trim preview sync:** Real-time trim preview follows the active trim boundary.
```

This is a non-breaking registry addition; do not bump the governance major version.

- [ ] **Step 3: Add V9.4 A1 real-device checklist section**

Append to `RELEASE-CHECKLIST.md`:

```markdown
## V9.4 A1 Core Timeline gate
- [ ] One source video initializes as one selected clip.
- [ ] Real-time scrub updates preview while the fixed playhead stays centered.
- [ ] Split occurs at playhead, keeps playhead position, and selects the right clip.
- [ ] Left trim works with a large touch handle and real-time trim-in preview.
- [ ] Right trim works with a large touch handle and real-time trim-out preview.
- [ ] No trim/split result can be shorter than 0.1 seconds.
- [ ] Delete closes the timeline gap automatically.
- [ ] Deleting the final clip reaches a recoverable No Clips state.
- [ ] Undo and Redo restore Split/Trim/Delete deterministically.
- [ ] A new structural edit after Undo clears Redo.
- [ ] Pinch zoom changes scale without changing clip/source durations.
- [ ] Timeline - / + zoom works and clamps at supported limits.
- [ ] Playback auto-scrolls timeline beneath the fixed-center playhead.
- [ ] Touching/scrubbing timeline during playback pauses before seeking.
- [ ] Trim gesture wins over pinch/scrub when a trim handle is active.
- [ ] Android portrait core flow PASS is recorded.
- [ ] Desktop pointer core flow PASS is recorded.
```

- [ ] **Step 4: Write release gate tests**

Create `tests/release/v94-release-gates.test.mjs` to assert:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const standard = readFileSync('docs/development-standard/VFORGE-STANDARD-v1.md', 'utf8');
const checklist = readFileSync('docs/development-standard/RELEASE-CHECKLIST.md', 'utf8');
const index = readFileSync('index.html', 'utf8');

for (let number = 1; number <= 10; number += 1) {
  const id = `REG-TIMELINE-${String(number).padStart(3, '0')}`;
  test(`${id} is registered`, () => assert.equal(standard.includes(id), true));
}

test('release checklist contains V9.4 Android and desktop core acceptance', () => {
  for (const phrase of [
    'V9.4 A1 Core Timeline gate',
    'Android portrait core flow PASS',
    'Desktop pointer core flow PASS',
    'fixed playhead stays centered',
    '0.1 seconds',
    'Pinch zoom',
    'No Clips'
  ]) assert.equal(checklist.includes(phrase), true, `missing ${phrase}`);
});

test('V9.4 production modules are loaded exactly once', () => {
  for (const file of [
    'v94-timeline-state.js',
    'v94-timeline-history.js',
    'v94-timeline-view.js',
    'v94-timeline-controller.js',
    'v94-timeline-gestures.js'
  ]) {
    assert.equal((index.match(new RegExp(file.replace('.', '\\.'), 'g')) || []).length, 1, `${file} duplicated`);
  }
});
```

- [ ] **Step 5: Update release-governance expectations**

Extend `tests/release/release-governance.test.mjs` required checklist phrases with:

```text
V9.4 A1 Core Timeline gate
fixed playhead
0.1 seconds
Pinch zoom
No Clips
```

Do not weaken existing Candidate/Release Candidate/Stable truthfulness assertions.

- [ ] **Step 6: Run release tests**

```bash
node --test tests/release/*.test.mjs
```

Expected: PASS, 0 failures.

- [ ] **Step 7: Commit Task 9**

```bash
git add docs/development-standard/VFORGE-STANDARD-v1.md docs/development-standard/RELEASE-CHECKLIST.md tests/release/protected-core.test.mjs tests/release/release-governance.test.mjs tests/release/v94-release-gates.test.mjs
git commit -m "test: add V9.4 timeline release gates"
```

---

### Task 10: Full verification and Candidate handoff

**Files:**
- Verify all changed files from Tasks 1–9.
- Do not edit Protected Core during this task.

**Interfaces:**
- Produces evidence for **Candidate** only. RC/Stable remain blocked until required Android and desktop real-device acceptance is recorded.

- [ ] **Step 1: Run all Node tests fresh**

```bash
node --test tests/static/*.test.mjs tests/regression/*.test.mjs tests/release/*.test.mjs
```

Expected: 0 failed tests.

- [ ] **Step 2: Run JavaScript syntax checks on every active V9.4/compat module**

```bash
node --check js/v94-timeline-state.js
node --check js/v94-timeline-history.js
node --check js/v94-timeline-view.js
node --check js/v94-timeline-controller.js
node --check js/v94-timeline-gestures.js
node --check js/v91-editor.js
node --check js/v93-editor.js
```

Expected: every command exits 0 with no syntax error.

- [ ] **Step 3: Verify Protected Core is unchanged**

```bash
git diff --exit-code b7dd1743fab052525cf71b8f297692171aa95725 -- \
  js/auth.js \
  js/firebase-config.js \
  firestore.rules.txt \
  js/processor.js \
  service-worker.js
```

Expected: exit code 0 and no diff.

- [ ] **Step 4: Verify production ownership and no legacy V9.1 active timeline mount**

Run:

```bash
grep -n "v94-timeline-" index.html
grep -n "getTimeline94" js/v91-editor.js
grep -n "VForgeTimeline94" js/v93-editor.js
grep -n "VForgeTimeline94" js/v94-timeline-controller.js
```

Expected:
- each V9.4 production script appears once;
- V9.1 compatibility branch is present;
- V9.3 V9.4 zoom guard is present;
- one runtime `window.VForgeTimeline94` owner is created by the controller.

- [ ] **Step 5: Run local browser smoke flow before real-device promotion**

Serve repository root with a simple local server, for example:

```bash
python3 -m http.server 8080
```

Then verify in browser DevTools:

```text
load source video
one clip appears
scrub -> preview follows
split -> two clips, right selected, playhead unchanged
left trim -> preview follows trim-in
right trim -> preview follows trim-out
delete -> gap closes
undo -> delete restored
redo -> delete reapplied
pinch or emulated touch zoom -> scale only
+/- zoom -> scale only
play -> timeline auto-scrolls beneath fixed center
manual timeline touch/drag -> playback pauses
last clip delete -> No Clips CTA
replace source -> one fresh clip, history cleared
```

Any failure keeps status at Development.

- [ ] **Step 6: Record Candidate evidence**

If Steps 1–5 pass, record:

```text
Release: V9.4 A1
State: Candidate
Automated tests: PASS
Syntax: PASS
Protected Core: unchanged
Local browser smoke: PASS
Android real-device: PENDING
Desktop acceptance: PENDING unless Step 5 was performed as the formal target desktop flow
```

Do **not** label RC or Stable yet.

- [ ] **Step 7: Perform required Android portrait acceptance for RC**

On the target Android browser/device, record PASS/FAIL evidence for this exact sequence:

```text
load video
→ scrub real-time
→ split
→ trim left
→ trim right
→ delete
→ undo
→ redo
→ pinch zoom
→ - / + zoom
→ playback auto-scroll
→ touch timeline while playing pauses and scrubs
→ delete final clip
→ add/select video recovery
```

Also verify no Preview/Timeline/Tool Scroller/Dock overlap and no unreachable primary action.

- [ ] **Step 8: Perform desktop pointer acceptance for RC**

Record PASS/FAIL for:

```text
load video
select clip
mouse scrub
split
left/right trim
undo/redo
- / + zoom
Ctrl/Cmd + wheel zoom
playback auto-scroll
manual scrub pauses playback
No Clips recovery
```

- [ ] **Step 9: Make the release decision truthfully**

```text
Candidate:
  automated + structural + local smoke PASS

Release Candidate:
  Candidate + Android target flow PASS + desktop flow PASS + evidence recorded + no blocker

Stable:
  RC + full relevant RELEASE-CHECKLIST PASS + exact deployed GitHub Pages build verified + no unresolved blocker
```

A successful deployment alone is not proof of Stable.

- [ ] **Step 10: Commit any evidence-only checklist updates if recorded in-repo**

If release evidence is written into tracked documentation:

```bash
git add docs/development-standard/RELEASE-CHECKLIST.md
git commit -m "docs: record V9.4 A1 acceptance evidence"
```

If evidence is not stored in the repository, do not create an empty commit.

---

## Regression Coverage Map

| Regression | Primary automated guard | Real-device confirmation |
|---|---|---|
| REG-TIMELINE-001 | `v94-timeline-state.test.mjs` Split state | Split visual/right selection |
| REG-TIMELINE-002 | state trim min-duration test | Thumb trim cannot cross min |
| REG-TIMELINE-003 | delete gapless state test | Delete visually closes gap |
| REG-TIMELINE-004 | history + controller tests | Undo/Redo sequence |
| REG-TIMELINE-005 | controller mapping test | Real-time scrub/playback sync |
| REG-TIMELINE-006 | state zoom isolation test | Pinch and +/- preserve durations |
| REG-TIMELINE-007 | gesture priority unit test | Trim handle does not scrub/pinch |
| REG-TIMELINE-008 | invalid Split state test | Boundary Split gives safe feedback |
| REG-TIMELINE-009 | final Delete state test | No Clips recovery UI |
| REG-TIMELINE-010 | controller trim-preview test | Frame follows trim boundary |

## Spec Coverage Check

- One source / split-derived clips: Tasks 1, 4, 5.
- Original clip order / no reorder: State transition rules in Task 1; no reorder command exists anywhere.
- Gapless timeline: Task 1 recomputation + REG-TIMELINE-003.
- Selected state / large handles: Tasks 3 and 8.
- Fixed-center playhead: Tasks 3, 5, 6.
- Real-time scrub: Tasks 5 and 6.
- Split at playhead / right selected / playhead retained: Task 1 + Task 4.
- Real-time left/right trim preview: Tasks 4 and 5.
- Delete + No Clips: Tasks 1, 4, 8.
- Pinch and `- / +` zoom: Tasks 1, 3, 6.
- Undo/Redo structural-only: Tasks 2 and 4.
- Touch during playback pauses: Tasks 5 and 6.
- Trim > pinch > scrub priority: Task 6.
- One timeline owner / no stacked patch: Task 7 + architecture tests.
- V9.3 regression preservation: Task 7 + Task 10.
- Protected Core isolation: Tasks 9 and 10.
- Android/desktop release evidence: Task 10.
- Excluded A2/A3 features: no task introduces them.

## Execution Notes

- Use `superpowers:using-git-worktrees` before implementation if an isolated workspace has not already been created.
- Run TDD RED before implementation in each task; do not accept a test that only ever passes.
- For regression tests that validate a bug fix, use the verification skill's Red-Green discipline: after the test passes, temporarily revert the relevant fix and confirm the test fails, then restore the fix and confirm PASS again when practical.
- Commit after each task only after its targeted tests pass.
- Do not rename stable public DOM hooks unrelated to timeline ownership.
- If implementation discovers a need to edit any Protected Core file, stop and obtain explicit scope approval before changing it.
