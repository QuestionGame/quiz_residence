// Initial import into Supabase: menu items from data/*.json + the first admin account.
//
//   node scripts/seed_supabase.mjs --admin <login> --password <password> --name "<Full name>"
//   node scripts/seed_supabase.mjs                 # items only (an admin already exists)
//   node scripts/seed_supabase.mjs --force         # overwrite items already in the database
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local.
// Safe to re-run: existing items are kept (admin edits are not lost) unless --force is given.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { USERNAME_PATTERN, usernameToEmail } from '../lib/server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = { wine: 'wines.json', bar: 'bar.json', cocktails: 'cocktails.json', menu: 'menu.json' };

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

loadEnv();
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Потрібні SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY (у .env.local або в змінних середовища).');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const force = process.argv.includes('--force');

/* ------------------------------------------------------------ menu items */

const rows = Object.entries(SOURCES).flatMap(([page, file]) => {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
  return items.map(({ id, choiceqr, ...data }, index) => ({
    page,
    id,
    // choiceqrPhoto = the ChoiceQR photo the local copy was made from, so the first sync doesn't re-download it.
    data: choiceqr?.photo ? { ...data, choiceqrPhoto: choiceqr.photo } : data,
    choiceqr_name: choiceqr?.name || null,
    sort_order: index
  }));
});

const badIds = rows.filter(row => !/^[a-z0-9][a-z0-9-]{0,79}$/.test(row.id));
if (badIds.length) {
  console.error('Некоректні id:', badIds.map(row => `${row.page}/${row.id}`).join(', '));
  process.exit(1);
}

const { error: itemsError, count } = await db.from('menu_items')
  .upsert(rows, { onConflict: 'page,id', ignoreDuplicates: !force, count: 'exact' });
if (itemsError) {
  console.error('Позиції не імпортовано:', itemsError.message);
  process.exit(1);
}
const perPage = Object.keys(SOURCES).map(page => `${page}: ${rows.filter(r => r.page === page).length}`).join(', ');
console.log(`Позиції (${perPage}) — ${force ? 'перезаписано' : 'додано нові, наявні не змінено'}${count != null ? `, змінено рядків: ${count}` : ''}.`);

/* ----------------------------------------------------------- first admin */

const username = argValue('admin')?.toLowerCase();
if (username) {
  const password = argValue('password');
  const fullName = argValue('name') || 'Адміністратор';
  if (!USERNAME_PATTERN.test(username)) { console.error('Некоректний логін адміністратора'); process.exit(1); }
  if (!password || password.length < 8) { console.error('Пароль адміністратора: щонайменше 8 символів (--password)'); process.exit(1); }

  const { data: existing } = await db.from('profiles').select('id').eq('username', username).maybeSingle();
  if (existing) {
    console.log(`Користувач «${username}» уже існує — пропущено.`);
  } else {
    const { data: created, error } = await db.auth.admin.createUser({
      email: usernameToEmail(username), password, email_confirm: true, user_metadata: { username, full_name: fullName }
    });
    if (error) { console.error('Адміністратора не створено:', error.message); process.exit(1); }
    const { error: profileError } = await db.from('profiles').insert({ id: created.user.id, username, full_name: fullName, role: 'admin' });
    if (profileError) {
      await db.auth.admin.deleteUser(created.user.id);
      console.error('Профіль адміністратора не створено:', profileError.message);
      process.exit(1);
    }
    console.log(`Адміністратора «${username}» створено.`);
  }
}
