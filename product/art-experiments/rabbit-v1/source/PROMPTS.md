# Built-in image generation record

Mode: built-in `image_gen`, never CLI/API fallback. Style reference: repository `design-system/reference-v4.webp`. No independent per-stage generation. Local generated filenames below identify the retained outputs; final masters are copied into this directory.

## Component master

Generate `stylized-concept`, transparent background requested, 1536×1024 landscape: premium warm cream/pink amigurumi rabbit matching reference. Exactly six isolated component groups in a 3×2 grid: cream pear torso; round cream head with glossy black bead eyes, tiny pink embroidered nose and rosy cheeks; pair of long upright cream/pink ears; pair of short cream arms; pair of oval cream feet facing camera; dusty rose bow. Same slightly elevated front camera, stitch gauge, warm upper-left light. Generous gutters, no text, no assembled rabbit, no props. Output `exec-25f86973-7c8b-4eef-a02b-dff3bb36c6d6.png`.

Follow-up `background-extraction`, target that atlas, transparent background true:

> Remove the ENTIRE brown blurred backdrop and all ambient background glow, make all space between and around the six component groups genuinely alpha-transparent. Preserve all six crochet parts, their exact positions, dimensions, texture, lighting, colors, pink details. Do not redraw or move components. No opaque background, no checkerboard painted in. Keep full 1536x1024 canvas. Output PNG with alpha.

Retained `parts.png`: `exec-f166f7d7-494a-4e71-b177-7b793a3d591a.png`. Alpha verified programmatically and on a checkerboard (the generator's preview alone does not prove opacity/transparency).

## Workshop master

Generate `stylized-concept`, style input approved reference: empty portrait 1024×1820 crochet workshop, premium miniature diorama, warm upper-left light, sage/cream/rose palette. Pale oak table fills lower 65%, center x200–824 / y600–1450 empty for rabbit assembled later. Cream and rose yarn balls and hook at far left, blurred workshop window/linen curtain above. No rabbit, animal, finished craft, house, flower object, text, UI or border. Slightly elevated view for front-facing seated toy; horizon around y560. Output `exec-41200567-7af8-44e6-863e-109e71a947a0.png` → `workshop.png`.

## Day meadow

Generate `stylized-concept`, style input approved reference: portrait 1024×1820 empty knitted meadow, golden upper-left sunlight, sage/moss yarn and cream accents, blurred leafy canopy at top edges, rolling grassy clearing, curved yarn path on right. Center empty for five separate sprites. No rabbit, animals, flowers, flowerbeds, houses, freestanding craftable tree, bridges, furniture, baskets, mushrooms, collectibles, text, UI or border. Slightly elevated ground plane matching seated toy. First output `exec-210e9138-ef31-480a-a9e1-43c6f7f95b3c.png` had a small unwanted canopy flower and was rejected.

Corrective `precise-object-edit` targeting the rejected day frame:

> Keep this meadow EXACTLY unchanged in composition, perspective, lighting, grass, path and foliage. Only remove the small cream flower in the upper left canopy, replace its petals and center with matching plain green knitted leaves. No flowers anywhere. Preserve original portrait dimensions. No other changes.

Retained `meadow-day.png`: `exec-20a4c23e-bc8a-4397-9b25-19ce96b06a0d.png`.

## Evening meadow

`lighting-weather`, target retained day frame:

> Edit this exact empty crochet meadow into EVENING. Change only illumination and sky color: soft blue lavender twilight, gentle warm residual upper-left sunset, readable muted sage yarn grass, soft shadows. Preserve EXACT camera, every path curve, grass hill, canopy silhouette, texture, framing, object-free clearing, portrait dimensions. No added lights, stars as objects, animals, flowers, houses, trees, furniture, collectibles, text, UI. Background remains entirely free of craftable future items. Keep enough light to read a cream rabbit sprite.

Retained `meadow-evening.png`: `exec-81116f58-6c8f-4769-8c59-cbfc0c29b121.png`.

AI generation is stochastic; these briefs explain provenance, not a promise of identical regeneration. The reproducible stage pipeline uses the retained master pixels and `master.json` only.
