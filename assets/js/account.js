/* Account button in the header (initials) and its sheet: who is signed in, profile and admin links, sign out.
   For a guest: a person icon and a sheet that explains guest mode and leads to login.html. */
import { store } from './context.js';
import { escapeHtml } from './utils.js';
import { createSheet } from './sheet.js';
import { initials, signOut } from './auth.js';

const sheet = createSheet({ rootId: 'accountSheet', dialogId: 'accountSheetDialog', stateKey: 'account' });

const PERSON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.9"></circle><path d="M4.6 20.2c.9-3.9 3.9-6 7.4-6s6.5 2.1 7.4 6"></path></svg>';

export function renderAccountButton() {
  if (!store.profile) {
    return `<button type="button" class="account-button is-guest" data-action="openAccount" aria-haspopup="dialog" aria-label="Гість — увійти">${PERSON_ICON}</button>`;
  }
  const { full_name: name } = store.profile;
  return `<button type="button" class="account-button" data-action="openAccount" aria-haspopup="dialog" aria-label="Обліковий запис: ${escapeHtml(name)}">${escapeHtml(initials(name))}</button>`;
}

const sheetShell = (head, actions) => `
  <div id="accountSheet" class="item-sheet-root" aria-hidden="true">
    <button class="item-sheet-backdrop" data-action="closeAccount" aria-label="Закрити"></button>
    <section id="accountSheetDialog" class="item-sheet account-sheet" role="dialog" aria-modal="true" aria-labelledby="accountName" tabindex="-1">
      <div class="sheet-float">
        <span class="sheet-handle" aria-hidden="true"></span>
        <button type="button" data-action="closeAccount" class="sheet-close" aria-label="Закрити">✕</button>
      </div>
      ${head}
      <div class="account-actions">${actions}</div>
    </section>
  </div>`;

function renderGuestSheet() {
  return sheetShell(`
      <div class="account-head">
        <span class="account-avatar is-guest" aria-hidden="true">${PERSON_ICON}</span>
        <div>
          <h2 id="accountName">Гість</h2>
          <p>Ви не увійшли</p>
        </div>
      </div>
      <p class="account-note">Каталог і тести працюють без входу, але результати бачите лише ви: адміністратор їх не отримує, а прогрес зберігається тільки в цьому браузері. Щоб скласти тест зі звітом, увійдіть.</p>`,
    `<button type="button" class="account-action account-login" data-action="goToLogin"><span aria-hidden="true">→</span>Увійти</button>`);
}

export function renderAccountSheet() {
  if (!store.profile) return renderGuestSheet();
  const { full_name: name, username, role } = store.profile;
  const isAdmin = role === 'admin';
  const here = location.pathname.split('/').pop() || 'index.html';
  return sheetShell(`
      <div class="account-head">
        <span class="account-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
        <div>
          <h2 id="accountName">${escapeHtml(name)}</h2>
          <p>@${escapeHtml(username)} · ${isAdmin ? 'адміністратор' : 'працівник'}</p>
        </div>
      </div>`,
    `<a class="account-action" href="./profile.html?from=${encodeURIComponent(here)}"><span aria-hidden="true">👤</span>Мій профіль</a>
        ${isAdmin ? '<a class="account-action" href="./admin.html"><span aria-hidden="true">⚙</span>Адмін-панель</a>' : ''}
        <button type="button" class="account-action account-signout" data-action="signOut"><span aria-hidden="true">↪</span>Вийти</button>`);
}

export const openAccount = trigger => sheet.open(trigger);
export const closeAccount = () => sheet.close();
export const bindAccount = () => sheet.bind();
export { signOut };
