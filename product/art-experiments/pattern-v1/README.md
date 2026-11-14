# Reusable pattern art — internal experiment, draft

Three original transparent masters generated with the built-in imagegen tool on 2026-11-14. No API spending and no replacement of accepted character artwork. The warm ivory/honey/sage palette, prominent yarn loops, upper-left light and rounded textile volume follow `design-system/reference-v4.webp`. The existing Rabbit and Cat were inspected before production.

- `exports/motif.png`: five-petal daisy applique; six cumulative sections.
- `exports/scarf.png`: sage scarf with the same ivory/honey five-petal daisies; six cumulative sections. Intended as an overlay on the original Rabbit, covering the existing bow.
- `exports/doily.png`: sage scalloped doily with ivory/honey daisy; seven cumulative sections. Placed beside Cat, without introducing Coffee or any other uncrafted item.
- `art.mjs`: semantic ownership masks, section order, anchors and placement metadata. All stages use unchanged pixels from their corresponding master. A single completed image is reconstructed without gaps by exhaustive ownership, retaining the original alpha.

The image tool's displayed RGB preview may show a gold halo outside the material. Alpha inspection confirmed those background pixels are fully transparent; the alpha is preserved, not thresholded away. Final review must inspect the actual browser composite and contact sheet. Master size/alpha and mobile scene appearance are separate gates.

This is not approved production artwork. The experiment must pass actual staged playback, final character application and independent mobile art review before owner presentation. Generated complete images alone do not satisfy that gate.

Director's preparation: inspected the checkerboard contact sheet and scarf over the original Rabbit. Replaced masks that left circular holes in the scarf's fabric with contiguous hem/tail/collar sections. Adjusted the full-image overlay rectangle to `[325,960,430,300]` in the original 1024×1820 Rabbit coordinates so the old bow is covered and the face remains visible. The three original PNGs total 7,234,176 bytes (about 6.90 MiB). No alpha editing or independent stage regeneration was performed.

Selected actual-browser evidence: [stages and application](evidence/contact-sheet.png), [Rabbit close-up](evidence/rabbit-scarf.png). These are preparation evidence; final in-game mobile composition and independent review are still required.
