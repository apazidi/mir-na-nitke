# Meadow flower: four real construction stages

DRAFT for Issue #20. All four stage assets and the transparent finished sprite exist. The package remains excluded from production discovery pending full independent in-world art review. No runtime, UI or economy changed. Work requirement 600 is an experimental authoring value.

Creative premise: a low ivory and dusty-rose crochet daisy clump with sage leaves and a moss base, visually subordinate to the rabbit. Intended later sniff interaction is a design candidate, not a new engine capability or interaction declared here.

Construction: stage00 moss foundation → stage01 leaves and bare stems → stage02 golden centers and ivory bud → stage03 complete ivory/rose flowers. The final master was generated once; all three construction states are explicit edits of that same master. Exactly four built-in image_gen calls were used across the initial iteration and authorized second repair cycle. Full prompt records are in source/PROMPTS.md. Four original1199×1312 RGBA masters are retained unedited.

The warm palette, tight cotton stitches and padded volume match the inspected reference-v4 and rabbit hero-v2 material direction. Common camera/placement is retained with small generated edge/fiber drift rather than identical pixels. The moss base is stable at the bottom anchor; removing future parts produces meaningful visual progress. This is not yet an owner-approved artistic baseline.

Exports: all five files are1024×1820 WebP with the same placement rectangle. Finished and stage03 intentionally share pixels. Total game art ~959KiB including the duplicated endpoint. Source alpha is retained without thresholding or background replacement; many yarn pixels are near-opaque rather than exactly255.

Review: contact-sheet.webp shows stages00→03 left to right on a checkerboard. alpha-dark.png (#18251c) and alpha-cream.png (#f8ecd4) show all four states composited at half original source resolution. The initial final/partial alpha diagnostic passed independent review before early edits. Phone360×800,390×844,430×932 previews show final art on neutral linen; these are art evidence, not gameplay screenshots. Early-stage source edits and actual meadow composition still require final independent acceptance.

Rebuild: inside this item directory run `npm ci --ignore-scripts --no-audit --no-fund` then `npm run export`. Sharp0.35.5 is package-local and locked; both clean installation (parent) and normal export (writer) passed. node_modules is ignored. Sharp performs resize/padding/format export and diagnostic composition only; it does not fabricate or repaint stages.

Validation: product validator0 errors/9 warnings, all9 for the pre-existing missing bunny draft art. Flower has no missing-asset warnings. All13 baseline tests passed through explicit PowerShell-expanded paths; shared npm test wildcard fix belongs to parent integration.

Next gate: independently inspect the full progression and technical browser harness at the three phone sizes, compare in-world scale with rabbit and verify no completed future objects appear early. Keep DRAFT until this gate and the agreed artistic approval are complete. No further image-generation calls authorized in this bounded task.
