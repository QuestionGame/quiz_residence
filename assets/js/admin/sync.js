/* ChoiceQR tab: refresh prices, portion sizes, descriptions and photos from the public ChoiceQR menu (api/sync-choiceqr.js).
   "Перевірити" shows what would change; "Застосувати" writes it (only for items already in the trainer).
   Items no longer found in ChoiceQR can be renamed (re-linked to the dish's new ChoiceQR name) or deleted.
   New ChoiceQR dishes can be created as items (pre-filled form) or marked «Не додавати в тренажер»
   (table choiceqr_ignored) and restored later. */
import { apiFetch, supabase } from '../core/auth.js';
import { PAGE_LINKS } from '../core/pages.js';
import { escapeHtml, openDialog, showFormErrors, toast, withBusy } from './ui.js';
import { ITEM_FORMS } from './item-forms.js';
import { removeItem, requestNewItem } from './items.js';

const SECTION = Object.fromEntries(PAGE_LINKS.map(link => [link.id, link]));

/* ChoiceQR menu section → trainer section. */
const pageOfSection = section => {
  const key = String(section).toUpperCase();
  return key === 'БАР' ? 'bar' : key === 'КОКТЕЙЛІ' ? 'cocktails' : 'menu';
};
const sentenceCase = text => { const t = String(text || '').toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
const words = text => new Set(String(text).toUpperCase().split(/[^A-ZА-ЯІЇЄҐ0-9]+/).filter(w => w.length > 2));

/* Names in the trainer: drinks are written like ChoiceQR (upper case), kitchen dishes in sentence case. */
const trainerName = (page, choiceqrName) => (page === 'menu' ? sentenceCase(choiceqrName) : choiceqrName);

/* New ChoiceQR dishes a missing item may have been renamed to: same section first, most shared words first. */
function renameCandidates(report, item) {
  const own = words(item.name);
  return report.fresh
    .map(dish => ({ dish, sameSection: pageOfSection(dish.section) === item.page, shared: [...words(dish.name)].filter(w => own.has(w)).length }))
    .sort((a, b) => (b.sameSection - a.sameSection) || (b.shared - a.shared) || a.dish.name.localeCompare(b.dish.name, 'uk'))
    .map(entry => entry.dish);
}

/* Form pre-fill for «Створити позицію»; quiz answers (type, style, ingredients, allergens…) are left to the admin. */
function draftFor(dish) {
  const page = pageOfSection(dish.section);
  const groupField = ITEM_FORMS[page].find(field => field.key === 'group');
  let group = sentenceCase(dish.category);
  if (groupField?.type === 'select') {
    // A select only accepts its own options ("Авторський" for ChoiceQR's "АВТОРСЬКІ").
    const stem = dish.category.toLowerCase().slice(0, 5);
    group = (groupField.options || []).find(option => option.toLowerCase().startsWith(stem)) || '';
  }
  const data = { name: trainerName(page, dish.name), group, price: dish.price, notes: dish.description };
  data[page === 'menu' ? 'weight' : 'volume'] = dish.volume;
  return { page, data, choiceqr_name: dish.key };
}

const changeTable = (rows, title, wide = false) => (rows.length ? `
  <h3>${title} <span class="admin-count">${rows.length}</span></h3>
  <div class="admin-table-wrap"><table class="admin-table${wide ? ' admin-sync-text' : ''}">
    <thead><tr><th>Позиція</th><th>Було</th><th>Стане</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td data-label="Позиція">${SECTION[r.page].icon} ${escapeHtml(r.name)}</td>
      <td data-label="Було" class="admin-muted">${escapeHtml(r.from)}</td>
      <td data-label="Стане"><strong>${escapeHtml(r.to)}</strong></td></tr>`).join('')}</tbody>
  </table></div>` : '');

const freshMeta = item => [item.section, item.category].filter(Boolean).join(' / ') + (item.price ? ` · ${item.price}` : '');

/* «Не знайдено в ChoiceQR»: the dish was renamed (→ «Перейменувати») or taken off the menu (→ «Видалити»). */
function renderMissing(report) {
  if (!report.missing.length) return '';
  return `
    <h3>Не знайдено в ChoiceQR <span class="admin-count">${report.missing.length}</span></h3>
    <p class="admin-muted">Страву перейменували або прибрали з меню ChoiceQR. Якщо її перейменували — «Перейменувати» й оберіть нову назву; якщо прибрали — «Видалити».</p>
    <ul class="admin-fresh">${report.missing.map(item => `
      <li><span><strong>${SECTION[item.page].icon} ${escapeHtml(item.name)}</strong><small class="admin-muted">було в ChoiceQR: ${escapeHtml(item.choiceqrName)}</small></span>
        <span class="admin-fresh-actions">
          ${report.fresh.length ? `<button type="button" class="admin-button is-ghost" data-rename="${escapeHtml(item.id)}" data-rename-page="${item.page}">Перейменувати</button>` : ''}
          <button type="button" class="admin-button is-danger" data-remove="${escapeHtml(item.id)}" data-remove-page="${item.page}">Видалити</button>
        </span></li>`).join('')}</ul>`;
}

/* «Нові страви в ChoiceQR» + the folded list of dishes marked «Не додавати в тренажер». */
function renderFresh(report) {
  const fresh = report.fresh.length ? `
    <h3>Нові страви в ChoiceQR <span class="admin-count">${report.fresh.length}</span></h3>
    <p class="admin-muted">Їх ще немає в тренажері. «Створити позицію» відкриє форму з назвою, ціною й описом з ChoiceQR — відповіді для тесту заповніть самі. Або позначте «Не додавати в тренажер», щоб страва більше тут не з’являлася.</p>
    <ul class="admin-fresh">${report.fresh.map(item => `
      <li><span><strong>${escapeHtml(item.name)}</strong><small class="admin-muted">${escapeHtml(freshMeta(item))}</small></span>
        <span class="admin-fresh-actions">
          <button type="button" class="admin-button" data-create="${escapeHtml(item.key)}">Створити позицію</button>
          <button type="button" class="admin-button is-ghost" data-ignore="${escapeHtml(item.key)}">Не додавати в тренажер</button>
        </span></li>`).join('')}</ul>` : '';
  const ignored = report.ignored.length ? `
    <details class="admin-details admin-ignored">
      <summary>Не додаються в тренажер <span class="admin-count">${report.ignored.length}</span></summary>
      <ul class="admin-fresh">${report.ignored.map(item => `
        <li><span><strong>${escapeHtml(item.name)}</strong><small class="admin-muted">${escapeHtml(freshMeta(item))}</small></span>
          <button type="button" class="admin-button is-ghost" data-restore="${escapeHtml(item.key)}">Повернути</button></li>`).join('')}</ul>
    </details>` : '';
  return fresh + ignored;
}

function renderReport(report) {
  const nothing = !report.prices.length && !report.volumes.length && !report.descriptions.length && !report.photos.length;
  return `
    <div class="admin-stats">
      <div><span>Перевірено позицій</span><strong>${report.checked}</strong></div>
      <div><span>Змін ціни</span><strong>${report.prices.length}</strong></div>
      <div><span>Змін опису</span><strong>${report.descriptions.length}</strong></div>
      <div><span>Нових фото</span><strong>${report.photos.length}</strong></div>
    </div>
    ${report.applied ? '<p class="admin-success">Зміни застосовано.</p>' : nothing ? '<p class="admin-success">Ціни, описи й фото вже актуальні.</p>' : '<p class="admin-muted">Це попередній перегляд: нічого ще не змінено.</p>'}
    ${report.errors.length ? `<div class="admin-error"><strong>Помилки:</strong><ul>${report.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>` : ''}
    ${changeTable(report.prices, 'Ціни')}
    ${changeTable(report.volumes, 'Порції')}
    ${changeTable(report.descriptions, 'Описи', true)}
    ${report.photos.length ? `<h3>Нові фото <span class="admin-count">${report.photos.length}</span></h3>
      <ul class="admin-photo-list">${report.photos.map(p => `<li><img src="${escapeHtml(p.url)}" alt="" loading="lazy"><span>${SECTION[p.page].icon} ${escapeHtml(p.name)}</span></li>`).join('')}</ul>` : ''}
    <div id="syncMissing">${renderMissing(report)}</div>
    <div id="syncFresh">${renderFresh(report)}</div>`;
}

function renameForm(item, candidates) {
  return `
    <form class="admin-form" novalidate>
      <p>У тренажері: <strong>${SECTION[item.page].icon} ${escapeHtml(item.name)}</strong><br>
        <span class="admin-muted">У ChoiceQR було: ${escapeHtml(item.choiceqrName)}</span></p>
      <label class="admin-field"><span>Як страва називається в ChoiceQR тепер</span>
        <select name="dish">${candidates.map(dish => `<option value="${escapeHtml(dish.key)}">${escapeHtml(dish.name)} — ${escapeHtml(freshMeta(dish))}</option>`).join('')}</select>
        <small>Зверху — схожі назви з того ж розділу.</small></label>
      <label class="admin-field"><span>Назва в тренажері</span>
        <input name="name" required maxlength="120" autocomplete="off"></label>
      <p class="admin-muted">Історія відповідей працівників збережеться. Ціну, опис і фото з ChoiceQR покаже наступна перевірка — їх можна буде застосувати.</p>
      <p class="admin-form-error" role="alert" hidden></p>
      <div class="admin-form-actions">
        <button type="button" class="admin-button is-ghost" data-close>Скасувати</button>
        <button type="submit" class="admin-button">Перейменувати</button>
      </div>
    </form>`;
}

export async function renderSync(panel) {
  panel.innerHTML = `
    <div class="admin-toolbar">
      <div><h1>Синхронізація з ChoiceQR</h1>
        <p class="admin-muted">«Застосувати» оновлює ціни, порції напоїв, описи з меню й фото позицій, які <strong>вже є</strong> в тренажері й прив’язані до страв ChoiceQR. Нові позиції ця кнопка не створює — для цього «Створити позицію» в списку нових страв нижче. Назви, склад, алергени й відповіді тесту не змінюються.</p></div>
      <div class="admin-sync-actions">
        <button type="button" class="admin-button is-ghost" data-sync="check">Перевірити зміни</button>
        <button type="button" class="admin-button" data-sync="apply" disabled>Застосувати</button>
      </div>
    </div>
    <div id="syncReport"><p class="admin-muted">Натисніть «Перевірити зміни», щоб побачити, що оновиться. Перевірка триває до хвилини.</p></div>
    <dialog id="renameDialog" class="admin-dialog" aria-labelledby="renameDialogTitle">
      <div class="admin-dialog-head"><h2 id="renameDialogTitle">Перейменувати позицію</h2><button type="button" class="admin-close" data-close aria-label="Закрити">✕</button></div>
      <div class="admin-dialog-body"></div>
    </dialog>`;

  const report = panel.querySelector('#syncReport');
  const checkButton = panel.querySelector('[data-sync="check"]');
  const applyButton = panel.querySelector('[data-sync="apply"]');
  const renameDialog = panel.querySelector('#renameDialog');
  let lastReport = null;
  const redrawFresh = () => { panel.querySelector('#syncFresh').innerHTML = renderFresh(lastReport); };
  const redrawMissing = () => { panel.querySelector('#syncMissing').innerHTML = renderMissing(lastReport); };

  async function run(apply, button) {
    try {
      const result = await withBusy(button, apply ? 'Застосування…' : 'Перевірка…', () => apiFetch('sync-choiceqr', { method: 'POST', body: { apply } }));
      lastReport = result;
      report.innerHTML = renderReport(result);
      const hasChanges = result.prices.length || result.volumes.length || result.descriptions.length || result.photos.length;
      applyButton.disabled = apply || !hasChanges;
      if (apply) toast('Дані з ChoiceQR оновлено');
    } catch (error) {
      report.innerHTML = `<p class="admin-error">${escapeHtml(error.message)}</p>`;
    }
  }

  /* «Не додавати в тренажер» / «Повернути»: saved at once, the list updates without re-checking ChoiceQR. */
  async function toggleIgnored(button, key, ignore) {
    try {
      await withBusy(button, ignore ? 'Збереження…' : 'Повернення…', async () => {
        if (ignore) {
          const item = lastReport.fresh.find(f => f.key === key);
          const { error } = await supabase.from('choiceqr_ignored')
            .upsert({ key, name: item.name, section: item.section, category: item.category }, { onConflict: 'key', ignoreDuplicates: true });
          if (error) throw new Error(error.message);
          lastReport.fresh = lastReport.fresh.filter(f => f.key !== key);
          lastReport.ignored = [...lastReport.ignored, item].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
          toast(`«${item.name}» більше не пропонується`);
        } else {
          const item = lastReport.ignored.find(f => f.key === key);
          const { error } = await supabase.from('choiceqr_ignored').delete().eq('key', key);
          if (error) throw new Error(error.message);
          lastReport.ignored = lastReport.ignored.filter(f => f.key !== key);
          lastReport.fresh = [...lastReport.fresh, item];
          toast(`«${item.name}» знову серед нових страв`);
        }
      });
      redrawFresh();
      redrawMissing(); // «Перейменувати» needs at least one new dish
    } catch (error) {
      toast(`Не вдалося зберегти: ${error.message}`, 'error');
    }
  }

  /* «Перейменувати»: links the item to the dish's new ChoiceQR name and renames it, then checks again. */
  function openRename(item) {
    const candidates = renameCandidates(lastReport, item);
    const body = renameDialog.querySelector('.admin-dialog-body');
    body.innerHTML = renameForm(item, candidates);
    const form = body.querySelector('form');
    let nameEdited = false;
    const syncName = () => {
      if (nameEdited) return;
      const dish = candidates.find(d => d.key === form.dish.value);
      form.name.value = trainerName(item.page, dish.name);
    };
    syncName();
    form.dish.addEventListener('change', syncName);
    form.name.addEventListener('input', () => { nameEdited = true; });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const name = form.name.value.replace(/\s+/g, ' ').trim();
      if (!name) return showFormErrors(form, [{ name: 'name', message: 'Назва в тренажері: обов’язкове поле' }]);
      showFormErrors(form, []);
      try {
        await withBusy(form.querySelector('[type=submit]'), 'Збереження…', async () => {
          const { data: row, error } = await supabase.from('menu_items').select('data').eq('page', item.page).eq('id', item.id).single();
          if (error) throw new Error(error.message);
          const { error: updateError } = await supabase.from('menu_items')
            .update({ data: { ...row.data, name }, choiceqr_name: form.dish.value })
            .eq('page', item.page).eq('id', item.id);
          if (updateError) throw new Error(updateError.message);
        });
        renameDialog.close();
        toast(`«${item.name}» → «${name}»`);
        await run(false, checkButton);
      } catch (error) {
        showFormErrors(form, [{ message: `Не вдалося перейменувати: ${error.message}` }]);
      }
    });
    openDialog(renameDialog);
  }

  async function removeMissing(button, item) {
    const confirmed = window.confirm(
      `Видалити «${item.name}»?\n\n` +
      'Позиція зникне з каталогу й тестів, а також з бази без можливості відновлення. ' +
      'Відповіді працівників по ній залишаться в «Результатах».'
    );
    if (!confirmed) return;
    try {
      await withBusy(button, 'Видалення…', () => removeItem({ page: item.page, id: item.id, data: { image: item.image } }));
      lastReport.missing = lastReport.missing.filter(m => !(m.page === item.page && m.id === item.id));
      redrawMissing();
      toast(`«${item.name}» видалено`);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  const missingItem = (id, page) => lastReport.missing.find(m => m.id === id && m.page === page);

  panel.addEventListener('click', async event => {
    if (event.target.closest('#renameDialog [data-close]')) return renameDialog.close();
    const ignore = event.target.closest('[data-ignore]');
    if (ignore) return toggleIgnored(ignore, ignore.dataset.ignore, true);
    const restore = event.target.closest('[data-restore]');
    if (restore) return toggleIgnored(restore, restore.dataset.restore, false);
    const create = event.target.closest('[data-create]');
    if (create) {
      requestNewItem(draftFor(lastReport.fresh.find(f => f.key === create.dataset.create)));
      location.hash = '#items';
      return;
    }
    const rename = event.target.closest('[data-rename]');
    if (rename) return openRename(missingItem(rename.dataset.rename, rename.dataset.renamePage));
    const remove = event.target.closest('[data-remove]');
    if (remove) return removeMissing(remove, missingItem(remove.dataset.remove, remove.dataset.removePage));
    const button = event.target.closest('[data-sync]');
    if (button) run(button.dataset.sync === 'apply', button);
  });
}
