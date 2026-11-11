/* ChoiceQR tab: refresh prices, portion sizes and photos from the public ChoiceQR menu (api/sync-choiceqr.js).
   "Перевірити" shows what would change; "Застосувати" writes it. */
import { apiFetch } from '../auth.js';
import { PAGE_LINKS } from '../pages.js';
import { escapeHtml, toast, withBusy } from './ui.js';

const SECTION = Object.fromEntries(PAGE_LINKS.map(link => [link.id, link]));

const changeTable = (rows, title) => (rows.length ? `
  <h3>${title} <span class="admin-count">${rows.length}</span></h3>
  <div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Позиція</th><th>Було</th><th>Стане</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td data-label="Позиція">${SECTION[r.page].icon} ${escapeHtml(r.name)}</td>
      <td data-label="Було" class="admin-muted">${escapeHtml(r.from)}</td>
      <td data-label="Стане"><strong>${escapeHtml(r.to)}</strong></td></tr>`).join('')}</tbody>
  </table></div>` : '');

function renderReport(report) {
  const nothing = !report.prices.length && !report.volumes.length && !report.photos.length;
  return `
    <div class="admin-stats">
      <div><span>Перевірено позицій</span><strong>${report.checked}</strong></div>
      <div><span>Змін ціни</span><strong>${report.prices.length}</strong></div>
      <div><span>Нових фото</span><strong>${report.photos.length}</strong></div>
    </div>
    ${report.applied ? '<p class="admin-success">Зміни застосовано.</p>' : nothing ? '<p class="admin-success">Ціни й фото вже актуальні.</p>' : '<p class="admin-muted">Це попередній перегляд: нічого ще не змінено.</p>'}
    ${report.errors.length ? `<div class="admin-error"><strong>Помилки:</strong><ul>${report.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>` : ''}
    ${changeTable(report.prices, 'Ціни')}
    ${changeTable(report.volumes, 'Порції')}
    ${report.photos.length ? `<h3>Нові фото <span class="admin-count">${report.photos.length}</span></h3>
      <ul class="admin-photo-list">${report.photos.map(p => `<li><img src="${escapeHtml(p.url)}" alt="" loading="lazy"><span>${SECTION[p.page].icon} ${escapeHtml(p.name)}</span></li>`).join('')}</ul>` : ''}
    ${report.missing.length ? `<h3>Не знайдено в ChoiceQR <span class="admin-count">${report.missing.length}</span></h3>
      <p class="admin-muted">Страву прибрали або перейменували в ChoiceQR. Оновіть «Назву в ChoiceQR» у позиції або приховайте її.</p>
      <ul class="admin-plain">${report.missing.map(m => `<li>${SECTION[m.page].icon} ${escapeHtml(m.name)} <code>${escapeHtml(m.choiceqrName)}</code></li>`).join('')}</ul>` : ''}
    ${report.fresh.length ? `<h3>Нові страви в ChoiceQR <span class="admin-count">${report.fresh.length}</span></h3>
      <p class="admin-muted">Їх ще немає в тренажері. Додайте їх у «Позиції» (склад, алергени й відповіді квізу заповнюються вручну).</p>
      <ul class="admin-plain">${report.fresh.map(f => `<li>${escapeHtml(f.name)} <span class="admin-muted">· ${escapeHtml(f.section)} / ${escapeHtml(f.category)}${f.price ? ` · ${escapeHtml(f.price)}` : ''}</span></li>`).join('')}</ul>` : ''}`;
}

export async function renderSync(panel) {
  panel.innerHTML = `
    <div class="admin-toolbar">
      <div><h1>Синхронізація з ChoiceQR</h1>
        <p class="admin-muted">Оновлює ціни, порції напоїв і фото позицій, прив’язаних до страв ChoiceQR. Назви, склад, алергени й відповіді квізу не змінюються.</p></div>
      <div class="admin-sync-actions">
        <button type="button" class="admin-button is-ghost" data-sync="check">Перевірити зміни</button>
        <button type="button" class="admin-button" data-sync="apply" disabled>Застосувати</button>
      </div>
    </div>
    <div id="syncReport"><p class="admin-muted">Натисніть «Перевірити зміни», щоб побачити, що оновиться. Перевірка триває до хвилини.</p></div>`;

  const report = panel.querySelector('#syncReport');
  const applyButton = panel.querySelector('[data-sync="apply"]');

  panel.addEventListener('click', async event => {
    const button = event.target.closest('[data-sync]');
    if (!button) return;
    const apply = button.dataset.sync === 'apply';
    try {
      const result = await withBusy(button, apply ? 'Застосування…' : 'Перевірка…', () => apiFetch('sync-choiceqr', { method: 'POST', body: { apply } }));
      report.innerHTML = renderReport(result);
      const hasChanges = result.prices.length || result.volumes.length || result.photos.length;
      applyButton.disabled = apply || !hasChanges;
      if (apply) toast('Ціни й фото оновлено');
    } catch (error) {
      report.innerHTML = `<p class="admin-error">${escapeHtml(error.message)}</p>`;
    }
  });
}
