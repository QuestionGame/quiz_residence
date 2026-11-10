/* Cheat sheet mode: printable table of every item. */
import { CONFIG, store } from './context.js';
import { escapeHtml } from './utils.js';

function highlightDot(item) {
  if (!CONFIG.highlight) return '';
  const color = CONFIG.highlight(item) ? 'bg-amber-400' : 'bg-wine-500';
  return `<span class="mt-1 w-2 h-2 shrink-0 rounded-full ${color}"></span>`;
}

function renderCell(col, item) {
  const value = escapeHtml(col.value(item));
  if (col.name) {
    return `<td class="py-3 px-3 align-top font-semibold text-white"><div class="flex items-start gap-2">${highlightDot(item)}<span>${value}</span></div></td>`;
  }
  const cls = col.notes ? 'text-slate-400 italic whitespace-normal break-words leading-relaxed'
    : col.accent ? 'font-medium text-amber-300'
    : col.mono ? 'text-slate-400 font-mono'
    : 'text-slate-200';
  return `<td class="py-3 px-3 align-top ${cls}">${value}</td>`;
}

export function renderCheatSheet() {
  document.getElementById('cheatSheetTableBody').innerHTML = store.items.map(item => `
    <tr class="hover:bg-white/5 transition">
      ${CONFIG.columns.map(col => renderCell(col, item)).join('')}
    </tr>`).join('');
}
