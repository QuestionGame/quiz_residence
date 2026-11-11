/* Header counters (streak, accuracy, mistakes) — refreshed after every change (answers are saved in storage.js). */
import { state } from './context.js';
import { renderMistakesList } from './mistakes.js';

export function updateStatsUI() {
  document.getElementById('streakCount').textContent = state.stats.streak;
  const acc = state.stats.answeredTotal > 0
    ? Math.round((state.stats.correctTotal / state.stats.answeredTotal) * 100)
    : 100;
  document.getElementById('accuracyPercent').textContent = `${acc}%`;

  const mistakeCount = state.stats.mistakesSet.size;
  document.getElementById('mistakeCountBadge').textContent = mistakeCount;
  document.getElementById('mistakeActionCount').textContent = mistakeCount;

  renderMistakesList();
}
