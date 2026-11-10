/* Mistakes mode: list of items answered wrong at least once. */
import { CONFIG, groupLabel, groupOf, state, store } from './context.js';
import { escapeHtml, itemImage } from './utils.js';

export function renderMistakesList() {
  const container = document.getElementById('mistakesListContainer');
  const startBtn = document.getElementById('btnStartMistakesQuiz');
  const mistakeItems = store.items.filter(item => state.stats.mistakesSet.has(item.id));
  const isEmpty = mistakeItems.length === 0;

  startBtn.disabled = isEmpty;
  startBtn.classList.toggle('opacity-50', isEmpty);
  startBtn.classList.toggle('cursor-not-allowed', isEmpty);

  if (isEmpty) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 bg-[#131722]/50 border border-white/5 rounded-2xl">
        <span class="text-4xl block mb-2">🎉</span>
        <p class="font-medium text-slate-300">Список помилок порожній!</p>
        <p class="text-xs text-slate-500 mt-1">Ви бездоганно відповіли на всі питання у квізі або ще не почали тест.</p>
      </div>`;
    return;
  }

  container.innerHTML = mistakeItems.map(item => {
    const [line1, line2] = CONFIG.summary(item);
    return `
    <div class="bg-[#131722] border border-rose-500/30 rounded-2xl p-5 flex items-center gap-4">
      <div class="w-20 h-24 flex-shrink-0">
        ${itemImage(item, 'h-full w-full object-contain rounded-lg', 'h-full w-full text-4xl')}
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-[10px] text-rose-400 font-mono uppercase">${escapeHtml(groupLabel(groupOf(item)))}</span>
        <h4 class="font-serif font-bold text-sm text-white truncate">${escapeHtml(item.name)}</h4>
        <p class="text-xs text-slate-400 mt-1">${escapeHtml(line1)}</p>
        <p class="text-xs text-amber-300 font-semibold mt-0.5">${escapeHtml(line2)}</p>
      </div>
    </div>`;
  }).join('');
}
