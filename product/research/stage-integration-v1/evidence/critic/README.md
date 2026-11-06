# Отобранный архив независимого критика

Полное заключение — [CRITIC-REVIEW.md](../../CRITIC-REVIEW.md). Архив содержит отобранные оригинальные записи, JSON и кадры. Не все диагностические PNG локального сеанса опубликованы; дублирующие WebM с автоматическими hash-именами исключены.

| Сценарий | Запись и основные доказательства | Значение |
|---|---|---|
| Свежий оплаченный маршрут, `5cc9ef5` | [Видео](fresh/process.webm), [наблюдения](fresh/observations.json), [раннее дерево](fresh/tree-early-motion.png), [венчик](fresh/flower-corolla-motion.png), [корпус и голова кота](fresh/cat-body-head-motion.png) | Исходный RETURN: ствол скрывался за кроликом. Остальные проекты пройдены реальными действиями |
| Уточнение первых 12 кликов кролика | [Видео](rabbit-start/process.webm), [наблюдения](rabbit-start/observations.json), [последовательность](rabbit-start/first-twelve-motion.png) | Без пауз авто, чтобы не приписывать тестовые задержки обычному ритму |
| Полный старый мир, max upgrades | [Видео](max-fixture/process.webm), [наблюдения](max-fixture/observations.json), [последовательность](max-fixture/tree-max-motion.png) | Явно технический fixture; не заработанный свежий путь |
| Собственный повтор после ремонта, `e2b1376` | [Видео](repair/process.webm), [наблюдения](repair/observations.json), [ранние стадии](repair/tree-early-motion.png), [размещение](repair/placement-motion.png) | RETURN закрыт, PROTOTYPE-WORTHY для ограниченной интеграции |

Сценарии `observe.mjs`, `rabbit-start.mjs`, `fixture.mjs`, `repair.mjs` и извлечение кадров `extract.mjs` сохранены рядом. Они проверяют конкретный записанный source SHA; для воспроизведения нужен соответствующий checkout и зависимости браузера через env. Контакты — последовательности кадров из записей, а не новые игровые ассеты или замена просмотра процесса.
