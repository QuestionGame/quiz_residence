/* Catalog mode: searchable grid of item cards. A card opens the item sheet (item-sheet.js). */
import { CONFIG, groupOf, store } from './context.js';
import { escapeHtml, formatItemCount, itemImage } from './utils.js';

function renderCard(item) {
  const tags = [...new Set((CONFIG.cardTags ? CONFIG.cardTags(item) : []).filter(Boolean))].slice(0, 3);
  const image = item.image
    ? `<span class="menu-card-media">${itemImage(item, 'menu-card-image', 'menu-card-image')}<span class="menu-card-open" aria-hidden="true">↗</span></span>`
    : '';
  return `
    <button type="button" class="menu-card ${item.image ? 'has-image' : 'no-image'}" data-item-open="${escapeHtml(item.id)}" aria-haspopup="dialog" aria-label="Відкрити картку: ${escapeHtml(item.name)}">
      ${image}
      <span class="menu-card-content">
        <span class="menu-card-overline"><span>${escapeHtml(CONFIG.cardBadge(item) || CONFIG.text.subtitle)}</span><strong>${escapeHtml(CONFIG.cardCorner(item) || '')}</strong></span>
        <span class="menu-card-name">${escapeHtml(item.name)}</span>
        ${item.weight ? `<span class="menu-card-weight">${escapeHtml(item.weight)}</span>` : ''}
        <span class="menu-card-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</span>
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
  // The tab badge always shows the total; the heading shows how many match the search / filter.
  document.getElementById('flashcardResultCount').textContent = formatItemCount(filtered.length);

  container.innerHTML = filtered.length
    ? filtered.map(renderCard).join('')
    : `
      <div class="col-span-full py-16 text-center text-slate-500">
        <span class="text-3xl block mb-2">🔍</span>
        <p>За вашим запитом нічого не знайдено</p>
      </div>`;
}
