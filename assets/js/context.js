/* Shared context: which page is open, its config, loaded items and runtime state. */
import { PAGES } from './pages.js';

export const PAGE_ID = document.body.dataset.page;
export const CONFIG = PAGES[PAGE_ID];
export const TEXT = CONFIG.text;

/* Loaded menu items (filled once in main.js). Kept in an object so modules share one array. */
export const store = { items: [] };

export const state = {
  quizPool: [],
  quizFilter: 'ALL',
  currentIndex: 0,
  answerChecked: false,
  activeQuestions: [],
  userAnswers: {},
  stats: {
    answeredTotal: 0,
    correctTotal: 0,
    streak: 0,
    mistakesSet: new Set() // Set of item IDs
  },
  mistakesModeActive: false
};

export const groupOf = item => item[CONFIG.groupField];
export const groupLabel = group => (CONFIG.groupLabels && CONFIG.groupLabels[group]) || group;
