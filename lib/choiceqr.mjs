// ChoiceQR menu reader + price / volume formatting.
// Shared by the admin "sync prices and photos" button (api/sync-choiceqr.js) and scripts/build_quiz_data.mjs.
// Same algorithm as scripts/parse_choiceqr_menu.py: every page embeds its data in <script id="__NEXT_DATA__">.

export const CHOICEQR_URL = 'https://residence1.choiceqr.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const norm = value => String(value ?? '').replace(/\s+/g, ' ').trim();
export const choiceqrKey = value => norm(value).toUpperCase();

/* ---------------------------------------------------------- formatting */

export function formatPrice(value, perHundred = false) {
  if (value == null || value === '') return '';
  const text = `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₴`;
  return perHundred ? `${text} / 100 г` : text;
}

/* "450 g" / "50 ml" → "450 г" / "50 мл"; a value without a number ("g") → "". */
export function formatVolume(raw) {
  const text = norm(raw);
  if (!/\d/.test(text)) return '';
  return text.replace(/\bml\b/i, 'мл').replace(/\bg\b/i, 'г');
}

export const isPricePerHundred = description => /ціна (вказана )?за 100\s*г/i.test(String(description || ''));

/* Menu description as shown to guests, without the leading dash and the "* ціна за 100 г" price note. */
export function cleanDescription(text) {
  return norm(text)
    .replace(/^[-–—]\s*/, '')
    .replace(/\*\s*ціна вказана за 100\s*г\s*/i, '')
    .replace(/\*\s*ЦІНА ЗА 100\s*г\s*/i, '')
    .trim();
}

/* ------------------------------------------------------------- reading */

function asText(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['uk', 'ua', 'name', 'value', 'text']) {
      const text = asText(value[key]);
      if (text) return text;
    }
    return '';
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function findImageUrl(value) {
  if (typeof value === 'string') return /^https?:\/\//.test(value) ? value : '';
  if (Array.isArray(value)) {
    for (const entry of value) { const url = findImageUrl(entry); if (url) return url; }
    return '';
  }
  if (value && typeof value === 'object') {
    for (const key of ['webp', 'url', 'thumbnail', 'medium', 'big', 'src']) {
      const url = key in value ? findImageUrl(value[key]) : '';
      if (url) return url;
    }
  }
  return '';
}

function imageOf(item) {
  for (const key of ['media', 'externalMedia', 'image', 'imageUrl']) {
    const url = key in item ? findImageUrl(item[key]) : '';
    if (url) return url;
  }
  return '';
}

/* ChoiceQR stores prices in kopecks. */
function priceOf(item) {
  let value = item.price;
  if (value == null && Array.isArray(item.prices) && item.prices.length) {
    value = typeof item.prices[0] === 'object' ? item.prices[0]?.price : item.prices[0];
  }
  if (value && typeof value === 'object') value = value.price ?? value.amount;
  const amount = Number(value) / 100;
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

async function fetchAppData(url, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) throw new Error('__NEXT_DATA__ not found');
      const app = JSON.parse(match[1])?.props?.app;
      if (!app || typeof app !== 'object') throw new Error('props.app not found');
      return app;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw new Error(`Не вдалося завантажити ${url}: ${lastError?.message}`);
}

/* All menu items of the public ChoiceQR menu:
   [{ section, category, name, price (UAH or null), volume (raw "450 g"), description, photo }] */
export async function fetchChoiceqrMenu(url = CHOICEQR_URL) {
  const origin = new URL(url).origin;
  const sections = (await fetchAppData(url)).sections;
  if (!Array.isArray(sections) || !sections.length) throw new Error('У ChoiceQR не знайдено розділів меню');

  const pages = await Promise.all(sections
    .filter(section => section && asText(section.hurl))
    .map(async section => ({ section, app: await fetchAppData(`${origin}/${asText(section.hurl).replace(/^\//, '')}`) })));

  const items = [];
  const seen = new Set();
  for (const { section, app } of pages) {
    const sectionName = asText(section.name) || 'Без назви';
    const categories = new Map((app.categories || []).filter(c => c?._id).map(c => [String(c._id), asText(c.name)]));
    for (const item of app.menu || []) {
      if (!item || typeof item !== 'object') continue;
      const uniqueKey = `${asText(section.hurl)}:${asText(item._id)}`;
      if (item._id && seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      items.push({
        section: sectionName,
        category: categories.get(String(item.category ?? '')) || sectionName,
        name: asText(item.name),
        price: priceOf(item),
        volume: [asText(item.weight), asText(item.weightType)].filter(Boolean).join(' '),
        description: asText(item.description),
        photo: imageOf(item)
      });
    }
  }
  return items;
}

/* Lookup by "NAME" and by "CATEGORY|NAME" (the latter disambiguates e.g. PIZZA / MINI PIZZA "ПЕПЕРОНІ"). */
export function indexChoiceqrItems(items) {
  const index = new Map();
  for (const item of items) {
    const name = choiceqrKey(item.name);
    if (!index.has(name)) index.set(name, item);
    index.set(`${choiceqrKey(item.category)}|${name}`, item);
  }
  return index;
}
