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
