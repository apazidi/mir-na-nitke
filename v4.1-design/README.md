# v4.1 visual restore — review only

This route reuses the **existing v4.1 gameplay engine and art assets unchanged** via `<base href="../v4.1/">`. Only the HTML composition and the shared `../design-system/skin-v4.css` differ. It is intentionally **not** a replacement of `/v4.1/` yet.

Visual target: `../design-system/reference-v4.webp`.

Visual comparison and review: run `python tests/visual_guard.py` in repository root. Golden screenshot is currently **provisional**, awaiting user approval; do not treat it as finished reference fidelity.
