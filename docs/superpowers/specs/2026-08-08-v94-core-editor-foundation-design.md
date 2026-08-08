# V-Forge V9.4 A1 — Core Editor Foundation Design Specification

**Status:** Approved Design
**Date:** 2026-08-08
**Baseline:** V-Forge V9.3.2 + Development Standard v1.0
**Scope:** Core timeline editing foundation for one source video with split-derived clips.
**Runtime target:** Mobile-first browser editor, with desktop support and no Protected Core changes.

## 1. Purpose

V9.4 A1 establishes a stable, non-destructive editing foundation before V-Forge expands into multi-source clips, multi-track editing, transitions, keyframes, or Kotlin migration.

The release focuses on one source video. The user may split that source into multiple timeline clips, trim them, delete them, undo/redo structural edits, scrub in real time, and zoom the timeline. Clip order remains original and the timeline is always gapless.

The design follows V-Forge Development Standard v1.0: single ownership, no stacked hotfix architecture, source-owner fixes, permanent regression guards, Protected Core isolation, and truthful Candidate/RC/Stable release gates.

## 2. Approved Product Scope

### 2.1 Included

- one source video per project session;
- split-derived clips from that source;
- selected-clip state;
- fixed-center playhead;
- real-time scrubbing;
- split at playhead;
- left/right trim with large touch targets;
- real-time trim preview;
- delete selected clip;
- automatic gapless recomputation;
- timeline zoom through pinch and `- / +` buttons;
- undo/redo for structural edits;
- safe empty/no-clips state;
- mobile portrait priority;
- supported landscape/tablet/desktop behavior;
- regression tests and real-device acceptance gates.

### 2.2 Explicitly excluded

- multiple source videos;
- clip reordering;
- multi-track editing;
- editable audio tracks;
- overlay tracks;
- transitions;
- keyframes;
- speed ramps;
- text animation;
- advanced export-pipeline redesign;
- Kotlin migration.

## 3. Architecture Decision

The approved architecture is a **single Timeline State Engine**.

```text
Source Video
   ↓
TimelineState
   ├── clips[]
   ├── selectedClipId
   ├── playheadTime
   ├── zoom
   ├── isPlaying
   ├── trimSession
   └── history
```

The timeline, preview adapter, gestures, and history all read or mutate one authoritative state model instead of maintaining independent copies of editing state.

## 4. Timeline Data Model

Each timeline clip is non-destructive metadata that references the same source video.

```text
clip {
  id
  sourceStart
  sourceEnd
  timelineStart
  timelineEnd
}
```

`Split` replaces one clip with two metadata ranges that reference the same source. `Trim` changes only `sourceStart` or `sourceEnd`. `Delete` removes clip metadata. After structural edits, timeline positions are recomputed so clips remain gapless and preserve original order.

Minimum valid clip duration is **0.1 seconds**.

## 5. Core Commands and Ownership

```text
SPLIT
TRIM_LEFT
TRIM_RIGHT
DELETE
SELECT
SET_PLAYHEAD
SET_ZOOM
UNDO
REDO
```

The state engine owns validation and state transitions. UI components request commands but must not directly mutate clip arrays or history. Selection and ordinary playhead movement do not create undo entries. Undo/redo is reserved for structural edits that affect project output.

## 6. Interaction Contract

### 6.1 Selection
Tap a clip to select it. The selected clip receives a clear outline and large trim handles. Clip-dependent actions are disabled when selection is invalid.

### 6.2 Fixed-center playhead
The playhead remains fixed at the center of the timeline interaction area. During scrub and playback, timeline content moves beneath it. Preview and timeline use the same playhead state.

### 6.3 Real-time scrub
Horizontal timeline drag scrubs media under the playhead. Preview updates in real time. Timeline interaction while playing pauses playback first. Playhead time is clamped to valid project duration.

### 6.4 Split
Split occurs at the playhead. The playhead stays at the split point. The right clip becomes selected. A split is rejected if either result would be shorter than 0.1 seconds; rejected operations leave state unchanged.

### 6.5 Trim
Large left/right handles are optimized for thumb input. Left-handle drag previews trim-in; right-handle drag previews trim-out. A clip cannot be trimmed below 0.1 seconds. Valid trims recompute downstream positions gaplessly. Trim gesture ownership has priority over scrub.

### 6.6 Delete
Delete removes the selected clip and closes the gap. Selection moves to the nearest valid surviving clip. Deleting the final clip enters No Clips state safely.

### 6.7 Zoom
Pinch-to-zoom and `- / +` controls change timeline scale only. Zoom never changes clip duration, source ranges, or project duration.

### 6.8 Playback
Timeline content auto-scrolls beneath the fixed-center playhead. Preview time and playhead remain synchronized. Touching/scrubbing the timeline pauses playback before manual seeking.

### 6.9 Undo/Redo
Undo/Redo covers Split, Trim, and Delete. It restores deterministic structural state and relevant selection. Undo/Redo buttons are disabled when their stacks are empty. A new structural edit after Undo clears the redo branch.

## 7. UI and Responsive Contract

V9.4 preserves:

```text
HEADER
PREVIEW
TIMELINE
TOOL SCROLLER
DOCK
```

The Video Editor remains a dark creative workspace in both app themes.

### 7.1 Mobile portrait
Mobile portrait is the primary target. Timeline must provide a readable clip strip, fixed-center playhead, large trim handles, clear selected state, reachable controls, no overlap with Preview/Tool Scroller/Dock, and safe-area compliance.

### 7.2 Gesture priority

```text
Trim handle drag
→ Pinch zoom
→ Timeline scrub
```

The winning gesture retains pointer ownership for the active interaction.

### 7.3 Desktop
Desktop uses the same state contract with click/select, drag/scrub, drag/trim, and consistent zoom controls. Full keyboard-shortcut expansion is outside A1 scope.

## 8. Empty, Loading, and Invalid States

### No Clips

```text
No clips
→ preview empty/recovery presentation
→ structural controls disabled
→ CTA to add/select video
```

### Source not ready
Split/Trim and time-dependent mutations stay disabled until valid media metadata exists.

### Invalid metadata
Invalid duration/timing data enters a recoverable state with feedback instead of producing NaN/negative ranges or crashing.

## 9. Proposed Module Boundaries

```text
js/
├── v94-timeline-state.js
├── v94-timeline-controller.js
├── v94-timeline-history.js
└── v94-timeline-gestures.js

css/
└── v94-timeline.css
```

- `v94-timeline-state.js`: authoritative state, invariants, derived timing.
- `v94-timeline-controller.js`: public editing commands and bridge to preview/editor behavior.
- `v94-timeline-history.js`: undo/redo.
- `v94-timeline-gestures.js`: pointer/touch arbitration, scrub, trim, pinch.
- `v94-timeline.css`: timeline visuals only; no global editor-theme ownership.

The implementation plan may refine boundaries after code inspection, but single ownership and separation of responsibilities are mandatory.

## 10. V9.3 Integration Boundary

V9.4 A1 takes authoritative ownership of timeline editing state and interactions. Existing V9.3 preview/workspace behavior may be used through an adapter. `v93-editor.js` must not become a second independent clip/playhead state owner. Stable public hooks are preserved unless migration is explicitly scoped.

## 11. Protected Core

Outside scope:

```text
js/auth.js
js/firebase-config.js
firestore.rules.txt
js/processor.js
service-worker.js
```

Any unexpected need to change Protected Core stops implementation and requires an explicit scope amendment and targeted verification.

## 12. Permanent Regression Registry — V9.4

- **REG-TIMELINE-001:** Split produces two valid clips referencing the same source.
- **REG-TIMELINE-002:** Trim cannot produce a clip shorter than 0.1 seconds.
- **REG-TIMELINE-003:** Delete preserves a gapless timeline.
- **REG-TIMELINE-004:** Undo/Redo restores structural state deterministically.
- **REG-TIMELINE-005:** Fixed-center playhead remains synchronized with preview during scrub/playback.
- **REG-TIMELINE-006:** Zoom changes scale only, never source/duration state.
- **REG-TIMELINE-007:** Trim-handle gesture ownership takes priority over scrub.
- **REG-TIMELINE-008:** Invalid boundary split is rejected without mutation.
- **REG-TIMELINE-009:** Deleting the final clip enters No Clips safely.
- **REG-TIMELINE-010:** Real-time trim preview follows the active trim boundary.

Existing V9.3 Showcase/theme/layout/navigation/picker regression guards remain active.

## 13. Testing Architecture

State-engine tests cover at minimum:

```text
initial clip state
split
trim left
trim right
delete
gapless recompute
select
playhead clamp
zoom clamp
undo
redo
empty timeline
```

Static/integration tests verify one active timeline owner, dependency/DOM initialization order, no detectable duplicate IDs/listeners, existing regression guards, and Protected Core integrity.

Before Stable, Android portrait must pass:

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
→ +/- zoom
→ playback auto-scroll
→ touch timeline while playing pauses and scrubs
```

Desktop must pass the equivalent pointer flow.

## 14. Release Gates

**Candidate:** implementation complete, relevant automated tests pass, no known automated blocker, Protected Core integrity confirmed.

**Release Candidate:** Candidate + Android real-device core flow PASS + desktop core flow PASS + no blocker gesture/layout failure + evidence recorded.

**Stable:** RC + all relevant release checklist items PASS + no unresolved blocker + exact deployed build verified + existing V9.3 contracts intact.

Deployment success alone is not proof of stability.

## 15. Definition of Done

V9.4 A1 is Done only when:

1. One Timeline State Engine owns clip/playhead/zoom editing state.
2. One source can be split non-destructively into ordered clips.
3. Split, Trim, Delete, Undo, and Redo obey approved behavior.
4. Minimum clip duration is 0.1 seconds.
5. Timeline remains gapless after structural edits.
6. Playhead remains fixed-center during scrub/playback.
7. Scrub and trim preview update in real time.
8. Pinch and `- / +` zoom change scale only.
9. Gesture ownership prevents trim/scrub/pinch conflicts.
10. No Clips and media-not-ready states are safe.
11. Mobile/desktop layouts have no blocker overlap.
12. Existing V9.3 regression tests remain green.
13. `REG-TIMELINE-001` through `010` are guarded where automation is practical.
14. Protected Core remains unchanged.
15. RC/Stable claims require real-device evidence.

## 16. Locked User Decisions

- A1 foundation scope, not A2/A3.
- One source video; split creates multiple derived clips.
- Original clip order; no reorder.
- Gapless timeline.
- Large mobile trim handles.
- Real-time scrub preview.
- Split keeps playhead at split point.
- Right clip auto-selected after split.
- Undo/Redo included now.
- Minimum clip duration 0.1 seconds.
- Real-time trim boundary preview.
- Pinch-to-zoom plus `- / +`.
- Fixed-center playhead with timeline moving beneath it.
- Playback auto-scroll under fixed playhead.
- Timeline touch during playback pauses first.
- Single Timeline State Engine architecture.
