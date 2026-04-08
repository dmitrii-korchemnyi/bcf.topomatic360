# dkorchemnyi.topomatic360.bcf

Плагин BCF для Topomatic 360.

Открывает замечания из BCF, просматривает viewpoints и выгружает их обратно в BCF прямо внутри платформы Томатик360.

Автор: Дмитрий Корчемный

---

## Статус

Прототип. Основная логика реализована, интеграция с API Topomatic 360 находится в процессе.

---

## Возможности

* Импорт BCFZIP
* Экспорт BCFZIP
* Отображение списка замечаний
* Навигация по viewpoint (частично)
* Добавление комментариев
* Хранение данных в памяти

---

## Разработка

```bash
npm install
npm run check
npm run build
npm run serve
```

---

## Установка

Плагин распространяется через GitHub Pages.
https://dmitrii-korchemnyi.github.io/dkorchemnyi.topomatic360.bcf/

Ссылка для установки:
https://360.topomatic.ru?extensionInstallPath=https://dmitrii-korchemnyi.github.io/dkorchemnyi.topomatic360.bcf/

---

## Примечания

Часть функций зависит от API Topomatic 360 и не может быть полностью протестирована вне среды платформы.

---

## Лицензия

MIT