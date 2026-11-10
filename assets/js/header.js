/* Site header shared by every page: section dropdown (wine / bar / cocktails / kitchen),
   stats, sound toggle and mode tabs. */
import { PAGE_LINKS, PAGES } from './pages.js';
import { CONFIG, PAGE_ID, TEXT } from './context.js';
import { escapeHtml } from './utils.js';

export const TAB_ACTIVE = "px-3.5 py-1.5 rounded-lg flex items-center space-x-2 whitespace-nowrap transition bg-wine-600/40 text-amber-300 border border-wine-500/50 shadow-sm";
export const TAB_IDLE = "px-3.5 py-1.5 rounded-lg flex items-center space-x-2 whitespace-nowrap transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent";

const CURRENT_LINK = PAGE_LINKS.find(link => link.id === PAGE_ID);

function renderMenuItems() {
  return PAGE_LINKS.map(link => {
    const active = link.id === PAGE_ID;
    const subtitle = PAGES[link.id].text.subtitle;
    return `
      <a href="${link.href}" role="menuitem" ${active ? 'aria-current="page"' : ''}
         class="flex items-center gap-3 rounded-xl px-3 py-3 min-h-[56px] outline-none transition
                focus-visible:ring-2 focus-visible:ring-amber-500
                ${active ? 'bg-amber-500/15 text-amber-200' : 'text-slate-200 hover:bg-white/5 focus-visible:bg-white/5'}">
        <span class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-xl ${active ? 'bg-amber-500/20' : 'bg-white/5'}" aria-hidden="true">${link.icon}</span>
        <span class="flex-1 min-w-0">
          <span class="block text-sm font-semibold">${link.label}</span>
          <span class="block text-xs text-slate-400 truncate">${escapeHtml(subtitle)}</span>
        </span>
        ${active ? '<span class="text-amber-400 text-base" aria-hidden="true">✓</span>' : ''}
      </a>`;
  }).join('');
}

function renderPageMenu() {
  return `
    <div class="relative min-w-0" id="pageMenu">
      <button type="button" id="pageMenuButton" aria-haspopup="menu" aria-expanded="false" aria-controls="pageMenuList"
              class="flex items-center gap-2.5 sm:gap-3 rounded-xl pl-1 pr-2 py-1 -ml-1 min-w-0 text-left transition
                     hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
        <span class="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-tr from-wine-700 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
          <span class="w-full h-full bg-[#11141e] rounded-[10px] flex items-center justify-center text-lg sm:text-xl">${CONFIG.placeholderIcon}</span>
        </span>
        <span class="min-w-0">
          <span class="sm:hidden block text-sm font-bold text-amber-300 truncate">${CURRENT_LINK.label}</span>
          <span class="hidden sm:block font-serif text-lg lg:text-xl font-bold tracking-wide leading-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 truncate">${escapeHtml(TEXT.title)}</span>
          <span class="hidden sm:block text-xs text-slate-400 font-mono truncate">${escapeHtml(TEXT.subtitle)}</span>
        </span>
        <svg id="pageMenuChevron" class="w-4 h-4 shrink-0 text-slate-400 transition-transform" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
        </svg>
      </button>

      <!-- Mobile: dim the page behind the full-width menu.
           The header has backdrop-blur, which makes it the containing block for fixed children,
           so the backdrop gets an explicit viewport height instead of bottom: 0. -->
      <div id="pageMenuBackdrop" class="hidden fixed inset-x-0 top-16 h-[100dvh] bg-black/60 sm:hidden" aria-hidden="true"></div>

      <div id="pageMenuList" role="menu" aria-labelledby="pageMenuButton"
           class="hidden menu-pop fixed inset-x-0 top-16 mx-3 mt-2 sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mx-0 sm:w-80
                  bg-[#151a26] border border-white/10 rounded-2xl shadow-2xl p-2 space-y-1 z-50">
        <p class="px-3 pt-1 pb-2 text-[11px] font-mono uppercase tracking-widest text-slate-500">Розділ тренажера</p>
        ${renderMenuItems()}
      </div>
    </div>`;
}

export function renderHeader() {
  return `
  <header class="sticky top-0 z-40 bg-[#10141e]/90 backdrop-blur-md border-b border-white/10 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
      ${renderPageMenu()}

      <div class="flex items-center gap-2 shrink-0">
        <div class="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold text-amber-300" title="Серія безпомилкових відповідей">
          <span>🔥</span><span id="streakCount">0</span><span class="hidden md:inline">серія</span>
        </div>
        <div class="flex items-center space-x-1.5 bg-slate-800/80 border border-white/10 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold text-slate-300" title="Точність відповідей">
          <span>🎯</span><span id="accuracyPercent">100%</span>
        </div>
        <button id="soundToggleBtn" class="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition" title="Увімкнути/вимкнути звук">
          <span id="soundIcon">🔊</span>
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#0e121a]/60">
      <nav class="flex space-x-2 sm:space-x-6 overflow-x-auto py-2.5 text-xs sm:text-sm font-medium no-scrollbar">
        <button data-mode="quiz" id="tabQuiz" class="${TAB_ACTIVE}"><span>🎯</span><span>Квіз-тренування</span></button>
        <button data-mode="flashcards" id="tabFlashcards" class="${TAB_IDLE}"><span>🗂️</span><span>Флеш-картки (<span id="flashcardCountBadge">0</span>)</span></button>
        <button data-mode="mistakes" id="tabMistakes" class="${TAB_IDLE}"><span>⚠️</span><span>Робота над помилками (<span id="mistakeCountBadge">0</span>)</span></button>
        <button data-mode="catalog" id="tabCatalog" class="${TAB_IDLE}"><span>📖</span><span>${escapeHtml(TEXT.cheatTab)}</span></button>
      </nav>
    </div>
  </header>`;
}

/* Dropdown behaviour: toggle, outside click / Esc to close, arrow-key navigation. */
export function bindPageMenu() {
  const root = document.getElementById('pageMenu');
  const button = document.getElementById('pageMenuButton');
  const list = document.getElementById('pageMenuList');
  const backdrop = document.getElementById('pageMenuBackdrop');
  const chevron = document.getElementById('pageMenuChevron');
  const items = () => [...list.querySelectorAll('[role="menuitem"]')];
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';

  function setOpen(open, { focus = false } = {}) {
    button.setAttribute('aria-expanded', String(open));
    list.classList.toggle('hidden', !open);
    backdrop.classList.toggle('hidden', !open);
    chevron.classList.toggle('rotate-180', open);
    if (open && focus) {
      (list.querySelector('[aria-current="page"]') || items()[0]).focus();
    }
  }

  button.addEventListener('click', () => setOpen(!isOpen(), { focus: !isOpen() }));
  backdrop.addEventListener('click', () => setOpen(false));

  document.addEventListener('click', event => {
    if (isOpen() && !root.contains(event.target)) setOpen(false);
  });

  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true, { focus: true });
    }
  });

  list.addEventListener('keydown', event => {
    const all = items();
    const index = all.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      all[(index + 1) % all.length].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      all[(index - 1 + all.length) % all.length].focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      all[0].focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      all[all.length - 1].focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });
}
