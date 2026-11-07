# Мир на ниточке — repository agent guidance

## Product leadership (canonical entrypoint)

The project's ONE user-facing lead is `.agents/skills/game-product-director/SKILL.md`. Read `product/PRODUCT-VISION-5-10-SCENES.md` first. The Product Director is responsible for creative product discovery, gameplay and economy evolution, planning and delivering **5–10 complete meadows** (five craftable slots each), prioritization, subagent delegation, independent QA, art-direction fidelity and playable milestones. Do not reduce this role to issue dispatch. 

`.agents/skills/coordinate-game-development/SKILL.md` is a **tactical orchestration subroutine**, not a separate user-facing product manager. A task in `product/AGENT-LAUNCH.md` describes the historical two-session pilot, not the long-term operating model.

**Current priority (2026-11-06):** the owner rejected both the two-meadow gameplay and the flower craft study as unenjoyable. Pleasure of making for adult craft hobbyists comes before further scene production; retain the approved visual direction. Follow [Product Critic](product/roles/PRODUCT-CRITIC.md): an independent `product_critic` must challenge substantial gameplay ideas before implementation and review the actual experience before owner presentation. Prototype permission is not proof of fun. See [mechanics research](product/research/MECHANICS-RESEARCH-2026-11-06.md) and open issue #32.

**Later owner clarification:** the [assembly study](product/research/assembly-v1/REVIEW.md) also received RETURN. Rejecting a candidate must not end the requested search: continue with other bounded hypotheses and the independent critic during the active session. The owner explicitly authorized publishing internal reports and selected evidence in GitHub for analysis of development quality and owner/agent participation. Archive negative outcomes too; publication of a report does not authorize presenting an unselected playable demo.

**Latest owner direction, 2026-11-06:** the pompom was [rejected by the owner](product/research/craft-material-v1/OWNER-FEEDBACK.md): trimming had no meaningful purpose or pleasure. The owner explicitly asks to return to **6–8 or 10 cumulative art stages**, click/auto progress, and a beautiful opacity/spark/ray appearance of the next section on an empty meadow. Treat this as authorized magical staged creation; do not require physical crafting simulation or reject counters/masks/transparency merely for being abstractions. Review readability, pacing, local feedback, scale and stage continuity. See [stage-magic-v1](product/research/stage-magic-v1/DIRECTION.md). Existing game/economy integration remains separate from this bounded preview.


**Subsequent owner decision, 2026-11-07:** the selected `/stage-study/` received “вау, это круто!”. The owner then said “да, давай попробуем” to carrying that mechanic into the game on different items. Follow [integration #39](https://github.com/apazidi/mir-na-nitke/issues/39) and [stage-integration-v1](product/research/stage-integration-v1/DIRECTION.md): Rabbit → Flower → Tree → Cat, real economy and meadow unlock, explicit auto, preserved old saves and free repeats of owned selected items. Keep the liked standalone study intact. This authorizes the bounded integration; it does not establish enjoyment across projects or retention. Continue independent process/art/technical review and retain negative evidence.

This repository contains **historical prototypes** (root, `v3*`, `v4*`) and the **new production foundation** in `product/`. Historical routes are frozen unless the user explicitly requests a fix to one of them. Never copy their HTML/CSS wholesale into the new product.

**Latest owner request, 2026-11-07:** the integrated version is better, but the game mechanics still need work. Introduce a dedicated [idle/clicker Game Designer](product/roles/GAME-DESIGNER.md), invoked as `idle_game_designer`, for diagnosis, progression/economy modelling and experiment specifications. The director remains the single lead. Before substantial gameplay/economy work, obtain a concrete designer specification and the separate critic's preflight; after implementation, check the actual behaviour against that specification and obtain independent process/art/technical review before owner presentation. The designer must not approve their own proposal as critic. Routine fixes restoring agreed behaviour do not need a new design cycle. The first [mechanics audit](product/research/idle-clicker-design-2026-11-07/README.md) is research, not authorization to ship a new economy. Preserve the liked staged appearance and keep #32 open until supported by player evidence.

## Product rules

1. Read `product/architecture/CONTENT-CONTRACT.md`, `product/architecture/UI-ASSET-POLICY.md`, and `design-system/DESIGN-CONTRACT.md` before producing product content or changing the game UI.
2. Use the repository skills in `.agents/skills/`: `create-knit-item` for new knitted items, `create-meadow` for five-item meadows, and `create-crochet-art` for high-fidelity stage art, golden-frame and finished-sprite production.
3. Content agents may only change their **own** `product/content/items/<id>/` or `product/content/meadows/<id>/` directory. Do not modify `product/app/`, `design-system/`, other content packages, shared manifests, or the legacy game. Engine changes require a separately reviewed task.
4. A new item/meadow is declarative data + art assets, not its own HTML screen or stylesheet. The engine discovers packages without editing a shared registry.
5. New art must match the approved v4 art direction; keep a common camera, light, color and proportions throughout stage images. Never use independent AI-generated stage images without a consistency review.
6. Never show unopened future objects as if they had already been crafted. Backgrounds are free of unlockable items.
7. The UI must use stable, approved visual components. A content task cannot invent new buttons, typography or navigation.
8. A `draft` package may reference unfinished work. A `ready` package must have required assets and dependencies resolved. Publishing uses **ready** packages only.
9. Run `npm --prefix product test` and `npm --prefix product run validate` before requesting review. The latter checks schemas, asset paths and references, not artistic quality.
10. For any appearance change, review device screenshots (360x800, 390x844, 430x932) next to the approved visual reference. Never silently update an approved visual baseline.

## Concurrent agents

- One item or meadow per feature branch/PR; avoid writes to common files.
- Meadow agents may depend on item IDs in other open PRs, but their manifest remains `draft` until dependencies are merged and validated.
- Tests and art checks are **gates**. Do not claim content is available in the game merely because the manifest exists.
- Do not promise automatic merging or deployment. Merge only after gameplay and visual review.

## Codex session coordination

- **Current start document:** `product/START-PRODUCT-DIRECTOR.md`, not the historical two-session pilot in `product/AGENT-LAUNCH.md`.
- Refresh live GitHub state: Engine #14, integration #19, HTTPS #24, visual #25, two-meadow #30 and craft-study #33 were merged. Delivery #22 is resolved; **P0 #32 remains open** after the owner rejected the flower study. Existing previews and technical PASS do not imply enjoyment or approved artwork.
- Product Director may independently publish conspicuously labelled technical/art-review builds on existing authorized free hosting and merge safe technical PRs after required green CI and independent review. Never replace approved art/release or silently promote draft assets.
- User approval is a **final visual milestone gate**, not an excuse to stop intermediate art improvements, coding, preview delivery or proposing new scenes. Raise a concrete design comparison and a recommendation rather than asking to approve a rough isolated draft.
- The skill file cannot run or schedule new Codex sessions by itself. Any unattended runner or new spending requires explicit authorization.
- Keep the initial art experiment for #11 under `product/art-experiments/rabbit-v1/**` until approved; do not modify finished shared artwork without review.
