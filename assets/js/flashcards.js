/* Flashcards mode: searchable grid of flip cards. */
import { CONFIG, TEXT, groupOf, store } from './context.js';
import { escapeHtml, itemImage } from './utils.js';
import { sound } from './sound.js';

function renderCard(item) {
  const notes = CONFIG.notes(item);
  return `
    <div class="flip-card-container h-[440px] cursor-pointer group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d13]"
         data-card-flip tabindex="0" role="button" aria-pressed="false"
         aria-label="${escapeHtml(item.name)} — перевернути картку">
      <div class="flip-card-inner">
        <div class="flip-card-front bg-[#131722] border border-white/10 p-5 flex flex-col justify-between shadow-xl hover:border-amber-500/40 transition">
          <div class="flex items-center justify-between gap-2">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-white/5 text-amber-300 border border-white/5 truncate">${escapeHtml(CONFIG.cardBadge(item))}</span>
            <span class="text-xs text-slate-400 font-mono whitespace-nowrap">${escapeHtml(CONFIG.cardCorner(item))}</span>
          </div>
          <div class="h-56 flex items-center justify-center my-2 transform group-hover:scale-105 transition-transform">
            ${itemImage(item, 'h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] rounded-xl', 'h-full w-full')}
          </div>
          <div class="text-center">
            <h4 class="font-serif font-bold text-base text-white line-clamp-2">${escapeHtml(item.name)}</h4>
            <p class="text-[11px] text-amber-400 mt-1">Торкніться або натисніть Enter, щоб розкрити паспорт ↺</p>
          </div>
        </div>

        <div class="flip-card-back bg-gradient-to-br from-[#1b2030] to-[#0f121a] border border-amber-500/30 p-5 flex flex-col shadow-2xl overflow-y-auto">
          <div class="flex justify-between items-start gap-2 mb-3">
            <h4 class="font-serif font-bold text-amber-300 text-sm leading-tight">${escapeHtml(item.name)}</h4>
            <span class="text-xs text-slate-400">↺</span>
          </div>
          <div class="space-y-2 text-xs border-y border-white/10 py-3 text-slate-300">
            ${CONFIG.details.map(row => `
              <div class="flex items-start justify-between gap-3">
                <span class="text-slate-400 shrink-0">${escapeHtml(row.label)}:</span>
                <span class="text-right ${row.accent ? 'font-semibold text-amber-300' : row.mono ? 'font-mono text-slate-300' : 'font-semibold text-white'}">${escapeHtml(row.value(item))}</span>
              </div>`).join('')}
          </div>
          ${notes ? `
          <div class="mt-3">
            <span class="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1">${escapeHtml(TEXT.noteLabel)}:</span>
            <p class="text-xs text-slate-300 leading-relaxed italic bg-white/5 p-2.5 rounded-lg border border-white/5">${escapeHtml(notes)}</p>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

export function renderFlashcards() {
  const container = document.getElementById('flashcardsGrid');
  const search = (document.getElementById('flashcardSearch').value || "").toLowerCase().trim();
  const filter = document.getElementById('flashcardCategoryFilter').value;

  const filtered = store.items.filter(item => {
    const matchesCategory = filter === 'ALL' || groupOf(item) === filter;
    const matchesSearch = !search ||
      CONFIG.searchFields.some(field => String(item[field] || '').toLowerCase().includes(search));
    return matchesCategory && matchesSearch;
  });

  container.innerHTML = filtered.length
    ? filtered.map(renderCard).join('')
    : `
      <div class="col-span-full py-16 text-center text-slate-500">
        <span class="text-3xl block mb-2">🔍</span>
        <p>За вашим запитом нічого не знайдено</p>
      </div>`;
}

export function toggleCardFlip(element) {
  sound.playClick();
  const flipped = element.classList.toggle('is-flipped');
  element.setAttribute('aria-pressed', String(flipped));
}
