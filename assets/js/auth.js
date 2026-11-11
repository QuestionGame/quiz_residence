/* Supabase client for the browser, sign-in / sign-out, page guards and calls to the admin API. */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
import { APP_CONFIG, isConfigured } from './config.js';

// Staff sign in with a login; Supabase Auth needs an email. Keep in sync with lib/server.mjs.
const USERNAME_DOMAIN = 'staff.residence.local';
export const usernameToEmail = username => `${String(username).trim().toLowerCase()}@${USERNAME_DOMAIN}`;

export const supabase = isConfigured ? createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey) : null;

/* Pages a successful sign-in may return to (prevents redirects to other sites via ?next=). */
const SAFE_NEXT = /^(index|bar|cocktails|menu|admin|profile)\.html(#quiz)?$/;
export const safeNext = value => (SAFE_NEXT.test(value || '') ? value : 'index.html');

export async function getProfile() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from('profiles')
    .select('id, username, full_name, role, is_active, answer_assist')
    .eq('id', session.user.id)
    .maybeSingle();
  return data || null;
}

/* Returns the signed-in, active profile — or sends the visitor to the login page and returns null. */
export async function requireProfile({ admin = false } = {}) {
  const profile = await getProfile().catch(() => null);
  if (profile?.is_active && (!admin || profile.role === 'admin')) return profile;

  if (profile && profile.is_active && admin) {
    location.replace('./index.html'); // signed in, but not an admin
    return null;
  }
  if (profile && !profile.is_active) await supabase.auth.signOut();
  const here = `${location.pathname.split('/').pop() || 'index.html'}${location.hash}`;
  const params = new URLSearchParams({ next: safeNext(here) });
  if (profile && !profile.is_active) params.set('blocked', '1');
  location.replace(`./login.html?${params}`);
  return null;
}

export async function signIn(username, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
  if (error) {
    const banned = /banned/i.test(error.message);
    throw new Error(banned ? 'Доступ заблоковано. Зверніться до адміністратора.' : 'Невірний логін або пароль.');
  }
  const profile = await getProfile();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    throw new Error('Доступ заблоковано. Зверніться до адміністратора.');
  }
  return profile;
}

/* "Ім’я Прізвище" → "ІП" (header button, account sheet, profile page). */
export const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();

/* profile.html: the server strips and verifies the optional answer-assist suffix before saving the name. */
export async function updateMyName(firstName, lastName) {
  return apiFetch('profile-name', {
    method: 'POST',
    body: { firstName, lastName }
  });
}

/* The current password is checked first, so an unattended open session can't be used to take over the account.
   Afterwards every other device is signed out. */
export async function changePassword(username, currentPassword, newPassword) {
  const check = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password: currentPassword });
  if (check.error) throw new Error('Поточний пароль невірний.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.code === 'same_password') throw new Error('Новий пароль має відрізнятися від поточного.');
    if (error.code === 'weak_password') throw new Error('Пароль надто простий: щонайменше 8 символів.');
    throw new Error('Не вдалося змінити пароль. Спробуйте ще раз.');
  }
  await supabase.auth.signOut({ scope: 'others' }).catch(() => {});
}

export async function signOut() {
  await supabase?.auth.signOut();
  location.replace('./login.html');
}

/* Calls a serverless function in api/ with the current session token. */
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`./api/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Помилка сервера (${response.status})`);
  return payload;
}
