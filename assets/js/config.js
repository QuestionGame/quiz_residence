/* Public Supabase settings for the browser.
   The URL and the publishable (anon) key are meant to be public — data is protected by Row Level Security
   in the database (supabase/migrations). The service-role key must NEVER be put here: it lives only in
   server env vars (.env.local locally, Vercel project settings in production). */

// `supabase start` — the same well-known demo values on every machine.
const LOCAL = {
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
};

// Supabase dashboard → Project Settings → API (fill in when the cloud project is created).
const PRODUCTION = {
  supabaseUrl: '',
  supabaseKey: ''
};

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
export const APP_CONFIG = isLocal ? LOCAL : PRODUCTION;
export const isConfigured = Boolean(APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseKey);
