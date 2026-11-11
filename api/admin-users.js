// Staff accounts (admin only).
//   GET    → list of accounts with last sign-in
//   POST   { username, fullName, password, role }          → create an account
//   PATCH  { id, fullName?, role?, isActive?, password? }  → change name / role / access / password
//   DELETE { id }                                          → permanently delete account and its quiz history
import { HttpError, USERNAME_PATTERN, adminClient, handle, readJson, requireAdmin, usernameToEmail } from '../lib/server.mjs';

const ROLES = ['staff', 'admin'];
const BAN_FOREVER = '876000h'; // ~100 years: Supabase Auth's way to block sign-in

function cleanName(value) {
  const name = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 80) throw new HttpError(400, 'Вкажіть ім’я (до 80 символів)');
  return name;
}

function checkPassword(value) {
  const password = String(value ?? '');
  if (password.length < 8) throw new HttpError(400, 'Пароль має містити щонайменше 8 символів');
  if (password.length > 72) throw new HttpError(400, 'Пароль занадто довгий (до 72 символів)');
  return password;
}

function checkRole(value) {
  if (!ROLES.includes(value)) throw new HttpError(400, 'Невідома роль');
  return value;
}

async function listUsers() {
  const db = adminClient();
  const [{ data: profiles, error }, { data: auth, error: authError }] = await Promise.all([
    db.from('profiles').select('id, username, full_name, role, is_active, created_at').order('full_name'),
    db.auth.admin.listUsers({ perPage: 1000 })
  ]);
  if (error || authError) throw new Error((error || authError).message);
  const lastSignIn = new Map(auth.users.map(user => [user.id, user.last_sign_in_at]));
  return { users: profiles.map(p => ({ ...p, last_sign_in_at: lastSignIn.get(p.id) || null })) };
}

async function createUser(req) {
  await requireAdmin(req);
  const body = await readJson(req);
  const username = String(body.username ?? '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, 'Логін: 3–32 символи — латинські літери, цифри, крапка, дефіс або підкреслення');
  }
  const fullName = cleanName(body.fullName);
  const password = checkPassword(body.password);
  const role = checkRole(body.role || 'staff');

  const db = adminClient();
  const { data: taken } = await db.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken) throw new HttpError(409, `Логін «${username}» уже зайнятий`);

  const { data: created, error } = await db.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName }
  });
  if (error) throw new HttpError(400, error.message);

  const { error: profileError } = await db.from('profiles').insert({ id: created.user.id, username, full_name: fullName, role });
  if (profileError) {
    await db.auth.admin.deleteUser(created.user.id); // keep auth.users and profiles in sync
    throw new HttpError(400, profileError.message);
  }
  return { user: { id: created.user.id, username, full_name: fullName, role, is_active: true } };
}

async function updateUser(req) {
  const caller = await requireAdmin(req);
  const body = await readJson(req);
  const db = adminClient();
  const { data: target } = await db.from('profiles').select('id, role, is_active').eq('id', body.id).maybeSingle();
  if (!target) throw new HttpError(404, 'Користувача не знайдено');

  const changes = {};
  if (body.fullName !== undefined) changes.full_name = cleanName(body.fullName);
  if (body.role !== undefined) changes.role = checkRole(body.role);
  if (body.isActive !== undefined) changes.is_active = Boolean(body.isActive);
  const losesAdmin = target.role === 'admin' && target.is_active && (changes.role === 'staff' || changes.is_active === false);
  if (losesAdmin) {
    if (target.id === caller.id) throw new HttpError(400, 'Не можна зняти права адміністратора або заблокувати самого себе');
    const { count } = await db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
    if (count <= 1) throw new HttpError(400, 'Має залишитися хоча б один активний адміністратор');
  }

  if (Object.keys(changes).length) {
    const { error } = await db.from('profiles').update(changes).eq('id', target.id);
    if (error) throw new HttpError(400, error.message);
  }

  const authChanges = {};
  if (body.password !== undefined && body.password !== '') authChanges.password = checkPassword(body.password);
  if (changes.is_active !== undefined) authChanges.ban_duration = changes.is_active ? 'none' : BAN_FOREVER;
  if (Object.keys(authChanges).length) {
    const { error } = await db.auth.admin.updateUserById(target.id, authChanges);
    if (error) throw new HttpError(400, error.message);
  }
  return { ok: true };
}

async function deleteUser(req) {
  const caller = await requireAdmin(req);
  const body = await readJson(req);
  if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.id)) {
    throw new HttpError(400, 'Некоректний ідентифікатор користувача');
  }

  const db = adminClient();
  const { data: target, error: targetError } = await db.from('profiles')
    .select('id, role, is_active')
    .eq('id', body.id)
    .maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!target) throw new HttpError(404, 'Користувача не знайдено');
  if (target.id === caller.id) throw new HttpError(400, 'Не можна видалити власний акаунт');

  if (target.role === 'admin' && target.is_active) {
    const { count, error } = await db.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);
    if (error) throw new Error(error.message);
    if (count <= 1) throw new HttpError(400, 'Має залишитися хоча б один активний адміністратор');
  }

  const { error } = await db.auth.admin.deleteUser(target.id);
  if (error) throw new HttpError(400, error.message);
  return { ok: true };
}

export default handle({
  GET: async req => { await requireAdmin(req); return listUsers(); },
  POST: createUser,
  PATCH: updateUser,
  DELETE: deleteUser
});
