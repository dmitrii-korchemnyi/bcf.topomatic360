# BCF Manager для Topomatic 360

Production-ready TypeScript-плагин для Albatros SDK: импорт, просмотр, создание, редактирование и экспорт BCFZIP 2.0 / 2.1 / 3.0.

## Архитектура

- `src/domain` — чистая внутренняя модель BCF.
- `src/application` — бизнес-логика и store.
- `src/bcf` — BCFZIP/XML parser, serializer, validation.
- `src/topomatic` — adapter layer к разрешённым Albatros API.
- `src/ui` — BIMcollab-like defined panel без зависимости от BCF XML.
- `src/commands` и `src/providers` — точки входа Albatros.

BCF engine не импортирует Topomatic API. UI работает только с internal model. Topomatic API изолирован в adapter layer.

## Запуск

```bash
npm install
npm run typecheck
npm run build
npm run serve
```

## Деплой

1. Выполнить `npm run build`.
2. Выполнить `npm run serve` для локальной проверки в Topomatic 360.
3. Для публикации собрать `.apx` через `albatros-cli build` или разместить сборку как статический плагин согласно правилам Albatros.

## QA checklist

- Импортировать BCFZIP 2.0, 2.1 и 3.0.
- Проверить блокировку импорта при отсутствии `bcf.version`, `project.bcfp`, `markup.bcf`.
- Проверить предупреждения: нет snapshot, нет components, нет camera.
- Создать замечание из модели, проверить selection, snapshot и статус-бар.
- Изменить Title/Description/Status в панели.
- Экспортировать BCFZIP 2.0, 2.1 и 3.0.
- Выполнить import → export → import без потери topics/comments/viewpoints/snapshots/components.
- Открыть архив в BIMcollab, Navisworks и Solibri.

## Known limitations

- Формат результата `ctx.openDialog` и `ctx.saveDialog` в установленном Albatros SDK должен быть подтверждён. Код не использует запрещённые `pickOpenFile`, `saveBinary`, `showHtmlPanel`; adapter принимает только структурно обнаруженные `Blob`, `ArrayBuffer`, `Uint8Array`, `read()` и `write()`.
- Камера, selection и snapshot читаются только если соответствующие поля или методы реально присутствуют в `ctx.cadview`; неподдержанные данные не имитируются, а дают warning.
- BCF API / OpenCDE не реализован в v1.0, но архитектура оставляет его отдельным application/adapter слоем.
