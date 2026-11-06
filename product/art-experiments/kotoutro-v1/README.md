# Котоутро у пруда — experimental art candidate

**Draft artwork, not an approved baseline or ready content.** This isolated experiment supplies five separately earned objects for a second meadow. It changes no engine, UI, content manifest, economy, save format, approved reference or historical route. The root Product Director owns integration and publication after independent review.

The scene is a warm knitted garden veranda beside a pond. The background contains **none** of the five projects: no cat, coffee table/cup, duckling, chair or leaf shelter. The orange cat is the main character; the two actual WB product photos guided recognizable identity, while `reference-v4.webp` and the actual first-meadow screenshot guided material, camera and lighting. The photos are reference-only and never shipped as game sprites. No WB lettering, logo or catalog graphic appears in the exported art.

## Runtime files

The scene uses 27 WebPs, together 5,463,642 bytes. The separate contextual control set adds 27 WebPs / 1,436,138 bytes, for 54 runtime files / 6,899,780 bytes in the complete pack.

- `exports/meadow-{day,evening}.webp`: two1024×1820 background candidates with matching composition and changed illumination.
- `exports/{id}-finished.webp`: five1024×1024 transparent placement sprites.
- `exports/{id}-stage-{00,01,02,03}.webp`: twenty1024×1820 transparent workshop artboards, compatible with the existing workshop background and moving yarn.

| ID | Subject | Meaningful four-stage progression |
| --- | --- | --- |
| `kot-cat` | Sleepy orange cat, turquoise forehead mask, ivory rabbit slippers; empty hands | Body foundation → stuffed unfinished body → face and partly finished accessories → finished cat |
| `kot-coffee` | One round crochet table with one white coffee cup | Leg foundations → partial tabletop → unfinished cup → complete table and coffee |
| `kot-duck` | Fluffy ivory/light-grey duckling with grey bill and webbed feet | Body foundation → unbrushed unfinished body → partly brushed duckling/wing → finished fluffy duckling |
| `kot-chair` | Dusty-rose armchair with cream cushion, piping and blanket | Seat base → unfinished body → cushion and partly attached trim → finished chair |
| `kot-leaf-house` | Folded leaf-shaped shelter with cream lining; no duck baked inside | Base → growing sidewalls → unfinished leaf canopy → finished shelter |

The supplied WB duck photo is light ivory/grey with a dark-grey bill and feet; the adaptation follows the actual reference, rather than recoloring its whole body dark grey. The cat's coffee cup becomes the separate `kot-coffee` project, so it is not visible before that project is earned.

## Sources and reproducible export

```sh
cd product/art-experiments/kotoutro-v1
npm ci
npm run export
```

Node 20.9+ and locked Sharp 0.35.5 perform only local deterministic processing. No model/API call, credentials, paid service, external worktree or machine-specific path is required to export. All required masters and proof references are retained under `source/`. `source/prompts.json` archives 15 built-in image_gen calls with exact prompts, input roles and original tool output paths. The two WB photo URLs and product IDs are recorded there; the photographs are inspiration/reference material, not new catalog exports. `npm run export` rebuilds scene and controls; `export:scene` and `export:ui` rebuild either group independently.

Every item begins with one finished master, then one coherent2×2 construction atlas derived from it. Each equal square cell is resized as a whole to1024×1024; no stage is independently trimmed or fitted. Explicit reviewed vertical canvas translations in `stageOffsetY` align the floor anchor across the four stages, preserving scale and horizontal position. The largest correction is84pixels for the leaf foundation; the final cell stays unchanged. Workshop placement is always(0,440) on the1024×1820 canvas. The final placed sprite comes from the same bottom-right cell as stage03. Construction states contain unfinished physical parts, not faded or covered completed art.

Targeted image_gen edits remove pale shadow matting from the cat and duck atlases and the leaf-house master. Originals are retained for provenance; the exporter explicitly selects the cleaned cat/duck atlases. Export clears alpha≤12 noise, zeroes transparent RGB, makes alpha≥248 opaque, and preserves intermediate edge alpha. This is not chroma keying or white-background removal. Runtime WebPs use quality95, alphaQuality100, effort6. The background recipe resizes the full portrait to1024×1820 with `fit:'fill'` and the same WebP settings.

## Placement and evidence

`layout.json` supplies proposed normalized centers/scales, draw order, reserved HUD/control regions and an anchor for the **existing** guest rabbit. That rabbit is only a composition reference for the generic visitor interaction, not a sixth craftable item. The guest's padded canvas may extend beyond the world; the visible alpha bounds remain on screen. The proof renderer clips only the transparent outside margin and never rescales its silhouette.

`review/asset-report.json` records27 output hashes/sizes/dimensions, source hashes, alpha bounds/counts, stage framing and14 composition studies. Every one of the25 object/stage exports has both fully transparent and opaque pixels.

- `review/scene-{day,evening}-{0,1,3,5}-390.png`: progression with zero, one, three and five earned objects at390×844.
- `review/scene-{day,evening}-5-visitor-390.png`: five projects plus the existing guest rabbit.
- `review/scene-{day,evening}-5-{360,430}.png`: full compositions at360×800 and430×932.
- `review/{id}-contact.png`: four-stage sequences on checkerboards.
- `review/{id}-alpha-{dark,cream}.png` and `finished-alpha-{dark,cream}.png`: actual exported WebPs on contrasting backgrounds.
- `review/leaf-before-alpha-repair-*.png`: explicitly retained rejected pale-matte evidence; these are not current exports.

These are **asset composition studies, not screenshots of playable software**. They intentionally contain no invented UI. Evening object lighting approximates the shared renderer's brightness/saturation adjustment. There are no dedicated evening object variants in this pack. The integration owner must review actual workshop/day/evening screens with shared controls and compare390×844 to the approved reference before promotion. Contact with the veranda/pond bank, guest scale, tap targets and interaction effects remain integration review concerns.

## Contextual controls

The additional controls match the existing `scene-v2/ui/pet.webp` linen, rose piping, stitching and warm brown lettering. One 3×3 atlas provides all nine labels. `source/ui/prompts.json` archives this additional built-in image_gen call and its retained template; no separate style was introduced.

| ID | Exact baked label |
| --- | --- |
| `water` | Полить |
| `sway` | Качнуть |
| `knock` | Постучать |
| `land` | Позвать |
| `greet` | Поздороваться |
| `brew` | Заварить |
| `feed` | Угостить |
| `rock` | Покачать |
| `shelter` | Зажечь |

Files are `ui/{id}.webp`, `ui/{id}-pressed.webp`, `ui/{id}-disabled.webp`, all 768×256. Preserve the corresponding accessible Russian label in HTML. Scale the whole image; never overlay or reflow its lettering. Values and cooldowns remain live UI outside the artwork. Intended display size is 150×50, checked in `review/ui-states-150.png` (columns normal, pressed, disabled). `ui-normal-{dark,cream}.png` checks compositing on contrasting backgrounds.

The exporter aligns each complete button into a common source canvas without changing individual scale, then applies one shared resize. State changes affect only brightness/saturation. `review/ui-report.json` verifies identical alpha hashes across all three states, real transparent and opaque pixels, and hashes for 27 controls and three source files. Scene and UI reports intentionally have separate source inventories.
