/* Shared mobile-first header and persistent primary navigation. */
import { PAGE_LINKS } from './pages.js';
import { CONFIG, PAGE_ID, TEXT } from './context.js';
import { escapeHtml } from './utils.js';

export const TAB_ACTIVE = "px-3.5 py-1.5 rounded-lg flex items-center space-x-2 whitespace-nowrap transition bg-wine-600/40 text-amber-300 border border-wine-500/50 shadow-sm";
export const TAB_IDLE = "px-3.5 py-1.5 rounded-lg flex items-center space-x-2 whitespace-nowrap transition text-slate-400 hover:text-white hover:bg-white/5 border border-transparent";

export function renderHeader() {
  return `
  <header id="siteHeader" class="residence-header">
    <div class="residence-header-main">
      <a class="residence-brand" href="./index.html" aria-label="Residence — головна">
        <span class="residence-monogram" aria-hidden="true">R</span>
        <span class="residence-brand-copy"><span class="residence-eyebrow">STAFF EDITION</span><span class="residence-brand-title">Residence</span><span class="residence-brand-subtitle">${escapeHtml(TEXT.subtitle)}</span></span>
      </a>
      <div class="residence-status">
        <span class="status-pill" title="Серія відповідей"><span aria-hidden="true">✦</span><span id="streakCount">0</span></span>
        <span class="status-pill status-accuracy" title="Точність"><span aria-hidden="true">◎</span><span id="accuracyPercent">100%</span></span>
        <button id="soundToggleBtn" class="sound-button" type="button" title="Увімкнути або вимкнути звук" aria-label="Увімкнути або вимкнути звук"><span id="soundIcon">♪</span></button>
      </div>
    </div>

    <div class="residence-search-area">
      <label class="search-field" for="flashcardSearch">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.2 4.2"></path></svg>
        <input id="flashcardSearch" data-input-action="renderFlashcards" type="search" placeholder="${escapeHtml(TEXT.searchPlaceholder.replace(/^🔍\s*/, ''))}" autocomplete="off" />
        <kbd class="search-shortcut" aria-hidden="true">⌕</kbd>
      </label>
      <div id="categoryChips" class="category-chips no-scrollbar" role="toolbar" aria-label="Швидкі фільтри"></div>
    </div>

    <nav class="mode-nav no-scrollbar" aria-label="Режим сторінки">
      <button data-mode="flashcards" id="tabFlashcards" class="${TAB_ACTIVE}"><span>Каталог</span><span class="mode-count" id="flashcardCountBadge">0</span></button>
      <button data-mode="quiz" id="tabQuiz" class="${TAB_IDLE}"><span>Тренування</span></button>
      <button data-mode="mistakes" id="tabMistakes" class="${TAB_IDLE}"><span>Помилки</span><span class="mode-count" id="mistakeCountBadge">0</span></button>
      <button data-mode="catalog" id="tabCatalog" class="${TAB_IDLE}"><span>${escapeHtml(TEXT.cheatTab)}</span></button>
    </nav>
  </header>`;
}

export function renderBottomNavigation() {
  return `
    <nav id="primaryBottomNav" class="bottom-navigation" aria-label="Основні розділи">
      ${PAGE_LINKS.map(link => `
        <a class="bottom-nav-item ${link.id === PAGE_ID ? 'is-current' : ''}" href="${link.href}" ${link.id === PAGE_ID ? 'aria-current="page"' : ''}>
          <span class="bottom-nav-icon" aria-hidden="true">${link.icon}</span><span>${link.label}</span>
        </a>`).join('')}
      <button class="bottom-nav-item trainer-nav-item" data-mode="quiz" data-trainer-tab type="button" aria-label="Відкрити тренажер">
        <span class="bottom-nav-icon trainer-icon" aria-hidden="true">✦</span><span>Тренажер</span>
      </button>
    </nav>`;
}
