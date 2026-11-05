# Rabbit art — revision 2 for #11

**DRAFT. Awaiting human artistic approval.** [PR #15](https://github.com/apazidi/mir-na-nitke/pull/15), [review request](https://github.com/apazidi/mir-na-nitke/pull/15#issuecomment-6665983785). No ready package, shared UI change, approved baseline update or playable release.

## Visual evidence

- [0/25/50/75/100% and alpha contact sheet](review/contact-sheet.png)
- [Approved reference vs actual 390×844 browser capture](review/reference-comparison-390.png)
- [Final in-world day/evening placement with contact shadow](review/meadow-alpha-proof.png)
- `review/phone-{360x800,390x844,430x932}-{000,025,050,075,100}.png`: 15 actual Chromium screenshots.
- `review/stages-{360x800,390x844,430x932}.png`: five-frame raster comparisons at device sizes.
- `review.html?stage=025`: art-only local browser preview. No simulated UI or prices.

## Changes requested → revision 2

1. **Character coherence / pose:** replaced the separately stacked component atlas with a newly painted **single complete ¾ hero**. Small bead eyes, cream planted paws without pink pads, attached limbs, occlusion at the neck and shoulders, visible tail and a perspective muzzle. The finished sprite comes directly from this coherent painting.
2. **Stage anchor:** edited early states show a connected open belly cup, then a connected open-neck torso. Every nonempty state uses exactly the same transform and source pixels below y=1220 (feet and lower contact area). No detached future parts lie on the table. The full head appears at 75%, ears complete at 100%. Percentages are abstract crafting milestones, not an amigurumi pattern.
3. **Composition / grounding:** a richer fixed workshop plate adds a woven work mat, foreground linen, deeper window/cubby layers and a working strand. Two soft contact-shadow lobes ground the toy on that mat. The meadow proof uses a smaller explicit placement and a separate ground shadow; no unlocked toy is baked into either empty meadow background.
4. **Reproduction / CI:** `export.cjs` replaces Windows/System.Drawing in the active path. One master descriptor, retained raster sources, exact dependency versions and a lockfile are sufficient to export on Node/Sharp without a browser, image service or Windows. Browser screenshots are a separate optional command. The original PowerShell spike remains as a reference, writing only to ignored `legacy-v1/` so it cannot overwrite revision 2.

## One documented master

`source/master.json` owns all source paths, artboard, source canvas, stage sequence, transform, head silhouette mask, preserved contact region and meadow placement. Raster sources:

- `hero-v2.png`: coherent ¾ completed toy, 1024×1536 RGBA.
- `body-v2.png`: anchored edit of hero with open neck and no head/ribbon.
- `cup-v2.png`: anchored edit of that body, shallow connected open crochet belly.
- `workshop-v2.png`: fixed richly layered empty workshop plate.
- `meadow-day.png`, `meadow-evening.png`: retained empty environmental backgrounds.

This is a retained layered raster master, not a 3D scene. Early source images were edited **from the hero**, then reviewed against it; they are not independent character prompts. To prevent subtle generative drift at the table, the exporter restores original hero RGBA pixels below y=1220 in both edited states. Stage 75 is the hero with a documented silhouette mask hiding ears; it is not a separately rendered character. Source pixels, stage masks and transform are all reviewable. The alpha sprite contains neither table nor ground shadow. SVG is used only for masking, shadow falloff and review labels; the character and scenery are real generated raster artwork.

Generation used built-in `image_gen` with the approved reference. See [revision 2 prompt record](source/PROMPTS-v2.md). Source hashes and the hash of the shared contact patch are in `review/asset-report.json`. Retained masters make export reproducible; stochastic generation itself is not claimed to be reproducible. `source/master-v1.json`, `source/parts.png`, `source/workshop.png`, `source/PROMPTS.md` and `export.ps1` preserve the superseded spike, not inputs to the active exporter.

## Export locally or in CI

Node >=20.9, npm, and the checked-in lockfile. From repository root, identical commands in PowerShell or a Linux/macOS CI shell:

```sh
npm ci --prefix product/art-experiments/rabbit-v1
npm --prefix product/art-experiments/rabbit-v1 run export
```

This active path requires **no System.Drawing, PowerShell, browser, API key or image-generation service**. It validates required sources/canvas sizes, stage order, export names, real nonempty alpha, 1024×1820 dimensions, shared contact pixels, and a 1.5 MB WebP limit per file. It writes nine WebP files, the full-artboard RGBA PNG sprite, contact sheet, three mobile raster sheets, and source/asset hash reports. PNG stage intermediates are no longer needed or consumed.

For actual browser evidence:

```sh
npx --prefix product/art-experiments/rabbit-v1 playwright install --with-deps chromium
npm --prefix product/art-experiments/rabbit-v1 run capture
```

Alternatively set `CHROME_PATH` to an installed Chrome executable. `npm --prefix product/art-experiments/rabbit-v1 run review` runs both export and capture. `NODE_PATH` may point to a preinstalled bundled runtime, but is not needed after `npm ci`. Capture never recompresses/replaces artwork. Export is independent of capture. A failed browser launch fails capture. Geometry and the 15 viewports are recorded in `review/capture-report.json`.

The scripts and lockfile are contained within this art task; no shared GitHub Actions workflow is changed. Linux CI can run the above export command; this revision was executed on Windows/Node and clean-installed from the lockfile. A Linux runner has not been executed in this session. Pixel/byte equality across libvips/platform/font versions is not promised; the report records exact runtime versions and hashes. Raster asset generation does not depend on font availability; only contact-sheet labels do.

## Weights and checks

- Five WebP stage scenes: **~2.23 MB total**, ~425–477 KB each.
- Finished transparent WebP: **~235 KB**; lossless RGBA PNG is also retained.
- Empty day/evening WebP: **~302/318 KB**.
- Runtime art set (five stages + sprite + two backgrounds): **~3.08 MB**. Duplicate golden-frame review alias adds ~477 KB. Review screenshots and source masters are not runtime downloads. Exact bytes: `review/webp-report.json`.
- Export + browser capture pass. No horizontal overflow at 360×800, 390×844, 430×932. The complete logical artboard uses `object-fit:contain`; tall-device letterboxing is deliberate.
- `npm --prefix product test` still fails because this Windows Node does not expand the repository's test glob; the equivalent explicit file invocation passes **13/13**. Shared test configuration is outside this art task.
- `npm --prefix product run validate`: **0 errors, 9 existing warnings** for missing art in draft `items/bunny`. This experiment does not modify or register that package.
- `git diff --check` passes. Historical UI visual guard does not exercise this art-only route; prototypes and visual baselines remain unchanged.

## Artistic review still required

Inspected the updated contact sheet, three phone widths, approved-reference comparison and day/evening placement proof. The pose, small eyes, cream paws and integrated volume are closer to the reference, with a richer workshop and a stable grounded stage anchor. This is a new proposed master, **not an art-director-approved scene**.

Review points: identity and yarn scale relative to the original reference; the head-mask contour at 75%; subtle seams where edited upper bodies meet the preserved lower region; whether cup → torso → head → ears is the desired abstract sequence; shadow density and contact point on the woven mat; final sprite scale/lighting on the meadow. The workshop remains a different environment from the outdoor reference. Evening is still a reference-based image edit, not a physically relit 3D world. In-world images demonstrate placement and alpha, not final five-slot layout, interactions or pet animation. Final shared UI safe areas require their separate integration review.

Do not merge, promote to `ready`, or close #11 before human visual approval.
