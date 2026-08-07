# V-Forge Release Checklist

**Release:** ____________________
**Commit:** ____________________
**Tester/device:** ____________________
**Browser:** ____________________
**Date:** ____________________
**Target state:** Development / Candidate / Release Candidate / Stable

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
