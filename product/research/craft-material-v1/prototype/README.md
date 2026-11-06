# Internal pompom material study

This is a scoped making experiment, not a production game, approved artwork, or evidence of human enjoyment. Open this directory through the repository preview HTTP server. It has no external runtime dependencies.

## Gesture and observations

The pointer is the grip between the scissors' rings. The active blades sit about 43 CSS px ahead of it, diagonally up-left. Pointer down positions the open scissors; moving at least 4 px closes them over the current short blade segment. Holding still and pointer up do not cut. One drag is one undoable pass, even if it contains many closures. Pointer cancellation preserves actual cuts and ends the pass. Keyboard arrows position the scissors; Space makes one cut; Ctrl/Cmd+Z undoes the last pass. Finish only preserves the current lengths and pauses editing.

The blade angle is fixed at 45 degrees in this first probe. There is no target contour, template mask, progress setter, completion threshold, or final-asset substitution. Each of 3,600 complete, curved strands runs from a central tie to a 3D tip; editing changes only the retained length of intersected strands. Current cut-tip depth orders the strands. Detached tails start at the cut intersection. Projected cutting treats the blade as passing through the visible bundle thickness; it is not a full 3D scissors simulation.

Stable DOM: `#scene`, `#undo`, `#finish`, `#reset`; the first rendered frame sets `document.documentElement.dataset.ready = 'true'`.

Read-only `window.__craftStudy`:

- `snapshot()` returns a detached copy: seed, lengths, changedFibers, cutOperations, undoDepth, finished, profileBounds and storageAvailable.
- `points()` returns absolute viewport CSS px: canvas, center, scale, materialBounds, tool, handle, gripOffset, blade endpoints and every strand endpoint. To place the cutting line at a given screen point, move the real pointer to that point plus `gripOffset`.

Pure model API in `model.mjs`: `createState`, `makeFibers`, `beginPass`, `cutSegment`, `cutSweep`, `endPass`, `undo`, `finish`, `resume`, `save`, `load`, `snapshot`, `pointAt`, `visiblePoints`, `surfacePoints`. `cutSegment` and `cutSweep` return `{ state, fragments, changed }`; all input states stay unchanged. `cutSweep(state, previousBlade, currentBlade)` takes two `{a,b}` blade segments and intersects the actual strand with the narrow swept area boundaries. Serialized state validates its version, seed, counts and length ranges. Model version 2 saves to `mir-craft-material-pompom-v2`; v1 lengths are rejected rather than reinterpreted against new roots. The old research key and existing game saves remain untouched.

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

## Critic repair: real central roots (version 2)

The critic found that version 1 placed roots on an outer shell at .62–.80 radius. A deep pass shortened many strands while leaving intact material outside the blade: it carved an internal channel rather than changing the outer profile. This invalidated the shaping interaction despite earlier technical checks. The version 1 captures above are retained as evidence of that rejected implementation.

Version 2 retains each complete physical strand from a central tie at .04–.10 radius to its tip. Cutting uses that entire curve. Rendering shows the outer .36 parameter interval of the remaining strand as an approximation of buried-fiber occlusion; after a deep cut, the newly exposed interval is still part of the same physical curve. There is no separate shell, immutable body or global deletion beyond a target line. Depth sorting uses the current endpoint. Dirty redraw includes the old and new visible intervals, the cut tail and their shadows.

A second defect emerged during the repair: sampling only separated blade lines missed strands nearly parallel to the 45-degree blades. Movement now cuts the narrow region actually swept between successive blade positions, including the trajectories of both blade ends. A stationary pointer still performs no work. The model's numerical cut tolerance was reduced to 1e-7 so small retained tips do not remain outside an exact full cut.

Regression evidence: `../evidence/07-model-regression.mjs` tests the full physical geometry after complete vertical/horizontal cuts, actual blade sweeps, unchanged right-side fibers, repeat, undo, reload, finish and rejection of v1 saves. Run it with Node. In real UI gestures, a shallow x=-.88 pass left the edge at -.79656; a deeper x=-.47 pass moved it to -.38656; a y=-.72 top pass moved the top to -.63656. The .08344 offset is half of the diagonal blade's projected span. The outcome is the actual deliberately asymmetric cut shape, with no detached clumps remaining outside it.

The author inspected `07-central-roots-{initial,shallow,deep,top}.png`. Cached-vs-full-reload RGBA checks were repeated for all three cuts, not only the shallow one: maximum channel differences 2/4/5 out of 255, pixels differing by more than 2 levels 0/1/2, mean differences below .007/255. Lengths reloaded exactly; browser errors were zero. Measurements are in `07-central-roots-measurements.json`. These checks address the model defect; they do not approve the remaining material/gesture quality.

The first 430px resize capture landed after canvas clearing but before the next paint. That failed capture is retained as `07-central-roots-resize-before-paint-430.png`; the corrected `07-central-roots-initial-430.png` was taken after two animation frames and readiness. Resize now clears the ready flag until its replacement frame is painted. The failed frame is not presented as evidence of a finished material render.

## Preview label and storage messages

The existing eyebrow now says `TECHNICAL PREVIEW — ART NOT APPROVED`. Header height remains 84px and the canvas retains its previous dimensions at 360×800, 390×844 and 430×932; no overflow was observed. No model or cutting gesture changed in this correction.

A denied storage read/write or denied write remains visibly reported even after Finish: the form is available only while the page is open. An unreadable own v2 save also keeps its warning through initial UI synchronization, including an empty stored value. A successful new save clears the old warning. Tests used browser initialization to deny Storage methods or supply invalid saved JSON, not to set crafting progress. Selected captures and results: `08-preview-390.png`, `08-storage-denied-finished.png`, `08-preview-storage-check.json`.

An updated V2 measurement of the same 24-step, 110px left-edge mouse drag took 818ms and changed 309 strands. The earlier 585ms figure belongs to V1 geometry. Both are local headless Chrome automation observations on one Windows machine, not mobile FPS or a guarantee of perceived responsiveness.
