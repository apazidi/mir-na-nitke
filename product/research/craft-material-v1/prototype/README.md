# Internal pompom material study

This is a scoped making experiment, not a production game, approved artwork, or evidence of human enjoyment. Open this directory through the repository preview HTTP server. It has no external runtime dependencies.

## Gesture and observations

The pointer is the grip between the scissors' rings. The active blades sit about 43 CSS px ahead of it, diagonally up-left. Pointer down positions the open scissors; moving at least 4 px closes them over the current short blade segment. Holding still and pointer up do not cut. One drag is one undoable pass, even if it contains many closures. Pointer cancellation preserves actual cuts and ends the pass. Keyboard arrows position the scissors; Space makes one cut; Ctrl/Cmd+Z undoes the last pass. Finish only preserves the current lengths and pauses editing.

The blade angle is fixed at 45 degrees in this first probe. There is no target contour, template mask, progress setter, completion threshold, or final-asset substitution. Each of 3,600 exposed, curved strands belongs to an immutable projected 3D bundle; editing changes only the retained length of intersected strands. Depth orders the strands and determines their light. Detached tails start at the cut intersection. Projected cutting treats the blade as passing through the visible bundle thickness; it is not a full 3D scissors simulation.

Stable DOM: `#scene`, `#undo`, `#finish`, `#reset`; the first rendered frame sets `document.documentElement.dataset.ready = 'true'`.

Read-only `window.__craftStudy`:

- `snapshot()` returns a detached copy: seed, lengths, changedFibers, cutOperations, undoDepth, finished, profileBounds and storageAvailable.
- `points()` returns absolute viewport CSS px: canvas, center, scale, materialBounds, tool, handle, gripOffset, blade endpoints and every strand endpoint. To place the cutting line at a given screen point, move the real pointer to that point plus `gripOffset`.

Pure model API in `model.mjs`: `createState`, `makeFibers`, `beginPass`, `cutSegment`, `endPass`, `undo`, `finish`, `resume`, `save`, `load`, `snapshot`, `pointAt`, `visiblePoints`. `cutSegment` returns `{ state, fragments, changed }`; all input states stay unchanged. Serialized state validates its version, seed, counts and length ranges. Each real snip is saved to the isolated `mir-craft-material-pompom-v1` key; existing game saves are untouched.

## Author's internal material iterations

1. Distributed roots with long strands to a shared outline: self-rejected as a radial straw nest with a central hole.
2. Short curved fibers distributed on a disk: self-rejected as flat tangled noodles/shavings. Strong continuous highlights made every strand resemble wire.
3. More fibers, gentler curves and spherical lighting: soft edge and volume improved, but the planar distribution still resembled a matted pad. Early screenshots for steps 1–3 were overwritten during smoke checks and are **not preserved**; no reconstructed evidence is claimed.
4. Projected 3D spherical bundle, muted rose yarn and depth-based light: preserved as `../evidence/03-sphere-first-390.png` and its left-cut pair. Still sparse at the front centre.
5. Extra front-facing tips, gentler root spread, and a single composite fiber shadow: `../evidence/04-bundle-390.png`, left-cut views at 360×800 / 390×844 / 430×932. The center is denser; a real left cut changes 288 strands in one undoable pass. Browser page errors: zero.

The author reviewed the device captures against `design-system/reference-v4.webp`. The procedural material has readable warm volume and local deformation, but still falls below the reference's tactile thread fidelity. This is **not visual PASS**. Current residual risks: central texture can look tangled and the fixed scissors angle may feel awkward. Independent interaction/critic review is required before owner presentation.

## Performance correction after first working commit

The initial 24-step Playwright drag took about 2.6 seconds. Geometry now rejects strands whose bounding boxes miss the blade, and the generated-bundle cache retains at most two seeds. Persistence and UI sync run once per pointer event, not once per interpolated micro-cut. Unchanged animation frames reuse the material bitmap; after a cut, the renderer redraws only the actual detached-tail bounds, expanded to include yarn width, nearby strands and shadows. It still draws the current model, with no substitute finished texture.

The same 24-step gesture took 585 ms after this change and altered the same 288 strands. This is a local automation measurement, not a mobile-device frame-rate guarantee. After finishing and hiding the scissors/particles, the author compared the entire canvas RGBA buffer with a full render after reload: 1 pixel differed by more than 2 channel levels; maximum difference 4/255; mean maximum-channel difference 0.00414/255. No cut-off fibers returned. Evidence: `../evidence/06-partial-left-cut-390.png` and `06-performance.json`.

Checks: pure-model empty cut, identical repeat, exact undo, save/load and finish invariants passed. Repository tests 47/47; content validation 0 errors, 9 existing draft bunny-asset warnings. These are technical checks, not a judgment of pleasure.
