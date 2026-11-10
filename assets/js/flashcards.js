/* Flashcards mode: searchable grid of flip cards.
   On phones a tap opens the card full screen instead of flipping it: a 3D-rotated card is
   rasterized at low resolution by mobile browsers (blurry text) and is too small to read anyway. */
import { CONFIG, TEXT, groupOf, store } from './context.js';
import { escapeHtml, itemImage } from './utils.js';
import { sound } from './sound.js';

const PHONE_QUERY = window.matchMedia('(max-width: 767px)');

/* Grouped composition (e.g. Основа / Соуси / Декор), plus optional warning groups (allergens). */
function renderSections(item) {
  if (!CONFIG.cardSections) return '';
  return CONFIG.cardSections(item).filter(group => group.values?.length).map(group => {
    const chip = group.tone === 'warn'
      ? 'bg-rose-500/15 text-rose-200 border-rose-500/30'
      : 'bg-white/5 text-slate-200 border-white/10';
    return `
      <div class="mt-3">
        <span class="text-[10px] font-mono uppercase tracking-wider ${group.tone === 'warn' ? 'text-rose-300' : 'text-amber-400'} block mb-1">${escapeHtml(group.label)}</span>
        <div class="flex flex-wrap gap-1">
          ${group.values.map(value => `<span class="px-2 py-0.5 rounded-md border text-[11px] leading-snug ${chip}">${escapeHtml(value)}</span>`).join('')}
        </div>
      </div>`;
  }).join('');
}

/* The card's "passport": details rows, grouped composition and notes. Shared by the card back and the full-screen view. */
function renderPassport(item) {
  const notes = CONFIG.notes(item);
  return `
    <div class="space-y-2 text-xs border-y border-white/10 py-3 text-slate-300">
      ${CONFIG.details.map(row => `
        <div class="flex items-start justify-between gap-3">
          <span class="text-slate-400 shrink-0">${escapeHtml(row.label)}:</span>
          <span class="text-right ${row.accent ? 'font-semibold text-amber-300' : row.mono ? 'font-mono text-slate-300' : 'font-semibold text-white'}">${escapeHtml(row.value(item))}</span>
        </div>`).join('')}
    </div>
    ${renderSections(item)}
    ${notes ? `
    <div class="mt-3">
      <span class="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1">${escapeHtml(TEXT.noteLabel)}:</span>
      <p class="text-xs text-slate-300 leading-relaxed italic bg-white/5 p-2.5 rounded-lg border border-white/5">${escapeHtml(notes)}</p>
    </div>` : ''}`;
}

function renderCard(item) {
  return `
    <div class="flip-card-container h-[440px] cursor-pointer group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d13]"
         data-card-flip data-item-id="${escapeHtml(item.id)}" tabindex="0" role="button" aria-pressed="false"
         aria-label="${escapeHtml(item.name)} — відкрити паспорт">
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
            <p class="text-[11px] text-amber-400 mt-1">Торкніться, щоб відкрити паспорт ↺</p>
          </div>
        </div>

        <div class="flip-card-back bg-gradient-to-br from-[#1b2030] to-[#0f121a] border border-amber-500/30 p-5 flex flex-col shadow-2xl overflow-y-auto">
          <div class="flex justify-between items-start gap-2 mb-3">
            <h4 class="font-serif font-bold text-amber-300 text-sm leading-tight">${escapeHtml(item.name)}</h4>
            <span class="text-xs text-slate-400">↺</span>
          </div>
          ${renderPassport(item)}
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

/* ------------------------------------------------- full-screen card (phones) */

let lastFocused = null;

function openCardModal(item) {
  const modal = document.getElementById('cardModal');
  const badge = CONFIG.cardBadge(item);
  const corner = CONFIG.cardCorner(item);
  modal.innerHTML = `
    <div class="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 bg-[#10141e]/95 border-b border-white/10">
      <h2 id="cardModalTitle" class="flex-1 min-w-0 font-serif font-bold text-amber-300 text-base leading-tight line-clamp-2">${escapeHtml(item.name)}</h2>
      <button type="button" data-card-modal-close aria-label="Закрити"
              class="w-11 h-11 shrink-0 rounded-xl bg-slate-800/80 border border-white/10 text-slate-200 text-lg flex items-center justify-center active:scale-95">✕</button>
    </div>
    <div class="px-4 pb-8">
      <div class="h-64 flex items-center justify-center my-4">
        ${itemImage(item, 'h-full w-full object-contain rounded-2xl', 'h-full w-full')}
      </div>
      <div class="flex items-center justify-between gap-2 mb-2">
        ${badge ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-white/5 text-amber-300 border border-white/5 truncate">${escapeHtml(badge)}</span>` : '<span></span>'}
        <span class="text-xs text-slate-400 font-mono whitespace-nowrap">${escapeHtml(corner)}</span>
      </div>
      <div class="text-sm">${renderPassport(item)}</div>
    </div>`;

  lastFocused = document.activeElement;
  modal.classList.remove('hidden');
  modal.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  history.pushState({ cardModal: true }, '');   // the phone's "Back" button closes the card
  modal.querySelector('[data-card-modal-close]').focus();
}

function hideCardModal() {
  const modal = document.getElementById('cardModal');
  if (modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  modal.innerHTML = '';
  document.body.style.overflow = '';
  lastFocused?.focus?.();
}

/* Closing goes through history so the pushed entry is consumed (popstate → hideCardModal). */
function closeCardModal() {
  if (history.state?.cardModal) history.back(); else hideCardModal();
}

export function bindCardModal() {
  window.addEventListener('popstate', hideCardModal);
  document.getElementById('cardModal').addEventListener('click', event => {
    if (event.target.closest('[data-card-modal-close]')) closeCardModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.getElementById('cardModal').classList.contains('hidden')) closeCardModal();
  });
}

/* Tap / Enter on a card: full screen on phones, flip elsewhere. */
export function openCard(element) {
  sound.playClick();
  if (PHONE_QUERY.matches) {
    const item = store.items.find(i => i.id === element.dataset.itemId);
    if (item) openCardModal(item);
    return;
  }
  const flipped = element.classList.toggle('is-flipped');
  element.setAttribute('aria-pressed', String(flipped));
}
