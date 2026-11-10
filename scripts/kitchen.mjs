// Kitchen data for menu.json, built from the detailed kitchen spec (data/source/residence_menu_full.json)
// plus prices / weights / photos / descriptions from ChoiceQR (data/source/menu_clean.json).
//
//   - ingredients: one entry per ingredient (for the quiz checklist)
//   - components:  grouped composition (base, sauces, decor…) for flashcards
//   - allergens:   derived from ingredients with ALLERGEN_RULES + composition of base sauces.
//                  AUTO-DERIVED — must be verified by the kitchen; fix with ALLERGEN_OVERRIDES.

const FOOD_SECTIONS = ['breakfasts', 'starters', 'salads', 'soups', 'pasta_ravioli_noodles',
  'grill_and_meat', 'fish_seafood', 'pizza', 'desserts', 'kids', 'side_dishes'];

const SECTION_LABELS = {
  breakfasts: 'Сніданки', starters: 'Закуски', salads: 'Салати', soups: 'Перші страви',
  pasta_ravioli_noodles: 'Паста та гарячі страви', grill_and_meat: "М'ясо та гриль",
  fish_seafood: 'Риба', pizza: 'Піца', desserts: 'Десерти', kids: 'Дітям', side_dishes: 'Гарніри'
};

/* Detailed-spec dish id → ChoiceQR dish name (for price, weight, photo, description).
   "CATEGORY|NAME" picks one of two same-named ChoiceQR dishes (e.g. PIZZA / MINI PIZZA). */
const CHOICEQR = {
  crudo_dorado: 'КРУДО З ДОРАДО', vitello_tonnato: 'ВІТЕЛЛО ТОННАТО', antipasti: 'АНТИПАСТІ',
  salmon_bruschetta: 'БРУСКЕТА З ЛОСОСЕМ', tuna_tartare: 'ТАРТАР ІЗ ТУНЦЯ ТА КРЕВЕТОК',
  beef_tartare: 'ТАРТАР ІЗ ЯЛОВИЧИНИ З АНЧОУСАМИ', tempura_shrimp: 'КРЕВЕТКА ТЕМПУРА',
  salmon_riette: 'РІЄТ ІЗ ЛОСОСЯ З ВЕРШКОВИМ МУСОМ ТА ЦИТРУСОВИМ ТЕРІЯКІ',
  salted_herring: 'МАЛОСОЛЬНІ ОСЕЛЕДЦІ З КАРТОПЛЕЮ, ТЕПЛИМ ЯЙЦЕМ ТА ЙОГУРТОМ',
  chicken_pate: 'ПАШТЕТ ІЗ КУРЯЧОЇ ПЕЧІНКИ З ЦИБУЛЕВИМ ЧАТНІ', shrimp_cakes_surf_turf: 'SHRIMP-КЕЙКИ SURF&TURF',
  caesar_shrimp: 'ЦЕЗАР З КРЕВЕТКОЮ ТА АВОКАДО',
  caesar_chicken_bacon: "ЦЕЗАР З ХРУМКОЮ КУРКОЮ, М'ЯКИМ ЯЙЦЕМ ТА ЧІПСАМИ З БЕКОНУ",
  duck_fillet_salad: 'САЛАТ ІЗ КАЧИНИМ ФІЛЕ ТА ЯГІДНИМ СОУСОМ', greek_pesto: 'ГРЕЦЬКИЙ З ПЕСТО З СЕЗОННОЇ ЗЕЛЕНІ',
  beef_hummus_salad: 'САЛАТ ІЗ ЯЛОВИЧИНОЮ ТА ХУМУСОМ', salmon_mango_avocado_salad: 'САЛАТ ІЗ ЛОСОСЕМ, МАНГО ТА АВОКАДО',
  tuna_tataki_salad: 'ЗЕЛЕНИЙ САЛАТ З ТУНЦЕМ ТАТАКІ ТА АВОКАДО',
  red_borscht: 'ДУЖЕ ЧЕРВОНИЙ БОРЩ ЗІ СВИНЯЧИМ РЕБЕРЦЕМ', chicken_meatball_broth: 'БУЛЬЙОН З МІТ БОЛАМИ',
  pho_bo: 'ФО БО З ЯЛОВИЧИНОЮ', spicy_trout_cream_soup: 'ПРЯНИЙ КРЕМ-СУП З ФОРЕЛІ',
  pumpkin_cream_soup: 'КРЕМ СУП З ГАРБУЗА',
  schnitzel_pasta: 'ПАСТА ЗІ ШНІЦЕЛЕМ', ricotta_spinach_ravioli: 'РАВІОЛІ З РІКОТОЮ ТА ШПИНАТОМ',
  smoked_duck_ravioli: 'РАВІОЛІ З КОПЧЕНОЮ КАЧКОЮ', beef_udon: 'УДОН З ЯЛОВИЧИНОЮ ТОНКАЦУ',
  shrimp_pelmeni: 'ПЕЛЬМЕНІ З КРЕВЕТКАМИ ТА ФОРЕЛЛЮ СЛАБОЇ СОЛІ', lasagnetta: 'ЛАЗАНЬЄТТА',
  baked_eggplant_beef: 'БАКЛАЖАН З РУБЛЕНОЮ ЯЛОВИЧИНОЮ, ЧИЛІ-КРІСПОМ ТА СОУСОМ БЛЕК ПЕПЕР',
  ribeye_steak: 'СТЕЙК РІБАЙ', veal_medallion: 'МЕДАЛЬЙОНИ З ЯЛОВИЧИНИ', veal_rack: 'КАРЕ ТЕЛЯТИНИ',
  pastrami_labneh: 'ПАСТРАМІ ІЗ ЯЛОВИЧИНИ З КАРТОПЛЕЮ ТА ЛАБНЕ',
  duck_breast: 'КАЧИНА ГРУДКА З КРЕМОМ З КУКУРУДЗИ ТА ГРУШЕЮ', pork_milanese: 'КОРЕЙКА МІЛАНЕЗЕ',
  cordon_bleu_turkey: 'КОРДОН БЛЮ З ІНДИЧКИ', chicken_thigh_puree: 'КУРЯЧЕ СТЕГНО З ІДЕАЛЬНИМ ПЮРЕ ТА ШПИНАТОМ',
  double_smash_cheeseburger: 'СМЕШ ДАБЛ ЧИЗБУРГЕР',
  tuna_steak: 'СТЕЙК З ТУНЦЯ', crispy_skin_salmon: 'ЛОСОСЬ З ХРУСТКОЮ СКОРИНКОЮ НА КРЕМІ З ТОМАТІВ',
  salmon_patty: 'БИТОК ІЗ ЛОСОСЯ, КРЕВЕТОК І ФЕРМЕРСЬКОЇ ТИЛАПІЇ З ЛИМОННИМ ТЕРІЯКІ',
  pizza_margherita: 'МАРГАРИТА', pizza_pepperoni: 'PIZZA|ПЕПЕРОНІ', pizza_chicken_pineapple: 'З АНАНАСОМ ТА КУРЯЧИМ СТЕГНОМ',
  pizza_chicken_oyster_mushrooms: 'З СОКОВИТИМ КУРЯЧИМ СТЕГНОМ ТА КОПЧЕНИМИ ГЛИВАМИ',
  pizza_braised_beef: 'З ТОМЛЕНОЮ ЯЛОВИЧИНОЮ', pizza_roastbeef: "З РОСТБІФОМ, РУКОЛОЮ ТА В'ЯЛЕНИМИ ТОМАТАМИ",
  pizza_vegan: 'ВЕГАН', pizza_bianca: "Б'ЯНКА З РІКОТТОЮ ТА ДОРБЛЮ", pizza_craft_cheeses: 'З КРАФТОВИМИ СИРАМИ',
  pizza_salmon_spinach: 'З ЛОСОСЕМ ТА ШПИНАТОМ',
  pizza_porcini: 'З БІЛИМИ ГРИБАМИ ТА ПАРМЕЗАНОМ',
  pizza_truffle_mushroom: 'ТРЮФЕЛЬНА З ДОРБЛЮ, ЕРІНГАМИ ТА ЦИБУЛЕВИМ МАРМЕЛАДОМ',
  english_breakfast: 'АНГЛІЙСКИЙ СНІДАНОК', shakshuka_hummus: 'ШАКШУКА З ТОМАТАМИ ТА ХУМУСОМ',
  two_egg_omelette: 'ОМЛЕТ З ДВОХ ЯЄЦЬ З ЗЕЛЕНИМ САЛАТОМ', truffle_scramble_shrimp_toast: 'ТРЮФЕЛЬНИЙ СКРЕМБЛ ТОСТ З КРЕВЕТКАМИ',
  avo_toast: 'АВО ТОСТ', whipped_butter_bread: 'ХЛІБ ЗІ ЗБИТИМ МАСЛОМ',
  spiced_grain_porridge_turkey: 'ПРЯНА ЗЛАКОВА КАША З ІНДИЧКОЮ',
  base_breakfast: 'БАЗОВИЙ СНІДАНОК', breakfast_for_him: 'СНІДАНОК ДЛЯ НЬОГО', breakfast_for_her: 'СНІДАНОК ДЛЯ НЕЇ',
  turkey_melt: 'МЕЛТ З ІНДИЧКОЮ', pastrami_melt: 'МЕЛТ З ПАСТРАМІ', pancakes_pastrami_mushrooms: 'МЛИНЦІ З ПАСТРАМІ',
  pancakes_pate_truffle_sour_cream: 'МЛИНЦІ З ПАШТЕТОМ ТА ТРЮФЕЛЬНОЮ СМЕТАНОЮ', syrnyky_three_milks: 'СИРНИКИ ТРИ МОЛОКА',
  syrnyky_meringue: 'СИРНИКИ SUZET',
  sweet_cheese_pancakes: 'МЛИНЦІ З СИРОМ ТА СМОРОДИНОВИМ ДЖЕМОМ',
  cherry_varenyky_strawberry_coulis: 'ВАРЕНИКИ З ВИШНЕЮ ТА ПОЛУНИЧНИМ КЮЛІ',
  napoleon_vanilla: 'НАПОЛЕОН З ВАНІЛЬНИМ КРЕМОМ', napoleon_coconut: 'НАПОЛЕОН КОКОСОВИЙ',
  poppy_seed_medovik: 'МАКОВИЙ МЕДОВИК З ВИШНЕЮ',
  classic_tiramisu: 'МАЙЖЕ КЛАСИЧНИЙ ТІРАМІСУ', chocolate_fondant: 'ШОКОЛАДНИЙ ФОНДАН', homemade_ice_cream: 'МОРОЗИВО',
  mashed_potatoes: 'КАРТОПЛЯНЕ ПЮРЕ', grilled_vegetables: 'ОВОЧІ ГРИЛЬ З ЧАСНИКОМ КОНФІ ТА СОУСОМ ЧІМІЧУРІ',
  baked_potatoes: 'ЗАПЕЧЕНА КАРТОПЛЯ З ЙОГУРТОМ ТА ЗЕЛЕНОЮ ОЛІЄЮ', sweet_potato_fries: 'БАТАТ ФРІ',
  french_fries: 'КАРТОПЛЯ ФРІ',
  // Added to the spec from ChoiceQR (marked "source": "choiceqr" in residence_menu_full.json)
  pizza_bianca_mini: "Б'ЯНКА МІНІ", pizza_salmon_spinach_mini: 'ЛОСОСЬ - ШПИНАТ МІНІ',
  pizza_pepperoni_mini: 'MINI PIZZA|ПЕПЕРОНІ',
  apple_strudel: 'ШТРУДЕЛЬ З ЯБЛУКАМИ ТА ДОМАШНІМ МОРОЗИВОМ', caramel_cheesecake_brownie: 'КАРАМЕЛЬНИЙ ЧІЗКЕЙК З БРАУНІ',
  cherry_varenyky_nuts: 'ВАРЕНИКИ З ВИШНЕЮ, ПОЛУНИЧНИМ КЮЛІ ТА ГОРІШКАМИ',
  seafood_saute_bisque: 'СОТЕ З МОРЕПРОДУКТАМИ ТА БІСКОМ ІЗ КРЕВЕТОК',
  kids_chicken_broth: 'КУРЯЧИЙ БУЛЬЙОН З ФРИКАДЕЛЬКАМИ', kids_meatballs_puree: 'КУРЯЧІ МІТБОЛИ З КАРТОПЛЯНИМ ПЮРЕ',
  kids_syrnychky: 'СИРНИЧКИ ЗІ СМЕТАНОЮ', kids_creamy_spaghetti: 'ВЕРШКОВІ СПАГЕТТІ З ПАРМЕЗАНОМ'
};

/* ------------------------------------------------------------- allergens */

export const ALLERGENS = ['Глютен', 'Ракоподібні', 'Молюски', 'Риба', 'Яйця', 'Молоко', 'Горіхи', 'Арахіс',
  'Соя', 'Кунжут', 'Гірчиця', 'Селера', 'Сульфіти', 'Люпин'];

// Lower-case word stems; matched at the start of a word. Order inside a rule doesn't matter.
const ALLERGEN_RULES = {
  'Глютен': ['борошн', 'хліб', 'тартін', 'тост', 'тісто', 'тіст', 'млинц', 'млинці', 'паніров', 'сухар', 'крутон', 'грінк',
    'бріош', 'булочк', 'пампушк', 'вареник', 'пельмен', 'равіолі', 'лазань', 'тальятел', 'спагет', 'домашня паста', 'яєчна паста',
    'пф паста', 'фреш паста', 'савоярд', 'корж', 'кекс', 'блонді', 'брауні', 'темпур', 'кляр', 'перлов', 'вівсян', 'ячм', 'удон',
    'пшенич', 'паніпурі', 'сирник', 'соєв', 'теріякі', 'понзу', 'понзо', 'унагі', 'хойсін', 'ворчестер', 'печиво'],
  'Ракоподібні': ['креветк', 'шрімп', 'краб', 'лобстер', 'біск'],
  'Молюски': ['мідії', 'мідій', 'гребін', 'кальмар', 'устриц', 'восьмин'],
  'Риба': ['лосос', 'тунц', 'тунец', 'тунець', 'дорадо', 'оселед', 'форел', 'тилапі', 'анчоус', 'корюшк', 'рибн', 'хондаші',
    'ворчестер'],
  'Яйця': ['яйц', 'яєць', 'яєчн', 'яйце', 'жовт', 'меренг', 'скрембл', 'омлет', 'глазун', 'майонез', 'голандез', 'айолі',
    'савоярд', 'заварн', 'брауні'],  // "заварний крем" (custard) is conventionally made with eggs — verify
  'Молоко': ['молок', 'молоч', 'вершк', 'вершков', 'масло', 'масл', 'сир', 'пармезан', 'моцарел', 'маскарпон', 'рікот',
    'дорблю', 'горгонзол', 'маасдам', 'гауд', 'камамбер', 'чедр', 'чедер', 'фета', 'халумі', 'філадельф', 'лабне',
    'йогурт', 'сметан', 'згущ', 'морозив', 'бешамел', 'ганаш', 'голандез', 'del gusto'],
  'Горіхи': ['фундук', 'фісташ', 'мигдал', 'волоськ', 'горіх', 'кешью', 'пекан', 'праліне'],
  'Арахіс': ['арахіс'],
  'Соя': ['соєв', 'соя', 'сої', 'місо', 'теріякі', 'понзу', 'понзо', 'унагі', 'хойсін', 'тофу', 'едамам'],
  'Кунжут': ['кунжут', 'тахіні', 'тхін'],
  'Гірчиця': ['гірчиц', 'діжон'],
  'Селера': ['селер'],
  'Сульфіти': ['вино', 'вина', 'вині', 'вином', 'бальзамі'],
  'Люпин': ['люпин']
};

// Phrases that contain an allergen stem but are not that allergen (removed before matching).
const FALSE_FRIENDS = [
  /мускатн\S*\s+горіх\S*/g,      // nutmeg is a spice
  /горіхов\S*\s+масл\S*/g,       // beurre noisette = brown butter (dairy is matched via "бернуазет" below)
  /рослинн\S*\s+масл\S*/g,       // vegetable oil
  /сироп\S*/g,                   // "сироп" starts with "сир"
  /кисло-солодк\S*/g,
  /кокосов\S*\s+молок\S*/g,      // coconut milk is not dairy
  /паніровці з білого та чорного кунжуту/g // tuna crust is sesame, not breadcrumbs (sesame is still matched)
];
const EXTRA_DAIRY = /бернуазет/;

// Base sauces from the spec ("Базові соуси") — their composition is added to the dish text.
const SAUCE_TRIGGERS = [
  [/цезар/, 'Соус Цезар'], [/демігляс|деміглас/, 'Соус Демігляс'], [/(^|[^а-яіїєґ])біск/, 'Соус Біск'],
  [/хумус/, 'Хумус'], [/чімічурі/, 'Соус Чімічурі'], [/песто/, 'Соус Песто'],
  [/соус манго/, 'Соус Манго'], [/перечн\S* соус|соус 7 перців/, 'Соус 7 перців'],
  [/картоплян\S* пюре|пюре картоплян/, 'Картопляне пюре']   // from the side dishes section
];

// Manual corrections after kitchen review: { dishId: { add: ['Селера'], remove: ['Сульфіти'] } }
const ALLERGEN_OVERRIDES = {};

const LETTER = 'a-zа-яіїєґ';
/* Matches a word starting with the stem; group 2 is the whole word as written ("вершк" → "вершками"). */
function stemRegex(stem) {
  return new RegExp(`(^|[^${LETTER}])(${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[${LETTER}'’-]*)`, 'gi');
}
const COMPILED_RULES = Object.entries(ALLERGEN_RULES).map(([allergen, stems]) => [allergen, stems.map(s => [s, stemRegex(s)])]);

/* Splits on commas that are not inside parentheses. */
function splitTopLevel(text) {
  const parts = [];
  let depth = 0, current = '';
  for (const ch of String(text)) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; } else current += ch;
  }
  parts.push(current);
  return parts;
}

/* Allergens for one dish, with the ingredients that triggered each one. */
function deriveAllergens(dish, sauceGuide, extraText) {
  const { custom, ...fixedComponents } = dish.components || {}; // "custom" = guest's choice, not always in the dish
  let text = [dish.name, JSON.stringify(fixedComponents), dish.ingredients_raw, dish.ingredients,
    dish.sauce, (dish.cheeses || []).join(', '), (dish.toppings || []).join(', '),
    (dish.flavors || []).map(f => f.ingredients).join(', '), extraText].filter(Boolean).join(' | ').toLowerCase();

  // Two passes: a sauce can reference another sauce (7 перців → демігляс).
  const added = new Set();
  for (let pass = 0; pass < 2; pass++) {
    for (const [pattern, sauceName] of SAUCE_TRIGGERS) {
      if (added.has(sauceName) || !sauceGuide[sauceName] || !pattern.test(text)) continue;
      added.add(sauceName);
      text += ` | ${sauceName.toLowerCase()}: ${sauceGuide[sauceName]}`;
    }
  }
  const hasExtraDairy = EXTRA_DAIRY.test(text);
  for (const re of FALSE_FRIENDS) text = text.replace(re, ' ');

  const sources = {};
  for (const [allergen, rules] of COMPILED_RULES) {
    const hits = rules.flatMap(([, re]) => [...text.matchAll(re)].map(m => m[2]));
    if (allergen === 'Молоко' && hasExtraDairy) hits.push('масло бернуазет');
    if (hits.length) sources[allergen] = [...new Set(hits)].slice(0, 6);
  }

  const override = ALLERGEN_OVERRIDES[dish.id] || {};
  (override.remove || []).forEach(a => delete sources[a]);
  (override.add || []).forEach(a => { sources[a] = sources[a] || ['вказано кухнею']; });

  const allergens = ALLERGENS.filter(a => sources[a]);
  return { allergens, allergenSources: Object.fromEntries(allergens.map(a => [a, sources[a]])) };
}

/* ----------------------------------------------------------- ingredients */

const NOT_AN_INGREDIENT = /^(соус|сіль|вода|спеції|сіль мальдонська|сіль молдонська|мальдонська сіль|малдонська сіль|суміш перців|прянощі)$/;
const MAX_OPTION_LENGTH = 42; // longer phrases are kept for flashcards but not used as checklist options

function cleanIngredient(text) {
  return String(text)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^\s*пф\s+/i, '')
    .replace(/^\s*(подається|подаємо)\s+(з|із|зі)\s+/i, '')
    .replace(/[.;]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const capitalize = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* Component lines that pack several ingredients into one phrase → one entry per ingredient.
   Keys are the cleaned (lower-case, no parentheses) phrase from residence_menu_full.json. */
const PHRASE_SPLITS = {
  'вівсяна та перлова крупи, насіння льону, вершки, курячий бульйон, соус блек пеппер, пармезан, масло':
    ['Вівсяна крупа', 'Перлова крупа', 'Насіння льону', 'Вершки', 'Курячий бульйон', 'Соус блек пеппер', 'Пармезан', 'Масло'],
  'хумус із запеченим буряком та зеленим горошком': ['Хумус', 'Запечений буряк', 'Зелений горошок'],
  'тост тартін з вершковим крем-сиром і слабосоленим лососем': ['Тост тартін', 'Вершковий крем-сир', 'Слабосолений лосось'],
  'млинці з начинкою з пастрамі, сирів чедр і моцарела з діжонською гірчицею та огірками':
    ['Млинці', 'Пастрамі', 'Сир чедр', 'Моцарела', 'Діжонська гірчиця', 'Огірки'],
  'фарш із курячого філе та креветки у хрусткій паніровці з кукурудзяних пластівців':
    ['Куряче філе', 'Креветки', 'Паніровка з кукурудзяних пластівців'],
  'яловичо-курячий бульйон, томлений із бадьяном, корицею, кардамоном, коріандром, гвоздикою, імбиром та яблуками':
    ['Яловичо-курячий бульйон', 'Бадьян', 'Кориця', 'Кардамон', 'Коріандр', 'Гвоздика', 'Імбир', 'Яблука'],
  'теляча вирізка, обсмажена з часником на маслі бернуазет': ['Теляча вирізка', 'Часник', 'Масло бернуазет'],
  'начинка з фаршу тигрової креветки та курячого філе': ['Тигрова креветка', 'Куряче філе'],
  'рублена яловичина, смажена цибуля, сир моцарела, майонез, соус ворчестер':
    ['Рублена яловичина', 'Смажена цибуля', 'Сир моцарела', 'Майонез', 'Соус ворчестер'],
  'кокосовий крем із сиром del gusto та кокосовою пудрою': ['Кокосовий крем', 'Сир Del Gusto', 'Кокосова пудра'],
  'шоколадний кекс із рідким гарячим центром із чорного шоколаду': ['Шоколадний кекс з рідким центром', 'Чорний шоколад']
};

function ingredientList(rawParts, { split = true } = {}) {
  const seen = new Set();
  const out = [];
  const add = value => {
    const key = value.toLowerCase();
    if (!value || NOT_AN_INGREDIENT.test(key) || seen.has(key)) return;
    seen.add(key);
    out.push(capitalize(value));
  };
  for (const part of rawParts) {
    for (const piece of split ? splitTopLevel(part) : [part]) {
      const value = cleanIngredient(piece);
      if (PHRASE_SPLITS[value]) PHRASE_SPLITS[value].forEach(add); else add(value);
    }
  }
  return out;
}

/* Dishes whose spec describes the composition only in prose: ingredients written out from that prose. */
const INGREDIENT_OVERRIDES = {
  whipped_butter_bread: ['Білий хліб тартін', 'Вершкове масло', 'Трюфельна паста', 'Часник конфі', 'Крихта фісташки'],
  napoleon_vanilla: ['Листкові коржі', 'Заварний крем', 'Молоко', 'Вершки', 'Ванільна паличка'],
  classic_tiramisu: ['Печиво савоярді', 'Кава', 'Темний ром', 'Сир маскарпоне', 'Сир філадельфія', 'Яєчні жовтки', 'Збиті вершки', 'Какао'],
  baked_potatoes: ['Запечена картопля', 'Зелений йогурт', 'Зелена олія', 'Зелень'],
  sweet_potato_fries: ['Батат фрі', 'Соус кімчі'],
  french_fries: ['Картопля фрі', 'Томатний кетчуп']
};

/* ------------------------------------------------------------ components */

const COMPONENT_LABELS = {
  base: 'Основа', garnish_decor: 'Гарнір / декор', sauces: 'Соуси', vegetables_greens: 'Овочі й зелень',
  sauces_dressings: 'Соуси й заправки', spices_decor: 'Спеції й декор', cheeses: 'Сири', meat: "М'ясо",
  sides_sauces: 'Доповнення й соуси', crisps: 'Чіпси', vegetables: 'Овочі', decor: 'Декор', seasoning: 'Приправа',
  dressing_mix: 'Заправка', sauces_dots: 'Соуси (крапки)', decor_cheese: 'Декор і сир', sauce: 'Соус', creams: 'Креми',
  sauce_decor: 'Соус і декор', sides: 'Гарнір', sauce_greens: 'Соус і зелень', toppings: 'Топінги',
  greens_veg: 'Зелень і овочі', protein: 'Білок', dressing: 'Заправка', crunch: 'Хрустке', crunch_cheese: 'Хрустке й сир',
  cheese: 'Сир', herbs_spices: 'Трави й спеції', hot_items: 'Теплі інгредієнти', greens_fruit: 'Зелень і фрукти',
  creams_dressing: 'Крем і заправка', specials: 'Особливе', dressings: 'Заправки', base_soup: 'Основа супу',
  serving: 'Подача', broth: 'Бульйон', contents: 'Наповнення', accent: 'Акцент', seafood: 'Морепродукти',
  vegetables_mushrooms: 'Овочі й гриби', aromatics_serving: 'Ароматика й подача', serving_sauces: 'Соуси до подачі',
  soup_base: 'Основа супу', decor_finish: 'Декор', pasta: 'Паста', dough_filling: 'Тісто й начинка', filling: 'Начинка',
  garnish: 'Гарнір', decor_crunch: 'Декор', dumplings: 'Пельмені', layers: 'Шари', crust_cheese: 'Скоринка',
  meat_topping: "М'ясний шар", side: 'Гарнір', finish: 'Фініш', grill_cooking: 'Приготування на грилі',
  sides_sauce: 'Гарнір і соус', base_cream: 'Крем-основа', side_cream: 'Крем-гарнір', side_fruit: 'Фруктовий гарнір',
  gratination: 'Запікання', side_greens: 'Зелень і сир', bun: 'Булочка', meat_cheese: "М'ясо й сир",
  eggs_meat: "Яйця й м'ясо", beans_veg: 'Квасоля й овочі', sauces_crisps: 'Соуси й кріспі', bread: 'Хліб', eggs: 'Яйця',
  omelette: 'Омлет', salad: 'Салат', bread_cream: 'Хліб і крем', top: 'Зверху', butter: 'Масло', porridge: 'Каша',
  meat_egg: "М'ясо й яйце", plate: 'На тарілці', separate: 'Окремо', custom: 'На вибір гостя', sandwich: 'Сендвіч',
  side_sauce: 'Гарнір і соус', pancakes_filling: 'Млинці й начинка', sauce_ragout: 'Соус-рагу', pancakes: 'Млинці',
  syrnyky: 'Сирники', cream: 'Крем', sauce_meringue: 'Соус і меренга', varenyky: 'Вареники', pastry: 'Тісто',
  cakes: 'Коржі', cake: 'Кекс', cheese_layer: 'Сирний шар', patty: 'Биток', side_decor: 'Гарнір і декор'
};

const asList = value => (Array.isArray(value) ? value : value ? [value] : []);

function componentGroups(dish, section) {
  if (section.id === 'pizza') {
    return [
      { label: 'Тісто', values: [section.dough_base] },
      { label: 'Соус', values: [dish.sauce] },
      { label: 'Сири', values: dish.cheeses },
      { label: 'Начинка', values: dish.toppings }
    ].filter(g => g.values && g.values.length && g.values[0]);
  }
  if (dish.flavors) {
    return dish.flavors.map(f => ({ label: f.name, values: splitTopLevel(f.ingredients).map(s => s.trim()) }));
  }
  if (dish.components) {
    return Object.entries(dish.components).map(([key, values]) => ({
      label: COMPONENT_LABELS[key] || key.replace(/_/g, ' '),
      values: asList(values).map(capitalize)
    }));
  }
  if (dish.ingredients) return [{ label: 'Склад', values: [capitalize(dish.ingredients)] }];
  return [];
}

function dishIngredients(dish, section) {
  if (dish.ingredients_raw) return ingredientList([dish.ingredients_raw]);
  if (section.id === 'pizza') return ingredientList([dish.sauce, ...(dish.cheeses || []), ...(dish.toppings || [])]);
  if (dish.flavors) return ingredientList(dish.flavors.map(f => f.ingredients));
  if (INGREDIENT_OVERRIDES[dish.id]) return INGREDIENT_OVERRIDES[dish.id];
  if (dish.ingredients) return ingredientList([dish.ingredients]);
  // components: one entry per component line. Lines are not split on commas ("печиво, просочене кавою…"
  // is one phrase); lines longer than MAX_OPTION_LENGTH stay out of the quiz. Guest-choice notes are skipped.
  const parts = Object.entries(dish.components || {})
    .filter(([key, value]) => key !== 'custom' && Array.isArray(value))
    .flatMap(([, values]) => values);
  return ingredientList(parts, { split: false });
}

/* ------------------------------------------------------------------ build */

export function buildKitchen({ spec, menuClean, helpers, report }) {
  const { slug, formatPrice, formatVolume, cleanDescription, norm } = helpers;
  const qrByKey = new Map();
  for (const raw of menuClean) {
    const name = norm(raw['Назва']).toUpperCase();
    qrByKey.set(name, qrByKey.get(name) || raw);
    qrByKey.set(`${norm(raw['Категорія']).toUpperCase()}|${name}`, raw);
  }
  const sauceGuide = Object.fromEntries(
    (spec.sections.find(s => s.id === 'sauces_guide')?.items || []).map(s => [s.name, s.ingredients.replace(/\([^)]*\)/g, '')])
  );
  const mashed = spec.sections.find(s => s.id === 'side_dishes')?.items.find(i => i.id === 'mashed_potatoes');
  if (mashed) sauceGuide['Картопляне пюре'] = mashed.ingredients;

  const items = [];
  for (const sectionId of FOOD_SECTIONS) {
    const section = spec.sections.find(s => s.id === sectionId);
    if (!section) { report.notCurated.push(`КУХНЯ: розділ ${sectionId} відсутній у специфікації`); continue; }

    for (const dish of section.items) {
      if (!(dish.id in CHOICEQR)) report.notCurated.push(`КУХНЯ: ${dish.name} (${dish.id}) — немає в таблиці CHOICEQR`);
      const qrName = CHOICEQR[dish.id];
      const qr = qrName ? qrByKey.get(qrName) : null;
      if (qrName && !qr) report.notCurated.push(`КУХНЯ: ${dish.name} — у ChoiceQR не знайдено «${qrName}»`);

      const ingredients = dishIngredients(dish, section);
      ingredients.filter(i => i.length > MAX_OPTION_LENGTH).forEach(phrase =>
        report.notCurated.push(`КУХНЯ: ${dish.name} — довга фраза не потрапить у квіз, розкладіть її в PHRASE_SPLITS: «${phrase}»`));
      const pizzaText = section.id === 'pizza' ? `${section.dough_base}, ${dish.sauce.includes('томат') ? section.pizza_sauce_base : ''}` : '';
      const { allergens, allergenSources } = deriveAllergens(dish, sauceGuide, pizzaText);
      const perHundred = qr && /ціна (вказана )?за 100\s*г/i.test(qr['Опис']);

      items.push({
        id: slug(dish.id.replace(/_/g, '-')),
        name: dish.name,
        group: SECTION_LABELS[sectionId],
        isNew: Boolean(dish.is_new),
        price: qr ? formatPrice(qr['Ціна (грн)'], perHundred) : (dish.price ? formatPrice(dish.price) : ''),
        weight: dish.weight ? dish.weight.replace(/(\d)\s*г$/, '$1 г') : (qr && !perHundred ? formatVolume(qr["Вага / Об'єм"]) : ''),
        notes: dish.description || (qr ? cleanDescription(qr['Опис']) : ''),
        imageUrl: qr?.['Фото'] || '',
        image: '',
        ingredients,
        quizIngredients: ingredients.filter(i => i.length <= MAX_OPTION_LENGTH),
        components: componentGroups(dish, section),
        allergens,
        allergenSources,
        page: 'menu'
      });
    }
  }
  return items;
}
