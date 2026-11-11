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
export const MENU_ALLERGENS = ['Глютен', 'Ракоподібні', 'Молюски', 'Риба', 'Яйця', 'Молоко', 'Горіхи', 'Арахіс',
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
    groupField: 'category',
    groupLabels: { "CORAVIN SELECTION": "Coravin Selection", "Біле": "Біле вино", "Червоне": "Червоне вино" },
    placeholderIcon: '🍷',
    text: {
      title: 'Sommelier Trainer',
      subtitle: 'Винна карта ресторану',
      quizHeading: 'Визначте параметри вина',
      quizHint: 'Уважно погляньте на етикетку, форму пляшки та колір капсули',
      skip: 'Пропустити вино →',
      next: 'Наступне вино',
      noteLabel: 'Шпаргалка сомельє',
      mistakesHeading: 'Вина, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють вина, у яких ви припустилися хоча б однієї помилки (у країні, сорті чи класифікації).',
      searchPlaceholder: '🔍 Пошук за назвою або сортом...',
      compositionTitle: 'Профіль смаку',
      footer: 'Sommelier Wine Card Trainer • Ресторанний тренажер для офіціантів та сомельє'
    },
    quizBadge: w => w.category,
    quizMeta: w => w.volume,
    cardBadge: w => w.category,
    cardCorner: w => w.priceHint,
    cardTags: w => [w.country, w.grapes, w.classificationGeneral],
    cardSections: w => [
      { label: 'Походження', values: [w.country, w.region] },
      { label: 'Сорт винограду', values: String(w.grapes).split(/[,;]+/).map(v => v.trim()).filter(Boolean) },
      { label: 'Стиль', values: [w.classificationGeneral] }
    ],
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
    summary: w => [`📍 ${w.country} • 🏷️ ${w.classification}`, `🍇 ${w.grapes}`]
  },

  /* -------------------------------------------------------------- BAR */
  bar: {
    groupField: 'group',
    placeholderIcon: '🥃',
    text: {
      title: 'Bar Trainer',
      subtitle: 'Барна карта ресторану',
      quizHeading: 'Визначте напій',
      quizHint: 'Згадайте, що це за напій, звідки він і чим вирізняється',
      skip: 'Пропустити →',
      next: 'Наступна позиція',
      noteLabel: 'Підказка бармена',
      mistakesHeading: 'Позиції, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють напої, у яких ви припустилися хоча б однієї помилки.',
      searchPlaceholder: '🔍 Пошук за назвою, країною або стилем...',
      compositionTitle: 'Смакові ноти',
      footer: 'Bar Trainer • Ресторанний тренажер для офіціантів та барменів'
    },
    quizBadge: () => '',
    quizMeta: i => [i.volume, i.price].filter(Boolean).join(' • '),
    cardBadge: i => i.group,
    cardCorner: i => [i.volume, i.price].filter(Boolean).join(' • '),
    cardTags: i => [i.type, i.country, i.style],
    cardSections: i => [
      { label: 'Вид напою', values: [i.type] },
      { label: 'Походження', values: [i.country] },
      { label: 'Стиль', values: [i.style] }
    ],
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
    summary: i => [`🥃 ${i.type}${i.country ? ` • 📍 ${i.country}` : ''}`, `🏷️ ${i.style}`]
  },

  /* -------------------------------------------------------- COCKTAILS */
  cocktails: {
    groupField: 'group',
    placeholderIcon: '🍸',
    text: {
      title: 'Cocktail Trainer',
      subtitle: 'Коктейльна карта ресторану',
      quizHeading: 'Визначте склад коктейлю',
      quizHint: 'Згадайте основу коктейлю, його склад і групу в меню',
      skip: 'Пропустити →',
      next: 'Наступний коктейль',
      noteLabel: 'Підказка бармена',
      mistakesHeading: 'Коктейлі, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють коктейлі, у яких ви припустилися хоча б однієї помилки.',
      searchPlaceholder: '🔍 Пошук за назвою або інгредієнтом...',
      compositionTitle: 'Склад коктейлю',
      footer: 'Cocktail Trainer • Ресторанний тренажер для офіціантів та барменів'
    },
    quizBadge: () => '',
    quizMeta: i => [i.volume, i.price].filter(Boolean).join(' • '),
    cardBadge: i => i.group,
    cardCorner: i => i.price,
    cardTags: i => [i.base, i.group, ...String(i.ingredients).split(/[,;]+/).map(v => v.trim()).filter(Boolean).slice(0, 2)],
    cardSections: i => [
      { label: 'Основа', values: [i.base] },
      { label: 'Склад коктейлю', values: String(i.ingredients).split(/[,;]+/).map(v => v.trim()).filter(Boolean) }
    ],
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
    summary: i => [`🥃 ${i.base} • 🏷️ ${i.group}`, `🍋 ${i.ingredients}`]
  },

  /* ---------------------------------------------------------- KITCHEN */
  menu: {
    groupField: 'group',
    placeholderIcon: '🍽️',
    text: {
      title: 'Menu Trainer',
      subtitle: 'Меню кухні ресторану',
      quizHeading: 'Склад і алергени страви',
      quizHint: 'Позначте всі інгредієнти, що входять до страви, і всі алергени, які вона містить',
      skip: 'Пропустити →',
      next: 'Наступна страва',
      noteLabel: 'Опис',
      mistakesHeading: 'Страви, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють страви, у яких ви припустилися хоча б однієї помилки.',
      searchPlaceholder: '🔍 Пошук за назвою, інгредієнтом або алергеном...',
      compositionTitle: 'Склад страви',
      footer: 'Menu Trainer • Ресторанний тренажер для офіціантів'
    },
    quizBadge: i => (i.isNew ? 'Новинка' : ''),
    quizMeta: i => [i.weight, i.price].filter(Boolean).join(' • '),
    cardBadge: i => i.group,
    cardCorner: i => i.price,
    cardTags: i => i.ingredients.slice(0, 3),
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
    cardSections: i => i.components, // allergens are shown in their own warning block (item-sheet.js)
    summary: i => [
      `⚠️ ${i.allergens.join(', ') || 'без основних алергенів'}`,
      `🥗 ${i.ingredients.slice(0, 5).join(', ')}${i.ingredients.length > 5 ? '…' : ''}`
    ]
  }
};
