/* "Тренажер" (bottom navigation): a sheet to choose which quiz to take — wine, bar, cocktails or kitchen.
   The current section opens its quiz in place; another section opens its page straight in quiz mode (#quiz). */
import { PAGE_LINKS, PAGES } from './pages.js';
import { PAGE_ID } from './context.js';
import { escapeHtml } from './utils.js';
import { createSheet } from './sheet.js';

export const QUIZ_HASH = '#quiz';

const sheet = createSheet({ rootId: 'trainerPicker', dialogId: 'trainerPickerDialog', stateKey: 'trainer' });

function renderOption(link) {
  const page = PAGES[link.id];
  const isCurrent = link.id === PAGE_ID;
  const topics = page.questions.map(q => q.label).join(' · ');
  return `
    <a class="trainer-option ${isCurrent ? 'is-current' : ''}" href="${link.href}${QUIZ_HASH}" data-trainer-page="${link.id}">
      <span class="trainer-option-icon" aria-hidden="true">${link.icon}</span>
      <span class="trainer-option-copy">
        <span class="trainer-option-title">${escapeHtml(link.label)}${isCurrent ? '<span class="trainer-option-badge">цей розділ</span>' : ''}</span>
        <span class="trainer-option-topics">${escapeHtml(topics)}</span>
      </span>
      <span class="trainer-option-arrow" aria-hidden="true">→</span>
    </a>`;
}

export function renderTrainerPicker() {
  return `
  <div id="trainerPicker" class="item-sheet-root" aria-hidden="true">
    <button class="item-sheet-backdrop" data-action="closeTrainerPicker" aria-label="Закрити вибір тренажера"></button>
    <section id="trainerPickerDialog" class="item-sheet trainer-picker" role="dialog" aria-modal="true" aria-labelledby="trainerPickerTitle" tabindex="-1">
      <div class="sheet-float">
        <span class="sheet-handle" aria-hidden="true"></span>
        <button type="button" data-action="closeTrainerPicker" class="sheet-close" aria-label="Закрити">✕</button>
      </div>
      <div class="trainer-picker-head">
        <p class="section-kicker">ТРЕНАЖЕР</p>
        <h2 id="trainerPickerTitle">Оберіть тест</h2>
      </div>
      <div class="trainer-picker-list">${PAGE_LINKS.map(renderOption).join('')}</div>
    </section>
  </div>`;
}

export function openTrainerPicker(trigger) {
  sheet.open(trigger);
}

export function closeTrainerPicker() {
  sheet.close();
}

/* onCurrentPage() starts the quiz of the page that is already open. */
export function bindTrainerPicker({ onCurrentPage }) {
  sheet.bind();
  document.getElementById('trainerPicker').addEventListener('click', event => {
    const option = event.target instanceof Element ? event.target.closest('[data-trainer-page]') : null;
    if (!option) return;
    event.preventDefault();
    if (option.dataset.trainerPage === PAGE_ID) {
      sheet.close();
      onCurrentPage();
    } else {
      // replace(): the history entry pushed when the picker opened is swapped for the new page,
      // so "Back" from there returns to this page instead of re-opening the picker.
      location.replace(option.getAttribute('href'));
    }
  });
}
