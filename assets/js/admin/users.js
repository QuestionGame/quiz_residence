/* Users tab: staff accounts — create, rename, change role, reset password, block / unblock.
   All changes go through api/admin-users.js (service-role key on the server). */
import { apiFetch } from '../auth.js';
import { escapeHtml, formatAgo, formatDate, generatePassword, openDialog, showFormErrors, toast, validityErrors, withBusy } from './ui.js';

const ROLE_LABELS = { staff: 'Працівник', admin: 'Адміністратор' };
let users = [];

/* What exactly is wrong with a login (the rule is in lib/server.mjs: ^[a-z0-9][a-z0-9._-]{2,31}$). */
function usernameProblem(value) {
  if (!value) return 'Логін: обов’язкове поле';
  const bad = [...new Set(value.replace(/[a-z0-9._-]/g, ''))];
  if (bad.length) {
    const shown = bad.map(ch => (ch === ' ' ? 'пробіл' : `«${ch}»`)).join(', ');
    return `Логін: недопустимі символи ${shown}. Можна лише латинські літери, цифри, крапку, дефіс і підкреслення`;
  }
  if (!/^[a-z0-9]/.test(value)) return 'Логін має починатися з латинської літери або цифри';
  if (value.length < 3) return `Логін: щонайменше 3 символи (зараз ${value.length})`;
  if (value.length > 32) return 'Логін: не більше 32 символів';
  return '';
}

function checkUserForm(form, isNew) {
  const errors = validityErrors(form).filter(e => e.name !== 'username');
  if (!form.fullName.value.trim() && !errors.some(e => e.name === 'fullName')) {
    errors.push({ name: 'fullName', message: 'Ім’я та прізвище: обов’язкове поле' });
  }
  if (isNew) {
    const problem = usernameProblem(form.username.value.trim());
    if (problem) errors.push({ name: 'username', message: problem });
  }
  const password = form.password.value;
  if ((isNew || password) && password.length < 8 && !errors.some(e => e.name === 'password')) {
    errors.push({ name: 'password', message: password ? `Пароль: щонайменше 8 символів (зараз ${password.length})` : 'Пароль: обов’язкове поле' });
  }
  // Same order as the fields in the form.
  const order = name => [...form.elements].indexOf(form.elements[name]);
  return errors.sort((a, b) => order(a.name) - order(b.name));
}

/* Server messages ("Логін «x» уже зайнятий", "Пароль…") are shown under the field they are about. */
const fieldOfServerError = message => (/^Логін/.test(message) ? 'username' : /^Пароль/.test(message) ? 'password' : /^Вкажіть ім’я/.test(message) ? 'fullName' : null);

function renderList(container) {
  container.innerHTML = users.length ? `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Ім’я</th><th>Логін</th><th>Роль</th><th>Доступ</th><th>Останній вхід</th><th></th></tr></thead>
        <tbody>${users.map(user => `
          <tr class="${user.is_active ? '' : 'is-inactive'}">
            <td data-label="Ім’я"><strong>${escapeHtml(user.full_name)}</strong></td>
            <td data-label="Логін"><code>${escapeHtml(user.username)}</code></td>
            <td data-label="Роль">${user.role === 'admin' ? '<span class="admin-badge is-admin">Адміністратор</span>' : 'Працівник'}</td>
            <td data-label="Доступ">${user.is_active ? '<span class="admin-badge is-ok">активний</span>' : '<span class="admin-badge is-off">заблоковано</span>'}</td>
            <td data-label="Останній вхід">${user.last_sign_in_at ? `${escapeHtml(formatAgo(user.last_sign_in_at))}<small>${escapeHtml(formatDate(user.last_sign_in_at))}</small>` : '<span class="admin-muted">ще не входив</span>'}</td>
            <td class="admin-row-actions"><button type="button" class="admin-button is-ghost" data-edit-user="${user.id}">Змінити</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p class="admin-empty">Користувачів ще немає.</p>';
}

const passwordField = (name, label, hint, required) => `
  <label class="admin-field">
    <span>${label}</span>
    <span class="admin-input-row">
      <input name="${name}" type="text" autocomplete="new-password" minlength="8" maxlength="72" ${required ? 'required' : ''} spellcheck="false">
      <button type="button" class="admin-button is-ghost" data-generate="${name}">Згенерувати</button>
    </span>
    <small>${hint}</small>
  </label>`;

function userForm(user) {
  const isNew = !user;
  return `
    <form class="admin-form" method="dialog" novalidate data-user-id="${escapeHtml(user?.id || '')}">
      <label class="admin-field"><span>Ім’я та прізвище</span>
        <input name="fullName" required maxlength="80" value="${escapeHtml(user?.full_name || '')}" autocomplete="off"></label>
      ${isNew ? `
      <label class="admin-field"><span>Логін</span>
        <input name="username" required maxlength="32" autocapitalize="none" spellcheck="false" autocomplete="off" placeholder="olena.k">
        <small>3–32 символи: латинські літери, цифри, крапка, дефіс, підкреслення. Змінити потім не можна.</small></label>` : `
      <p class="admin-muted">Логін: <code>${escapeHtml(user.username)}</code></p>`}
      <label class="admin-field"><span>Роль</span>
        <select name="role">${Object.entries(ROLE_LABELS).map(([value, label]) =>
          `<option value="${value}" ${(user?.role || 'staff') === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      ${isNew
        ? passwordField('password', 'Пароль', 'Щонайменше 8 символів. Передайте його працівнику — після закриття вікна пароль більше не буде видно.', true)
        : passwordField('password', 'Новий пароль', 'Залиште порожнім, щоб не змінювати.', false)}
      ${isNew ? '' : `
      <label class="admin-check"><input type="checkbox" name="isActive" ${user.is_active ? 'checked' : ''}>
        <span>Доступ дозволено <small>Зніміть, щоб заблокувати вхід (історія результатів збережеться).</small></span></label>
      `}
      <p class="admin-form-error" role="alert" hidden></p>
      <div class="admin-form-actions">
        ${isNew ? '' : '<button type="button" class="admin-button is-danger" data-delete-user>Видалити акаунт</button>'}
        <button type="button" class="admin-button is-ghost" data-close>Скасувати</button>
        <button type="submit" class="admin-button">${isNew ? 'Створити' : 'Зберегти'}</button>
      </div>
    </form>`;
}

function credentialsCard(username, password, fullName) {
  return `
    <div class="admin-credentials">
      <p>Акаунт для <strong>${escapeHtml(fullName)}</strong> створено. Передайте ці дані працівнику:</p>
      <dl><dt>Логін</dt><dd><code>${escapeHtml(username)}</code></dd><dt>Пароль</dt><dd><code>${escapeHtml(password)}</code></dd></dl>
      <div class="admin-form-actions">
        <button type="button" class="admin-button is-ghost" data-copy="Логін: ${escapeHtml(username)}\nПароль: ${escapeHtml(password)}">Скопіювати</button>
        <button type="button" class="admin-button" data-close>Готово</button>
      </div>
    </div>`;
}

export async function renderUsers(panel) {
  panel.innerHTML = `
    <div class="admin-toolbar">
      <div><h1>Користувачі</h1><p class="admin-muted">Працівники входять у тренажер за логіном і паролем, які створює адміністратор.</p></div>
      <button type="button" class="admin-button" data-new-user>+ Новий працівник</button>
    </div>
    <div id="usersList"><p class="admin-muted">Завантаження…</p></div>
    <dialog id="userDialog" class="admin-dialog" aria-labelledby="userDialogTitle">
      <div class="admin-dialog-head"><h2 id="userDialogTitle"></h2><button type="button" class="admin-close" data-close aria-label="Закрити">✕</button></div>
      <div class="admin-dialog-body"></div>
    </dialog>`;

  const list = panel.querySelector('#usersList');
  const dialog = panel.querySelector('#userDialog');
  const body = dialog.querySelector('.admin-dialog-body');
  const reload = async () => { users = (await apiFetch('admin-users')).users; renderList(list); };

  const open = user => {
    dialog.querySelector('h2').textContent = user ? `Змінити: ${user.full_name}` : 'Новий працівник';
    body.innerHTML = userForm(user);
    const form = body.querySelector('form');
    if (!user) {
      form.password.value = generatePassword();
      // Logins are lower-case: "Olena.K" becomes "olena.k" while typing instead of being rejected.
      form.username.addEventListener('input', () => {
        const { selectionStart, selectionEnd } = form.username;
        form.username.value = form.username.value.toLowerCase();
        form.username.setSelectionRange(selectionStart, selectionEnd);
      });
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const problems = checkUserForm(form, !user);
      showFormErrors(form, problems);
      if (problems.length) return;
      const submit = form.querySelector('[type=submit]');
      try {
        await withBusy(submit, 'Збереження…', async () => {
          if (user) {
            await apiFetch('admin-users', { method: 'PATCH', body: {
              id: user.id, fullName: form.fullName.value, role: form.role.value,
              isActive: form.isActive.checked,
              password: form.password.value || undefined
            } });
            dialog.close();
            toast('Зміни збережено');
          } else {
            const username = form.username.value.trim().toLowerCase();
            await apiFetch('admin-users', { method: 'POST', body: {
              username, fullName: form.fullName.value, password: form.password.value, role: form.role.value
            } });
            dialog.querySelector('h2').textContent = 'Працівника створено';
            body.innerHTML = credentialsCard(username, form.password.value, form.fullName.value);
          }
          await reload();
        });
      } catch (failure) {
        showFormErrors(form, [{ name: fieldOfServerError(failure.message), message: failure.message }]);
      }
    });
    openDialog(dialog);
  };

  panel.addEventListener('click', async event => {
    if (event.target.closest('[data-new-user]')) return open(null);
    const edit = event.target.closest('[data-edit-user]');
    if (edit) return open(users.find(u => u.id === edit.dataset.editUser));
    const deleteButton = event.target.closest('[data-delete-user]');
    if (deleteButton) {
      const targetId = deleteButton.closest('form')?.dataset.userId;
      const target = users.find(candidate => candidate.id === targetId);
      if (!target) return;
      const confirmed = window.confirm(
        `Видалити акаунт «${target.full_name}» (@${target.username})?\n\n` +
        'Усі результати квізів, помилки та статистика цього користувача будуть видалені без можливості відновлення.'
      );
      if (!confirmed) return;
      try {
        await withBusy(deleteButton, 'Видалення…', () => apiFetch('admin-users', {
          method: 'DELETE',
          body: { id: target.id }
        }));
        dialog.close();
        toast('Акаунт і його історію видалено');
        try {
          await reload();
        } catch (error) {
          toast(`Акаунт видалено, але список не оновився: ${error.message}`, 'error');
        }
      } catch (error) {
        toast(error.message, 'error');
      }
      return;
    }
    const generate = event.target.closest('[data-generate]');
    if (generate) {
      const input = generate.closest('form').elements[generate.dataset.generate];
      input.value = generatePassword();
      input.focus();
      return;
    }
    const copy = event.target.closest('[data-copy]');
    if (copy) {
      await navigator.clipboard.writeText(copy.dataset.copy).then(() => toast('Скопійовано'), () => toast('Не вдалося скопіювати', 'error'));
      return;
    }
    if (event.target.closest('[data-close]')) dialog.close();
  });

  await reload();
}
