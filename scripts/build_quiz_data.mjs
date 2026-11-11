// Builds bar.json, cocktails.json and menu.json for the trainer pages.
//
// Source of truth:
//   - data/source/menu_clean.json (from scripts/parse_choiceqr_menu.py): names, prices, volumes, descriptions, photo URLs
//   - the curated answer tables below (bar, cocktails): correct answers for each quiz question
//   - data/source/residence_menu_full.json + scripts/kitchen.mjs: kitchen dishes, ingredients, components, allergens
//
// Usage:  node scripts/build_quiz_data.mjs            (rebuild data/*.json, download missing photos to assets/img/)
//         node scripts/build_quiz_data.mjs --no-images (rebuild JSON only)
//
// After re-running the ChoiceQR parser, re-run this script: prices/descriptions/photos refresh,
// new menu items are reported as "NOT CURATED" so you can add answers for them below.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKitchen } from './kitchen.mjs';
import { choiceqrKey as key, formatPrice, formatVolume, isPricePerHundred, norm } from '../lib/choiceqr.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const IMG_DIR = 'assets/img';
const DOWNLOAD_IMAGES = !process.argv.includes('--no-images');
const menu = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'source', 'menu_clean.json'), 'utf8'));
const kitchenSpec = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'source', 'residence_menu_full.json'), 'utf8'));

/* ---------------------------------------------------------------- helpers */

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: ''
};
function slug(text) {
  return norm(text).toLowerCase()
    .split('').map(ch => TRANSLIT[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function cleanDescription(text) {
  return norm(text)
    .replace(/^[-–—]\s*/, '')
    .replace(/\*\s*ціна вказана за 100\s*г\s*/i, '')
    .replace(/\*\s*ЦІНА ЗА 100\s*г\s*/i, '')
    .trim();
}

function itemsOf(sectionNames) {
  const wanted = new Set(sectionNames.map(key));
  return menu.filter(item => wanted.has(key(item['Розділ'])));
}

/* ------------------------------------------------------------------ BAR */
// type / country / style. country: null = not stated in the menu and not verifiable → question hidden.
const BAR = {
  // Віскі
  'CHIVAS REGAL 18 Y.O. GOLD SIGNATURE': ['Віскі', 'Шотландія', 'Купажований'],
  'ARRAN AMARONE CASK': ['Віскі', 'Шотландія', 'Односолодовий'],
  'GLENMORANGIE THE ORIGINAL, 12 Y.O.': ['Віскі', 'Шотландія', 'Односолодовий'],
  'THE SINGLETON OF DUFFTOWN 12 Y.O.': ['Віскі', 'Шотландія', 'Односолодовий'],
  'MONKEY SHOULDER': ['Віскі', 'Шотландія', 'Купажований'],
  'MISAKI': ['Віскі', 'Японія', 'Купажований'],
  'JACK DANIELS TENNESSEE': ['Віскі', 'США', 'Теннессі-віскі'],
  'FOUR ROSES': ['Віскі', 'США', 'Бурбон'],
  'WEST CORK': ['Віскі', 'Ірландія', 'Купажований'],
  'JAMESON': ['Віскі', 'Ірландія', 'Купажований'],
  'THE POGUES, STREAMS': ['Віскі', 'Ірландія', 'Купажований'],
  'POGUES': ['Віскі', 'Ірландія', 'Купажований'],
  'POGUES HONEY': ['Віскі', 'Ірландія', 'Медовий (ароматизований)'],
  // Горілка
  'ORA, ФРАНЦІЯ': ['Горілка', 'Франція', 'Зернова, п\'ятикратна дистиляція'],
  'ESBJAERG, НІДЕРЛАНДИ': ['Горілка', 'Нідерланди', 'Пшенична'],
  'FINLANDIA, ФІНЛЯНДІЯ': ['Горілка', 'Фінляндія', 'Ячмінна, на льодовиковій воді'],
  'NEMIROFF DE LUXE, УКРАЇНА': ['Горілка', 'Україна', '11 стадій фільтрації'],
  // Коньяк / бренді
  'HENNESSY VERY SPECIAL, ФРАНЦІЯ': ['Коньяк / бренді', 'Франція', 'Коньяк VS'],
  'A.E. DOR VSOP, ФРАНЦІЯ': ['Коньяк / бренді', 'Франція', 'Коньяк VSOP'],
  'SAINT REMY VSOP, ФРАНЦІЯ': ['Коньяк / бренді', 'Франція', 'Бренді VSOP'],
  'ДУРУДЖИ ВЕЛІ 7, ГРУЗІЯ': ['Коньяк / бренді', 'Грузія', 'Бренді, витримка 7 років'],
  'CALVADOS FINE, MARQUIS DE SAIN-LOUP, ФРАНЦІЯ': ['Коньяк / бренді', 'Франція', 'Кальвадос (яблучний бренді)'],
  'PISCO CAPEI, ESPECIAL': ['Коньяк / бренді', 'Чилі', 'Піско (виноградний бренді)'],
  // Текіла / мескаль
  'MEZCAL NOBLE COYTE': ['Текіла / мескаль', 'Мексика', 'Мескаль'],
  'MEZCAL LOKITA, ARTESANAL': ['Текіла / мескаль', 'Мексика', 'Мескаль'],
  'SIERRA ANTIGUO PLATA': ['Текіла / мескаль', 'Мексика', 'Бланко (срібна)'],
  'JARANA BLANCO 100% BLUE AGAVE': ['Текіла / мескаль', 'Мексика', 'Бланко (срібна)'],
  'JANARA REPOSADO 100% AGAVE': ['Текіла / мескаль', 'Мексика', 'Репосадо (витримана)'],
  // Ром
  'BUMBU XO, 18 Y.O': ['Ром', 'Панама', 'Витриманий XO'],
  'BOTAFOGO SPICED': ['Ром', null, 'Пряний (spiced)'],
  'BOTAFOGO BLACK': ['Ром', null, 'Темний'],
  'SANTIAGO DE CUBA, CARTA BLANCA': ['Ром', 'Куба', 'Білий'],
  'TANDAY ASIAN GOLD': ['Ром', 'Філіппіни', 'Золотий'],
  // Джин
  'WHITLEY NEILL QUINCE': ['Джин', 'Великобританія', 'Ароматизований: айва'],
  'WHITLEY NEILL BLACK CHERRY': ['Джин', 'Великобританія', 'Ароматизований: чорна вишня'],
  'TANQUERAY LONDON DRY GIN': ['Джин', 'Великобританія', 'London Dry'],
  'TANQUERAY, RANGPUR LIME': ['Джин', 'Великобританія', 'Ароматизований: лайм рангпур'],
  'STIRLING, LONDON DRY': ['Джин', null, 'London Dry'],
  'WHITLEY NEIL RASPBERRY, БЕЗАЛКОГОЛЬНИЙ': ['Джин', 'Великобританія', 'Безалкогольний: малина'],
  // Аперитиви та дигестиви
  'PILLA, SELECT VENEZIA': ['Аперитив / лікер', 'Італія', 'Біттер-аперитив'],
  'HERETIC': ['Аперитив / лікер', 'Іспанія', 'Трав\'яний лікер'],
  'JAGERMEISTER': ['Аперитив / лікер', 'Німеччина', 'Трав\'яний лікер'],
  'BECHERОVKA': ['Аперитив / лікер', 'Чехія', 'Трав\'яний лікер'],
  'BAILEYS': ['Аперитив / лікер', 'Ірландія', 'Вершковий лікер'],
  'DOLIN VERMOUTH DRY': ['Аперитив / лікер', 'Франція', 'Сухий вермут'],
  // Пиво
  'MILK STOUT': ['Пиво', null, 'Стаут (молочний)'],
  'SAMURAI\'S DAUGHTER': ['Пиво', null, 'Рисовий ель з імбиром'],
  'PARTY WEIZEN': ['Пиво', null, 'Пшеничне (вайцен)'],
  'CORONA EXTRA': ['Пиво', 'Мексика', 'Лагер'],
  'LEFFE BRUNЕ': ['Пиво', 'Бельгія', 'Темний абатський ель'],
  'ZERO STRESS Б/А': ['Пиво', null, 'Безалкогольний пейл-ель'],
  'STELLA ARTOIS': ['Пиво', 'Бельгія', 'Лагер'],
  'HOЕGAARDEN WHITE': ['Пиво', 'Бельгія', 'Пшеничне біле (вітбір)']
};

// Display-name fixes: drop the country (it is a quiz answer) and replace look-alike Cyrillic letters.
const BAR_NAMES = {
  'ORA, ФРАНЦІЯ': 'ORA',
  'ESBJAERG, НІДЕРЛАНДИ': 'ESBJAERG',
  'FINLANDIA, ФІНЛЯНДІЯ': 'FINLANDIA',
  'NEMIROFF DE LUXE, УКРАЇНА': 'NEMIROFF DE LUXE',
  'HENNESSY VERY SPECIAL, ФРАНЦІЯ': 'HENNESSY VERY SPECIAL',
  'A.E. DOR VSOP, ФРАНЦІЯ': 'A.E. DOR VSOP',
  'SAINT REMY VSOP, ФРАНЦІЯ': 'SAINT REMY VSOP',
  'ДУРУДЖИ ВЕЛІ 7, ГРУЗІЯ': 'ДУРУДЖИ ВЕЛІ 7',
  'CALVADOS FINE, MARQUIS DE SAIN-LOUP, ФРАНЦІЯ': 'CALVADOS FINE, MARQUIS DE SAIN-LOUP',
  'BECHERОVKA': 'BECHEROVKA',
  'LEFFE BRUNЕ': 'LEFFE BRUNE',
  'HOЕGAARDEN WHITE': 'HOEGAARDEN WHITE'
};

// Notes for items that have no description in ChoiceQR.
const BAR_NOTES = {
  'CORONA EXTRA': 'Світлий мексиканський лагер. Традиційно подається з часточкою лайма в шийці пляшки.',
  'LEFFE BRUNЕ': 'Бельгійський темний абатський ель з карамельно-солодовими нотами.',
  'STIRLING, LONDON DRY': 'Класичний сухий джин стилю London Dry з домінантою ялівцю.',
  'STELLA ARTOIS': 'Бельгійський світлий лагер на розлив.',
  'HOЕGAARDEN WHITE': 'Бельгійське пшеничне біле пиво (вітбір) на розлив.'
};

const BAR_GROUP_LABELS = {
  'ПИВО ПЛЯШКОВЕ': 'Пиво пляшкове', 'ПИВО НА РОЗЛИВ': 'Пиво на розлив', 'ГОРІЛКА': 'Горілка', 'ВІСКІ': 'Віскі',
  'КОНЬЯКИ ТА БРЕНДІ': 'Коньяки та бренді', 'ТЕКІЛА': 'Текіла', 'РОМ': 'Ром',
  'АПЕРИТИВИ ТА ДИГЕСТИВИ': 'Аперитиви та дигестиви', 'ДЖИН': 'Джин'
};

/* ------------------------------------------------------------- COCKTAILS */
// [group, base, key ingredients]. Keyed by "GROUP|NAME" because some names repeat across groups.
const COCKTAILS = {
  'КЛАСИЧНІ|AVIATION': ['Джин', 'Сухий джин, вишневий лікер, фіалковий лікер, лимонний сік'],
  'КЛАСИЧНІ|BIG LEBOWSKI': ['Горілка', 'Горілка, кавовий лікер, вершки'],
  'КЛАСИЧНІ|NEGRONI': ['Джин', 'Джин, вермут, біттер'],
  'КЛАСИЧНІ|WHISKEY SOUR': ['Бурбон / віскі', 'Американський віскі, лимонний сік, цукровий сироп'],
  'КЛАСИЧНІ|MAI THAI': ['Ром', 'Бельгійський і панамський ром, цитрус, мигдальний сироп'],
  'КЛАСИЧНІ|PORN STAR MARTINI': ['Горілка', 'Ванільна горілка, маракуйя, лайм, ігристе вино'],
  'КЛАСИЧНІ|FRENCH 75': ['Джин', 'Джин, іспанське ігристе вино, лимонний сік, сироп'],
  'КЛАСИЧНІ|CLOVER CLUB': ['Джин', 'Джин, малина, лимон, пінка'],
  'КЛАСИЧНІ|APEROL SPRITZ': ['Біттер / аперитив', 'Aperol, ігристе вино, содова, апельсин'],
  'КЛАСИЧНІ|PISCO SOUR': ['Піско', 'Піско, цитрусовий сік, цукровий сироп'],
  'АВТОРСЬКІ|WITCH\'S SIN': ['Текіла', 'Текіла бланко, мескаль, сік лайма, цукровий сироп, червоне сухе вино'],
  'АВТОРСЬКІ|ZOMBIE MOJITO': ['Ром', 'Три види рому, м\'ята, сік лайма, содова, чорний барвник'],
  'АВТОРСЬКІ|INQUISITION': ['Бурбон / віскі', 'Бурбон, лікер Heretic, червоний солодкий вермут, шоколадно-горіховий сироп'],
  'АВТОРСЬКІ|MELON WAVE': ['Ром', 'Темний ром, персиковий лікер, динний лікер, ананасовий сік'],
  'АВТОРСЬКІ|MONTENEGRO CHERRY SPRITZ': ['Біттер / аперитив', 'Amaro Montenegro, чорна вишня, ігристе вино, содова'],
  'АВТОРСЬКІ|REPOSITA': ['Текіла', 'Текіла репосадо, два види вермуту, Amaro Montenegro'],
  'АВТОРСЬКІ|AERO AMARETTO': ['Лікер', 'Амаретто, кава, шоколадно-горіхові ноти'],
  'АВТОРСЬКІ|STRAWBERRY SPRITZ': ['Ігристе вино', 'Ігристе вино, вермут, стигла полуниця'],
  'АВТОРСЬКІ|TWIST ESPRESSO MARTINI': ['Ром', 'Ром, еспресо, шоколадно-горіховий смак'],
  'АВТОРСЬКІ|№ 24': ['Ігристе вино', 'Ігристе вино, грейпфрут, вишня'],
  'АВТОРСЬКІ|QUEENS COLADA': ['Джин', 'Джин, банан, ананас, молочна нотка'],
  'АВТОРСЬКІ|FOREST GUMP': ['Джин', 'Джин на жасминовому чаї, огірок, м\'ята, сироп бузини'],
  'АВТОРСЬКІ|APEROL COCONUT MARGARITA': ['Текіла', 'Текіла, Aperol, кокосовий сироп'],
  'АВТОРСЬКІ|RES TONIC': ['Джин', 'Джин, червоний аперитив, сироп манго, тонік'],
  'АВТОРСЬКІ|PINEAPPLE SPRITZ': ['Ігристе вино', 'Ігристе вино, ананас, Amaro Montenegro'],
  'АВТОРСЬКІ|CUCUMBER GIN TONIC': ['Джин', 'Джин, огірковий сироп, тонік, свіжий огірок'],
  'АВТОРСЬКІ|BEAR BERRY': ['Джин', 'Джин на лимонній цедрі, полуниця, цитрус'],
  'АВТОРСЬКІ|VIOLET GIN TONIC': ['Джин', 'Англійський джин, тайський синій чай, лавандовий сироп, тонік'],
  'БЕЗАЛКОГОЛЬНІ|COCONUT DAIQUIRI': ['Без алкоголю', 'Кокосовий сироп, лимонний фреш, цукровий сироп'],
  'БЕЗАЛКОГОЛЬНІ|NEW YORK SOUR': ['Без алкоголю', 'Б/а віскі, лимонний фреш, цукровий сироп, б/а червоне вино'],
  'БЕЗАЛКОГОЛЬНІ|CLOVER CLUB': ['Без алкоголю', 'Б/а основа, малина, лимон, пінка'],
  'БЕЗАЛКОГОЛЬНІ|PINEAPPLE SPRITZ': ['Без алкоголю', 'Ананас, б/а ігриста основа'],
  'БЕЗАЛКОГОЛЬНІ|APEROL SPRITZ': ['Без алкоголю', 'Б/а біттер-аперитив, б/а ігриста основа, апельсин'],
  'БЕЗАЛКОГОЛЬНІ|MOJITO': ['Без алкоголю', 'М\'ята, лайм, содова']
};
const COCKTAIL_GROUP_LABELS = { 'КЛАСИЧНІ': 'Класичний', 'АВТОРСЬКІ': 'Авторський', 'БЕЗАЛКОГОЛЬНІ': 'Безалкогольний' };

/* -------------------------------------------------------------- builders */

const report = { notCurated: [], excluded: [] };

function uniqueIds(items) {
  const seen = new Map();
  for (const item of items) {
    const base = item.id || 'item';
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    if (n > 1) item.id = `${base}-${n}`;
  }
  return items;
}

function baseItem(raw, page, name) {
  const perHundred = isPricePerHundred(raw['Опис']);
  return {
    id: slug(name),
    // Link to the ChoiceQR dish for the admin "sync prices and photos" button (→ menu_items.choiceqr_name).
    choiceqr: { name: `${key(raw['Категорія'])}|${key(raw['Назва'])}`, photo: raw['Фото'] || '' },
    name,
    price: formatPrice(raw['Ціна (грн)'], perHundred),
    volume: perHundred ? '' : formatVolume(raw["Вага / Об'єм"]),
    notes: cleanDescription(raw['Опис']),
    imageUrl: raw['Фото'] || '',
    image: '',
    page
  };
}

function buildBar() {
  return uniqueIds(itemsOf(['БАР']).flatMap(raw => {
    const k = key(raw['Назва']);
    const answers = BAR[k];
    if (!answers) { report.notCurated.push(`БАР: ${raw['Назва']}`); return []; }
    const [type, country, style] = answers;
    const item = baseItem(raw, 'bar', BAR_NAMES[k] || norm(raw['Назва']));
    if (!item.notes) item.notes = BAR_NOTES[k] || '';
    return [{ ...item, group: BAR_GROUP_LABELS[key(raw['Категорія'])] || raw['Категорія'], type, country, style }];
  }));
}

function buildCocktails() {
  return uniqueIds(itemsOf(['КОКТЕЙЛІ']).flatMap(raw => {
    const groupKey = key(raw['Категорія']);
    const k = `${groupKey}|${key(raw['Назва'])}`;
    const answers = COCKTAILS[k];
    if (!answers) { report.notCurated.push(`КОКТЕЙЛІ: ${raw['Категорія']} / ${raw['Назва']}`); return []; }
    const group = COCKTAIL_GROUP_LABELS[groupKey];
    const isZero = groupKey === 'БЕЗАЛКОГОЛЬНІ';
    const name = isZero ? `${norm(raw['Назва'])} б/а` : norm(raw['Назва']);
    const [base, ingredients] = answers;
    return [{ ...baseItem(raw, 'cocktails', name), group, base, ingredients }];
  }));
}

/* ---------------------------------------------------------------- images */

async function downloadImages(items, folder) {
  const dir = path.join(ROOT, IMG_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  for (const item of items) {
    if (!item.imageUrl) continue;
    const file = `${item.id}.webp`;
    const target = path.join(dir, file);
    if (DOWNLOAD_IMAGES && !fs.existsSync(target)) {
      try {
        const res = await fetch(item.imageUrl);
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !type.startsWith('image/')) throw new Error(`${res.status} ${type}`);
        fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
      } catch (error) {
        console.warn(`  ! фото не завантажено: ${item.name} (${error.message})`);
      }
    }
    if (fs.existsSync(target)) item.image = `./${IMG_DIR}/${folder}/${file}`;
  }
}

function write(file, items) {
  const clean = items.map(({ imageUrl, page, ...rest }) => rest);
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(clean, null, 2) + '\n');
  console.log(`data/${file}: ${clean.length} позицій, з фото: ${clean.filter(i => i.image).length}`);
}

const pages = [
  ['bar.json', 'bar', buildBar()],
  ['cocktails.json', 'cocktails', buildCocktails()],
  ['menu.json', 'menu', buildKitchen({ spec: kitchenSpec, menuClean: menu, helpers: { slug, formatPrice, formatVolume, cleanDescription, norm }, report })]
];
for (const [file, folder, items] of pages) {
  await downloadImages(items, folder);
  write(file, items);
}

if (report.notCurated.length) {
  console.log('\nNOT CURATED (додайте відповіді в scripts/build_quiz_data.mjs):');
  report.notCurated.forEach(line => console.log(`  - ${line}`));
}
if (report.excluded.length) {
  console.log('\nПропущено:');
  report.excluded.forEach(line => console.log(`  - ${line}`));
}
