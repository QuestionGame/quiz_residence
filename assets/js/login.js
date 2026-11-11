/* login.html: sign in with the login and password issued by an admin. */
import { isConfigured } from './config.js';
import { getProfile, safeNext, signIn } from './auth.js';

const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');
const submit = document.getElementById('loginSubmit');
const params = new URLSearchParams(location.search);
const next = safeNext(params.get('next'));
document.getElementById('guestLink').href = `./${next}`;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

if (!isConfigured) {
  showError('Сайт ще не підключено до бази даних (assets/js/config.js).');
  submit.disabled = true;
} else {
  if (params.get('blocked')) showError('Доступ заблоковано. Зверніться до адміністратора.');
  // Already signed in → straight to the app.
  getProfile().then(profile => { if (profile?.is_active) location.replace(`./${next}`); }).catch(() => {});
}

document.getElementById('togglePassword').addEventListener('click', event => {
  const input = document.getElementById('loginPassword');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-pressed', String(show));
  event.currentTarget.setAttribute('aria-label', show ? 'Сховати пароль' : 'Показати пароль');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const username = form.username.value.trim();
  const password = form.password.value;
  if (!username || !password) return showError('Введіть логін і пароль.');

  showError('');
  submit.disabled = true;
  submit.textContent = 'Вхід…';
  try {
    await signIn(username, password);
    location.replace(`./${next}`);
  } catch (error) {
    showError(error.message || 'Не вдалося увійти. Спробуйте ще раз.');
    submit.disabled = false;
    submit.textContent = 'Увійти';
    form.password.select();
  }
});
