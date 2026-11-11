/* ChoiceQR tab: refresh prices, portion sizes, descriptions and photos from the public ChoiceQR menu (api/sync-choiceqr.js).
   "Перевірити" shows what would change; "Застосувати" writes it.
   New ChoiceQR dishes can be marked «Не додавати в тренажер» (table choiceqr_ignored) and restored later. */
import { apiFetch, supabase } from '../auth.js';
import { PAGE_LINKS } from '../pages.js';
import { escapeHtml, toast, withBusy } from './ui.js';

const SECTION = Object.fromEntries(PAGE_LINKS.map(link => [link.id, link]));

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

/* «Нові страви в ChoiceQR» + the folded list of dishes marked «Не додавати в тренажер». */
function renderFresh(report) {
  const fresh = report.fresh.length ? `
    <h3>Нові страви в ChoiceQR <span class="admin-count">${report.fresh.length}</span></h3>
    <p class="admin-muted">Їх ще немає в тренажері. Додайте їх у «Позиції» (склад, алергени й відповіді квізу заповнюються вручну) або позначте «Не додавати в тренажер», щоб вони більше тут не з’являлися.</p>
    <ul class="admin-fresh">${report.fresh.map(item => `
      <li><span><strong>${escapeHtml(item.name)}</strong><small class="admin-muted">${escapeHtml(freshMeta(item))}</small></span>
        <button type="button" class="admin-button is-ghost" data-ignore="${escapeHtml(item.key)}">Не додавати в тренажер</button></li>`).join('')}</ul>` : '';
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
    ${report.missing.length ? `<h3>Не знайдено в ChoiceQR <span class="admin-count">${report.missing.length}</span></h3>
      <p class="admin-muted">Страву прибрали або перейменували в ChoiceQR. Оновіть «Назву в ChoiceQR» у позиції.</p>
      <ul class="admin-plain">${report.missing.map(m => `<li>${SECTION[m.page].icon} ${escapeHtml(m.name)} <code>${escapeHtml(m.choiceqrName)}</code></li>`).join('')}</ul>` : ''}
    <div id="syncFresh">${renderFresh(report)}</div>`;
}

export async function renderSync(panel) {
  panel.innerHTML = `
    <div class="admin-toolbar">
      <div><h1>Синхронізація з ChoiceQR</h1>
        <p class="admin-muted">Оновлює ціни, порції напоїв, описи з меню й фото позицій, прив’язаних до страв ChoiceQR. Назви, склад, алергени й відповіді квізу не змінюються.</p></div>
      <div class="admin-sync-actions">
        <button type="button" class="admin-button is-ghost" data-sync="check">Перевірити зміни</button>
        <button type="button" class="admin-button" data-sync="apply" disabled>Застосувати</button>
      </div>
    </div>
    <div id="syncReport"><p class="admin-muted">Натисніть «Перевірити зміни», щоб побачити, що оновиться. Перевірка триває до хвилини.</p></div>`;

  const report = panel.querySelector('#syncReport');
  const applyButton = panel.querySelector('[data-sync="apply"]');
  let lastReport = null;
  const redrawFresh = () => { panel.querySelector('#syncFresh').innerHTML = renderFresh(lastReport); };

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
    } catch (error) {
      toast(`Не вдалося зберегти: ${error.message}`, 'error');
    }
  }

  panel.addEventListener('click', async event => {
    const ignore = event.target.closest('[data-ignore]');
    if (ignore) return toggleIgnored(ignore, ignore.dataset.ignore, true);
    const restore = event.target.closest('[data-restore]');
    if (restore) return toggleIgnored(restore, restore.dataset.restore, false);
    const button = event.target.closest('[data-sync]');
    if (!button) return;
    const apply = button.dataset.sync === 'apply';
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
  });
}
