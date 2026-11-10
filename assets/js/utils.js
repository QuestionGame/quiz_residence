/* Small shared helpers. */
import { CONFIG } from './context.js';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

/* Unbiased Fisher–Yates shuffle (in place) */
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export const unique = values => [...new Set(values.filter(Boolean))];

/* Item photo, or the page's emoji placeholder when there is no photo. */
export function itemImage(item, className, placeholderClass) {
  if (item.image) {
    return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="${className}" loading="lazy">`;
  }
  return `<div class="${placeholderClass} flex items-center justify-center text-6xl opacity-60" aria-hidden="true">${CONFIG.placeholderIcon}</div>`;
}
