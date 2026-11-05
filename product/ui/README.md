# World-first GameShell preview

The UI shares the v4 textile tokens and skin, with local draft layout overrides. The viewport is the play area: wallet and lighting at the top, craft progress/actions and navigation at the bottom. Projects, placement and upgrades open in the **Проекты** drawer. No item cards are appended below the game.

Open /product/ui/?mode=development for synthetic fixtures. Use /product/ui/?mode=art-review&flower=review for draft rabbit and flower art. Ready-only /product/ui/ still displays the content gate while no approved meadow exists. Art review now uses its own mir-na-nitke-art-preview-v2 save key; old development and production saves are untouched. All fixture asset URLs resolve beneath the deployment prefix.

For separate art worktrees, set ART_REVIEW_ROOT to the rabbit experiment exports folder and FLOWER_REVIEW_ROOT to the meadow-flower art folder before running node product/scripts/serve-preview.mjs.

## Player feedback

- A single contextual action starts the next project, crafts, completes, or places the finished object.
- Clicking the rabbit pets it if the existing manual action is available. Cooldown clicks still give a gentle visual greeting without extra yarn.
- Clicking a placed flower sways it without granting an unearned bonus.
- The existing automatic sniff event leans the rabbit toward the flower, sways both sprites, draws a brief scent trail and names the actual reward.
- Stage changes and completion show brief feedback. CSS animations use the original event time as a negative delay, so the one-second render does not restart them. Reduced-motion users receive text feedback without movement.
- Only placed items become visible in the meadow. Locked future items remain secondary text entries in the drawer.

## Verification

Run npm --prefix product test and npm --prefix product run validate. For browser verification set PLAYWRIGHT_MODULE to an installed Playwright index.mjs and optionally CHROME_PATH, then run node product/ui/browser-check.mjs with both art roots.

The browser check exercises the real two-project loop, direct sprite clicks, cooldown reward, automatic sniff, save/reload, Escape drawer close, reduced motion and missing-art/console errors. It records exact viewport screenshots (not full-page captures) for workshop and meadow, day and evening, at 360×800, 390×844 and 430×932. It checks one-screen page height, 65% scene height, 94% scene width, 44px targets and visible control bounds. Evidence is under review/world-first-*.png and review/world-first-geometry.json. Previous screenshots and the approved baseline are not overwritten.

The legacy tests/visual_guard.py targets unchanged v4.1-design rather than this product UI; the product browser check is the relevant geometry check here.

## Artistic status

TECHNICAL PREVIEW — ART NOT APPROVED. Stable buttons still use live draft labels because no approved image library exists. Rabbit/flower assets are from the existing unapproved experiments. This UI iteration improves scale, composition and legibility; it does **not** establish parity with design-system/reference-v4.webp. The meadow still lacks the reference's layered natural detail, foreground framing and integrated button artwork. Those remain independent art-direction review gates. The demo economy is deliberately accelerated and is not final balance.

## Scene-v2 artwork adapter (integration opt-in)

Add &scene=v2 to the explicit art-review URL only after the scene-v2 asset pack is included in the preview bundle. This swaps the day/evening backgrounds and the three remaining fixture items to scene-v2/exports. Four stage images use thresholds 0, 1/3, 2/3 and 1; all existing item IDs, costs and interactions stay unchanged. The ordinary technical preview remains on its existing assets until this opt-in is enabled.

Six stable controls load scene-v2/ui/{workshop,meadow,projects,knit,complete,pet}.webp and their -pressed/-disabled variants. Russian accessible names stay on the actual HTML buttons; visible lettering belongs to the raster artwork. Nav images render in approximately112×84px, actions150×50px. Missing draft button art falls back to its accessible live label and displays the existing art warning.

The top HUD contains only current place, yarn and lighting. Sprite input targets follow cached alpha bounds while maintaining the original world anchor and at least44px targets; transparent flower padding can no longer intercept the rabbit's face. The project drawer is modal for keyboard and assistive technology, traps Tab and returns focus to Проекты on Close, Escape and backdrop click.
