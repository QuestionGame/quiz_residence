/* profile.html: the signed-in user changes their first / last name and their password. */
import { changePassword, initials, requireProfile, safeNext, signOut, updateMyName } from './auth.js';

const NAME_MAX = 40;
const PASSWORD_MIN = 8;
const ROLE_LABEL = { admin: 'адміністратор', staff: 'працівник' };

const card = document.querySelector('.profile-card');
const nameForm = document.getElementById('nameForm');
const passwordForm = document.getElementById('passwordForm');
const cleanName = value => value.replace(/\s+/g, ' ').trim();

/* Error / success line of a form; showing one hides the other. */
function say(form, kind, message) {
  const error = form.querySelector('.auth-error');
  const success = form.querySelector('.auth-success');
  error.hidden = kind !== 'error';
  success.hidden = kind !== 'success';
  (kind === 'error' ? error : success).textContent = message || '';
}

async function busy(form, label, task) {
  const button = form.querySelector('.auth-submit');
  const idle = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { return await task(); } finally { button.disabled = false; button.textContent = idle; }
}

function showProfile(profile) {
  document.getElementById('profileAvatar').textContent = initials(profile.full_name);
  document.getElementById('profileName').textContent = profile.full_name;
  document.getElementById('profileMeta').textContent = `@${profile.username} · ${ROLE_LABEL[profile.role] || profile.role}`;
}

const profile = await requireProfile();
if (profile) {
  const from = new URLSearchParams(location.search).get('from');
  document.getElementById('profileBack').href = `./${safeNext(from)}`;

  // full_name is one column: the first word is the first name, the rest is the last name.
  const [first = '', ...rest] = profile.full_name.split(' ');
  nameForm.firstName.value = first;
  nameForm.lastName.value = rest.join(' ');
  passwordForm.username.value = profile.username; // lets password managers save the right login
  showProfile(profile);
  card.hidden = false;

  nameForm.addEventListener('submit', async event => {
    event.preventDefault();
    const firstName = cleanName(nameForm.firstName.value);
    const lastName = cleanName(nameForm.lastName.value);
    if (!firstName || !lastName) return say(nameForm, 'error', 'Вкажіть ім’я та прізвище.');
    if ((firstName.length > NAME_MAX && !firstName.includes('\\')) || lastName.length > NAME_MAX) {
      return say(nameForm, 'error', `Ім’я та прізвище мають бути до ${NAME_MAX} символів кожне.`);
    }
    if (`${firstName} ${lastName}` === profile.full_name) return say(nameForm, 'success', 'Змін немає.');
    const wasAnswerAssistEnabled = profile.answer_assist;
    try {
      const saved = await busy(nameForm, 'Збереження…', () => updateMyName(firstName, lastName));
      profile.full_name = saved.fullName;
      profile.answer_assist = saved.answerAssist;
      const [savedFirst = '', ...savedLast] = saved.fullName.split(' ');
      nameForm.firstName.value = savedFirst;
      nameForm.lastName.value = savedLast.join(' ');
      showProfile(profile);
      say(nameForm, 'success', saved.answerAssist && !wasAnswerAssistEnabled
        ? 'Збережено. Спеціальний доступ увімкнено.'
        : 'Збережено.');
    } catch (error) {
      say(nameForm, 'error', error.message);
    }
  });

  passwordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const { current, password, repeat } = passwordForm;
    if (!current.value) return say(passwordForm, 'error', 'Введіть поточний пароль.');
    if (password.value.length < PASSWORD_MIN) return say(passwordForm, 'error', `Новий пароль — щонайменше ${PASSWORD_MIN} символів.`);
    if (password.value !== repeat.value) return say(passwordForm, 'error', 'Нові паролі не збігаються.');
    try {
      await busy(passwordForm, 'Зміна…', () => changePassword(profile.username, current.value, password.value));
      passwordForm.reset();
      passwordForm.username.value = profile.username;
      say(passwordForm, 'success', 'Пароль змінено.');
    } catch (error) {
      say(passwordForm, 'error', error.message);
      (/Поточний/.test(error.message) ? current : password).select();
    }
  });

  document.querySelectorAll('[data-toggle-password]').forEach(toggle => toggle.addEventListener('click', () => {
    const input = toggle.previousElementSibling;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Сховати пароль' : 'Показати пароль');
  }));

  document.getElementById('profileSignOut').addEventListener('click', signOut);
}
