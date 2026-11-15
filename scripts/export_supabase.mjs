// Dump the live menu back into data/*.json — a backup and up-to-date seed files after edits in the admin panel.
// The inverse of scripts/seed_supabase.mjs: what this writes, `npm run seed` imports back unchanged.
//
//   npm run export                 # overwrite data/wines.json, bar.json, cocktails.json, menu.json
//   node scripts/export_supabase.mjs --out <dir>   # write elsewhere (used to verify the round-trip)
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local.
// Note: data.image points at Supabase Storage; the files are a faithful backup of THIS project.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = { wine: 'wines.json', bar: 'bar.json', cocktails: 'cocktails.json', menu: 'menu.json' };

function loadEnv() {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
  }
}

function argValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

/* One DB row → one item in the seed file (inverse of seed's { id, choiceqr, ...data } destructure). */
function toFileItem(row) {
  const { choiceqrPhoto, ...data } = row.data || {};
  const item = { id: row.id, ...data };
  if (row.choiceqr_name || choiceqrPhoto) item.choiceqr = { name: row.choiceqr_name || null, photo: choiceqrPhoto || '' };
  return item;
}

loadEnv();
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Потрібні SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY (у .env.local або в змінних середовища).');
  process.exit(1);
}
const outDir = path.resolve(ROOT, argValue('out') || 'data');
fs.mkdirSync(outDir, { recursive: true });
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: rows, error } = await db.from('menu_items')
  .select('page, id, data, choiceqr_name, sort_order, is_active')
  .order('page')
  .order('sort_order')
  .order('id');
if (error) { console.error('Не вдалося прочитати меню:', error.message); process.exit(1); }

const hidden = rows.filter(row => row.is_active === false);
if (hidden.length) console.warn(`! Приховані позиції (is_active=false) не зберігають цей стан після seed: ${hidden.map(r => `${r.page}/${r.id}`).join(', ')}`);

const summary = [];
for (const [page, file] of Object.entries(FILES)) {
  const items = rows.filter(row => row.page === page).map(toFileItem);
  fs.writeFileSync(path.join(outDir, file), `${JSON.stringify(items, null, 2)}\n`);
  summary.push(`${page}: ${items.length}`);
}
console.log(`Збережено в ${path.relative(ROOT, outDir) || '.'}/ (${summary.join(', ')}).`);
