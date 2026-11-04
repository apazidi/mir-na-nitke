---
name: create-meadow
description: Use when adding a new five-project meadow, thematic scene, new island/patch or linked area in «Мир на ниточке». Produces one declarative meadow package with day/evening art, five slots, supported interactions and atlas links; does not redesign the app.
---

# Create a new meadow

## Input

Theme, setting, resident or emotional promise, five item IDs (or a provisional list of content dependencies), and optional neighboring meadow. If items are not yet ready, continue in `draft` without inventing finished assets.

## Read before acting

1. Repo `AGENTS.md`.
2. `product/architecture/CONTENT-CONTRACT.md` and `product/architecture/UI-ASSET-POLICY.md`.
3. `design-system/DESIGN-CONTRACT.md` and `design-system/reference-v4.webp`.
4. `product/examples/meadow.sample.json` and existing meadow manifests, if any.

## Procedure

1. Select a new kebab-case ID and a dedicated feature branch such as `meadow/<id>`. This agent's **only product write scope** is `product/content/meadows/<id>/`.
2. Define a compelling **five-item set**, not a long scrolling map. The scene should tell a small story. Describe why objects change the world and what will become interactive after each completion.
3. Create a **clean** day background and evening background of the same 1024×1820 world artboard. Do not paint any of the five craftable items as completed. One background and five independent item sprites make the scene composable.
4. Define exactly five slots in `manifest.json`, each with unique `slot.id`, `itemId`, normalized `x/y`, scale and drawing `z`. Keep the main character dominant, leave adequate empty space for future item additions and UI safe areas.
5. Define supported reactions via `interactions`: `greet`, `pet`, `sniff`, `glow`, `sway`, `land`, `visit`, `idle`. Each reaction lists slots that must be completed, and an actor slot. Do not write custom animation code or offer an action the engine does not support.
6. Define `plannedNeighbors` (unresolved IDs, locked previews) separately from `neighbors` (active links to ready meadows). The world atlas is owned by the engine; do not reimplement it.
7. If referenced items have not merged, set `status: draft`; CI should identify missing dependencies as warnings. When ready, all five item IDs must resolve to `ready` items with finished sprites and all meadow background art must exist.
8. Run `npm --prefix product run validate` and `npm --prefix product test`; inspect phone previews at 360×800, 390×844 and 430×932. Check that any clickable-looking object really responds, is a locked affordance, or is visually minor background.
9. Attach a day/night contact sheet and progression mockup (0/5, 1/5, 3/5, 5/5 unlocked) for art review. The release reviewer decides if the actual result matches the **approved** game look.
10. PR summary: five slots, dependencies, interaction table, atlas links, screenshots, tests, ready/draft status and blockers.

## Hard exclusions

- No changes to `product/app/`, `product/ui/`, `design-system/`, other meadow/item folders, shared manifests or old PoC.
- Never create an HTML page with bespoke buttons for this meadow. Content must render in the shared GameShell.
- Never invent an item image to hide a missing dependency, or make a meadow `ready` while any required item is missing.

## Output / success criterion

One independent meadow folder + PR. It assembles five existing item packages into a coherent, beautiful, living diorama with supported interactions, and it requires no modifications to the engine or shared visual system.
