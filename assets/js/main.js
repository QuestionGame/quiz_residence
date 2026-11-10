/* Entry point: renders the page, wires up events and loads the page's data.
   Loaded from every HTML page as <script type="module" src="./assets/js/main.js">. */
import { CONFIG, PAGE_ID, state, store } from './context.js';
import { sound } from './sound.js';
import { loadStats } from './storage.js';
import { renderLayout } from './layout.js';
import { TAB_ACTIVE, TAB_IDLE } from './header.js';
import { checkQuizAnswer, initQuiz, nextQuizItem, onQuizFilterChange, renderCategoryFilters, setMistakeMode, startQuizForItem } from './quiz.js';
import { updateStatsUI } from './stats.js';
import { renderFlashcards, toggleCardFlip } from './flashcards.js';
import { renderMistakesList } from './mistakes.js';
import { renderCheatSheet } from './cheatsheet.js';
import { bindItemSheetGestures, closeItemSheet, openItemSheet } from './item-sheet.js';

/* ------------------------------------------------------- mode switching */

const TABS = [
  { id: 'tabQuiz', section: 'quizSection', mode: 'quiz' },
  { id: 'tabFlashcards', section: 'flashcardsSection', mode: 'flashcards' },
  { id: 'tabMistakes', section: 'mistakesSection', mode: 'mistakes' },
  { id: 'tabCatalog', section: 'catalogSection', mode: 'catalog' }
];

export function switchMode(newMode, playSound = true) {
  if (playSound) sound.playClick();
  TABS.forEach(t => {
    const isActive = t.mode === newMode;
    document.getElementById(t.section).classList.toggle('hidden', !isActive);
    document.getElementById(t.id).className = isActive ? TAB_ACTIVE : TAB_IDLE;
  });
  document.querySelector('[data-trainer-tab]')?.classList.toggle('is-mode-active', newMode === 'quiz');

  if (newMode === 'flashcards') renderFlashcards();
  else if (newMode === 'mistakes') renderMistakesList();
  else if (newMode === 'catalog') renderCheatSheet();
}

function startMistakesQuiz() {
  if (state.stats.mistakesSet.size === 0) return;
  setMistakeMode(true);
  switchMode('quiz');
  initQuiz();
}

function clearMistakes() {
  state.stats.mistakesSet.clear();
  updateStatsUI();
}

function closeSearch() {
  const search = document.getElementById('flashcardSearch');
  search.value = '';
  renderFlashcards();
  search.focus();
}

function trainCurrentItem() {
  const itemId = document.getElementById('itemSheet').dataset.itemId;
  closeItemSheet();
  if (startQuizForItem(itemId)) switchMode('quiz');
}

/* ------------------------------------------------------------- events */

const ACTIONS = {
  skipQuizItem: nextQuizItem,
  checkQuizAnswer,
  nextQuizItem,
  startMistakesQuiz,
  clearMistakes,
  print: () => window.print(),
  closeItemSheet,
  closeSearch,
  trainCurrentItem
};

function bindEvents() {
  bindItemSheetGestures();

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const categoryChip = target.closest('[data-category-filter]');
    if (categoryChip) {
      const filter = document.getElementById('flashcardCategoryFilter');
      filter.value = categoryChip.dataset.categoryFilter;
      document.querySelectorAll('[data-category-filter]').forEach(chip => {
        chip.classList.toggle('is-selected', chip === categoryChip);
        chip.setAttribute('aria-pressed', String(chip === categoryChip));
      });
      renderFlashcards();
      return;
    }
    const itemCard = target.closest('[data-item-open]');
    if (itemCard) {
      openItemSheet(itemCard.dataset.itemOpen, itemCard);
      return;
    }
    const modeButton = target.closest('[data-mode]');
    if (modeButton) switchMode(modeButton.dataset.mode);
    const actionButton = target.closest('[data-action]');
    if (actionButton) ACTIONS[actionButton.dataset.action]?.();
    const card = target.closest('[data-card-flip]');
    if (card) toggleCardFlip(card);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target instanceof Element ? event.target.closest('[data-card-flip]') : null;
    if (!card) return;
    event.preventDefault();
    toggleCardFlip(card);
  });

  document.addEventListener('change', event => {
    const action = event.target.dataset.changeAction;
    if (action === 'onQuizFilterChange') onQuizFilterChange();
    if (action === 'renderFlashcards') renderFlashcards();
  });

  document.addEventListener('input', event => {
    if (event.target.dataset.inputAction === 'renderFlashcards') renderFlashcards();
  });

  document.getElementById('soundToggleBtn').addEventListener('click', () => {
    sound.muted = !sound.muted;
    document.getElementById('soundIcon').textContent = sound.muted ? '🔇' : '🔊';
  });
}

/* -------------------------------------------------------------- start */

async function initializeApp() {
  renderLayout();
  bindEvents();
  try {
    const response = await fetch(CONFIG.dataUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const items = await response.json();
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Data is empty or invalid');
    }

    store.items = items;
    if (PAGE_ID === 'menu') {
      const [rawResponse, wineResponse] = await Promise.allSettled([
        fetch('./data/source/raw_menu.json').then(result => result.ok ? result.json() : []),
        fetch('./data/wines.json').then(result => result.ok ? result.json() : [])
      ]);
      const normalizedName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('uk').replace(/[^\p{L}\p{N}]/gu, '');
      if (rawResponse.status === 'fulfilled' && Array.isArray(rawResponse.value)) {
        const rawByName = new Map(rawResponse.value.flatMap(section => section.items || []).map(item => [normalizedName(item.name), item]));
        store.items = items.map(item => {
          const raw = rawByName.get(normalizedName(item.name));
          return raw ? { ...item, allergenCodes: raw.allergens || [], preparationTime: raw.preparationTime || 0 } : item;
        });
      }
      if (wineResponse.status === 'fulfilled' && Array.isArray(wineResponse.value)) store.wineItems = wineResponse.value;
    }
    loadStats();
    renderCategoryFilters();
    initQuiz();
    updateStatsUI();
    renderFlashcards();
    renderCheatSheet();
    switchMode('flashcards', false);
  } catch (error) {
    console.error(`Unable to load ${CONFIG.dataUrl}:`, error);
    const status = document.getElementById('appStatus');
    status.textContent = `Не вдалося завантажити ${CONFIG.dataUrl.replace('./', '')}. Запустіть сторінку через локальний вебсервер (наприклад, Live Server) і оновіть її.`;
    status.classList.remove('hidden');
  }
}

// Module scripts run after the document is parsed, so the DOM is ready here.
initializeApp();
