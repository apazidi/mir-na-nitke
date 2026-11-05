# Meadow flower: golden master and construction proof

DRAFT for Issue #20. This iteration contains two actual same-master states, not a finished four-stage package. `art/stage-00.webp` and `art/stage-01.webp` are intentionally absent pending a later controlled edit cycle and art review. No runtime/UI or economy changed. Work requirement 600 is an experimental authoring value.

Creative premise: a low ivory and dusty-rose crochet daisy clump with sage leaves and a moss base, visually subordinate to the rabbit. Intended later sniff interaction is a design candidate, not a new action declaration here.

Sources: `source/master-final.png` and its edited `source/master-partial.png` (1199×1312 RGBA). Built-in image_gen was used in exactly two calls. Full prompts are retained in `source/PROMPTS.md`. Final has dense tactile stitches, padded petals and a readable silhouette matching the warm reference palette. Partial removes the two flowers' petals while retaining centers, bud, stems and leaf base; small generated fiber/edge drift remains and requires independent review. This is not yet an owner-approved artistic baseline.

Exports: 1024×1820 WebP, common placement rectangle and bottom anchor. `finished.webp` and `stage-03.webp` share the final pixels; `stage-02.webp` is the actual partial edit. Three exported files total ~770 KiB (final duplicated for stage endpoint). Real alpha is retained, including soft yarn edges; source alpha has many near-opaque rather than exactly-255 pixels, so dark-background halo inspection remains part of acceptance. No alpha threshold/removal was performed.

Review: `review/contact-sheet.webp` is partial left / final right, checkerboard composited only for evidence. `review/phone-{360x800,390x844,430x932}.webp` show the final sprite on neutral linen, not a gameplay screenshot. Reference and rabbit hero-v2 were inspected before generation; phone review confirms recognizable stitches and clean composition. Actual meadow composition/collision review remains pending integration.

Rebuild with `node product/content/items/meadow-flower/export.cjs`; run `npm ci --ignore-scripts` inside this package first. Sharp is pinned locally at 0.35.5 with a lockfile (integrity entries retained from the repository art pipeline). The exporter uses normal `require('sharp')`, then resizes/pads/exports only. This sandbox has no cached Sharp metadata; network install stalled and was stopped. Export was checked using existing Sharp 0.35.5 via temporary NODE_PATH, so clean installation still needs network-enabled verification. No procedural imitation or image-editing substitution.

Validation: product validator 0 errors / 11 warnings (9 existing bunny draft assets; 2 missing early flower stages). All 13 baseline tests pass via explicit PowerShell-expanded test paths. The existing `npm test` wildcard is incompatible with this Windows Node version; parent integration owns that shared-script fix.

Next: independent golden-frame and partial review; then separately authorize the next controlled edit cycle for moss-base and leaf/stem construction stages, inspect dark-background alpha and stage alignment, and only consider ready promotion after four real coherent states pass review.

Repair-cycle diagnostic evidence: review/alpha-dark.png (#18251c) and alpha-cream.png (#f8ecd4), lossless PNG at half source resolution, partial left/final right. These are actual alpha composites without source edits. Raw source-view colored fringe does not visibly remain in the dark composite at this scale; independent review remains required.

