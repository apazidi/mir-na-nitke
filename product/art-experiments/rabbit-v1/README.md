# Rabbit v1 — issue #11 art review

**Status: DRAFT / awaiting human art approval.** No runtime content is registered, no approved baseline changed. This is an isolated art experiment, not the GameShell or a playable release. Related issue: https://github.com/apazidi/mir-na-nitke/issues/11 (do not close on technical checks alone).

## Review first

- [Contact sheet: 0/25/50/75/100% + alpha](review/contact-sheet.png)
- [Approved reference vs browser capture at 390×844](review/reference-comparison-390.png)
- [Sprite composited over day and evening](review/meadow-alpha-proof.png)
- Browser captures: `review/phone-{360x800,390x844,430x932}-{000,025,050,075,100}.png`.
- Five-frame mobile comparisons: `review/stages-{360x800,390x844,430x932}.png` (raster art previews; the `phone-*` files are actual Chromium screenshots).
- Open `review.html` locally for an art-only preview; `?stage=025` selects a stage. There are no game controls or simulated prices.

## Controllable master and production method

`source/master.json` is the editable layer assembly: fixed source crop rectangles, destination rectangles, z order and stage membership, on a 1024×1820 artboard. `source/parts.png` is the immutable generated RGBA component atlas. `source/workshop.png` is the fixed scene; `source/meadow-day.png` and `source/meadow-evening.png` are empty environment sources.

All five stages are deterministically exported from the **same pixels**, not five independent AI renders. Ears render behind the head, arms behind the head and feet, bow on top. The sequence is empty worktable → body → body/limbs → head → ears/bow. These percentages are abstract work checkpoints, not a crochet pattern. Components appear only once crafted; no loose future parts are laid out on the table. Shadows are exported separately from the transparent sprite and stay on the table. Stage 25 has its own contact height because the body has no feet yet.

Image generation used the built-in `image_gen` tool, with the approved reference as a style input. See [prompt record](source/PROMPTS.md). Generated pixels themselves are retained as the source of truth: rerunning stochastic image generation is **not** claimed to reproduce the same image. Exporting the retained atlas and layout is reproducible on the documented Windows/runtime stack (cross-version encoders can differ in bytes).

## Rebuild

Requires Windows PowerShell with `System.Drawing`, Node.js, `sharp` 0.34-compatible API and Playwright (Chromium or installed Chrome). No API key or generation service is needed to reproduce exports.

```powershell
./product/art-experiments/rabbit-v1/export.ps1
# If modules are not installed locally, set NODE_PATH to your runtime node_modules.
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node product/art-experiments/rabbit-v1/pack-and-capture.cjs
```

`export.ps1` exports full resolution PNG intermediates, the finished RGBA PNG, contact sheet and scaled previews; it checks 1024×1820 dimensions, real transparency, a 12 MiB PNG ceiling, and records SHA-256/byte sizes in `review/asset-report.json`. Intermediate PNG frames are ignored by Git to avoid duplicating the WebP deliverables. `pack-and-capture.cjs` exports quality-90 WebP (alpha quality 100), checks dimensions/alpha and 1.5 MB per-file budget, writes `review/webp-report.json`, captures all 15 browser screenshots and compares the golden frame with the approved reference. A failed browser launch is an error, not a passing capture.

## Files / weight

- `exports/stage-{000,025,050,075,100}.webp`: five actual stage frames, about 231–314 KB each; total ~1.33 MB.
- `exports/golden-frame.webp`: same completed scene as stage 100, ~314 KB, deliberate review alias.
- `exports/finished-sprite.png`: RGBA master export ~1.37 MB; `.webp` ~170 KB, same full artboard/pivot as the stages.
- `exports/meadow-{day,evening}.webp`: empty environmental backgrounds, ~306/313 KB. No houses, rabbits, bridges, flowers or unlockable props.
- Runtime-sized stage set + sprite + two backgrounds: ~2.12 MB, excluding the duplicate golden alias and review/source images. Sources and browser captures are review assets, not runtime downloads.

## Visual assessment and limitations

Inspected the approved reference and candidate side by side, the contact sheet, mobile browser captures, and day/evening alpha proof. Common traits: cream crochet fiber loops, warm upper-left light, rose details, rounded toy volume and readable dark bead eyes. All stages share identical framing, materials and reused components. The sprite has genuine transparency and no tabletop rectangle.

The candidate changes the reference's three-quarter sitting rabbit to a frontal seated pose, larger eyes, stronger pink paw pads and a more symmetrical face. The workshop is a new environment rather than the reference's outdoor screen. These are **art proposals requiring owner acceptance**, not reference parity. Assembly seams and the head/torso overlap need close artistic review; the system is layered raster assembly, not a deformable 3D crochet model. Evening is a reference-based lighting edit and may have small texture drift relative to day; it is not a physically relit shared 3D scene. The meadow proof checks alpha and legibility, not final five-slot layout or pet animation.

Previews contain only art, with `object-fit: contain` to preserve the whole artboard and safe margins. No global UI, navigation or dynamic labels are designed or validated here. The art fills the viewport width; letterboxing is visible on tall devices. Final UI safe areas and meadow sprite scale require integration review in their separate tasks. No content manifest has been promoted to `ready`.

## Validation

- `npm --prefix product test`: fails on this Windows Node version because the literal `tests/*.test.mjs` is not expanded.
- Equivalent explicit test file invocation: `node --test @(Get-ChildItem product/tests/*.test.mjs | ForEach-Object FullName)` — **13 passed, 0 failed**.
- `npm --prefix product run validate` — **0 errors, 9 warnings** for missing artwork in the pre-existing draft `items/bunny` package. This experiment intentionally does not modify that package.
- Both export scripts pass; dimensions, actual sprite alpha, asset budgets and 15 device screenshots checked. `git diff --check` passes.
- Historical UI visual guard is not applicable to this art-only route; existing prototypes and their baselines are untouched.

Before promotion: owner reviews the images against the reference and approves the master/pose/stage sequence. Then a separate content task can import approved exports into an item package. Do not merge or close #11 before artistic acceptance.
