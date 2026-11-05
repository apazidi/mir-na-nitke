# Runtime content boundary

Run `node product/scripts/build-content-index.mjs` before serving product/. It reuses the validated ready-only discovery loader, checks real asset paths remain within their package, and writes app/content/catalog.json. Generated files must be rebuilt after content changes. No package is promoted automatically.

Browser entry: `index.mjs`.

- `loadRuntimeCatalog(indexURL, {fetch, economy})` returns `{catalog, config, assetUrl(pkg, relative)}`. The index must live at product/app/content/catalog.json; deployment URL prefixes are preserved.
- `resolveAssetUrl(pkg, relative, productBaseURL, verifiedAssets)` returns a URL only for package-owned inventory entries; otherwise null. Render no image on null or failed image load.
- `selectStage(item, progress)` returns the stage at a clamped 0..1 progress threshold, or null for malformed progression.
- `placementLayout(meadow, state.placements[meadow.id], catalog.items)` returns only matching placed items, ordered by z and slot id, with slot fields, item manifest, and left/top percentages. Anchor sprites consistently in the shared shell; scale remains relative to source sprite. Locked slots never receive a finished sprite.
- `createEngineConfig(catalog, economy)` maps v1 manifests to the core contract. Pass the result to core.validateConfig before creating state.

Economy is a separate object: global initialYarn/reserveYarnPerHour/clickWork/idleWorkPerSecond/maxOfflineMs/upgrades, `items[id].yarnCost`, and `meadows[id].passive` plus `meadows[id].interactions[id] = {trigger, amount, cooldownMs}`. Defaults provide free craft starts, 5 work/click, 1 work/second, 12 reserve yarn/hour and an eight-hour offline cap. These are adapter defaults, not supported manifest fields. Only pet/sniff interactions with explicit economy configuration map to core rewards; other declarative art actions remain available to the renderer, without an invented reward.

Current production catalog is empty because the only item remains draft. A separate development harness may supply synthetic content/config explicitly; it must not promote artwork or enter this catalog.
