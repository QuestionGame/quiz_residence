/* Static page shell: header + the four mode sections + footer, rendered from the page config. */
import { CONFIG, TEXT } from './context.js';
import { escapeHtml } from './utils.js';
import { renderBottomNavigation, renderHeader } from './header.js';

const SELECT_CLASS = "bg-[#1b2030] text-slate-200 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 outline-none";

function renderQuestionBlocks() {
  return CONFIG.questions.map((q, index) => `
    <div id="block-${q.key}">
      <div class="flex items-center justify-between mb-2.5">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold" data-step-number>${index + 1}</span>
          <span>${escapeHtml(q.label)}:</span>
          ${q.hint ? `<span class="normal-case tracking-normal font-normal text-slate-500">${escapeHtml(q.hint)}</span>` : ''}
        </span>
        <span id="badge-${q.key}" class="text-xs font-medium hidden"></span>
      </div>
      <div id="grid-${q.key}" class="grid ${q.cols} gap-2" role="group" aria-label="${escapeHtml(q.label)}"></div>
    </div>`).join('');
}

function renderQuizSection() {
  return `
    <section id="quizSection" class="space-y-6">
      <div class="bg-[#131722]/80 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur shadow-xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span class="text-xs font-mono uppercase tracking-widest text-amber-400">Питання <span id="quizCurrentIndex">1</span> з <span id="quizTotalCount">0</span></span>
            <h2 class="text-lg font-bold text-white flex flex-wrap items-center gap-2">
              <span>${escapeHtml(TEXT.quizHeading)}</span>
              <span id="mistakeModeIndicator" class="hidden text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-md">Режим виправлення помилок</span>
            </h2>
          </div>
          <div class="flex items-center space-x-2">
            <label for="quizCategoryFilter" class="text-xs text-slate-400 whitespace-nowrap">Фільтр меню:</label>
            <select id="quizCategoryFilter" data-change-action="onQuizFilterChange" class="${SELECT_CLASS}"></select>
          </div>
        </div>
        <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div id="quizProgressBar" class="h-full bg-gradient-to-r from-wine-500 to-amber-500 transition-all duration-300" style="width: 0%;"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 bg-gradient-to-b from-[#161a26] to-[#11141e] border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden group">
          <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-wine-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="w-full flex justify-between items-start gap-2 z-10 min-h-[1.75rem]">
            <span id="quizItemBadge" class="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-white/10 text-amber-300 border border-white/10"></span>
            <span id="quizItemMeta" class="ml-auto text-xs font-mono text-slate-400 bg-black/40 px-2 py-1 rounded border border-white/5"></span>
          </div>
          <div id="quizItemImage" class="my-6 relative flex items-center justify-center h-64 sm:h-80 w-full z-10 transition-transform duration-500 group-hover:scale-105"></div>
          <div class="text-center z-10 w-full">
            <h3 id="quizItemName" class="text-xl sm:text-2xl font-bold font-serif text-white tracking-wide break-words"></h3>
            <p class="text-xs text-slate-400 mt-1">${escapeHtml(TEXT.quizHint)}</p>
          </div>
        </div>

        <div class="lg:col-span-7 bg-[#131722]/90 border border-white/10 rounded-3xl p-5 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur">
          <div class="space-y-6">${renderQuestionBlocks()}</div>

          <div id="quizResultPanel" class="hidden mt-6 p-4 sm:p-5 rounded-2xl border border-white/10 bg-slate-900/90 text-sm space-y-3">
            <div id="resultHeaderBadge" class="font-bold text-sm flex items-center gap-1.5"></div>
            <div id="resultDetails" class="text-xs space-y-1.5 border-t border-white/10 pt-3 text-slate-300"></div>
            <div id="resultNoteBox" class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
              💡 <span class="font-semibold text-amber-300">${escapeHtml(TEXT.noteLabel)}:</span>
              <span id="resultNote"></span>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <button data-action="skipQuizItem" class="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg transition">${escapeHtml(TEXT.skip)}</button>
            <div class="flex items-center space-x-3 ml-auto">
              <button id="btnCheckAnswer" data-action="checkQuizAnswer" disabled class="px-6 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 text-slate-500 cursor-not-allowed transition shadow-lg flex items-center gap-2">
                <span>Перевірити відповідь</span><span>✓</span>
              </button>
              <button id="btnNextItem" data-action="nextQuizItem" class="hidden px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition shadow-lg flex items-center gap-2">
                <span>${escapeHtml(TEXT.next)}</span><span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderFlashcardsSection() {
  return `
    <section id="flashcardsSection" class="space-y-5">
      <div class="catalog-heading">
        <div><p class="section-kicker">${escapeHtml(TEXT.subtitle)}</p><h2 class="section-title">Меню для зміни</h2></div>
        <span class="catalog-total" id="flashcardResultCount">0 позицій</span>
      </div>
      <div id="flashcardsGrid" class="catalog-grid"></div>
      <select id="flashcardCategoryFilter" class="hidden" aria-hidden="true" tabindex="-1"></select>
    </section>`;
}

function renderMistakesSection() {
  return `
    <section id="mistakesSection" class="hidden space-y-6">
      <div class="bg-gradient-to-r from-rose-950/40 to-[#131722] border border-rose-500/20 rounded-2xl p-6 sm:p-8">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center space-x-2 text-rose-400 font-semibold text-sm"><span>⚠️</span><span>Банк помилок</span></div>
            <h2 class="text-2xl font-bold font-serif text-white mt-1">${escapeHtml(TEXT.mistakesHeading)}</h2>
            <p class="text-xs text-slate-400 mt-1 max-w-xl">${escapeHtml(TEXT.mistakesHint)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button data-action="startMistakesQuiz" id="btnStartMistakesQuiz" class="px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition flex items-center space-x-2">
              <span>Тренувати помилки (<span id="mistakeActionCount">0</span>)</span>
            </button>
            <button data-action="clearMistakes" class="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition">Очистити список</button>
          </div>
        </div>
      </div>
      <div id="mistakesListContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    </section>`;
}

function renderCatalogSection() {
  return `
    <section id="catalogSection" class="hidden space-y-6">
      <div class="bg-[#131722]/90 border border-white/10 rounded-2xl p-4 sm:p-6 overflow-hidden shadow-2xl">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 class="text-xl font-bold font-serif text-white">${escapeHtml(TEXT.cheatHeading)}</h2>
            <p class="text-xs text-slate-400">${escapeHtml(TEXT.cheatSubheading)}</p>
          </div>
          <button data-action="print" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-white/10 transition flex items-center gap-1.5">
            <span>🖨️</span><span>Друк / Експорт</span>
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] table-fixed text-left border-collapse text-xs">
            <colgroup>${CONFIG.columns.map(c => `<col style="width: ${c.width}">`).join('')}</colgroup>
            <thead>
              <tr class="border-b border-white/10 bg-slate-900/60 text-slate-400 font-mono uppercase text-[11px]">
                ${CONFIG.columns.map(c => `<th class="py-3 px-3">${escapeHtml(c.header)}</th>`).join('')}
              </tr>
            </thead>
            <tbody id="cheatSheetTableBody" class="divide-y divide-white/5 text-slate-300"></tbody>
          </table>
        </div>
      </div>
    </section>`;
}

export function renderLayout() {
  document.title = `${TEXT.title} | ${TEXT.subtitle}`;
  document.getElementById('app').innerHTML = `
  ${renderHeader()}
  <main class="residence-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
    <div id="appStatus" class="hidden mb-6 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200" role="alert"></div>
    ${renderFlashcardsSection()}
    ${renderQuizSection()}
    ${renderMistakesSection()}
    ${renderCatalogSection()}
  </main>
  <footer class="residence-footer border-t border-white/5 bg-[#0a0c11] py-4 px-4 text-center text-xs text-slate-500">
    <p>${escapeHtml(TEXT.footer)}</p>
  </footer>
  ${renderBottomNavigation()}
  <div id="itemSheet" class="item-sheet-root" aria-hidden="true">
    <button class="item-sheet-backdrop" data-action="closeItemSheet" aria-label="Закрити картку"></button>
    <section id="itemSheetDialog" class="item-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetItemName" tabindex="-1">
      <div class="sheet-handle-wrap"><span class="sheet-handle"></span></div>
      <div class="sheet-toolbar"><span id="sheetItemGroup" class="sheet-group"></span><button type="button" data-action="closeItemSheet" class="sheet-close" aria-label="Закрити">×</button></div>
      <div id="sheetContent" class="item-sheet-content"></div>
      <div class="sheet-actions"><button type="button" data-action="trainCurrentItem" class="sheet-train-button">Тренувати цю позицію <span aria-hidden="true">↗</span></button></div>
    </section>
  </div>`;
}
