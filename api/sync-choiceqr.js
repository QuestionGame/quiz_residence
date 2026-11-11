// "Оновити ціни й фото з ChoiceQR" (admin only).
//   POST { apply: false } → report what would change (nothing is written)
//   POST { apply: true }  → write new prices / volumes, upload changed photos to Storage, return the report
// The menu itself (names, composition, allergens, quiz answers) is edited in the admin panel; this only
// refreshes prices, portion sizes and photos of items linked to a ChoiceQR dish (menu_items.choiceqr_name).
import { createHash } from 'node:crypto';
import { HttpError, adminClient, handle, readJson, requireAdmin } from '../lib/server.mjs';
import { choiceqrKey, fetchChoiceqrMenu, formatPrice, formatVolume, indexChoiceqrItems, isPricePerHundred } from '../lib/choiceqr.mjs';

export const config = { maxDuration: 60 };

const BUCKET = 'menu-images';
// ChoiceQR sections that the trainer covers; dishes there without a trainer item are reported as new.
const TRACKED_SECTIONS = ['БАР', 'КОКТЕЙЛІ', 'НА СНІДАНОК', 'ПІЦА', 'НА ОБІД ТА ВЕЧЕРЮ'];
// Portion sizes come from ChoiceQR for drinks; kitchen weights come from the kitchen spec.
const VOLUME_PAGES = new Set(['bar', 'cocktails']);

async function uploadPhoto(db, page, id, url) {
  const response = await fetch(url);
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.startsWith('image/')) throw new Error(`фото не завантажилось (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 10);
  const extension = type.includes('png') ? 'png' : type.includes('jpeg') ? 'jpg' : 'webp';
  const path = `${page}/${id}-${hash}.${extension}`;
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true });
  if (error) throw new Error(error.message);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function sync(req) {
  await requireAdmin(req);
  const { apply = false } = await readJson(req);
  const db = adminClient();

  let choiceqrItems;
  try {
    choiceqrItems = await fetchChoiceqrMenu();
  } catch (error) {
    throw new HttpError(502, `ChoiceQR недоступний: ${error.message}`);
  }
  const index = indexChoiceqrItems(choiceqrItems);

  const { data: rows, error } = await db.from('menu_items')
    .select('page, id, name, data, choiceqr_name, is_active')
    .not('choiceqr_name', 'is', null);
  if (error) throw new Error(error.message);

  const report = { applied: Boolean(apply), checked: rows.length, prices: [], volumes: [], photos: [], missing: [], fresh: [], errors: [] };
  const linked = new Set();
  const updates = [];

  for (const row of rows) {
    const source = index.get(choiceqrKey(row.choiceqr_name));
    if (!source) {
      report.missing.push({ page: row.page, id: row.id, name: row.name, choiceqrName: row.choiceqr_name });
      continue;
    }
    linked.add(source);
    const data = { ...row.data };
    let changed = false;

    const price = formatPrice(source.price, isPricePerHundred(source.description));
    if (price && price !== data.price) {
      report.prices.push({ page: row.page, id: row.id, name: row.name, from: data.price || '—', to: price });
      data.price = price;
      changed = true;
    }
    if (VOLUME_PAGES.has(row.page)) {
      const volume = isPricePerHundred(source.description) ? '' : formatVolume(source.volume);
      if (volume && volume !== data.volume) {
        report.volumes.push({ page: row.page, id: row.id, name: row.name, from: data.volume || '—', to: volume });
        data.volume = volume;
        changed = true;
      }
    }
    if (source.photo && source.photo !== data.choiceqrPhoto) {
      report.photos.push({ page: row.page, id: row.id, name: row.name, url: source.photo });
      if (apply) {
        try {
          data.image = await uploadPhoto(db, row.page, row.id, source.photo);
          data.choiceqrPhoto = source.photo;
          changed = true;
        } catch (uploadError) {
          report.errors.push(`${row.name}: ${uploadError.message}`);
        }
      }
    }
    if (changed) updates.push({ page: row.page, id: row.id, data });
  }

  const tracked = new Set(TRACKED_SECTIONS);
  report.fresh = choiceqrItems
    .filter(item => tracked.has(choiceqrKey(item.section)) && !linked.has(item))
    .map(item => ({ section: item.section, category: item.category, name: item.name, price: formatPrice(item.price) }));

  if (apply) {
    for (const update of updates) {
      const { error: updateError } = await db.from('menu_items').update({ data: update.data }).eq('page', update.page).eq('id', update.id);
      if (updateError) report.errors.push(`${update.data.name}: ${updateError.message}`);
    }
  }
  return report;
}

export default handle({ POST: sync });
