# Visual contract: Мир на ниточке / Living Meadow

**Design reference:** [reference-v4.webp](./reference-v4.webp) is the art direction the user approved for v4. This is the visual *target*, not a screenshot of current implementation.

## Non-negotiable appearance rules

1. **World-first:** at 390×844 the meadow occupies at least 65% of the visible screen height, starts near the top, and takes at least 94% of width. No large flat tabs before the world.
2. **Premium handcrafted art:** rounded stitched linen labels, warm volume/light, knitted objects, decorative depth. Plain rectangles, default emoji menus, stock material cards and large empty gradients do not qualify as finished design.
3. **Single visual shell:** shared tokens and styles in `design-system/skin-v4.css`. New features should use its existing classes, not replace the app frame with an unrelated layout.
4. **Navigation and actions:** short, tappable controls are anchored to the lower part of the world scene. The actual game world, not UI chrome, remains dominant.
5. **Character first:** the rabbit must be clearly visible and remain central; locked future projects must be visually secondary.
6. **Progressive reveal:** unavailable products must not be visibly completed beforehand. No painted-in tree/house/butterfly as a substitute for their future project sprites.
7. **Responsive:** screens of 360×800, 390×844, 430×932 must have no horizontal overflow, inaccessible tap targets or colliding text.
8. **Functionality must be preserved:** idle/click/flower project/meadow placement/petting/night toggle/atlas all remain valid. Art changes must not reset save state or change gameplay without a separate explicit decision.

## Development workflow / visual freeze

- Treat the approved v4 reference as a design brief *and* a review asset. Don't assume a passing unit test means a visually acceptable screen.
- Build new features on a branch or separate preview route. Never overwrite the last satisfactory published route during design experiments.
- Run `node --test` in the candidate and `python tests/visual_guard.py`. This checks mobile geometry and compares screenshots to the stored provisional baseline.
- Open the latest screenshots next to `reference-v4.webp` (in the PR or review) before promotion. A review must confirm lighting, material, composition, character scale and controls—not just screenshot similarity to the previous implementation.
- If a visual change is intentional, update the baseline screenshot **in the same PR** with an explanation and side-by-side comparison. Baseline updates are a deliberate review event, not something to do automatically on every build.
- Do not call the current candidate approved or production-quality without user review. The guard prevents accidental visual changes to a chosen implementation; it cannot replace art direction approval.

## Current status (2026-11-04)

`v4.1-design/` is a **layout and visual governance candidate**, NOT the final v4 reference parity. It restores the immersive hierarchy, stitched elements and bottom navigation but still uses the low-detail background and small character assets from the earlier prototype. Improving those requires a controlled dedicated art pack. Keep `/v4.1/` unchanged until the new candidate reaches acceptable fidelity.
