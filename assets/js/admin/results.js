/* Results tab: every worker's quiz results (all time) by section, with a per-worker breakdown. */
import { supabase } from '../auth.js';
import { PAGE_LINKS } from '../pages.js';
import { accuracyTone, escapeHtml, formatAgo, formatDate, openDialog, percent } from './ui.js';

const SECTIONS = Object.fromEntries(PAGE_LINKS.map(link => [link.id, link]));
const filters = { page: 'all' };

const accuracyCell = (correct, total) => {
  const value = percent(correct, total);
  return value == null ? '<span class="admin-muted">—</span>' : `<span class="accuracy ${accuracyTone(value)}">${value}%</span>`;
};

function segmented(name, options, current) {
  return `<div class="admin-segmented" role="group" aria-label="${name}">${options.map(o =>
    `<button type="button" data-filter="${name}" data-value="${o.id}" aria-pressed="${o.id === current}" class="${o.id === current ? 'is-active' : ''}">${escapeHtml(o.label)}</button>`).join('')}</div>`;
}

async function loadSummary() {
  const [{ data: rows, error }, { data: people, error: peopleError }] = await Promise.all([
    supabase.rpc('attempt_summary', { only_page: filters.page === 'all' ? null : filters.page }),
    supabase.from('profiles').select('id, username, full_name, role, is_active').order('full_name')
  ]);
  if (error || peopleError) throw new Error((error || peopleError).message);

  const byUser = new Map(people.map(p => [p.id, { ...p, attempts: 0, correct: 0, items: 0, lastAt: null, pages: {} }]));
  for (const row of rows) {
    const user = byUser.get(row.user_id);
    if (!user) continue;
    user.attempts += row.attempts;
    user.correct += row.correct;
    user.items += row.items;
    if (!user.lastAt || row.last_at > user.lastAt) user.lastAt = row.last_at;
    user.pages[row.page] = row;
  }
  // Workers first (admins only if they trained); most recent activity on top, then by name.
  return [...byUser.values()]
    .filter(user => user.role === 'staff' || user.attempts)
    .sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || '') || a.full_name.localeCompare(b.full_name, 'uk'));
}

function renderTable(users) {
  const allSections = filters.page === 'all';
  if (!users.length) return '<p class="admin-empty">Ще немає працівників. Створіть їх у вкладці «Користувачі».</p>';
  const head = allSections
    ? PAGE_LINKS.map(link => `<th class="num">${link.icon} ${escapeHtml(link.label)}</th>`).join('')
    : '<th class="num">Позицій</th>';
  return `
    <div class="admin-table-wrap">
      <table class="admin-table admin-results-table">
        <thead><tr><th>Працівник</th><th class="num">Відповідей</th><th class="num">Точність</th>${head}<th>Остання активність</th></tr></thead>
        <tbody>${users.map(user => `
          <tr data-user="${user.id}" tabindex="0" class="is-clickable ${user.is_active ? '' : 'is-inactive'}">
            <td data-label="Працівник"><strong>${escapeHtml(user.full_name)}</strong><small>@${escapeHtml(user.username)}${user.is_active ? '' : ' · заблоковано'}</small></td>
            <td data-label="Відповідей" class="num">${user.attempts || '<span class="admin-muted">0</span>'}</td>
            <td data-label="Точність" class="num">${accuracyCell(user.correct, user.attempts)}</td>
            ${allSections
              ? PAGE_LINKS.map(link => `<td data-label="${escapeHtml(link.label)}" class="num">${accuracyCell(user.pages[link.id]?.correct, user.pages[link.id]?.attempts)}</td>`).join('')
              : `<td data-label="Позицій" class="num">${user.items}</td>`}
            <td data-label="Остання активність">${user.lastAt ? `${escapeHtml(formatAgo(user.lastAt))}<small>${escapeHtml(formatDate(user.lastAt))}</small>` : '<span class="admin-muted">не тренувався</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* "Обрано X — правильно Y" for each wrong required question of an attempt. */
function describeMistakes(details) {
  return (details || []).filter(q => !q.isCorrect && !q.optional).map(q => {
    const correct = q.correct || [];
    const chosen = (q.chosen || []).filter(Boolean);
    if (correct.length > 1 || chosen.length > 1) {
      const missed = correct.filter(v => !chosen.includes(v));
      const extra = chosen.filter(v => !correct.includes(v));
      return `${q.label}: ${[missed.length ? `пропущено ${missed.join(', ')}` : '', extra.length ? `зайве ${extra.join(', ')}` : ''].filter(Boolean).join('; ')}`;
    }
    return `${q.label}: обрано «${chosen[0] ?? '—'}», правильно «${correct[0] ?? '—'}»`;
  });
}

async function openWorker(dialog, user) {
  dialog.querySelector('.admin-dialog-body').innerHTML = '<p class="admin-muted">Завантаження…</p>';
  dialog.querySelector('h2').textContent = user.full_name;
  openDialog(dialog);

  let query = supabase.from('quiz_attempts')
    .select('page, item_id, item_name, is_correct, details, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(500);
  if (filters.page !== 'all') query = query.eq('page', filters.page);
  const { data: attempts, error } = await query;
  if (error) {
    dialog.querySelector('.admin-dialog-body').innerHTML = `<p class="admin-error">${escapeHtml(error.message)}</p>`;
    return;
  }

  const perItem = new Map();
  for (const a of attempts) {
    const key = `${a.page}/${a.item_id}`;
    const entry = perItem.get(key) || { page: a.page, name: a.item_name, total: 0, wrong: 0 };
    entry.total++;
    if (!a.is_correct) entry.wrong++;
    perItem.set(key, entry);
  }
  const problems = [...perItem.values()].filter(e => e.wrong).sort((a, b) => b.wrong - a.wrong || b.total - a.total).slice(0, 8);
  const correct = attempts.filter(a => a.is_correct).length;

  dialog.querySelector('.admin-dialog-body').innerHTML = `
    <p class="admin-muted">@${escapeHtml(user.username)}${filters.page === 'all' ? '' : ` · ${escapeHtml(SECTIONS[filters.page].label)}`}${attempts.length === 500 ? ' · показано останні 500 відповідей' : ''}</p>
    <div class="admin-stats">
      <div><span>Відповідей</span><strong>${attempts.length}</strong></div>
      <div><span>Точність</span><strong>${accuracyCell(correct, attempts.length)}</strong></div>
      <div><span>Позицій</span><strong>${perItem.size}</strong></div>
    </div>
    <h3>Найчастіші помилки</h3>
    ${problems.length ? `<ul class="admin-problems">${problems.map(p => `
      <li><span>${SECTIONS[p.page].icon} ${escapeHtml(p.name)}</span><span class="admin-muted">${p.wrong} з ${p.total} невірно</span></li>`).join('')}</ul>`
      : '<p class="admin-muted">Помилок немає.</p>'}
    <h3>Останні відповіді</h3>
    ${attempts.length ? `<ul class="admin-attempts">${attempts.slice(0, 40).map(a => `
      <li class="${a.is_correct ? 'is-right' : 'is-wrong'}">
        <span class="admin-attempt-mark" aria-label="${a.is_correct ? 'правильно' : 'помилка'}">${a.is_correct ? '✓' : '✕'}</span>
        <span><strong>${SECTIONS[a.page].icon} ${escapeHtml(a.item_name)}</strong>
          ${describeMistakes(a.details).map(line => `<small>${escapeHtml(line)}</small>`).join('')}</span>
        <time datetime="${a.created_at}">${escapeHtml(formatDate(a.created_at))}</time>
      </li>`).join('')}</ul>` : '<p class="admin-muted">Відповідей ще немає.</p>'}`;
}

export async function renderResults(panel) {
  panel.innerHTML = `
    <div class="admin-toolbar">
      <div><h1>Результати працівників</h1><p class="admin-muted">Відповіді в тренажері. Натисніть на працівника, щоб побачити його помилки.</p></div>
      <div class="admin-filters">
        ${segmented('page', [{ id: 'all', label: 'Усі розділи' }, ...PAGE_LINKS.map(l => ({ id: l.id, label: `${l.icon} ${l.label}` }))], filters.page)}
      </div>
    </div>
    <div id="resultsTable"><p class="admin-muted">Завантаження…</p></div>
    <dialog id="workerDialog" class="admin-dialog admin-dialog-wide" aria-labelledby="workerDialogTitle">
      <div class="admin-dialog-head"><h2 id="workerDialogTitle"></h2><button type="button" class="admin-close" data-close aria-label="Закрити">✕</button></div>
      <div class="admin-dialog-body"></div>
    </dialog>`;

  const dialog = panel.querySelector('#workerDialog');
  let users = [];
  const refresh = async () => {
    panel.querySelector('#resultsTable').innerHTML = '<p class="admin-muted">Завантаження…</p>';
    users = await loadSummary();
    panel.querySelector('#resultsTable').innerHTML = renderTable(users);
  };

  panel.addEventListener('click', event => {
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      filters[filter.dataset.filter] = filter.dataset.value;
      panel.querySelectorAll(`[data-filter="${filter.dataset.filter}"]`).forEach(b => {
        const active = b === filter;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      refresh();
      return;
    }
    if (event.target.closest('[data-close]')) return dialog.close();
    const row = event.target.closest('[data-user]');
    if (row) openWorker(dialog, users.find(u => u.id === row.dataset.user));
  });
  panel.addEventListener('keydown', event => {
    const row = event.target.closest?.('[data-user]');
    if (row && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openWorker(dialog, users.find(u => u.id === row.dataset.user));
    }
  });
  await refresh();
}
