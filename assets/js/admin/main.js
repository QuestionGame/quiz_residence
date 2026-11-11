/* admin.html entry: admin-only guard, tabs (#results / #items / #users / #sync). Each tab renders lazily. */
import { requireProfile, signOut } from '../auth.js';
import { escapeHtml } from './ui.js';
import { renderResults } from './results.js';
import { renderItems } from './items.js';
import { renderUsers } from './users.js';
import { renderSync } from './sync.js';

const TABS = { results: renderResults, items: renderItems, users: renderUsers, sync: renderSync };
const rendered = new Set();

async function showTab(name) {
  const tab = TABS[name] ? name : 'results';
  document.querySelectorAll('[data-tab]').forEach(link => {
    const active = link.dataset.tab === tab;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== tab; });
  if (!rendered.has(tab)) {
    rendered.add(tab);
    const panel = document.getElementById(`tab-${tab}`);
    try {
      await TABS[tab](panel);
    } catch (error) {
      console.error(error);
      rendered.delete(tab);
      panel.innerHTML = `<p class="admin-error">Не вдалося завантажити: ${escapeHtml(error.message)}</p>`;
    }
  }
}

const profile = await requireProfile({ admin: true });
if (profile) {
  document.getElementById('adminWho').textContent = profile.full_name;
  document.getElementById('adminSignOut').addEventListener('click', signOut);
  document.getElementById('admin').hidden = false;
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
  showTab(location.hash.slice(1));
}
