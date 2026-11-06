# Staged appearance — internal implementation

This isolated preview implements the owner's requested magical click/auto appearance. It is not a production meadow, an economy, approved artwork, or a claim of human enjoyment. Open this directory through the repository's HTTP preview server. There are no new runtime dependencies.

## Art and controls

The fixed meadow is `craft-study/assets/meadow.webp`. The material uses one stable foundation source, `craft-study/assets/flower-base.webp` (stage02), and only the two complete corollas from `craft-study/assets/flower.webp`. The existing `knit.webp` button and `design-system/skin-v4.css` supply the shared visual language. All assets remain unchanged; runtime Canvas masks select semantic material.

The art agent supplied six sections: green foundation → white center → complete white corolla → pink center → complete pink corolla → closed bud. Source02 centers stay above the new corollas. Bud/greenery/corollas/centers have fixed depth order. The final result stays this same composite; it never swaps to another finished bitmap. A common transform puts the group at roughly 165–175 CSS px wide on 390×844, with its foot around 65% of the scene height.

One click adds .08 section. Automatic mode is an explicit visible choice and takes 35 seconds per section. Fresh state is empty with auto off. Clicks continue during animation and carry across section boundaries. The repeat control appears only after all six sections are finished.

Use `?effect=sparks` (default) or `?effect=wave`. Both use the same `p^0.25` material opacity and approximately 200–250ms settling of that opacity. Completed material is always opaque and stationary. A click flashes the existing button, sends a small warm light to the current section in 210ms, then makes a few contour glints. Wave also sweeps a local light band clipped to that material. Repeated wave accents are coalesced visually without losing click work. Completion uses real contour points; no generic rings remain. The final accent lasts about one second, then the finished scene is quiet. Reduced motion keeps material progress and restrained stationary light feedback.

Contour particles sample sufficiently opaque pixels and reject tiny disconnected components. That filtering only chooses FX coordinates; original art alpha is never thresholded, recolored, blurred or rewritten.

## Model and observation contract

`model.mjs` exports `VERSION`, `SECTION_COUNT`, `CLICK_WORK`, `STAGE_MS`, `createState(now)`, `advance(state, now)`, `click(state, now)`, `setAuto(state, enabled, now)`, `serialize(state)`, `deserialize(text)`, and `snapshot(state)`. Operations return new state objects. Work is cumulative in section units; snapshot includes work, stage/completedSections, stageIndex, stageProgress, started, auto, finished/complete, completedAt and lastUpdatedAt.

The isolated save key is `mir-stage-magic-v1`. A high-water clock prevents duplicate elapsed-time work after reload or clock rollback. Loading applies elapsed auto work once and saves the settled state immediately. Auto pause is persisted. Storage failures and unreadable own saves stay visible; no old game/research save is read or modified.

Read-only `window.__stageStudy.snapshot()` adds effect, storageAvailable and artReady. `points()` returns viewport CSS-pixel bounds for the scene, controls, item, ground anchor, and named sections/anchors. It has no progress setters. Stable elements are `#scene`, `#craft`, `#auto`, `#reset`. `document.documentElement.dataset.ready` becomes true only after all images load and the first frame paints; resize clears it until repaint.

## Author's inspection and retained failures

1. `01-semantic-contact.png` records six static cumulative compositions. The art agent inspected it and the full final scene: whole corollas, no foreign fragments, no green patches on the gold centers, and a restrained scale suitable for testing movement. This was a static review only.
2. `01-first-click-390.png`: author and art agent rejected `sqrt(p)` at the first .08 click; the green material nearly disappeared into the green meadow. `02-first-click-lifted.png` records an intermediate `.18 + .82*sqrt(p)` attempt. These were not the eventual `p^0.25` curve.
3. `03-*` records the shared `p^0.25` curve at first click and roughly 24/48/72%. The first material is more readable. Late progress is more compressed visually; the director and critic must assess whether the remaining clicks stay worthwhile. This capture still contained generic completion rings and less constrained effect bursts.
4. The art agent challenged those rings as disconnected from material. `04-*` removes them, bounds rapid-click glints, coalesces repeated local waves, and retains both variants for independent movement review. The author inspected real scene captures, not only a renderer mockup. A complete cycle used real UI clicks and ended with work6, auto off and the same saved result on reload, with no browser errors. The explicit auto control, pause and reload were also smoke checked.

The selected author evidence is in `../author-evidence/`, including the failed first-click frame, static contact, quarter-progress frames, both movement recordings and the quiet result. The director owns independent QA and the critic's selection. Repository checks passed 47/47; validation had 0 errors and 9 existing draft bunny-asset warnings. These technical checks do not establish visual parity or pleasure.
