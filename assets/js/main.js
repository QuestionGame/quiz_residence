/* Entry point: renders the page, wires up events and loads the page's data.
   Loaded from every HTML page as <script type="module" src="./assets/js/main.js">. */
import { CONFIG, PAGE_ID, state, store } from './context.js';
import { sound } from './sound.js';
import { loadStats } from './storage.js';
import { renderLayout } from './layout.js';
import { TAB_ACTIVE, TAB_IDLE } from './header.js';
import { checkQuizAnswer, initQuiz, nextQuizItem, onQuizFilterChange, renderCategoryFilters, setMistakeMode, startQuizForItem } from './quiz.js';
import { updateStatsUI } from './stats.js';
import { renderFlashcards } from './flashcards.js';
import { renderMistakesList } from './mistakes.js';
import { bindItemSheet, closeItemSheet, openItemSheet } from './item-sheet.js';
import { QUIZ_HASH, bindTrainerPicker, closeTrainerPicker, openTrainerPicker } from './trainer-picker.js';

/* ------------------------------------------------------- mode switching */

/* The quiz has no top tab: it is opened by "Тренажер" in the bottom navigation. */
const TABS = [
  { id: 'tabFlashcards', section: 'flashcardsSection', mode: 'flashcards' },
  { id: null, section: 'quizSection', mode: 'quiz' },
  { id: 'tabMistakes', section: 'mistakesSection', mode: 'mistakes' }
];

let currentMode = 'flashcards';

export function switchMode(newMode, playSound = true) {
  if (playSound) sound.playClick();
  currentMode = newMode;
  TABS.forEach(t => {
    const isActive = t.mode === newMode;
    document.getElementById(t.section).classList.toggle('hidden', !isActive);
    if (t.id) {
      const tab = document.getElementById(t.id);
      tab.className = isActive ? TAB_ACTIVE : TAB_IDLE;
      tab.setAttribute('aria-pressed', String(isActive));
    }
  });
  document.querySelector('[data-trainer-tab]')?.classList.toggle('is-mode-active', newMode === 'quiz');

  if (newMode === 'flashcards') renderFlashcards();
  else if (newMode === 'mistakes') renderMistakesList();
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

function trainCurrentItem() {
  const itemId = document.getElementById('itemSheet').dataset.itemId;
  closeItemSheet();
  if (startQuizForItem(itemId)) switchMode('quiz');
}

function selectCategoryChip(chip) {
  document.getElementById('flashcardCategoryFilter').value = chip.dataset.categoryFilter;
  document.querySelectorAll('[data-category-filter]').forEach(other => {
    other.classList.toggle('is-selected', other === chip);
    other.setAttribute('aria-pressed', String(other === chip));
  });
  if (currentMode !== 'flashcards') switchMode('flashcards', false);
  else renderFlashcards();
}

/* ------------------------------------------------------------- events */

const ACTIONS = {
  skipQuizItem: nextQuizItem,
  checkQuizAnswer,
  nextQuizItem,
  startMistakesQuiz,
  clearMistakes,
  closeItemSheet,
  trainCurrentItem,
  openTrainerPicker,
  closeTrainerPicker
};

function bindEvents() {
  bindItemSheet();
  bindTrainerPicker({ onCurrentPage: () => switchMode('quiz') });

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const categoryChip = target.closest('[data-category-filter]');
    if (categoryChip) return selectCategoryChip(categoryChip);
    const itemCard = target.closest('[data-item-open]');
    if (itemCard) return openItemSheet(itemCard.dataset.itemOpen, itemCard);
    const modeButton = target.closest('[data-mode]');
    if (modeButton) switchMode(modeButton.dataset.mode);
    const actionButton = target.closest('[data-action]');
    if (actionButton) ACTIONS[actionButton.dataset.action]?.();
  });

  document.addEventListener('change', event => {
    if (event.target.dataset.changeAction === 'onQuizFilterChange') onQuizFilterChange();
  });

  // The search field lives in the header on every mode, but it filters the catalog — show the catalog while typing.
  document.addEventListener('input', event => {
    if (event.target.dataset.inputAction !== 'renderFlashcards') return;
    if (currentMode !== 'flashcards') switchMode('flashcards', false);
    else renderFlashcards();
  });

  document.getElementById('soundToggleBtn').addEventListener('click', () => {
    sound.muted = !sound.muted;
    document.getElementById('soundIcon').textContent = sound.muted ? '🔇' : '♪';
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
      // Wine list for the pairing hint in the dish sheet; the page works without it.
      store.wineItems = await fetch('./data/wines.json')
        .then(result => (result.ok ? result.json() : []))
        .catch(() => []);
    }
    loadStats();
    renderCategoryFilters();
    initQuiz();
    updateStatsUI();
    // Opened from the trainer picker of another section (e.g. bar.html#quiz): start in the quiz.
    if (location.hash === QUIZ_HASH) {
      history.replaceState(null, '', location.pathname + location.search);
      switchMode('quiz', false);
    } else {
      switchMode('flashcards', false);
    }
  } catch (error) {
    console.error(`Unable to load ${CONFIG.dataUrl}:`, error);
    const status = document.getElementById('appStatus');
    status.textContent = `Не вдалося завантажити ${CONFIG.dataUrl.replace('./', '')}. Запустіть сторінку через локальний вебсервер (наприклад, Live Server) і оновіть її.`;
    status.classList.remove('hidden');
  }
}

// Module scripts run after the document is parsed, so the DOM is ready here.
initializeApp();
