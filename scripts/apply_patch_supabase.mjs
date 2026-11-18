// Applies a data patch (data/patches/*.json) to menu items in Supabase: changes only the listed fields
// of the listed items and leaves everything else (prices, photos, other edits from the admin panel) as is.
//
//   node scripts/apply_patch_supabase.mjs data/patches/<file>.json           # dry run: shows what would change
//   node scripts/apply_patch_supabase.mjs data/patches/<file>.json --apply   # writes the changes
//
// Patch format: { changes: [{ page, id, name, fields: { <field>: { from, to } } }] }
// For each field the database value is compared with `from` / `to`:
//   equals `from` → updated to `to`;  equals `to` → already applied, skipped;
//   anything else → changed in the admin panel since, NOT touched (reported as a conflict).
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Deep equality that ignores object key order (jsonb does not keep it). */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  }
  return value ?? null;
}
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/* Fields that only make sense together: a conflict in one of them skips the whole group. */
const FIELD_GROUPS = [['allergens', 'allergenSources'], ['ingredients', 'quizIngredients']];
const groupOf = field => FIELD_GROUPS.find(group => group.includes(field)) || [field];

/* Pure planning step: database rows + patch → updates to write and what was skipped. */
export function planPatch(rows, patch) {
  const byKey = new Map(rows.map(row => [`${row.page}/${row.id}`, row]));
  const plan = { updates: [], applied: [], conflicts: [], missing: [] };
  for (const change of patch.changes) {
    const key = `${change.page}/${change.id}`;
    const row = byKey.get(key);
    if (!row) { plan.missing.push(change); continue; }
    const status = Object.fromEntries(Object.entries(change.fields).map(([field, { from, to }]) => {
      const current = row.data?.[field];
      return [field, same(current, to) ? 'applied' : same(current, from) ? 'update' : 'conflict'];
    }));
    const blocked = new Set(Object.keys(status).filter(f => status[f] === 'conflict').flatMap(groupOf));
    const data = { ...row.data };
    const fields = [];
    for (const [field, { to }] of Object.entries(change.fields)) {
      if (status[field] === 'applied') plan.applied.push({ key, name: change.name, field });
      else if (blocked.has(field)) plan.conflicts.push({ key, name: change.name, field, current: row.data?.[field], to });
      else { data[field] = to; fields.push(field); }
    }
    if (fields.length) plan.updates.push({ page: row.page, id: row.id, name: change.name, fields, data, updatedAt: row.updated_at });
  }
  return plan;
}

const short = value => {
  const text = Array.isArray(value) ? value.join(', ') : typeof value === 'object' && value ? JSON.stringify(value) : String(value ?? '—');
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
};

function printPlan(plan) {
  console.log(`\nБуде оновлено позицій: ${plan.updates.length}`);
  for (const u of plan.updates) console.log(`  ${u.page}/${u.id} (${u.name}): ${u.fields.join(', ')}`);
  if (plan.applied.length) console.log(`\nВже збігається з патчем, пропущено полів: ${plan.applied.length}`);
  if (plan.conflicts.length) {
    console.log(`\nКОНФЛІКТИ — поле змінили в адмін-панелі, скрипт його НЕ чіпає (${plan.conflicts.length}):`);
    for (const c of plan.conflicts) {
      console.log(`  ${c.key} (${c.name}) — ${c.field}\n    зараз у базі: ${short(c.current)}\n    у патчі:      ${short(c.to)}`);
    }
  }
  if (plan.missing.length) {
    console.log(`\nНемає в базі (видалені або перейменовані), пропущено: ${plan.missing.length}`);
    for (const m of plan.missing) console.log(`  ${m.page}/${m.id} (${m.name})`);
  }
}

function loadEnv() {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
  }
}

async function main() {
  const patchFile = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const apply = process.argv.includes('--apply');
  if (!patchFile) {
    console.error('Вкажіть файл патча: node scripts/apply_patch_supabase.mjs data/patches/<file>.json [--apply]');
    process.exit(1);
  }
  const patch = JSON.parse(fs.readFileSync(path.resolve(ROOT, patchFile), 'utf8'));

  loadEnv();
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Потрібні SUPABASE_URL і SUPABASE_SERVICE_ROLE_KEY (у .env.local або в змінних середовища).');
    process.exit(1);
  }
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const pages = [...new Set(patch.changes.map(c => c.page))];
  const { data: rows, error } = await db.from('menu_items').select('page, id, data, updated_at').in('page', pages);
  if (error) { console.error('Не вдалося прочитати меню:', error.message); process.exit(1); }

  console.log(`База: ${SUPABASE_URL}\nПатч: ${patchFile}${patch.description ? ` — ${patch.description}` : ''}`);
  const plan = planPatch(rows, patch);
  printPlan(plan);

  if (!apply) {
    console.log('\nЦе пробний запуск — у базі нічого не змінено. Щоб записати, додайте --apply.');
    return;
  }
  let ok = 0;
  for (const u of plan.updates) {
    // updated_at guard: if someone saved this item in the admin panel after we read it, the update matches no row.
    const { data: written, error: writeError } = await db.from('menu_items')
      .update({ data: u.data })
      .eq('page', u.page).eq('id', u.id).eq('updated_at', u.updatedAt)
      .select('id');
    if (writeError) console.error(`  ! ${u.page}/${u.id}: ${writeError.message}`);
    else if (!written.length) console.error(`  ! ${u.page}/${u.id}: позицію щойно змінили в адмінці — пропущено, запустіть скрипт ще раз`);
    else ok++;
  }
  console.log(`\nЗаписано позицій: ${ok} з ${plan.updates.length}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
