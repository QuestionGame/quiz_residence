/* Account button in the header (initials) and its sheet: who is signed in, profile and admin links, sign out. */
import { store } from './context.js';
import { escapeHtml } from './utils.js';
import { createSheet } from './sheet.js';
import { initials, signOut } from './auth.js';

const sheet = createSheet({ rootId: 'accountSheet', dialogId: 'accountSheetDialog', stateKey: 'account' });

export function renderAccountButton() {
  const { full_name: name } = store.profile;
  return `<button type="button" class="account-button" data-action="openAccount" aria-haspopup="dialog" aria-label="Обліковий запис: ${escapeHtml(name)}">${escapeHtml(initials(name))}</button>`;
}

export function renderAccountSheet() {
  const { full_name: name, username, role } = store.profile;
  const isAdmin = role === 'admin';
  const here = location.pathname.split('/').pop() || 'index.html';
  return `
  <div id="accountSheet" class="item-sheet-root" aria-hidden="true">
    <button class="item-sheet-backdrop" data-action="closeAccount" aria-label="Закрити"></button>
    <section id="accountSheetDialog" class="item-sheet account-sheet" role="dialog" aria-modal="true" aria-labelledby="accountName" tabindex="-1">
      <div class="sheet-float">
        <span class="sheet-handle" aria-hidden="true"></span>
        <button type="button" data-action="closeAccount" class="sheet-close" aria-label="Закрити">✕</button>
      </div>
      <div class="account-head">
        <span class="account-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
        <div>
          <h2 id="accountName">${escapeHtml(name)}</h2>
          <p>@${escapeHtml(username)} · ${isAdmin ? 'адміністратор' : 'працівник'}</p>
        </div>
      </div>
      <div class="account-actions">
        <a class="account-action" href="./profile.html?from=${encodeURIComponent(here)}"><span aria-hidden="true">👤</span>Мій профіль</a>
        ${isAdmin ? '<a class="account-action" href="./admin.html"><span aria-hidden="true">⚙</span>Адмін-панель</a>' : ''}
        <button type="button" class="account-action account-signout" data-action="signOut"><span aria-hidden="true">↪</span>Вийти</button>
      </div>
    </section>
  </div>`;
}

export const openAccount = trigger => sheet.open(trigger);
export const closeAccount = () => sheet.close();
export const bindAccount = () => sheet.bind();
export { signOut };
