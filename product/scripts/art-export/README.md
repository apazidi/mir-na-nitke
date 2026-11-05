# Shared crochet art export

Content packages contain data and artwork only. This authoring tool reads an item's declarative `source/export.json`; it does not run package-provided code or generate new art.

From repository root:

```
npm ci --prefix product/scripts/art-export --ignore-scripts --no-audit --no-fund
node product/scripts/art-export/export.cjs product/content/items/meadow-flower
```

The specification supplies a 1024×1820 artboard, one placement rectangle, and 4–8 source PNG/output WebP filename pairs. The final stage also becomes `art/finished.webp`. All source masters must have real alpha. The tool exports stages, a contact sheet, dark/cream edge diagnostics, phone previews and an asset report. It never changes manifest status or the approved baseline.

Resize/padding and format conversion preserve the retained master pixels; construction changes must be authored before export. Review all actual stages for camera, anchor, texture and lighting drift. Technical export success does not approve art.
