# Мир на ниточке 1.0 — content pipeline foundation

This folder is the **new product**, developed without copying HTML/CSS from the historical PoCs. There is **no playable 1.0 app yet**. The initial milestone is a reproducible, parallel-friendly workflow for adding knitted items and five-project meadows.

## Новый продуктовый цикл: мастерская ⇄ полянки

Уточнили базовую экономику будущего продукта: в мастерской игрок тратит волшебную пряжу на проекты, а готовые персонажи и предметы на полянке производят ресурсы и дают бонусы за взаимодействия. **Оба экрана — idle + clicker**, без симуляции реальных петель.

- [Ресурсная петля, экономика и PoC](architecture/RESOURCE-LOOP.md)
- [Задача реализации #3](https://github.com/apazidi/mir-na-nitke/issues/3)

Этот контракт **пока проектный**: в `product/app/` ещё нет рабочего движка, а новые поля `economy` / `reward` пока не внедрены в валидатор. Не выдавать документацию за готовую механику.

## Contents

- `architecture/CONTENT-CONTRACT.md` — engine, skin and content ownership contracts; parallel agents and release gates.
- `architecture/UI-ASSET-POLICY.md` — image-baked fixed labels versus live dynamic text, responsive art and visual approval.
- `content/items/<id>/manifest.json` — one independent item package per directory.
- `content/meadows/<id>/manifest.json` — one meadow package per directory; exactly five item slots.
- `examples/` — draft examples with missing artwork on purpose; **not playable content**.
- `scripts/validate-content.mjs` — deterministic validation of manifests, files and references.
- `tests/` — validator tests.
- `.agents/skills/create-knit-item` and `.agents/skills/create-meadow` in repo root — repeatable Codex agent workflows.

## Run checks

From repository root:

```
npm --prefix product test
npm --prefix product run validate
```

The `draft` status tolerates missing art / dependencies with warnings. `ready` requires real art and all item references to be available. Automated checks **do not replace visual review**. The baseline v4 reference stays in `design-system/reference-v4.webp`.

## How agents work

Start separate feature branches. Give each Codex agent one item or meadow, using the corresponding repository skill. Each agent touches only its own content folder. A meadow can refer to pending item IDs as `draft`. The build should discover all ready manifests and must never require editing a central registry to add content.
