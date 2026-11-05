# GameShell development preview

Run from repository root after engine + runtime dependencies are integrated:

```
node product/scripts/build-content-index.mjs
node product/scripts/serve-preview.mjs
```

Open `/product/ui/` for ready-only production loading. There are currently no ready meadows, so this route deliberately displays the content gate.

Open `/product/ui/?mode=development` for a playable technical fixture (five slots, rabbit/flower crafting, placement, pet reward, automatic sniff, upgrades, reload). The figures are explicit synthetic test assets, not content packages. Use `/product/ui/?mode=art-review` for the same test economy with the unapproved rabbit art experiment. Set `ART_REVIEW_ROOT` to the experiment's `exports` directory when starting the local server if it is not integrated locally. All other objects remain test figures; no flower art has passed review. The art review route never promotes draft content or uses the production save key.

Run `node --test product/ui/session.test.mjs`. For browser geometry and interaction checks, install Playwright or set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path, optionally set `CHROME_PATH` and `ART_REVIEW_ROOT`, then run `node product/ui/browser-check.mjs`. It writes mobile evidence under `product/ui/review/`. The script uses the explicit art-review route; screenshots are development evidence, not an approved visual baseline.

UI reuses `design-system/skin-v4.css`. Fixed button image assets are absent from the approved skin library; current controls use temporary live text and are a known art acceptance gap. No final visual-quality claim is made. Storage failures keep the current tab playable and show a notice; incompatible saved data is preserved without silent overwrite. The fixture save is separate from production.
