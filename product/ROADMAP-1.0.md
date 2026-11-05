# Мир на ниточке 1.0 — execution roadmap

**Дата:** 5 ноября 2026. **Цель:** уйти от изолированных PoC к одной расширяемой игре, где независимые агенты добавляют items и meadows без вмешательства в engine/skin.

## Текущее состояние

- Уже есть контракты, валидатор, тесты, policy области изменений, два skills и Node-based ready-content catalog (см. `product/README.md`).
- `product/app/` пока содержит только `content-catalog.mjs`. Полного нового игрового движка нет.
- Черновые пакеты кролика/цветка/полянки — не выпускные ассеты. Графическое качество и интеграция ещё должны быть подтверждены.
- Legacy v2/v3/v4.x не переписывать; использовать для проверки механики и визуальных сравнений.

## Уровень 0 — минимальные контракты

Не делать ещё один длинный GDD. Достаточно согласовать API для двух сущностей:

- `work`: абстрактные очки создания текущего предмета, накопленные click/idle;
- `yarn`: тратимая пряжа, добытая в полянках и потраченная на запуск проектов/улучшения.

Экономическое расширение декларативных manifest из [RESOURCE-LOOP](architecture/RESOURCE-LOOP.md) и **задача #3**. Не привязывать игровой баланс к реальным петлям или рядам.

## Параллельные потоки работ

| Поток | Issue | Ответственность | Может стартовать |
| --- | --- | --- | --- |
| Engine / game logic | [#8](https://github.com/apazidi/mir-na-nitke/issues/8) | state, time, idle, clicker, wallet, save, upgrades | сразу |
| UI / GameShell | [#9](https://github.com/apazidi/mir-na-nitke/issues/9) | мастерская + полянка, responsive skin, interactions | сразу (mock events) |
| Art direction & asset production | [#11](https://github.com/apazidi/mir-na-nitke/issues/11) | согласованные стадии кролика, finished sprite, meadow day/evening | сразу |
| Runtime content adapter | [#10](https://github.com/apazidi/mir-na-nitke/issues/10) | ready-only generated catalog -> browser, stage & placement renderer | параллельно с Engine |
| Agent skills & review | [#12](https://github.com/apazidi/mir-na-nitke/issues/12) | strengthen item/meadow, add art & QA skills | параллельно; финализировать по итогам runtime |
| Publishing / previews | [#13](https://github.com/apazidi/mir-na-nitke/issues/13) | GitHub Pages, build, smoke & visual QA | начать настройки сразу, закрыть после интеграции |
| Resource loop integration | [#3](https://github.com/apazidi/mir-na-nitke/issues/3) | мастерская -> кролик -> полянка -> пряжа -> цветок | после скелета Engine/GameShell |

Требование визуальной приёмки — [#1](https://github.com/apazidi/mir-na-nitke/issues/1), распространяется на каждый релиз.

## Milestones / gates

### Gate A: Runnable engine (не художественный релиз)

- Чистая модель состояния тестируется без браузера.
- Временный GameShell показывает две вкладки и умеет вызывать engine actions.
- Движок грузит **декларативный** content index; никаких условий на id `bunny` внутри renderer.
- Есть автоматическая сборка и preview URL, старые маршруты не затронуты.
- Временные изображения допустимы только на техническом превью, чётко обозначенном как dev.

### Gate B: First quality playable slice

- Реальный художественно одобренный кролик: 4–8 стадий + готовый прозрачный спрайт.
- Одна настоящая полянка, мастерская: create bunny -> unlock/placement -> pet -> bonus yarn.
- Мастерская и полянка используют одно состояние/кошелёк; обратное переключение без потери прогресса.
- Idle офлайн и сохранение проверены на телефоне, визуальная fidelity сверена с `design-system/reference-v4.webp`.
- Только после Gate B просить тестировать игру вне команды.

### Gate C: AI content factory (настоящая end-to-end проверка)

- Независимый агент A делает **новый ready item** в `product/content/items/<id>/`, агент B — другой item, агент C — meadow.
- Никаких правок engine, UI, общего реестра или других контентных папок в их PR.
- CI проверяет manifest, изображения, зависимости и source scope; reviewer визуально оценивает contact sheet.
- После merge ready item автоматически попадает в game build; новая meadow открывается при выполнении условий, без ручного перечня.

## Как пользователь запускает агентов

Не нужны сразу отдельные постоянно работающие сервисы. На первом этапе **агент = одна Codex-сессия с доступом к GitHub-репозиторию**, а **skill = версионированная инструкция из `.agents/skills/`**. На каждую задачу создаётся собственная ветка и PR.

Примеры промптов после Gate A/B:

- `Возьми issue #11. Подготовь first-quality rabbit art pack по design-system/DESIGN-CONTRACT.md и create-crochet-art skill. Не меняй engine или UI. В PR приложи contact sheet и скриншоты 390×844.`
- `Создай в собственной ветке новый предмет «ёжик» по skill create-knit-item; только product/content/items/hedgehog/**. Подготовь готовую графику, manifest, finished sprite, прогони валидатор и открой PR.`
- `Создай новую полянку по create-meadow, только product/content/meadows/<id>/**. Если нужные предметы ещё не ready, оставь draft. Не изменяй shared files.`

Контентные агенты **не имеют права** самостоятельно менять общий art style, schema, engine и UI. Эти изменения — отдельные задачи для владельцев системных модулей.

## Что не включать в первую публикацию 1.0

- Telegram bot auth/server persistence, синхронизация между устройствами.
- Десятки видов ресурсов, монетизацию, рефералов, социальный рейтинг.
- Физически достоверные петли и выкройки.
- Сложные миграции прежних сохранений; 1.0 — отдельный key namespace.

Первый адрес — статическая HTTPS-игра на GitHub Pages. Хранение в браузере достаточно для проверки UX, но не для честной экономики/мультидевайса.

## Приоритеты

1. **#8 + #9 + #10** — runnable minimal engine и GameShell.
2. **#11** — высокого качества artwork и исходник (работать одновременно с п. 1).
3. **#3 + #13** — завершить ресурсную петлю и опубликовать один настоящий вертикальный срез.
4. **#12 + #1** — сделать повторяемый арт/контентный конвейер с review gate.
5. Запуск параллельных Codex-агентов на *новых* предметах/полянках, проверка Gate C.

**Главный запрет на самообман:** «CI зелёный» не значит «художественное качество достигнуто»; «валидный manifest» не значит «предмет доступен в игре»; «создали skill» не значит «автономный агент уже работает».
