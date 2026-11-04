---
name: create-knit-item
description: Use when adding a new knit/crochet item (toy, tree, flower, house, decoration) to «Мир на ниточке». Produces one self-contained content package with a staged-art manifest; does not edit engine, UI, or other packages.
---

# Create a new knitted item

## Input

A concept/name and, if known, target meadow, narrative role, visual reference and difficulty. If no difficulty is given, choose a reasonable draft and label its numbers experimental. Do not block on noncritical details.

## Read before acting

1. Repo `AGENTS.md`.
2. `product/architecture/CONTENT-CONTRACT.md` and `product/architecture/UI-ASSET-POLICY.md`.
3. `design-system/DESIGN-CONTRACT.md` and approved `design-system/reference-v4.webp`.
4. `product/examples/item.sample.json` for the manifest shape.

## Procedure

1. Select a stable lowercase kebab-case ID and check no existing `product/content/items/<id>/` conflicts.
2. Make a new feature branch named `item/<id>` (or an equivalent dedicated working branch). This agent's **only product write scope** is `product/content/items/<id>/`.
3. Design a recognizable, lovable final item consistent with the *existing* cream-yarn / warm-light art direction. The item must be attractive at phone scale and use a fixed 3/4 camera. A finished item cannot change silhouette/lighting unexpectedly across stages.
4. Plan **4–8 meaningful construction stages**, not per-stitch animation. All stages share the same logical artboard/anchor and are exported to `art/stage-00.webp` etc. Use a single controllable master if possible; never claim separately generated incompatible images are a consistent series.
5. Prepare a **transparent finished sprite** for placement in meadows. Do not bake future unlocks or full meadow backgrounds into the item. Include small appropriate behavior variants only when the engine supports them.
6. Write `manifest.json` matching the example. Fields include `id`, `schemaVersion`, `kind`, `status`, `displayName`, `tags`, `workUnits`, `art.styleId`, `art.stages`, `art.finishedSprite`. No arbitrary JavaScript, HTML or CSS is allowed.
7. Run `npm --prefix product run validate` and `npm --prefix product test`. If images are missing, keep status `draft` and clearly report missing files. Mark `ready` only when all image paths actually exist and pass the human artwork review.
8. Produce a 4–8-stage contact sheet and a phone-size finished-sprite preview for review. Keep this evidence in this item's own directory (e.g. `review/contact-sheet.webp`), not in shared UI paths.
9. PR summary: the creative premise, exact stage sequence, final interactions/tags, image dimensions + file budget, test results and any blockers. Do **not** report a package as playable if it has not been integrated/approved.

## Hard exclusions

- No changes to `product/app/`, `product/ui/`, `design-system/`, other item folders, meadow folders, shared manifests or legacy PoC pages.
- No changes to common click/idle economy, screen layouts, titles, button artwork, navigation, save schema or styling.
- No fake images/placeholder CSS presented as production art. If art tools are unavailable, deliver a validated `draft` manifest and an explicit asset brief only.

## Output / success criterion

A single conflict-free item folder and a PR. A release-ready item is discoverable automatically without edits outside its folder; its artwork matches the approved style and its 4–8 stages are coherent at mobile size.
