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
    storageKey: 'residenceTrainer.menu.v1',
    groupField: 'group',
    placeholderIcon: '🍽️',
    text: {
      title: 'Menu Trainer',
      subtitle: 'Меню кухні ресторану',
      quizHeading: 'Визначте страву',
      quizHint: 'Згадайте, у якому розділі меню страва, що в неї входить і який вихід',
      allItems: 'Усі страви',
      skip: 'Пропустити →',
      next: 'Наступна страва',
      noteLabel: 'Опис з меню',
      cheatTab: 'Шпаргалка меню',
      cheatHeading: 'Зведена шпаргалка кухні',
      cheatSubheading: 'Усі страви меню: категорія, склад, вихід і ціна',
      mistakesHeading: 'Страви, що потребують повторення',
      mistakesHint: 'Сюди автоматично потрапляють страви, у яких ви припустилися хоча б однієї помилки.',
      searchPlaceholder: '🔍 Пошук за назвою або інгредієнтом...',
      footer: 'Menu Trainer • Ресторанний тренажер для офіціантів'
    },
    quizBadge: () => '',
    quizMeta: i => i.price,
    cardBadge: i => i.category,
    cardCorner: i => i.price,
    searchFields: ['name', 'category', 'composition'],
    questions: [
      {
        key: 'category', label: 'Категорія меню', resultLabel: 'Категорія', resultIcon: '📂',
        cols: 'grid-cols-2 sm:grid-cols-4',
        answer: i => i.category,
        options: { pool: ['group'], count: 4 }
      },
      {
        key: 'composition', label: 'Склад', resultLabel: 'Склад', resultIcon: '🥗',
        cols: 'grid-cols-1 sm:grid-cols-2', wide: true,
        answer: i => i.composition,
        options: { pool: ['category', 'group'], count: 4 }
      },
      {
        key: 'weight', label: 'Вихід страви', resultLabel: 'Вихід', resultIcon: '⚖️',
        cols: 'grid-cols-2 sm:grid-cols-4',
        answer: i => i.weight,
        options: { pool: ['category', 'group'], count: 4 }
      }
    ],
    notes: i => i.notes,
    details: [
      { label: 'Категорія', value: i => `${i.group} · ${i.category}` },
      { label: 'Склад', value: i => i.composition || '—' },
      { label: 'Вихід', value: i => i.weight || '—', accent: true },
      { label: 'Ціна', value: i => i.price || '—', mono: true }
    ],
    summary: i => [`📂 ${i.category}${i.weight ? ` • ⚖️ ${i.weight}` : ''}`, `🥗 ${i.composition || '—'}`],
    columns: [
      { header: 'Страва', width: '20%', value: i => i.name, name: true },
      { header: 'Категорія', width: '12%', value: i => i.category, mono: true },
      { header: 'Склад', width: '30%', value: i => i.composition || '—' },
      { header: 'Вихід', width: '9%', value: i => i.weight || '—', accent: true },
      { header: 'Ціна', width: '9%', value: i => i.price || '—' },
      { header: 'Опис', width: '20%', value: i => i.notes, notes: true }
    ]
  }
};
