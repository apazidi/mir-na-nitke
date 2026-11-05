# Persistent technical preview

Canonical URL after the reviewed bundle reaches `main`:
<https://apazidi.github.io/mir-na-nitke/play-preview/>

This is **TECHNICAL PREVIEW — ART NOT APPROVED**, not a production release. It uses the explicit technical fixture, isolated save key `mir-na-nitke-art-preview-v2`, noindex/nofollow, rabbit art from draft PR #15 and flower art from draft PR #21. No manifest changes to `ready`. The runtime includes two illustrated projects; the other three fixture projects remain synthetic test figures. First-scene artistic approval remains outstanding.

## Build and verify

From a clean checkout with Node 22 and Git:

```sh
git fetch --no-tags origin 56a748cc0de532b40a1b9a0927ff1d900406d85b 0dbd5e2e2df90d54e6fe9cb45ff5da5e3955b7f4
npm --prefix product test
npm --prefix product run validate
npm --prefix product run build:preview
npm install --prefix product/.browser-tools --no-save --package-lock=false playwright@1.62.1
node product/.browser-tools/node_modules/playwright/cli.js install chromium
PLAYWRIGHT_MODULE="$PWD/product/.browser-tools/node_modules/playwright/index.mjs" npm --prefix product run check:preview
```

PowerShell uses `$env:PLAYWRIGHT_MODULE = (Resolve-Path 'product/.browser-tools/node_modules/playwright/index.mjs').Path` before the final command. `CHROME_PATH` may select an already installed browser for local checks. Neither variable is consumed by the delivered website. `ART_REVIEW_ROOT` and `FLOWER_REVIEW_ROOT` are never read by this build or static smoke server.

`product/preview-sources.json` pins the exact draft commits and allowlisted WebP exports. The builder reads committed Git objects, follows local browser module imports, and packages them with the approved shared CSS into `play-preview/`. Commit UI/runtime changes first: uncommitted browser source changes fail the build. Canonical Git bytes plus the scoped `.gitattributes` rule keep SHA-256 values identical on Windows and Linux. The builder replaces only that verified output directory, never historical routes. No Node packages, credentials, local paths, export tools, or source art masters enter the bundle. `preview-manifest.json` records source hashes, draft provenance, and the SHA-256 and length of every served file. Builds omit timestamps and produce identical output for identical sources. The empty ready catalog is deliberate: the canonical entry explicitly opts into draft art review.

The smoke test serves **only the built directory**, mounted under `/mir-na-nitke/play-preview/`, so root-relative asset mistakes cannot be masked by the working tree. It verifies every packaged file by SHA-256, no external requests or failed assets, the rabbit → placement → pet/yarn → flower → automatic bonus loop, reload persistence, isolated storage, noindex and phone geometry at 360×800, 390×844 and 430×932. Screenshots go to ignored `product/preview-evidence/` and CI artifacts. To repeat the same test against the live HTTPS site:

```sh
PREVIEW_URL=https://apazidi.github.io/mir-na-nitke/play-preview/ PLAYWRIGHT_MODULE="$PWD/product/.browser-tools/node_modules/playwright/index.mjs" npm --prefix product run check:preview
```

## Delivery gate and existing hosting

Read-only Pages inspection on 2026-11-05 confirmed the existing public site uses legacy branch publishing from **`main`, `/`**, with HTTPS enforced. No new hosting, permissions, secrets, workflow publishing token, or Pages setting is needed. The content QA workflow only builds/tests; it never deploys.

1. Commit the generated `play-preview/` alongside its source changes on the technical PR. Review the exact diff, screenshots and all required CI independently.
2. After independent review and green exact-head CI, merge the technical PR into `main`. Existing Pages branch publishing then serves the committed extra directory. Retain every historical file and route; do not replace the Pages source or publish only the product bundle as the whole site.
3. Wait for Pages deployment success, open the canonical HTTPS URL and run the external smoke command. Verify legacy `/`, `/v3-stage/`, `/v3.2/`, `/v4-meadow/`, `/v4.1/` and `/v4.1-design/` remain available. A local check or uploaded CI artifact alone is not delivery.
4. Record the deployed commit, URL and external checks in Issue #22. Keep PR #15/#21 draft until artistic approval; the preview is not approval.

For rollback, restore only `play-preview/` from its previous reviewed commit in a normal PR. Do not force-push main, change hosting settings, touch unrelated save keys, or modify historical routes.
