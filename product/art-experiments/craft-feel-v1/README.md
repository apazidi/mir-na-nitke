# Calm clearing — one craft-feel study

**Status: draft, not approved.** This is one exploratory daytime background for the isolated flower-making study. It is not a new production meadow or a replacement for the approved reference.

The previous empty meadow already contained the visual work of many projects: a terrace, railings, large flower beds, an ornamental canopy and pond. This candidate reserves the central and lower clearing for the player's work while keeping yarn texture, warm upper-left light and forest depth. No craftable characters, flowers, furniture or structures are painted into the background.

## Source and export

- `source/meadow-day-master.png`: the sole generated candidate, 941×1672, unchanged built-in `image_gen` output.
- `prompt.json`: exact prompt, target and input role. The existing `../kotoutro-v1/exports/meadow-day.webp` was the edit target for material, camera and lighting continuity.
- `exports/meadow-day.webp`: 1024×1820, 638600 bytes. Small proportional enlargement and central cover crop; no distortion, repainting or recolouring in the export script.
- `asset-report.json`: sizes, SHA-256 hashes and native review dimensions.

Built-in image generation was used; no paid API/CLI fallback or additional variants were used.

## Review evidence

The actual export was inspected at 360×800, 390×844 and 430×932. At all three sizes the clearing stays open, the foreground textile remains visible, and the forest reads as a secondary distant plane.

`review/reference-empty-flower-390.png` places the approved reference, empty candidate and a **composition study** into equal 390×844 frames. The reference is contained without distortion. The third frame composites the existing flower from the committed preview bundle over the candidate; it is not a screenshot of implemented gameplay. The flower becomes the clear focal point and the completed work is visibly distinguishable from the empty ground. No UI was invented for this art study.

Limitations: the open ground is intentionally much quieter than a completed meadow; distant woodland is conventional and not a distinctive final scene identity. Five-slot placement, evening lighting, mobile interaction and artistic acceptance are not established by this asset. Only one daytime draft is supplied.

## Reproduce

With Node and the pinned Sharp dependency installed:

```sh
npm ci --prefix product/art-experiments/craft-feel-v1
npm run export --prefix product/art-experiments/craft-feel-v1
```

`CRAFT_SHARP_MODULE` optionally accepts an absolute module URL for an already-installed Sharp 0.35.5. This was used for this export after the local package installation encountered a Windows directory permission error. No fallback image renderer was used.

The exporter reads the committed reference and existing `play-preview/product/content/items/meadow-flower/art/finished.webp` solely to create the labelled composition study. All outputs are confined to this experiment directory.
