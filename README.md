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
  js/main.js          Точка входу: перемикання режимів, події, завантаження даних
  js/pages.js         Налаштування кожної сторінки: тексти, питання, колонки шпаргалки
  js/context.js       Поточна сторінка, її конфіг, стан квізу та завантажені позиції
  js/header.js        Хедер: лого, перемикач сторінок, статистика, вкладки режимів
  js/layout.js        Розмітка секцій сторінки та футер
  js/quiz.js          Квіз: фільтри, варіанти відповідей, перевірка
  js/flashcards.js    Флеш-картки
  js/mistakes.js      Банк помилок
  js/cheatsheet.js    Шпаргалка (таблиця для друку)
  js/stats.js         Лічильники в шапці (серія, точність, помилки)
  js/storage.js       Збереження прогресу в localStorage
  js/sound.js         Звуки (Web Audio API)
  js/utils.js         Допоміжні функції
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

HTML-сторінки лише підключають `assets/js/main.js` (ES-модуль): усю розмітку, зокрема спільний
хедер з `header.js`, будують модулі за налаштуваннями з `assets/js/pages.js`
(сторінка обирається атрибутом `<body data-page="...">`).

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

### Що робить `build_quiz_data.mjs`

1. Читає `data/source/menu_clean.json` (назви, ціни, вага/об'єм, описи, фото з ChoiceQR).
2. Бере розділи «БАР», «КОКТЕЙЛІ» та «НА СНІДАНОК» / «ПІЦА» / «НА ОБІД ТА ВЕЧЕРЮ».
3. Додає до кожної позиції правильні відповіді з таблиць `BAR`, `COCKTAILS`, `KITCHEN`
   (їх немає в ChoiceQR, тому вони ведуться вручну). Позиції без відповідей пропускає і
   виводить як `NOT CURATED`.
4. Нормалізує дані: «450 g» → «450 г», форматує ціни, позначає ціну за 100 г, додає «б/а»
   до безалкогольних коктейлів, виправляє назви (`BAR_NAMES`, `KITCHEN_NAMES`).
5. Пропускає страви, для яких немає ні складу, ні ваги (нема про що питати).
6. Завантажує відсутні фото в `assets/img/<сторінка>/` (наявні не чіпає).
7. Записує `data/bar.json`, `data/cocktails.json`, `data/menu.json`.

Запускати після кожного оновлення меню парсером.

## Особливості даних і що варто перевірити

**Як працює квіз**
- Якщо для позиції немає відповіді (наприклад, країна пива невідома або страва без опису),
  це питання для неї не показується.
- Неправильні варіанти складу й виходу беруться з інших позицій тієї ж категорії.
- Країну прибрано з назв бару («ORA, Франція» → «ORA»), бо вона підказувала відповідь.
  У назвах Hoegaarden, Leffe Brune, Becherovka кириличні літери замінено на латинські (для пошуку).
- У квіз не потрапили 4 позиції кухні без опису й ваги: пшеничний і житній тартіни,
  гречані грінки, картопляне пюре.

**Відповіді, взяті не з меню (варто звірити з баром)**
- Склад класичних коктейлів, якого немає в описі меню: Porn Star Martini, Whiskey Sour,
  Pisco Sour, French 75, Aperol Spritz, а також Clover Club і Aperol Spritz б/а.
- Країни, не вказані в меню: Corona (Мексика), Stella Artois, Hoegaarden, Leffe (Бельгія),
  Tanduay (Філіппіни), Pisco (Чилі).
- Країна невідома, питання не показується: Botafogo Spiced/Black, Stirling, Milk Stout,
  Samurai's Daughter, Party Weizen, Zero Stress.

**Можливі опечатки в ChoiceQR (у тренажері лишено як у меню)**
PISCO CAPEI (ймовірно Capel), JANARA / JARANA, TANDAY (в описі — Tanduay), MAI THAI,
MARQUIS DE SAIN-LOUP (в описі — Saint-Loup). Після виправлення в ChoiceQR достатньо
перезапустити парсер і скрипт збірки; ключі в таблицях відповідей теж треба буде оновити.
