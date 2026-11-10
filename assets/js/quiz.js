/* Quiz mode: category filters, building answer options, checking answers. */
import { CONFIG, TEXT, groupLabel, groupOf, state, store } from './context.js';
import { escapeHtml, itemImage, shuffle, unique } from './utils.js';
import { sound } from './sound.js';
import { updateStatsUI } from './stats.js';

const formatOption = (question, value) => (question.format ? question.format(value) : value);

/* Questions that have an answer for this item (others are skipped). */
export function questionsFor(item) {
  return CONFIG.questions.filter(q => q.answer(item));
}

/* Correct answer + wrong ones, using the strategy from question.options (see pages.js). */
export function buildOptions(question, item) {
  const correct = question.answer(item);
  const spec = question.options;
  if (spec.all) return unique([...spec.all, correct]);

  const count = spec.count || 4;
  let candidates;
  if (spec.distractors) {
    candidates = spec.distractors(item) || [];
  } else {
    const tiers = (spec.pool || []).map(field =>
      shuffle(unique(store.items.filter(other => other[field] === item[field]).map(question.answer))));
    if (spec.pool) tiers.push(shuffle(unique(store.items.map(question.answer))));
    if (spec.list) tiers.push(shuffle([...spec.list]));
    candidates = tiers.flat();
  }
  const picks = unique(candidates).filter(value => value !== correct).slice(0, count - 1);
  return shuffle([correct, ...picks]);
}

/* ---------------------------------------------------------- filters */

export function renderCategoryFilters() {
  const counts = new Map();
  store.items.forEach(item => counts.set(groupOf(item), (counts.get(groupOf(item)) || 0) + 1));

  const quizSelect = document.getElementById('quizCategoryFilter');
  const flashSelect = document.getElementById('flashcardCategoryFilter');
  quizSelect.innerHTML = `<option value="ALL">${escapeHtml(TEXT.allItems)} (${store.items.length})</option>`;
  flashSelect.innerHTML = `<option value="ALL">Всі категорії</option>`;

  counts.forEach((count, group) => {
    quizSelect.add(new Option(`${groupLabel(group)} (${count})`, group));
    flashSelect.add(new Option(groupLabel(group), group));
  });

  document.getElementById('flashcardCountBadge').textContent = store.items.length;
}

/* ---------------------------------------------------------- quiz flow */

export function initQuiz() {
  applyFilterToPool();
  state.currentIndex = 0;
  loadQuizQuestion();
}

export function setMistakeMode(active) {
  state.mistakesModeActive = active;
  document.getElementById('mistakeModeIndicator').classList.toggle('hidden', !active);
}

function applyFilterToPool() {
  if (state.mistakesModeActive) {
    state.quizPool = store.items.filter(item => state.stats.mistakesSet.has(item.id));
    if (state.quizPool.length === 0) {
      setMistakeMode(false);
      state.quizPool = [...store.items];
    }
  } else if (state.quizFilter === 'ALL') {
    state.quizPool = [...store.items];
  } else {
    state.quizPool = store.items.filter(item => groupOf(item) === state.quizFilter);
  }
  shuffle(state.quizPool);
}

export function onQuizFilterChange() {
  state.quizFilter = document.getElementById('quizCategoryFilter').value;
  setMistakeMode(false);
  initQuiz();
}

function loadQuizQuestion() {
  const item = state.quizPool[state.currentIndex];
  if (!item) {
    state.currentIndex = 0;
    return;
  }

  state.answerChecked = false;
  state.activeQuestions = questionsFor(item);
  state.userAnswers = {};

  document.getElementById('quizCurrentIndex').textContent = state.currentIndex + 1;
  document.getElementById('quizTotalCount').textContent = state.quizPool.length;
  document.getElementById('quizProgressBar').style.width = `${((state.currentIndex + 1) / state.quizPool.length) * 100}%`;

  const badge = CONFIG.quizBadge(item);
  const meta = CONFIG.quizMeta(item);
  const badgeEl = document.getElementById('quizItemBadge');
  const metaEl = document.getElementById('quizItemMeta');
  badgeEl.textContent = badge;
  badgeEl.classList.toggle('hidden', !badge);
  metaEl.textContent = meta;
  metaEl.classList.toggle('hidden', !meta);
  document.getElementById('quizItemName').textContent = item.name;
  document.getElementById('quizItemImage').innerHTML = itemImage(item,
    'h-full w-full object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] rounded-2xl',
    'h-full w-full');

  document.getElementById('quizResultPanel').classList.add('hidden');
  document.getElementById('btnCheckAnswer').classList.remove('hidden');
  document.getElementById('btnNextItem').classList.add('hidden');
  validateCanCheck();

  let step = 0;
  CONFIG.questions.forEach(question => {
    const block = document.getElementById(`block-${question.key}`);
    const isActive = state.activeQuestions.includes(question);
    block.classList.toggle('hidden', !isActive);
    resetBadge(`badge-${question.key}`);
    if (!isActive) return;
    block.querySelector('[data-step-number]').textContent = ++step;
    renderOptions(question, item);
  });
}

function resetBadge(id) {
  const el = document.getElementById(id);
  el.className = "text-xs font-medium hidden";
  el.innerHTML = "";
}

const OPTION_BASE_CLASS = "option-btn p-2 text-xs font-medium rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-700/80 hover:border-amber-500/40 text-slate-300 transition active:scale-95 disabled:cursor-default disabled:active:scale-100";

function renderOptions(question, item) {
  const container = document.getElementById(`grid-${question.key}`);
  container.innerHTML = "";
  buildOptions(question, item).forEach(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.value = value;
    btn.className = `${OPTION_BASE_CLASS} ${question.wide ? 'p-2.5 text-left' : 'text-center'}`;
    btn.textContent = formatOption(question, value);
    btn.onclick = () => selectOption(question, value, btn);
    container.appendChild(btn);
  });
}

function selectOption(question, value, btn) {
  if (state.answerChecked) return;
  sound.playClick();
  state.userAnswers[question.key] = value;
  document.querySelectorAll(`#grid-${question.key} .option-btn`).forEach(b => {
    b.classList.remove('bg-amber-500', 'text-slate-950', 'border-amber-400', 'font-bold');
    b.classList.add('bg-slate-800/80', 'text-slate-300');
  });
  btn.classList.remove('bg-slate-800/80', 'text-slate-300');
  btn.classList.add('bg-amber-500', 'text-slate-950', 'border-amber-400', 'font-bold');
  validateCanCheck();
}

const allAnswered = () => state.activeQuestions.every(q => state.userAnswers[q.key]);

const CHECK_BTN_BASE = "px-6 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg flex items-center gap-2";
const CHECK_BTN_ENABLED = "bg-gradient-to-r from-wine-600 to-amber-600 hover:from-wine-500 hover:to-amber-500 text-white cursor-pointer transform hover:-translate-y-0.5";
const CHECK_BTN_DISABLED = "bg-slate-800 text-slate-500 cursor-not-allowed";

function validateCanCheck() {
  const btn = document.getElementById('btnCheckAnswer');
  const canCheck = !state.answerChecked && allAnswered();
  const hidden = btn.classList.contains('hidden');
  btn.disabled = !canCheck;
  btn.className = `${CHECK_BTN_BASE} ${canCheck ? CHECK_BTN_ENABLED : CHECK_BTN_DISABLED}`;
  btn.classList.toggle('hidden', hidden);
}

function markOptions(question, correctValue, chosenValue) {
  document.querySelectorAll(`#grid-${question.key} .option-btn`).forEach(b => {
    b.disabled = true;
    if (b.dataset.value === correctValue) {
      b.classList.add('!bg-emerald-600', '!text-white', '!border-emerald-400');
    } else if (b.dataset.value === chosenValue) {
      b.classList.add('!bg-rose-600', '!text-white', '!border-rose-400');
    }
  });
}

function setBadgeStatus(elementId, isCorrect) {
  const el = document.getElementById(elementId);
  el.className = `text-xs font-semibold flex items-center gap-1 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`;
  el.innerHTML = isCorrect ? "<span>✓ Вірно</span>" : "<span>✕ Помилка</span>";
}

export function checkQuizAnswer() {
  const item = state.quizPool[state.currentIndex];
  if (!item || state.answerChecked || !allAnswered()) return;
  state.answerChecked = true;

  let isAllCorrect = true;
  state.activeQuestions.forEach(question => {
    const correct = question.answer(item);
    const chosen = state.userAnswers[question.key];
    const isCorrect = chosen === correct;
    if (!isCorrect) isAllCorrect = false;
    markOptions(question, correct, chosen);
    setBadgeStatus(`badge-${question.key}`, isCorrect);
  });

  state.stats.answeredTotal++;
  if (isAllCorrect) {
    sound.playCorrect();
    state.stats.correctTotal++;
    state.stats.streak++;
    state.stats.mistakesSet.delete(item.id);
  } else {
    sound.playWrong();
    state.stats.streak = 0;
    state.stats.mistakesSet.add(item.id);
  }
  updateStatsUI();

  const panel = document.getElementById('quizResultPanel');
  const header = document.getElementById('resultHeaderBadge');
  if (isAllCorrect) {
    header.innerHTML = `<span class="text-emerald-400">✨ Бездоганно! Усі відповіді правильні.</span>`;
    panel.className = "mt-6 p-4 sm:p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 text-sm space-y-3";
  } else {
    header.innerHTML = `<span class="text-rose-400">⚠️ Є неточності. Зверніть увагу на розбір нижче:</span>`;
    panel.className = "mt-6 p-4 sm:p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-sm space-y-3";
  }

  document.getElementById('resultDetails').innerHTML = state.activeQuestions.map(question => {
    const value = question.result ? question.result(item) : formatOption(question, question.answer(item));
    return `<p>${question.resultIcon} <strong class="text-white">${escapeHtml(question.resultLabel)}:</strong> <span class="text-amber-300">${escapeHtml(value)}</span></p>`;
  }).join('');

  const note = CONFIG.notes(item);
  document.getElementById('resultNote').textContent = note || '';
  document.getElementById('resultNoteBox').classList.toggle('hidden', !note);

  document.getElementById('btnCheckAnswer').classList.add('hidden');
  document.getElementById('btnNextItem').classList.remove('hidden');
}

export function nextQuizItem() {
  sound.playClick();
  state.currentIndex++;
  if (state.currentIndex >= state.quizPool.length) {
    state.currentIndex = 0;
    shuffle(state.quizPool);
  }
  loadQuizQuestion();
}
