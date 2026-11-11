/* Items tab: browse, edit, add and hide menu items of a section (table menu_items, admin-only RLS). */
import { supabase } from '../auth.js';
import { PAGE_LINKS } from '../pages.js';
import { escapeHtml, formatDate, openDialog, slug, toast, withBusy } from './ui.js';
import { renderItemFields, readItemForm } from './item-forms.js';

const BUCKET = 'menu-images';
const PHOTO_MAX_SIDE = 800; // same size as the photos already in the project
const state = { page: 'menu', search: '', showHidden: false, rows: [] };
const META = {
  wine: d => [d.category, d.priceHint],
  bar: d => [d.group, [d.volume, d.price].filter(Boolean).join(' · ')],
  cocktails: d => [d.group, d.price],
  menu: d => [d.group, [d.weight, d.price].filter(Boolean).join(' · ')]
};

async function loadRows() {
  const { data, error } = await supabase.from('menu_items')
    .select('page, id, data, choiceqr_name, is_active, sort_order, updated_at')
    .eq('page', state.page)
    .order('sort_order').order('name');
  if (error) throw new Error(error.message);
  state.rows = data;
}

/* Distinct existing values of a field in this section — suggestions for datalist fields. */
const suggestions = key => [...new Set(state.rows.map(row => row.data[key]).filter(v => typeof v === 'string' && v))];

function renderList(container) {
  const term = state.search.trim().toLowerCase();
  const rows = state.rows.filter(row =>
    (state.showHidden || row.is_active) && (!term || JSON.stringify(row.data).toLowerCase().includes(term)));
  const hidden = state.rows.filter(row => !row.is_active).length;
  container.innerHTML = `
    <p class="admin-muted">${rows.length} з ${state.rows.length}${hidden ? ` · прихованих: ${hidden}` : ''}</p>
    ${rows.length ? `<ul class="admin-items">${rows.map(row => {
      const [line1, line2] = META[row.page](row.data);
      return `
      <li class="admin-item ${row.is_active ? '' : 'is-inactive'}">
        <button type="button" class="admin-item-open" data-edit-item="${escapeHtml(row.id)}">
          ${row.data.image ? `<img src="${escapeHtml(row.data.image)}" alt="" loading="lazy">` : '<span class="admin-item-noimg" aria-hidden="true">—</span>'}
          <span class="admin-item-copy">
            <strong>${escapeHtml(row.data.name)}</strong>
            <small>${escapeHtml([line1, line2].filter(Boolean).join(' · '))}</small>
            <small class="admin-item-flags">${row.is_active ? '' : '<span class="admin-badge is-off">приховано</span>'}${row.choiceqr_name ? '<span class="admin-badge">ChoiceQR</span>' : ''}<span>змінено ${escapeHtml(formatDate(row.updated_at))}</span></small>
          </span>
        </button>
      </li>`;
    }).join('')}</ul>` : '<p class="admin-empty">Нічого не знайдено.</p>'}`;
}

/* Resize in the browser to ≤ 800px and re-encode as WebP before upload. */
async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Не вдалося обробити фото'))), 'image/webp', 0.8));
}

async function uploadPhoto(page, id, file) {
  const blob = await shrinkPhoto(file);
  const path = `${page}/${id}-${Date.now()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp' });
  if (error) throw new Error(`Фото не завантажено: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function uniqueId(name) {
  const base = slug(name);
  const taken = new Set(state.rows.map(row => row.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

function itemForm(row) {
  const data = row?.data || {};
  return `
    <form class="admin-form admin-item-form" novalidate>
      <div class="admin-photo">
        <div class="admin-photo-preview">${data.image ? `<img src="${escapeHtml(data.image)}" alt="">` : '<span>Без фото</span>'}</div>
        <div class="admin-photo-actions">
          <label class="admin-button is-ghost"><input type="file" name="photo" accept="image/*" hidden>Завантажити фото</label>
          ${data.image ? '<label class="admin-check"><input type="checkbox" name="removePhoto"><span>Прибрати фото</span></label>' : ''}
          <small>Фото зменшиться до 800 px автоматично.</small>
        </div>
      </div>
      <div class="admin-form-grid">${renderItemFields(state.page, data, suggestions)}</div>
      <details class="admin-details">
        <summary>Службове</summary>
        <label class="admin-field"><span>Назва в ChoiceQR</span>
          <input name="choiceqrName" value="${escapeHtml(row?.choiceqr_name || '')}" autocomplete="off" spellcheck="false">
          <small>Для кнопки «Оновити ціни й фото»: «НАЗВА» або «КАТЕГОРІЯ|НАЗВА» як у ChoiceQR. Порожнє — позиція не синхронізується.</small></label>
        ${row ? `<p class="admin-muted">ID: <code>${escapeHtml(row.id)}</code></p>` : ''}
      </details>
      <label class="admin-check"><input type="checkbox" name="isActive" ${row ? (row.is_active ? 'checked' : '') : 'checked'}>
        <span>Показувати працівникам <small>Зніміть, щоб приховати позицію (наприклад, її прибрали з меню). Історія відповідей збережеться.</small></span></label>
      <p class="admin-form-error" role="alert" hidden></p>
      <div class="admin-form-actions">
        <button type="button" class="admin-button is-ghost" data-close>Скасувати</button>
        <button type="submit" class="admin-button">${row ? 'Зберегти' : 'Додати позицію'}</button>
      </div>
    </form>`;
}

async function save(form, row) {
  const { data, errors } = readItemForm(state.page, form, row?.data || {});
  if (errors.length) throw new Error(errors.join('. '));
  const id = row?.id || uniqueId(data.name);

  const file = form.photo.files[0];
  if (file) data.image = await uploadPhoto(state.page, id, file);
  else if (form.removePhoto?.checked) delete data.image;

  const fields = { data, choiceqr_name: form.choiceqrName.value.trim().toUpperCase() || null, is_active: form.isActive.checked };
  const result = row
    ? await supabase.from('menu_items').update(fields).eq('page', state.page).eq('id', id)
    : await supabase.from('menu_items').insert({
      page: state.page, id, ...fields,
      sort_order: Math.max(-1, ...state.rows.map(r => r.sort_order)) + 1
    });
  if (result.error) throw new Error(result.error.message);
  return data.name;
}

export async function renderItems(panel) {
  panel.innerHTML = `
    <div class="admin-toolbar">
      <div><h1>Позиції меню</h1><p class="admin-muted">Зміни одразу бачать працівники в каталозі й тренажері.</p></div>
      <button type="button" class="admin-button" data-new-item>+ Нова позиція</button>
    </div>
    <div class="admin-filters">
      <div class="admin-segmented" role="group" aria-label="Розділ">${PAGE_LINKS.map(link =>
        `<button type="button" data-page="${link.id}" aria-pressed="${link.id === state.page}" class="${link.id === state.page ? 'is-active' : ''}">${link.icon} ${escapeHtml(link.label)}</button>`).join('')}</div>
      <input type="search" class="admin-search" placeholder="Пошук у розділі…" aria-label="Пошук позицій" data-search>
      <label class="admin-check"><input type="checkbox" data-show-hidden><span>Показати приховані</span></label>
    </div>
    <div id="itemsList"><p class="admin-muted">Завантаження…</p></div>
    <dialog id="itemDialog" class="admin-dialog admin-dialog-wide" aria-labelledby="itemDialogTitle">
      <div class="admin-dialog-head"><h2 id="itemDialogTitle"></h2><button type="button" class="admin-close" data-close aria-label="Закрити">✕</button></div>
      <div class="admin-dialog-body"></div>
    </dialog>`;

  const list = panel.querySelector('#itemsList');
  const dialog = panel.querySelector('#itemDialog');
  const reload = async () => { await loadRows(); renderList(list); };

  const open = row => {
    const section = PAGE_LINKS.find(l => l.id === state.page);
    dialog.querySelector('h2').textContent = row ? row.data.name : `Нова позиція · ${section.label}`;
    dialog.querySelector('.admin-dialog-body').innerHTML = itemForm(row);
    const form = dialog.querySelector('form');
    form.photo.addEventListener('change', () => {
      const file = form.photo.files[0];
      if (file) form.querySelector('.admin-photo-preview').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const error = form.querySelector('.admin-form-error');
      error.hidden = true;
      try {
        const name = await withBusy(form.querySelector('[type=submit]'), 'Збереження…', () => save(form, row));
        dialog.close();
        toast(`«${name}» збережено`);
        await reload();
      } catch (failure) {
        error.textContent = failure.message;
        error.hidden = false;
      }
    });
    openDialog(dialog);
  };

  panel.addEventListener('click', async event => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) {
      state.page = pageButton.dataset.page;
      panel.querySelectorAll('[data-page]').forEach(b => {
        const active = b === pageButton;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      list.innerHTML = '<p class="admin-muted">Завантаження…</p>';
      await reload();
      return;
    }
    if (event.target.closest('[data-new-item]')) return open(null);
    const edit = event.target.closest('[data-edit-item]');
    if (edit) return open(state.rows.find(row => row.id === edit.dataset.editItem));
    if (event.target.closest('[data-close]')) dialog.close();
  });
  panel.addEventListener('input', event => {
    if (event.target.matches('[data-search]')) { state.search = event.target.value; renderList(list); }
  });
  panel.addEventListener('change', event => {
    if (event.target.matches('[data-show-hidden]')) { state.showHidden = event.target.checked; renderList(list); }
  });
  await reload();
}
