/* Shared mobile-first header and persistent primary navigation. */
import { PAGE_LINKS } from './pages.js';
import { PAGE_ID, TEXT } from './context.js';
import { escapeHtml } from './utils.js';
import { renderAccountButton } from './account.js';

export const TAB_ACTIVE = 'mode-tab is-active';
export const TAB_IDLE = 'mode-tab';

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
        ${renderAccountButton()}
      </div>
    </div>

    <div class="residence-search-area">
      <label class="search-field" for="flashcardSearch">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.2 4.2"></path></svg>
        <input id="flashcardSearch" data-input-action="renderFlashcards" type="search" placeholder="${escapeHtml(TEXT.searchPlaceholder.replace(/^🔍\s*/, ''))}" autocomplete="off" />
        <kbd class="search-shortcut" aria-hidden="true">⌕</kbd>
      </label>
    </div>

    <nav class="mode-nav" aria-label="Режим сторінки">
      <button type="button" data-mode="flashcards" id="tabFlashcards" class="${TAB_ACTIVE}" aria-pressed="true"><span>Каталог</span><span class="mode-count" id="flashcardCountBadge">0</span></button>
      <button type="button" data-mode="mistakes" id="tabMistakes" class="${TAB_IDLE}" aria-pressed="false"><span>Помилки</span><span class="mode-count" id="mistakeCountBadge">0</span></button>
    </nav>

    <div class="residence-chips-area">
      <div id="categoryChips" class="category-chips no-scrollbar" role="toolbar" aria-label="Швидкі фільтри"></div>
    </div>
  </header>`;
}

/* Bottom navigation: the four sections with the quiz ("Тренажер") in the middle — Вино · Бар · Тренажер · Коктейлі · Кухня. */
export function renderBottomNavigation() {
  const link = item => `
        <a class="bottom-nav-item ${item.id === PAGE_ID ? 'is-current' : ''}" href="${item.href}" ${item.id === PAGE_ID ? 'aria-current="page"' : ''}>
          <span class="bottom-nav-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span>
        </a>`;
  const middle = Math.ceil(PAGE_LINKS.length / 2);
  return `
    <nav id="primaryBottomNav" class="bottom-navigation" aria-label="Основні розділи">
      ${PAGE_LINKS.slice(0, middle).map(link).join('')}
      <button class="bottom-nav-item trainer-nav-item" data-action="openTrainerPicker" data-trainer-tab type="button" aria-haspopup="dialog" aria-label="Обрати тренажер">
        <span class="bottom-nav-icon trainer-icon" aria-hidden="true">✦</span><span>Тренажер</span>
      </button>
      ${PAGE_LINKS.slice(middle).map(link).join('')}
    </nav>`;
}
