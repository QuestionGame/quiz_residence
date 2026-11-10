/* Quiz mode: category filters, building answer options, checking answers. */
import { CONFIG, TEXT, groupLabel, groupOf, state, store } from './context.js';
import { escapeHtml, itemImage, shuffle, unique } from './utils.js';
import { sound } from './sound.js';
import { updateStatsUI } from './stats.js';

const formatOption = (question, value) => (question.format ? question.format(value) : value);
const asArray = value => (Array.isArray(value) ? value : value ? [value] : []);

/* Questions that have an answer for this item (others are skipped). */
export function questionsFor(item) {
  return CONFIG.questions.filter(q => asArray(q.answer(item)).length > 0);
}

/* First 5 letters of every word of 4+ letters — used to keep near-synonyms out of wrong options
   ("Пармезан" must not be a wrong option for a dish with "Сир пармезан"). */
function wordStems(text) {
  return new Set(String(text).toLowerCase().split(/[^a-zа-яіїєґ0-9]+/i).filter(w => w.length >= 4).map(w => w.slice(0, 5)));
}

/* Multi-answer (checklist) question: a sample of correct answers + wrong ones from other items.
   Returns { options, correct } where `correct` is the subset of options that is right. */
export function buildChecklist(question, item) {
  const allCorrect = asArray(question.answer(item));
  const spec = question.options;
  if (spec.all) return { options: unique([...spec.all, ...allCorrect]), correct: allCorrect };

  const correct = spec.correct === 'all' ? allCorrect : shuffle([...allCorrect]).slice(0, spec.correct || 4);
  const ownStems = wordStems(spec.similarText ? spec.similarText(item) : allCorrect.join(' '));
  const wrong = shuffle(unique(store.items.filter(other => other !== item).flatMap(other => asArray(question.answer(other)))))
    .filter(value => ![...wordStems(value)].some(stem => ownStems.has(stem)))
    .slice(0, spec.wrong || 4);
  return { options: shuffle([...correct, ...wrong]), correct };
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
  state.shownCorrect = {};

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

const SELECTED = ['bg-amber-500', 'text-slate-950', 'border-amber-400', 'font-bold'];
const UNSELECTED = ['bg-slate-800/80', 'text-slate-300'];

function setSelected(btn, selected) {
  btn.classList.remove(...(selected ? UNSELECTED : SELECTED));
  btn.classList.add(...(selected ? SELECTED : UNSELECTED));
  btn.setAttribute(btn.getAttribute('role') === 'checkbox' ? 'aria-checked' : 'aria-pressed', String(selected));
  const mark = btn.querySelector('[data-check-mark]');
  if (mark) mark.textContent = selected ? '✓' : '';
}

function renderOptions(question, item) {
  const container = document.getElementById(`grid-${question.key}`);
  container.innerHTML = "";
  let values;
  if (question.multi) {
    const { options, correct } = buildChecklist(question, item);
    state.shownCorrect[question.key] = correct;
    state.userAnswers[question.key] = new Set();
    values = options;
  } else {
    values = buildOptions(question, item);
  }

  values.forEach(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.value = value;
    btn.className = `${OPTION_BASE_CLASS} ${question.wide ? 'p-2.5 text-left' : 'text-center'}`;
    if (question.multi) {
      btn.setAttribute('role', 'checkbox');
      btn.setAttribute('aria-checked', 'false');
      btn.classList.add('flex', 'items-center', 'gap-2', 'min-h-[44px]');
      btn.innerHTML = `
        <span data-check-mark class="w-4 h-4 shrink-0 rounded border border-current flex items-center justify-center text-[11px] leading-none" aria-hidden="true"></span>
        <span class="flex-1">${escapeHtml(formatOption(question, value))}</span>
        <span data-result-note class="hidden text-[10px] font-semibold uppercase tracking-wide"></span>`;
    } else {
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = formatOption(question, value);
    }
    btn.onclick = () => selectOption(question, value, btn);
    container.appendChild(btn);
  });
}

function selectOption(question, value, btn) {
  if (state.answerChecked) return;
  sound.playClick();
  if (question.multi) {
    const chosen = state.userAnswers[question.key];
    if (chosen.has(value)) chosen.delete(value); else chosen.add(value);
    setSelected(btn, chosen.has(value));
  } else {
    state.userAnswers[question.key] = value;
    document.querySelectorAll(`#grid-${question.key} .option-btn`).forEach(b => setSelected(b, false));
    setSelected(btn, true);
  }
  validateCanCheck();
}

const isAnswered = q => (q.multi ? state.userAnswers[q.key]?.size > 0 : Boolean(state.userAnswers[q.key]));
/* Optional questions (e.g. allergens) never block checking and never count towards the score. */
const allAnswered = () => state.activeQuestions.filter(q => !q.optional).every(isAnswered);

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

/* Colours options after checking. Works for single answers and checklists:
   picked & right → green, picked & wrong → red, missed right answer → dashed green "пропущено". */
function markOptions(question, correctValues, chosenValues) {
  const correct = new Set(correctValues);
  const chosen = new Set(chosenValues);
  document.querySelectorAll(`#grid-${question.key} .option-btn`).forEach(b => {
    b.disabled = true;
    const value = b.dataset.value;
    const note = b.querySelector('[data-result-note]');
    const setNote = text => { if (note) { note.textContent = text; note.classList.remove('hidden'); } };
    if (correct.has(value) && (chosen.has(value) || !question.multi)) {
      b.classList.add('!bg-emerald-600', '!text-white', '!border-emerald-400');
    } else if (correct.has(value)) {
      b.classList.add('!border-emerald-400', '!border-dashed', '!text-emerald-300');
      setNote('пропущено');
    } else if (chosen.has(value)) {
      b.classList.add('!bg-rose-600', '!text-white', '!border-rose-400');
      setNote('зайве');
    } else {
      b.classList.add('opacity-50');
    }
  });
}

/* Result for one question: { correct, chosen, isCorrect } */
function evaluate(question, item) {
  if (question.multi) {
    const correct = state.shownCorrect[question.key];
    const chosen = [...state.userAnswers[question.key]];
    const isCorrect = chosen.length === correct.length && chosen.every(v => correct.includes(v));
    return { correct, chosen, isCorrect };
  }
  const correct = question.answer(item);
  const chosen = state.userAnswers[question.key];
  return { correct: [correct], chosen: [chosen], isCorrect: chosen === correct };
}

function setBadgeStatus(elementId, isCorrect, optional = false) {
  const el = document.getElementById(elementId);
  const color = isCorrect ? 'text-emerald-400' : optional ? 'text-amber-400' : 'text-rose-400';
  const text = isCorrect ? '✓ Вірно' : optional ? '△ Не все — на результат не впливає' : '✕ Помилка';
  el.className = `text-xs font-semibold flex items-center gap-1 text-right ${color}`;
  el.innerHTML = `<span>${text}</span>`;
}

export function checkQuizAnswer() {
  const item = state.quizPool[state.currentIndex];
  if (!item || state.answerChecked || !allAnswered()) return;
  state.answerChecked = true;

  let isAllCorrect = true;
  state.activeQuestions.forEach(question => {
    const { correct, chosen, isCorrect } = evaluate(question, item);
    if (!isCorrect && !question.optional) isAllCorrect = false;
    markOptions(question, correct, chosen);
    setBadgeStatus(`badge-${question.key}`, isCorrect, question.optional);
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
    const value = question.result
      ? question.result(item)
      : asArray(question.answer(item)).map(v => formatOption(question, v)).join(', ');
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
