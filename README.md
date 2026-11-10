# Residence Trainer

Тренажер для персоналу ресторану: квізи, флеш-картки, робота над помилками та шпаргалки
для винної карти, бару, коктейлів і меню кухні.

## Структура

```
index.html            Вино
bar.html              Бар
cocktails.html        Коктейлі
menu.html             Кухня
assets/
  css/styles.css      Власні стилі (флеш-картки, друк шпаргалки)
  js/app.js           Рушій тренажера, спільний для всіх сторінок
  js/pages.js         Налаштування кожної сторінки: тексти, питання, колонки шпаргалки
  js/tailwind.config.js
  img/<сторінка>/     Фото позицій
data/
  wines.json          Вина (заповнюється вручну)
  bar.json            Бар       ┐
  cocktails.json      Коктейлі  ├ генеруються скриптом scripts/build_quiz_data.mjs
  menu.json           Кухня     ┘
  source/             Вивантаження меню з ChoiceQR (raw_menu.json, menu_clean.json, menu.csv)
scripts/
  parse_choiceqr_menu.py   Завантажує меню з ChoiceQR у data/source/
  build_quiz_data.mjs      Збирає data/*.json і завантажує фото в assets/img/
```

HTML-сторінки лише підключають скрипти: усю розмітку будує `assets/js/app.js`
за налаштуваннями з `assets/js/pages.js` (сторінка обирається атрибутом `<body data-page="...">`).

## Запуск

Дані завантажуються через `fetch`, тому сторінки треба відкривати через локальний вебсервер
(наприклад, Live Server у VS Code або `python -m http.server`), а не подвійним кліком.

## Оновлення меню

```bash
python scripts/parse_choiceqr_menu.py   # свіже меню → data/source/
node scripts/build_quiz_data.mjs        # data/bar.json, cocktails.json, menu.json + нові фото
```

Скрипт збірки виведе список позицій без відповідей (`NOT CURATED`). Відповіді для них
додаються в таблиці `BAR`, `COCKTAILS` і `KITCHEN` на початку `scripts/build_quiz_data.mjs`.
