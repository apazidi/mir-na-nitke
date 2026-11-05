# Scene v2 — experimental art candidate

**Draft. Not an approved visual baseline and not ready content.** This directory is an art experiment only. It does not change the engine, economy, content manifests, historical routes, or `design-system/reference-v4.webp`. The complete integrated game still requires independent technical and visual review.

The supplied day/evening landscape restores the reference's yarn canopy, creek, stone and floral depth while keeping all five unlockable objects separate. New cottage, flowering tree and butterfly sprites replace the remaining synthetic fixture figures. Six stable controls use illustrated tactile linen and baked Russian lettering instead of generic text cards.

## Asset contract

- `exports/meadow-day.webp`, `meadow-evening.webp`: supplied 1024×1820 clean background candidates.
- `exports/{house,tree,butterfly}-stage-{00,01,02,03}.webp`: four transparent 1024×1820 workshop artboards per item. Stages show base → structure → partial finish → completed item at suggested thresholds 0 / 0.35 / 0.7 / 1.
- `exports/{house,tree,butterfly}-finished.webp`: separate transparent 1024×1024 placement sprites. Their measured alpha bounds appear in `review/asset-report.json`; padded canvases must not become rectangular hit targets.
- `ui/{workshop,meadow,projects}.webp`: 512×384 navigation controls; intended visible size about112×84 CSS px.
- `ui/{knit,complete,pet}.webp`: 768×256 action controls; intended size150×50 CSS px.
- Every control also has `-pressed` and `-disabled` exports. Pressed uses lower brightness; disabled uses lower saturation while preserving legible lettering, silhouette and alignment. The UI must keep the corresponding accessible Russian `aria-label`.

The labels are exactly **Мастерская, Полянка, Проекты, Вязать, Завершить, Погладить**. Values, prices and progress remain live UI text outside these assets. No object is painted into the background to impersonate an unlocked item.

## Reproducible export

```sh
cd product/art-experiments/scene-v2
npm ci
npm run export
```

Node20.9+ and the committed lockfile install Sharp0.35.5. This is local deterministic image processing, with no external model/API call, credentials, environment-specific file paths, or paid service. `source/prompts.json` archives all eight built-in image_gen prompts, reference roles and original tool output locations, including the parent Product Director's day/evening generations; all selected masters are copied into `source/`. Backgrounds reproduce the supplied recipe exactly: resize1024×1820 with `fit:'fill'`, then WebP quality90. Their expected sizes are594628 and508388bytes.

Each item's four states come from **one coherent 2×2 atlas**. Every cell has the same627×627 crop and is resized to1024×1024 without trimming individual states. Workshop placement is fixed at(0,440) on the1024×1820 canvas. This prevents the partially built pieces from growing or moving merely because their silhouette is smaller. There are no separately generated unrelated stage images. Small handmade illustration differences within an atlas remain subject to visual review.

The initial navigation generation had a diffuse low-alpha haze. A targeted image_gen transparency repair produced `nav-atlas-clean.png`; the original is retained for provenance and is not consumed. Export clears residual alpha≤12 noise and makes alpha≥248 fully opaque, preserving other edge alpha. No chroma key or white-background deletion is used. Transparent RGB is zeroed. Control crops share the union of the three corresponding silhouettes; no labels are stretched independently.

## Evidence and limitations

`review/asset-report.json` records source/output SHA-256, byte lengths, dimensions, alpha counts and normalized bounds. All33 new WebPs together use about3.52MB, excluding the two supplied backgrounds. Every new output has both fully transparent and fully opaque pixels. Control lettering and item edges were inspected on the dark forest and cream diagnostics, with no opaque box or pale fringe observed.

`review/*-contact.png` shows each construction sequence on a checkerboard. `*-alpha-dark.png` and `*-alpha-cream.png` expose matte problems. Individual `*-phone-{360,390,430}.png` files are asset placement studies only, **not screenshots of the game**. The root Product Director and UI lane supply the real workshop/day/evening screenshots and390×844 reference comparison after integration.

The reference's camera, yarn texture, warm left light, rose cottage roof and organic leaf shapes guided this candidate. The cottage's honey window, separate flowering sapling and decorative butterfly are intended to bring finished-scene depth closer to the approved reference. This does not establish artistic parity by itself: scene composition, rabbit prominence, lighting interaction, button scale and all-five-item playability must be checked in the real app before promotion. The evening backdrop currently reuses the same warm sprites; no dedicated night sprite set is claimed.
