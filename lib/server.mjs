// Shared helpers for the serverless functions in api/ (Vercel; locally served by scripts/dev-server.mjs).
// The service-role key bypasses Row Level Security, so it lives only in server env vars — never in the browser.
import { createClient } from '@supabase/supabase-js';

/* Staff log in with a username; Supabase Auth needs an email, so every username maps to this internal address. */
export const USERNAME_DOMAIN = 'staff.residence.local';
export const usernameToEmail = username => `${username}@${USERNAME_DOMAIN}`;
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let adminClientInstance = null;
export function adminClient() {
  if (!adminClientInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new HttpError(500, 'На сервері не налаштовано SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    adminClientInstance = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return adminClientInstance;
}

/* Resolves the caller from "Authorization: Bearer <access token>" and requires an active admin. */
export async function requireAdmin(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Потрібно увійти');
  const db = adminClient();
  const { data: { user } = {}, error } = await db.auth.getUser(token);
  if (error || !user) throw new HttpError(401, 'Сесія недійсна, увійдіть знову');
  const { data: profile } = await db.from('profiles').select('id, role, is_active').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin' || !profile.is_active) throw new HttpError(403, 'Доступ лише для адміністратора');
  return profile;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;          // Vercel already parsed it
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, 'Некоректний JSON');
  }
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/* Builds a handler from { GET: fn, POST: fn, ... }: method check, JSON response, JSON errors. */
export function handle(methods) {
  return async (req, res) => {
    try {
      const run = methods[req.method];
      if (!run) throw new HttpError(405, 'Метод не підтримується');
      sendJson(res, 200, await run(req, res));
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(res, status, { error: status === 500 ? 'Внутрішня помилка сервера' : error.message });
    }
  };
}
