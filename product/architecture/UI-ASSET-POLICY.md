# UI artwork and typography policy — fixed visual shell

## Decision: hybrid, not all-text-over-image and not all-baked-text

The recurrent overlap of text and buttons is a layout bug. Do not solve it with one giant image of the entire app: the result is not interactive, does not support saved prices/progress, and scales badly. We use two categories:

### A. Stable Russian button names: text baked into button artwork

Examples: **«Вязать», «Мастерская», «Полянка», «Проекты», «Карта»**. The artwork includes the label, stitch decoration, material texture, and shadow. For each control, provide `normal`, `pressed`, `disabled` where needed, plus a narrow-width variant only if the original would become unreadable. Export 2× or 3× WebP/PNG or rasterized SVG asset; scale the WHOLE asset, never independently overlay/reflow its lettering. HTML retains an accessible `aria-label` in Russian. Interactivity, hit box and states remain real HTML/React buttons.

Never regenerate a button to suit an individual item or meadow. Only the skin/UI owner changes the global library, with a design-review PR.

### B. Dynamic labels/numbers: live text in reserved safe regions

Examples: `+24 очка прогресса`, price, percentage, number of owned objects, meadow title, level and tooltip. The panel asset has an **explicit text-safe rectangle** in its metadata; text sits in a flex/grid layout in that rectangle, never on arbitrary absolute coordinates. Check length limits, minimum font size, number formatting and clipping on 360x800, 390x844, 430x932. If the text cannot fit, shorten the content or move the label into a separate panel; never let it overlap an image.

Avoid making assets for every resolution. Use two layouts (compact and regular) and responsive scaling of 2×/3× sources. Different device pixel ratios do not require different layouts. Only artwork with proven unreadable fine print gets a separate narrow-size variant.

## Screen / world coordinate contract

- Stable portrait GameShell and one world-artboard convention: **1024 × 1820 logical art units**.
- Paint the world once and position all objects in normalized coordinates within that artboard. Account for screen cropping and safe areas; no important object or control outside the accessible zone.
- Background art for a meadow must contain **none of the five craftable items**. Those are independently unlocked sprites.
- Gameplay content must not introduce fonts, buttons, gradients, headings, navigation or custom HTML/CSS.
- Touch targets at least 44×44 CSS px. Visual sprites may be smaller; invisible accessible hit areas are allowed.

## Definition of Done for UI skin

- All stable labels render crisply and without overlap at 360/390/430 widths.
- All dynamic values remain legible at expected min/max lengths and with enlarged system fonts.
- Approved visual hierarchy: world dominates; craft UI is secondary; character central; only unlocked objects display as finished.
- Compare real screenshots with the **art-director-approved** reference. A pixel-diff against a previously poor build does not mean artistic fidelity.
- Do not promote a new skin unless a reviewer has inspected both day/night and meadow/workshop views.

## Suggested asset API (future GameShell)

`<ArtButton id="knit" ariaLabel="Вязать" state="normal" />` resolves a fixed approved image; dynamic click gains render in a nearby live-text field. Content manifests reference buttons by stable ID; they never supply their own UI art.
