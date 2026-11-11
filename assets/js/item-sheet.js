/* Item detail sheet shared by every catalog (wine, bar, cocktails, kitchen).
   Bottom sheet on phones (swipe down / Back button / Esc closes it), centered dialog on desktop. */
import { CONFIG, PAGE_ID, store } from './context.js';
import { escapeHtml, itemImage } from './utils.js';
import { createSheet } from './sheet.js';

const sheet = createSheet({ rootId: 'itemSheet', dialogId: 'itemSheetDialog', stateKey: 'item' });

/* ------------------------------------------------------------ sections */

function renderComposition(item) {
  const groups = (CONFIG.cardSections ? CONFIG.cardSections(item) : [])
    .map(group => ({ ...group, values: [...new Set((group.values || []).filter(Boolean))] }))
    .filter(group => group.values.length);
  if (!groups.length) return '';
  return `
    <section class="sheet-section">
      <div class="sheet-section-heading"><span class="section-kicker">COMPOSITION</span><h3>${escapeHtml(CONFIG.text.compositionTitle || 'Склад')}</h3></div>
      ${groups.map(group => `
        <div class="ingredient-group">
          <span class="ingredient-group-label">${escapeHtml(group.label)}</span>
          <div class="ingredient-tags">${group.values.map(tag => `<span class="ingredient-tag">${escapeHtml(tag)}</span>`).join('')}</div>
        </div>`).join('')}
    </section>`;
}

/* Kitchen only: allergens derived from the dish composition (scripts/kitchen.mjs) — always to be confirmed with the kitchen. */
function renderAllergens(item) {
  if (!Array.isArray(item.allergens)) return '';
  const rows = item.allergens.length
    ? `<ul class="allergen-list">${item.allergens.map(name => `
        <li><strong>${escapeHtml(name)}</strong>${item.allergenSources?.[name]?.length ? ` — ${escapeHtml(item.allergenSources[name].join(', '))}` : ''}</li>`).join('')}</ul>`
    : '<p>Основних алергенів у складі не знайдено.</p>';
  return `
    <section class="sheet-warning" aria-label="Алергени">
      <span class="sheet-warning-icon" aria-hidden="true">!</span>
      <div>
        <h3>Алергени</h3>
        ${rows}
        <p>Визначено автоматично за складом страви. Перед відповіддю гостю з алергією обов’язково уточніть на кухні.</p>
      </div>
    </section>`;
}

/* Kitchen only: an indicative wine suggestion from the wine list, by the dish's character. */
function pairingProfile(item) {
  const text = `${item.name} ${item.group} ${(item.ingredients || []).join(' ')}`.toLocaleLowerCase('uk');
  if (/десерт|сирник|млинц|морозив|шоколад|фондан|медовик|штрудель|чізкейк|тірамісу|наполеон/.test(text)) {
    return {
      reason: 'Солодке вино підтримує десерт і не губиться поруч із його насиченістю.',
      names: ['Remparts De Bastor Lamontagne 2022', "Porto Fine Ruby, Maynard's", 'Asti, Zonin']
    };
  }
  if (/ялович|теля|стейк|рібай|кач|пастрам|бургер|реберц|свин|баранин/.test(text)) {
    return {
      reason: 'Структурне червоне пасує до виразного м’ясного смаку.',
      names: ['Amarone della Valpolicella Classico 2022, Zeni', 'Catena Alta Malbec 2022, Catena Zapata', 'Chateau Grange-Neuve 2020']
    };
  }
  if (/риба|лосос|тунц|тунець|дорадо|кревет|міді|кальмар|оселед|форел|салат|халумі/.test(text)) {
    return {
      reason: 'Свіже біле або ігристе підкреслює делікатний смак і кислотність страви.',
      names: ['Sancerre 2023, Sauvion Les Fondettes', 'Chablis, Domaine Du Colombier', 'Cava Brut Nature Reserva Vintage 2022, Jaume Serra']
    };
  }
  return {
    reason: 'Легке біле або ігристе — універсальний початок до цієї позиції.',
    names: ['Cava Brut Nature Reserva Vintage 2022, Jaume Serra', "Pinot Grigio, Pete's Pure", 'Sauvignon Blanc, Marlborough Sun']
  };
}

function renderPairings(item) {
  if (PAGE_ID !== 'menu' || !store.wineItems?.length) return '';
  const profile = pairingProfile(item);
  const wines = profile.names.map(name => store.wineItems.find(wine => wine.name === name)).filter(Boolean).slice(0, 2);
  if (!wines.length) return '';
  return `
    <section class="sheet-section pairing-section">
      <div class="sheet-section-heading"><span class="section-kicker">SOMMELIER NOTE</span><h3>Орієнтовна пара з винної карти</h3></div>
      <p class="pairing-reason">${escapeHtml(profile.reason)}</p>
      <div class="pairing-list">${wines.map(wine => `
        <a class="pairing-item" href="./index.html" aria-label="Перейти до вина ${escapeHtml(wine.name)}">
          ${itemImage(wine, 'pairing-image', 'pairing-image pairing-image-empty')}
          <span><strong>${escapeHtml(wine.name)}</strong><small>${escapeHtml(wine.classificationGeneral)} · ${escapeHtml(wine.grapes)}</small></span>
          <span class="pairing-arrow" aria-hidden="true">↗</span>
        </a>`).join('')}</div>
    </section>`;
}

/* --------------------------------------------------------- open / close */

export function openItemSheet(itemId, trigger) {
  const item = store.items.find(entry => entry.id === itemId);
  if (!item) return;
  const root = document.getElementById('itemSheet');
  const dialog = document.getElementById('itemSheetDialog');

  const details = CONFIG.details.map(detail => `
    <div class="detail-row ${detail.accent ? 'detail-row-accent' : ''}">
      <dt>${escapeHtml(detail.label)}</dt><dd>${escapeHtml(detail.value(item))}</dd>
    </div>`).join('');
  const notes = CONFIG.notes(item);
  // Wine / bar / cocktails: the tasting note is the lead. Kitchen: the menu description goes in its own section.
  const lead = PAGE_ID !== 'menu' && notes ? `<p class="sheet-lead">${escapeHtml(notes)}</p>` : '';
  const menuNotes = PAGE_ID === 'menu' && notes
    ? `<section class="sheet-section"><div class="sheet-section-heading"><span class="section-kicker">SERVICE NOTES</span><h3>Опис і подача з меню</h3></div><p class="sheet-service-notes">${escapeHtml(notes)}</p></section>`
    : '';

  root.dataset.itemId = item.id;
  // Full-bleed 16:10 photo at the top of the sheet (none for items without a photo).
  const media = document.getElementById('sheetMedia');
  media.innerHTML = item.image ? itemImage(item, 'sheet-media-image', 'sheet-media-image') : '';
  media.hidden = !item.image;
  dialog.classList.toggle('has-media', Boolean(item.image));

  document.getElementById('sheetContent').innerHTML = `
    <div class="sheet-hero">
      <p class="sheet-overline">
        <span class="sheet-group">${escapeHtml(CONFIG.cardBadge(item) || CONFIG.text.subtitle)}</span>
        <span class="sheet-price">${escapeHtml(CONFIG.cardCorner(item) || '')}</span>
      </p>
      <h2 id="sheetItemName">${escapeHtml(item.name)}</h2>
      ${lead}
    </div>
    <dl class="sheet-details">${details}</dl>
    ${renderComposition(item)}
    ${menuNotes}
    ${renderAllergens(item)}
    ${renderPairings(item)}`;

  sheet.open(trigger);
}

export function closeItemSheet() {
  sheet.close();
}

export function bindItemSheet() {
  sheet.bind();
}
