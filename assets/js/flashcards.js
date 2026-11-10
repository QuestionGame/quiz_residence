/* Flashcards mode: searchable grid of flip cards. */
import { CONFIG, PAGE_ID, groupOf, store } from './context.js';
import { escapeHtml, formatItemCount, itemImage } from './utils.js';
import { sound } from './sound.js';

function renderCard(item) {
  const tags = PAGE_ID === 'wine'
    ? [item.country, item.grapes, item.classificationGeneral || item.classification]
    : PAGE_ID === 'menu'
      ? String(item.composition || '').split(/[,;]+/).map(value => value.trim()).filter(Boolean).slice(0, 3)
      : PAGE_ID === 'cocktails'
        ? [item.base, item.group, ...String(item.ingredients || '').split(/[,;]+/).map(value => value.trim()).filter(Boolean).slice(0, 2)]
        : [item.type, item.country, item.style];
  const image = item.image
    ? `<span class="menu-card-media">${itemImage(item, 'menu-card-image', 'menu-card-image')}<span class="menu-card-open" aria-hidden="true">↗</span></span>`
    : '';
  return `
    <button type="button" class="menu-card ${item.image ? 'has-image' : 'no-image'}" data-item-open="${escapeHtml(item.id)}" aria-haspopup="dialog" aria-label="Відкрити картку: ${escapeHtml(item.name)}">
      ${image}
      <span class="menu-card-content">
        <span class="menu-card-overline"><span>${escapeHtml(CONFIG.cardBadge(item) || CONFIG.text.subtitle)}</span><strong>${escapeHtml(CONFIG.cardCorner(item) || '')}</strong></span>
        <span class="menu-card-name">${escapeHtml(item.name)}</span>
        ${PAGE_ID === 'menu' && item.weight ? `<span class="menu-card-weight">${escapeHtml(item.weight)}</span>` : ''}
        <span class="menu-card-tags">${[...new Set(tags.filter(Boolean))].slice(0, 3).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</span>
      </span>
    </button>`;
}

export function renderFlashcards() {
  const container = document.getElementById('flashcardsGrid');
  const search = (document.getElementById('flashcardSearch').value || "").toLowerCase().trim();
  const filter = document.getElementById('flashcardCategoryFilter').value;

  const filtered = store.items.filter(item => {
    const matchesCategory = filter === 'ALL' || groupOf(item) === filter;
    const matchesSearch = !search ||
      CONFIG.searchFields.some(field => String(item[field] || '').toLowerCase().includes(search));
    return matchesCategory && matchesSearch;
  });
  document.getElementById('flashcardCountBadge').textContent = filtered.length;
  document.getElementById('flashcardResultCount').textContent = formatItemCount(filtered.length);

  container.innerHTML = filtered.length
    ? filtered.map(renderCard).join('')
    : `
      <div class="col-span-full py-16 text-center text-slate-500">
        <span class="text-3xl block mb-2">🔍</span>
        <p>За вашим запитом нічого не знайдено</p>
      </div>`;
}

export function toggleCardFlip(element) {
  sound.playClick();
  const flipped = element.classList.toggle('is-flipped');
  element.setAttribute('aria-pressed', String(flipped));
}
