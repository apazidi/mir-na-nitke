# Content-first architecture — knitted world 1.0

## Reason for the rebuild

PoCs v2–v4.1 proved idle/clicker, staged crafting, and a small living meadow. They also showed that rebuilding UI per feature destroys the accepted art direction. The new product separates **engine**, **skin** and **content**.

## Three ownership boundaries

1. **Engine** (`product/app/`, to be implemented): shared save model, idle economy, state machine, stage transitions, renderer, navigation, touch handling, common animations, interactions and telemetry. Content agents must not edit it.
2. **Skin / art direction** (`design-system/` + future `product/ui/`): fixed responsive GameShell, button treatments, panels, text-safe regions, world coordinate system, and art standards. Content agents must not edit it.
3. **Packages** (`product/content/`): `items/<id>/manifest.json` with artwork, and `meadows/<id>/manifest.json` with layout/interactions. No JS or CSS is allowed inside a content package.

The runtime loader should discover item and meadow manifests at build time (e.g., via an import glob), validate them, and generate a content index. **There is no hand-edited central list**. An item PR only touches its item folder; a meadow PR only touches its meadow folder.

## New item's contract

Each item describes its name, tags, total abstract work points, staged graphical states (4–8 high-quality artwork images), and the finished transparent sprite. Work points are deliberately NOT real crochet stitches or rows. The engine owns click and idle rates globally. All stage images share one camera and aligned artboard. Stage 0 starts at 0.0; final stage at 1.0. Items use `art.styleId = crochet-diorama-v1`.

`status: draft` means the package can be worked on without breaking the app; it does **not** appear in the published game. `status: ready` requires all paths to exist and to be compatible with the art direction, and a reviewer to check the actual pictures. The CLI only checks structural validity, not beauty.

## New meadow's contract

One meadow has **exactly five slots**, each tied to an item ID and normalized position in a world artboard of 1024×1820. Scene base art has no already-unlocked furniture/characters. `slot.x`, `slot.y` are normalized coordinates within the artboard, `scale` is relative to the supplied finished sprite and `z` is drawing order.

Interactions are declarative recipes with supported engine actions. The meadow can request `greet`, `pet`, `sniff`, `glow`, `sway`, `land`, `visit` or `idle`. A new interaction type requires a separate engine task, **not custom JS in the meadow**. Interactions list their required completed slot IDs.

Meadows may specify `plannedNeighbors` that are not ready yet; they render only as locked previews. Active `neighbors` must resolve to other ready meadows. In a draft, unresolved item references are permitted and reported; a ready meadow requires five ready items.

## Concurrency example

- Agent A owns `product/content/items/apple-tree/`.
- Agent B owns `product/content/items/hedgehog/`.
- Agent C owns `product/content/items/berry-basket/`.
- Agent D owns `product/content/meadows/autumn-garden/`; it references those IDs but stays `draft` while they are pending.
- Integration agent validates ready packages and builds preview screenshots once item PRs land. No one needs to edit or rebase a global product registry.

## Content lifecycle

1. `draft`: full manifest and placeholders permitted; validation reports warnings for missing images/dependencies.
2. `ready`: images and dependency graph complete; validation errors on missing assets/links. Eligible for an app build, subject to visual sign-off.
3. Release: app imports only ready content from the generated index. Keep release promotion separate from agent authoring.

No game state migration should be coupled to new item/meadow PRs. Saves key progress by stable IDs. Renames and deletion require a dedicated migration plan.

## Production gates (not merely a README promise)

- Machine-readable manifest validation (implemented in `product/scripts/validate-content.mjs`).
- Unit tests for validators and dependencies (implemented in `product/tests/`).
- Artwork review: a contact sheet for the 4–8 stages and finished item, plus PNG/WebP test at 360, 390, and 430 CSS-pixel device widths; no sudden shape, color, light or camera shifts.
- UI review: compare to the **approved** golden art, not the previous inadequate screenshot; never auto-update visual baselines.
- Content PRs are accepted without changing the engine or UI. If a task truly requires a new engine capability, split it into a separate PR.

## Roadmap

**Now:** prove two skills can author independently checkable packages and a validator can reject broken packages. **Next:** create one high-fidelity `rabbit` item and one meadow based on the approved art; implement loader and shared GameShell; import stable idle logic. **Later:** parallelize item/meadow art production only after one end-to-end package passes full art and gameplay QA.
