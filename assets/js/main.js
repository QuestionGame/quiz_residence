/* Entry point: renders the page, wires up events and loads the page's data.
   Loaded from every HTML page as <script type="module" src="./assets/js/main.js">. */
import { PAGE_ID, state, store } from './context.js';
import { requireProfile } from './auth.js';
import { loadItems } from './data.js';
import { sound } from './sound.js';
import { loadStats, resetMistakes } from './storage.js';
import { renderLayout } from './layout.js';
import { TAB_ACTIVE, TAB_IDLE } from './header.js';
import { checkQuizAnswer, initQuiz, nextQuizItem, prevQuizItem, renderCategoryFilters, restartQuiz, resumeOrRestartQuiz, setMistakeMode, startQuizForItem } from './quiz.js';
import { updateStatsUI } from './stats.js';
import { renderFlashcards } from './flashcards.js';
import { renderMistakesList } from './mistakes.js';
import { bindItemSheet, closeItemSheet, openItemSheet } from './item-sheet.js';
import { QUIZ_HASH, bindTrainerPicker, closeTrainerPicker, openTrainerPicker } from './trainer-picker.js';
import { bindAccount, closeAccount, openAccount, signOut } from './account.js';

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
  window.scrollTo({ top: 0 });
}

function clearMistakes() {
  state.stats.mistakesSet.clear();
  updateStatsUI();
  resetMistakes();
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
  prevQuizItem,
  checkQuizAnswer,
  nextQuizItem,
  restartQuiz,
  startMistakesQuiz,
  clearMistakes,
  closeItemSheet,
  trainCurrentItem,
  openTrainerPicker,
  closeTrainerPicker,
  openAccount,
  closeAccount,
  signOut
};

function bindEvents() {
  bindItemSheet();
  bindTrainerPicker({ onCurrentPage: () => { resumeOrRestartQuiz(); switchMode('quiz'); } });
  bindAccount();

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
  // Every page needs a signed-in, active account (otherwise → login.html).
  store.profile = await requireProfile();
  if (!store.profile) return;

  renderLayout();
  bindEvents();
  try {
    store.items = await loadItems(PAGE_ID);
    if (!store.items.length) throw new Error('у цьому розділі ще немає позицій');
    if (PAGE_ID === 'menu') {
      // Wine list for the pairing hint in the dish sheet; the page works without it.
      store.wineItems = await loadItems('wine').catch(() => []);
    }
    await loadStats();
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
    console.error('Unable to load the page data:', error);
    const status = document.getElementById('appStatus');
    status.textContent = `Не вдалося завантажити дані: ${error.message}. Перевірте інтернет і оновіть сторінку.`;
    status.classList.remove('hidden');
  }
}

// Module scripts run after the document is parsed, so the DOM is ready here.
initializeApp();
