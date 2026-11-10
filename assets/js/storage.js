/* Persists quiz progress per page in localStorage. */
import { CONFIG, state, store } from './context.js';

export function saveStats() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({
      answeredTotal: state.stats.answeredTotal,
      correctTotal: state.stats.correctTotal,
      streak: state.stats.streak,
      mistakes: [...state.stats.mistakesSet]
    }));
  } catch (error) {
    // Storage unavailable (private mode, blocked cookies) — progress just won't persist
  }
}

export function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));
    if (!saved) return;
    const knownIds = new Set(store.items.map(item => item.id));
    state.stats.answeredTotal = Number(saved.answeredTotal) || 0;
    state.stats.correctTotal = Number(saved.correctTotal) || 0;
    state.stats.streak = Number(saved.streak) || 0;
    state.stats.mistakesSet = new Set((saved.mistakes || []).filter(id => knownIds.has(id)));
  } catch (error) {
    // Corrupted or unavailable storage — start fresh
  }
}
