# Isolated craft-feel study

Draft experiment for issue #32, **not a new game release**. The owner prioritizes pleasure during making for adult craft hobbyists. This route tests a single local material-reveal interaction before changing the main economy or adding more scenes.

Open `/craft-study/`. Touch the flower or hold the illustrated knit control. Each gesture adds permanent material; hold stops at one petal. A completed daisy remains in view until the next gesture. Completion leaves the whole plant for inspection; placement demonstrates one sparse background candidate. Enter/Space and reduced motion are supported.

The only persistence key is `mir-craft-feel-study-v1`. The experiment never imports, modifies or resets the actual game's saves. There is no automatic/offline progression, reward currency or claim of a realistic crochet technique in this study.

## Sources

- `assets/flower.webp` and `flower-base.webp`: unchanged existing meadow-flower final and stage-02, bundled by main `e285240`; original art commit `0dbd5e2e2df90d54e6fe9cb45ff5da5e3955b7f4`.
- `assets/workshop.webp`: unchanged rabbit-v1 stage-000, original art commit `56a748cc0de532b40a1b9a0927ff1d900406d85b`.
- Illustrated controls: unchanged scene-v2 library bundled by main `e285240`, original art pin `18ce3b9dd0313e1896161f33179fd8d2c342369f`.
- `assets/meadow.webp`: one new built-in imagegen draft, original art commit `3a0befeeda139fe16d6ea27625a93fb3ffe41a82`. Master and exact prompt are in `product/art-experiments/craft-feel-v1/`.
- Local masks/camera: runtime canvas geometry, not separately generated inconsistent intermediate images.

## Verification

`PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node product/research/craft-feel-v1/check.mjs` starts a loopback-only test server. Set `CHROME_PATH` for an installed Chrome, or use Playwright's installed Chromium. `STUDY_URL` optionally verifies an externally deployed HTTPS directory; all 12 shipped HTML/JS/CSS/asset files must match local reviewed bytes before interaction checks run.

Evidence and critical assessment: `product/research/craft-feel-v1/`. Required CI also exercises the unchanged two-meadow preview. Functional/art review allows publication of a labelled experiment; only player response can support or reject the pleasure hypothesis.
