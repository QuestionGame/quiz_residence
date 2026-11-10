/* =========================================================
   PAGE CONFIGS
   One engine (main.js + modules) renders every trainer page. Each page picks its
   config via <body data-page="...">.

   Question option strategies (question.options):
     { all: [...] }            – always show the full list
     { list: [...], count }    – correct + random picks from the list
     { distractors: item=>[] } – correct + hand-written wrong answers
     { pool: [field, ...], list?, count }
                               – correct + other items' answers, preferring items
                                 that share `field` (e.g. same category), then any
                                 item, then the optional fallback list
   Checklist questions (multi: true) — answer(item) returns an array, the user ticks every right option:
     { all: [...] }                     – show the full list; every item answer in it must be ticked
     { correct, wrong, similarText }    – `correct` random right answers ('all' = every one) + `wrong` answers from other
                                          items; values sharing a word with similarText(item) are never
                                          offered as wrong (avoids near-synonyms)
   optional: true — the question is shown and checked, but never blocks "Перевірити" and never counts
   towards the score or the mistakes bank (kitchen allergens).
   A question whose answer is empty for an item is skipped for that item.
   ========================================================= */

const COUNTRY_FLAGS = {
  "Італія": "🇮🇹", "Франція": "🇫🇷", "Іспанія": "🇪🇸", "Німеччина": "🇩🇪",
  "Австралія": "🇦🇺", "Нова Зеландія": "🇳🇿", "США": "🇺🇸", "Аргентина": "🇦🇷",
  "Чилі": "🇨🇱", "Грузія": "🇬🇪", "Ізраїль": "🇮🇱", "Португалія": "🇵🇹",
  "Шотландія": "🏴", "Ірландія": "🇮🇪", "Японія": "🇯🇵", "Великобританія": "🇬🇧",
  "Нідерланди": "🇳🇱", "Фінляндія": "🇫🇮", "Україна": "🇺🇦", "Мексика": "🇲🇽",
  "Панама": "🇵🇦", "Куба": "🇨🇺", "Філіппіни": "🇵🇭", "Чехія": "🇨🇿", "Бельгія": "🇧🇪"
};
const withFlag = country => `${COUNTRY_FLAGS[country] || "🌍"} ${country}`;

/* 14 major food allergens (EU Regulation 1169/2011). Keep in sync with ALLERGENS in scripts/kitchen.mjs. */
const MENU_ALLERGENS = ['Глютен', 'Ракоподібні', 'Молюски', 'Риба', 'Яйця', 'Молоко', 'Горіхи', 'Арахіс',
  'Соя', 'Кунжут', 'Гірчиця', 'Селера', 'Сульфіти', 'Люпин'];

export const PAGE_LINKS = [
  { id: 'wine', href: './index.html', icon: '🍷', label: 'Вино' },
  { id: 'bar', href: './bar.html', icon: '🥃', label: 'Бар' },
  { id: 'cocktails', href: './cocktails.html', icon: '🍸', label: 'Коктейлі' },
  { id: 'menu', href: './menu.html', icon: '🍽️', label: 'Кухня' }
];

export const PAGES = {
  /* ------------------------------------------------------------- WINE */
  wine: {
    dataUrl: './data/wines.json',
    storageKey: 'sommelierTrainer.stats.v1',
    groupField: 'category',
    groupLabels: { "CORAVIN SELECTION": "Coravin Selection", "Біле": "Біле вино", "Червоне": "Червоне вино" },
    placeholderIcon: '🍷',
    text: {
      title: 'Sommelier Trainer',
      subtitle: 'Винна карта ресторану',
      quizHeading: 'Визначте параметри вина',
      quizHint: 'Уважно погляньте на етикетку, форму пляшки та колір капсули',
      allItems: 'Усі вина',
      skip: 'Пропустити вино →',
      next: 'Наступне вино',
      noteLabel: 'Шпаргалка сомельє',
      cheatTab: 'Шпаргалка сомельє',
      cheatHeading: 'Зведена шпаргалка ресторану',
      cheatSubheading: 'Повна структурована таблиця всіх вин з меню за країнами та категоріями',
      mistakesHeading: 'Вина, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють вина, у яких ви припустилися хоча б однієї помилки (у країні, сорті чи класифікації).',
      searchPlaceholder: '🔍 Пошук за назвою або сортом...',
      footer: 'Sommelier Wine Card Trainer • Ресторанний тренажер для офіціантів та сомельє'
    },
    quizBadge: w => w.category,
    quizMeta: w => w.volume,
    cardBadge: w => w.category,
    cardCorner: w => w.priceHint,
    highlight: w => w.category === 'CORAVIN SELECTION',
    searchFields: ['name', 'grapes', 'country'],
    questions: [
      {
        key: 'country', label: 'Країна походження', resultLabel: 'Правильна країна', resultIcon: '📍',
        cols: 'grid-cols-2 sm:grid-cols-4',
        answer: w => w.country,
        format: withFlag,
        options: {
          list: ["Італія", "Франція", "Іспанія", "Німеччина", "Австралія", "Нова Зеландія", "США",
                 "Аргентина", "Чилі", "Грузія", "Ізраїль", "Португалія"],
          count: 4
        }
      },
      {
        key: 'classification', label: 'Класифікація (солодкість / тип)', resultLabel: 'Класифікація', resultIcon: '🏷️',
        cols: 'grid-cols-2 sm:grid-cols-3',
        answer: w => w.classification,
        result: w => w.classificationGeneral,
        options: {
          all: ["Сухе", "Напівсухе", "Брют / Брют Натюр", "Напівсолодке", "Солодке", "Кріплене",
                "Помаранчеве, сухе", "Помаранчеве, напівсухе", "Безалкогольне"]
        }
      },
      {
        key: 'grapes', label: 'Сортовий склад (виноград)', resultLabel: 'Сортовий склад', resultIcon: '🍇',
        cols: 'grid-cols-1 sm:grid-cols-2', wide: true,
        answer: w => w.grapes,
        result: w => w.grapes,
        format: g => `🍇 ${g}`,
        options: { distractors: w => w.distractors }
      }
    ],
    notes: w => w.tastingNotes,
    details: [
      { label: 'Країна / регіон', value: w => `${withFlag(w.country)}${w.region ? ` · ${w.region}` : ''}` },
      { label: 'Сортовий склад', value: w => w.grapes },
      { label: 'Класифікація', value: w => w.classificationGeneral, accent: true },
      { label: "Об'єм / Міцність", value: w => w.volume, mono: true }
    ],
    summary: w => [`📍 ${w.country} • 🏷️ ${w.classification}`, `🍇 ${w.grapes}`],
    columns: [
      { header: 'Вино', width: '19%', value: w => w.name, name: true },
      { header: 'Категорія меню', width: '12%', value: w => w.category, mono: true },
      { header: 'Країна', width: '14%', value: w => `${withFlag(w.country)}${w.region ? ` (${w.region})` : ''}` },
      { header: 'Класифікація', width: '18%', value: w => w.classificationGeneral, accent: true },
      { header: 'Сорт винограду', width: '15%', value: w => w.grapes },
      { header: 'Ключові ноти смаку', width: '22%', value: w => w.tastingNotes, notes: true }
    ]
  },

  /* -------------------------------------------------------------- BAR */
  bar: {
    dataUrl: './data/bar.json',
    storageKey: 'residenceTrainer.bar.v1',
    groupField: 'group',
    placeholderIcon: '🥃',
    text: {
      title: 'Bar Trainer',
      subtitle: 'Барна карта ресторану',
      quizHeading: 'Визначте напій',
      quizHint: 'Згадайте, що це за напій, звідки він і чим вирізняється',
      allItems: 'Усі позиції бару',
      skip: 'Пропустити →',
      next: 'Наступна позиція',
      noteLabel: 'Підказка бармена',
      cheatTab: 'Шпаргалка бармена',
      cheatHeading: 'Зведена шпаргалка бару',
      cheatSubheading: 'Усі позиції барної карти: вид, країна, стиль і смакові ноти',
      mistakesHeading: 'Позиції, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють напої, у яких ви припустилися хоча б однієї помилки.',
      searchPlaceholder: '🔍 Пошук за назвою, країною або стилем...',
      footer: 'Bar Trainer • Ресторанний тренажер для офіціантів та барменів'
    },
    quizBadge: () => '',
    quizMeta: i => [i.volume, i.price].filter(Boolean).join(' • '),
    cardBadge: i => i.group,
    cardCorner: i => [i.volume, i.price].filter(Boolean).join(' • '),
    searchFields: ['name', 'type', 'country', 'style'],
    questions: [
      {
        key: 'type', label: 'Вид напою', resultLabel: 'Вид', resultIcon: '🥃',
        cols: 'grid-cols-2 sm:grid-cols-4',
        answer: i => i.type,
        options: {
          list: ['Віскі', 'Горілка', 'Коньяк / бренді', 'Текіла / мескаль', 'Ром', 'Джин', 'Аперитив / лікер', 'Пиво'],
          count: 4
        }
      },
      {
        key: 'country', label: 'Країна походження', resultLabel: 'Країна', resultIcon: '📍',
        cols: 'grid-cols-2 sm:grid-cols-4',
        answer: i => i.country,
        format: withFlag,
        options: { pool: ['type'], count: 4 }
      },
      {
        key: 'style', label: 'Стиль / особливість', resultLabel: 'Стиль', resultIcon: '🏷️',
        cols: 'grid-cols-1 sm:grid-cols-2', wide: true,
        answer: i => i.style,
        options: { pool: ['type'], count: 4 }
      }
    ],
    notes: i => i.notes,
    details: [
      { label: 'Вид', value: i => i.type },
      { label: 'Країна', value: i => (i.country ? withFlag(i.country) : '—') },
      { label: 'Стиль', value: i => i.style, accent: true },
      { label: "Порція / ціна", value: i => [i.volume, i.price].filter(Boolean).join(' • ') || '—', mono: true }
    ],
    summary: i => [`🥃 ${i.type}${i.country ? ` • 📍 ${i.country}` : ''}`, `🏷️ ${i.style}`],
    columns: [
      { header: 'Позиція', width: '20%', value: i => i.name, name: true },
      { header: 'Вид', width: '12%', value: i => i.type, mono: true },
      { header: 'Країна', width: '12%', value: i => (i.country ? withFlag(i.country) : '—') },
      { header: 'Стиль', width: '17%', value: i => i.style, accent: true },
      { header: 'Порція / ціна', width: '11%', value: i => [i.volume, i.price].filter(Boolean).join(' • ') || '—' },
      { header: 'Смакові ноти', width: '28%', value: i => i.notes, notes: true }
    ]
  },

  /* -------------------------------------------------------- COCKTAILS */
  cocktails: {
    dataUrl: './data/cocktails.json',
    storageKey: 'residenceTrainer.cocktails.v1',
    groupField: 'group',
    placeholderIcon: '🍸',
    text: {
      title: 'Cocktail Trainer',
      subtitle: 'Коктейльна карта ресторану',
      quizHeading: 'Визначте склад коктейлю',
      quizHint: 'Згадайте основу коктейлю, його склад і групу в меню',
      allItems: 'Усі коктейлі',
      skip: 'Пропустити →',
      next: 'Наступний коктейль',
      noteLabel: 'Підказка бармена',
      cheatTab: 'Шпаргалка бармена',
      cheatHeading: 'Зведена шпаргалка коктейлів',
      cheatSubheading: 'Усі коктейлі меню: група, основа, склад і опис',
      mistakesHeading: 'Коктейлі, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють коктейлі, у яких ви припустилися хоча б однієї помилки.',
      searchPlaceholder: '🔍 Пошук за назвою або інгредієнтом...',
      footer: 'Cocktail Trainer • Ресторанний тренажер для офіціантів та барменів'
    },
    quizBadge: () => '',
    quizMeta: i => [i.volume, i.price].filter(Boolean).join(' • '),
    cardBadge: i => i.group,
    cardCorner: i => i.price,
    searchFields: ['name', 'base', 'ingredients'],
    questions: [
      {
        key: 'base', label: 'Основа коктейлю', resultLabel: 'Основа', resultIcon: '🥃',
        cols: 'grid-cols-2 sm:grid-cols-4',
        answer: i => i.base,
        options: {
          list: ['Джин', 'Ром', 'Текіла', 'Горілка', 'Бурбон / віскі', 'Ігристе вино', 'Піско', 'Біттер / аперитив', 'Лікер', 'Без алкоголю'],
          count: 4
        }
      },
      {
        key: 'ingredients', label: 'Склад', resultLabel: 'Склад', resultIcon: '🍋',
        cols: 'grid-cols-1 sm:grid-cols-2', wide: true,
        answer: i => i.ingredients,
        options: { pool: ['base', 'group'], count: 4 }
      },
      {
        key: 'group', label: 'Група в меню', resultLabel: 'Група', resultIcon: '🏷️',
        cols: 'grid-cols-3',
        answer: i => i.group,
        options: { all: ['Класичний', 'Авторський', 'Безалкогольний'] }
      }
    ],
    notes: i => i.notes,
    details: [
      { label: 'Група', value: i => i.group },
      { label: 'Основа', value: i => i.base, accent: true },
      { label: 'Склад', value: i => i.ingredients },
      { label: "Ціна / об'єм", value: i => [i.price, i.volume].filter(Boolean).join(' • ') || '—', mono: true }
    ],
    summary: i => [`🥃 ${i.base} • 🏷️ ${i.group}`, `🍋 ${i.ingredients}`],
    columns: [
      { header: 'Коктейль', width: '17%', value: i => i.name, name: true },
      { header: 'Група', width: '11%', value: i => i.group, mono: true },
      { header: 'Основа', width: '11%', value: i => i.base, accent: true },
      { header: 'Склад', width: '25%', value: i => i.ingredients },
      { header: 'Ціна', width: '8%', value: i => i.price || '—' },
      { header: 'Опис', width: '28%', value: i => i.notes, notes: true }
    ]
  },

  /* ---------------------------------------------------------- KITCHEN */
  menu: {
    dataUrl: './data/menu.json',
    storageKey: 'residenceTrainer.menu.v2',
    groupField: 'group',
    placeholderIcon: '🍽️',
    text: {
      title: 'Menu Trainer',
      subtitle: 'Меню кухні ресторану',
      quizHeading: 'Склад і алергени страви',
      quizHint: 'Позначте всі інгредієнти, що входять до страви, і всі алергени, які вона містить',
      allItems: 'Усі страви',
      skip: 'Пропустити →',
      next: 'Наступна страва',
      noteLabel: 'Опис',
      cheatTab: 'Шпаргалка меню',
      cheatHeading: 'Зведена шпаргалка кухні',
      cheatSubheading: 'Усі страви меню: склад, алергени, вихід і ціна',
      mistakesHeading: 'Страви, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють страви, у яких ви припустилися хоча б однієї помилки.',
      searchPlaceholder: '🔍 Пошук за назвою, інгредієнтом або алергеном...',
      footer: 'Menu Trainer • Ресторанний тренажер для офіціантів'
    },
    quizBadge: i => (i.isNew ? 'Новинка' : ''),
    quizMeta: i => [i.weight, i.price].filter(Boolean).join(' • '),
    cardBadge: i => i.group,
    cardCorner: i => i.price,
    searchFields: ['name', 'group', 'ingredients', 'allergens'],
    questions: [
      {
        key: 'ingredients', label: 'Склад', hint: '(оберіть усі, що входять до страви)',
        resultLabel: 'Повний склад', resultIcon: '🥗',
        cols: 'grid-cols-1 sm:grid-cols-2', wide: true, multi: true,
        answer: i => i.quizIngredients,
        result: i => i.ingredients.join(', '),
        options: {
          correct: 'all', wrong: 4,
          // words of the dish itself — keeps near-synonyms ("Пармезан" vs "Сир пармезан") out of wrong options
          similarText: i => [i.name, ...i.ingredients, ...i.components.flatMap(c => c.values)].join(' ')
        }
      },
      {
        key: 'allergens', label: 'Алергени', hint: '(необов’язково — на результат не впливає)',
        resultLabel: 'Алергени', resultIcon: '⚠️',
        cols: 'grid-cols-2 sm:grid-cols-3', multi: true, optional: true,
        answer: i => i.allergens,
        result: i => i.allergens.map(a => `${a} (${i.allergenSources[a].join(', ')})`).join('; '),
        options: { all: MENU_ALLERGENS }
      }
    ],
    notes: i => i.notes,
    details: [
      { label: 'Розділ', value: i => i.group },
      { label: 'Вихід', value: i => i.weight || '—', mono: true },
      { label: 'Ціна', value: i => i.price || '—', mono: true }
    ],
    cardSections: i => [
      ...i.components,
      { label: 'Алергени', values: i.allergens.length ? i.allergens : ['Основних алергенів немає'], tone: 'warn' }
    ],
    summary: i => [
      `⚠️ ${i.allergens.join(', ') || 'без основних алергенів'}`,
      `🥗 ${i.ingredients.slice(0, 5).join(', ')}${i.ingredients.length > 5 ? '…' : ''}`
    ],
    columns: [
      { header: 'Страва', width: '18%', value: i => i.name, name: true },
      { header: 'Розділ', width: '11%', value: i => i.group, mono: true },
      { header: 'Склад', width: '41%', value: i => i.ingredients.join(', ') },
      { header: 'Алергени', width: '18%', value: i => i.allergens.join(', ') || '—', accent: true },
      { header: 'Вихід / ціна', width: '12%', value: i => [i.weight, i.price].filter(Boolean).join(' • ') || '—' }
    ]
  }
};
