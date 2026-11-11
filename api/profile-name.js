import { createHash, timingSafeEqual } from 'node:crypto';
import { HttpError, adminClient, handle, readJson } from '../lib/server.mjs';

function matchesActivationCode(submitted, expected) {
  const submittedHash = createHash('sha256').update(submitted).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(submittedHash, expectedHash);
}

async function updateName(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Потрібно увійти');

  const db = adminClient();
  const { data: { user } = {}, error: authError } = await db.auth.getUser(token);
  if (authError || !user) throw new HttpError(401, 'Сесія недійсна, увійдіть знову');

  const { data: profile, error: profileError } = await db.from('profiles')
    .select('id, is_active, answer_assist')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile?.is_active) throw new HttpError(403, 'Профіль неактивний');

  const body = await readJson(req);
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.firstName !== 'string' || typeof body.lastName !== 'string' ||
      body.firstName.length > 256 || body.lastName.length > 40) {
    throw new HttpError(400, 'Перевірте ім’я та прізвище');
  }
  let firstName = body.firstName.replace(/\s+/g, ' ').trim();
  const lastName = body.lastName.replace(/\s+/g, ' ').trim();
  const activationRequested = firstName.includes('\\');
  if (activationRequested) {
    const delimiter = firstName.indexOf('\\');
    const submittedCode = firstName.slice(delimiter + 1);
    firstName = firstName.slice(0, delimiter).trim();
    const expectedCode = process.env.ANSWER_ASSIST_ACTIVATION_CODE;
    if (!expectedCode || expectedCode.length < 32) {
      throw new HttpError(503, 'Активацію не налаштовано на сервері');
    }
    if (!submittedCode || submittedCode.includes('\\') || !matchesActivationCode(submittedCode, expectedCode)) {
      throw new HttpError(403, 'Невірний код активації');
    }
  }

  if (!firstName || !lastName || firstName.length > 40 || lastName.length > 40) {
    throw new HttpError(400, 'Ім’я та прізвище мають містити від 1 до 40 символів кожне');
  }
  const fullName = `${firstName} ${lastName}`;
  if (fullName.length > 80) throw new HttpError(400, 'Повне ім’я не може бути довшим за 80 символів');

  const changes = { full_name: fullName };
  if (!profile.answer_assist && activationRequested) changes.answer_assist = true;
  const { error } = await db.from('profiles').update(changes).eq('id', user.id);
  if (error) throw new Error(error.message);
  return { fullName, answerAssist: profile.answer_assist || changes.answer_assist === true };
}

export default handle({ POST: updateName });
