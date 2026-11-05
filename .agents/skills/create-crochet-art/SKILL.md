---
name: create-crochet-art
description: Use when designing or preparing consistent, reusable high-quality crochet/amigurumi graphics for Мир на ниточке, including golden frames, staged artwork, transparent finished sprites, or meadow backgrounds. Applies before marking item or meadow artwork ready.
---

# Create cohesive crochet game art

## Purpose

Produce a high-quality handcrafted textile illustration set that can actually be used by the new game engine. Avoid the historical failure mode: a beautiful poster followed by a much poorer interactive scene.

## Sources of truth

1. Repository `AGENTS.md`.
2. `design-system/DESIGN-CONTRACT.md` and approved `design-system/reference-v4.webp`.
3. `product/architecture/CONTENT-CONTRACT.md` and `product/architecture/UI-ASSET-POLICY.md`.
4. The specific item/meadow GitHub issue and owner-approved art references.
5. For agent session boundaries and handoff, `product/AGENT-LAUNCH.md`.

## Required process

1. **Inspect** the current reference and the target mobile screen, describe camera, textile material, proportions, lighting, visual hierarchy and safe areas. Do not claim equivalence without looking at both.
2. **Agree on a master:** create a single controllable source (layered artwork or 3D scene). If an image-generation tool is available, use it for the golden reference and materials, but do not independently regenerate each stage and assume consistency.
3. **Golden frame first:** make the final item and one partially crafted state. Ensure the materials look like real crochet/amigurumi without needing to animate every stitch. The user has chosen stage-based crafting with approximately 4–8 high-quality states.
4. **Stage pipeline:** export consistent states from the master; camera, light, object placement, silhouette and recurring props must stay stable. Put finished parts on the table only after their crafting stage. No future unlocks on meadow backgrounds.
5. **Game exports:** stages as compatible WebP/PNG files, plus a **transparent finished sprite** independent of the background, and any small optional animation variants. Assets must match 1024×1820 logical artboard used by the game.
6. **Review:** generate a contact sheet showing all stages, a finished sprite on a checkerboard, and phone-size previews at 360×800, 390×844, 430×932. Compare the result to the approved reference by eye. Check alpha, image size and total byte budget.
7. **Handoff:** create one feature branch, commit source, exports and review evidence only in the task's owned directory, open a PR with visual evidence and unresolved issues. Mark package `ready` **only after real assets exist, validation passes and a reviewer approves their appearance**.

## Ownership / isolation

For the first art spike on issue #11, own only `product/art-experiments/rabbit-v1/**`. Do not modify the engine, game shell, shared design system, historical PoCs or someone else's content folder. Once the master is approved, a separate item-package task may import its production exports into `product/content/items/bunny/**`.

For later item/meadow work, use `create-knit-item` or `create-meadow` as the content authoring workflow, and this art skill for visual-production rules. Do not create one-off UI styles in content packages.

## Acceptance rules

- The object, **not** the HUD, dominates the mobile composition.
- Stages have a believable construction sequence but are **not** a stitch-by-stitch simulator.
- No jump in framing, yarn texture, shadow or proportions between stages.
- The finished sprite can be placed on a different clean meadow background without a cut-out box.
- All dynamic progress/price labels remain live UI; baked-in lettering is allowed only for stable approved button sprites.
- Automated validation is not an art-quality decision. If visual quality is below the accepted reference, keep it `draft`.
- If suitable image tools are unavailable, deliver a clear blocker and asset brief **instead of presenting placeholder CSS or inconsistent AI frames as production art**.

## Final report

Include the exact files, source master, number of stages, contact sheet, mobile previews, validation commands/results, approximate asset sizes, comparisons to the reference, known shortcomings, and a PR URL. Do not merge the PR or update the approved visual baseline without explicit review.
