/* Quiz progress.
   Signed in: stored in Supabase per user (table quiz_attempts) — the same history on every device,
   and admins see it in the results tab of admin.html.
   Guest: kept only in this browser (localStorage); nothing is sent anywhere. */
import { PAGE_ID, state, store } from './context.js';
import { supabase } from './auth.js';

const STREAK_WINDOW = 200; // how many recent answers are scanned for the current streak

const GUEST_KEY = `residence-guest-stats-${PAGE_ID}`;

/* Storage can be unavailable (private mode, blocked site data): the guest then simply starts fresh each visit. */
function loadGuestStats() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(GUEST_KEY)); } catch { /* fresh start */ }
  const knownIds = new Set(store.items.map(item => item.id));
  state.stats.answeredTotal = saved?.answered || 0;
  state.stats.correctTotal = saved?.correct || 0;
  state.stats.streak = saved?.streak || 0;
  state.stats.mistakesSet = new Set((saved?.mistakes || []).filter(id => knownIds.has(id)));
}

function saveGuestStats() {
  const { answeredTotal, correctTotal, streak, mistakesSet } = state.stats;
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({ answered: answeredTotal, correct: correctTotal, streak, mistakes: [...mistakesSet] }));
  } catch { /* not saved — fine for a guest */ }
}

/* Answered / correct totals, current streak and the mistakes bank on this page. */
export async function loadStats() {
  if (!store.profile) return loadGuestStats();
  const userId = store.profile.id;
  const mine = query => query.eq('user_id', userId).eq('page', PAGE_ID);

  const [total, correct, recent, latest, reset] = await Promise.all([
    mine(supabase.from('quiz_attempts').select('id', { count: 'exact', head: true })),
    mine(supabase.from('quiz_attempts').select('id', { count: 'exact', head: true })).eq('is_correct', true),
    mine(supabase.from('quiz_attempts').select('is_correct')).order('created_at', { ascending: false }).limit(STREAK_WINDOW),
    mine(supabase.from('latest_item_results').select('item_id, is_correct, created_at')),
    mine(supabase.from('mistake_resets').select('cleared_at')).maybeSingle()
  ]);
  const failed = [total, correct, recent, latest, reset].find(result => result.error);
  if (failed) throw new Error(failed.error.message);

  const streakEnd = recent.data.findIndex(row => !row.is_correct);
  const clearedAt = reset.data ? new Date(reset.data.cleared_at) : null;
  const knownIds = new Set(store.items.map(item => item.id));

  state.stats.answeredTotal = total.count || 0;
  state.stats.correctTotal = correct.count || 0;
  state.stats.streak = streakEnd === -1 ? recent.data.length : streakEnd;
  // Mistakes bank: items whose latest answer was wrong (and newer than the last "Очистити список").
  state.stats.mistakesSet = new Set(latest.data
    .filter(row => !row.is_correct && knownIds.has(row.item_id) && (!clearedAt || new Date(row.created_at) > clearedAt))
    .map(row => row.item_id));
}

/* Saves one checked answer (call after state.stats is updated). The UI is already updated locally;
   a failed save is reported, not retried. */
export async function recordAttempt(item, isCorrect, details) {
  if (!store.profile) return saveGuestStats();
  const { error } = await supabase.from('quiz_attempts').insert({
    page: PAGE_ID,
    item_id: item.id,
    item_name: item.name,
    is_correct: isCorrect,
    details
  });
  if (error) {
    console.error('Відповідь не збережено:', error.message);
    showSaveWarning();
  }
}

/* "Очистити список" in the mistakes bank: hides everything answered wrong before now. */
export async function resetMistakes() {
  if (!store.profile) return saveGuestStats();
  const { error } = await supabase.from('mistake_resets')
    .upsert({ page: PAGE_ID, cleared_at: new Date().toISOString() }, { onConflict: 'user_id,page' });
  if (error) {
    console.error('Список помилок не очищено:', error.message);
    showSaveWarning();
  }
}

function showSaveWarning() {
  const status = document.getElementById('appStatus');
  status.textContent = 'Не вдалося зберегти результат — перевірте інтернет. Відповіді з цієї сесії можуть не потрапити в статистику.';
  status.classList.remove('hidden');
}
