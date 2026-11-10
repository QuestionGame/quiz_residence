/* Interactive one-item detail sheet shared by wine, kitchen, bar and cocktail catalogs. */
import { CONFIG, PAGE_ID, store } from './context.js';
import { escapeHtml, itemImage } from './utils.js';

let returnFocus = null;

function splitList(value) {
  return String(value || '').split(/[,;\n]+/).map(part => part.trim()).filter(Boolean);
}

function itemTagGroups(item) {
  if (PAGE_ID === 'menu') {
    return [{ label: 'Склад', values: splitList(item.composition) }];
  }
  if (PAGE_ID === 'cocktails') {
    return [
      { label: 'Основа', values: [item.base] },
      { label: 'Склад коктейлю', values: splitList(item.ingredients) }
    ];
  }
  if (PAGE_ID === 'wine') {
    return [
      { label: 'Походження', values: [item.country, item.region] },
      { label: 'Сорт винограду', values: splitList(item.grapes) },
      { label: 'Стиль', values: [item.classificationGeneral || item.classification] }
    ];
  }
  return [
    { label: 'Вид напою', values: [item.type] },
    { label: 'Походження', values: [item.country] },
    { label: 'Стиль', values: [item.style] }
  ];
}

function pairingProfile(item) {
  const text = `${item.name} ${item.group} ${item.category} ${item.composition}`.toLocaleLowerCase('uk');
  if (/десерт|сирник|млинц|морозив|шоколад|фондан|медовик|штрудель/.test(text)) {
    return {
      reason: 'Солодке вино підтримує десерт і не губиться поруч із його насиченістю.',
      names: ['Remparts De Bastor Lamontagne 2022', "Porto Fine Ruby, Maynard's", 'Asti, Zonin']
    };
  }
  if (/ялович|теля|стейк|ріб|кач|пастрам|бургер|реберц|свинин|баранин/.test(text)) {
    return {
      reason: 'Структурне червоне пасує до виразного м’ясного смаку.',
      names: ['Amarone della Valpolicella Classico 2022, Zeni', 'Catena Alta Malbec 2022, Catena Zapata', 'Chateau Grange-Neuve 2020']
    };
  }
  if (/риба|лосос|тунц|дорадо|кревет|міді|морепродукт|салат|халумі/.test(text)) {
    return {
      reason: 'Свіже біле або ігристе підкреслює делікатний смак і кислотність страви.',
      names: ['Sancerre 2023, Sauvion Les Fondettes', 'Chablis, Domaine Du Colombier', 'Cava Brut Nature Reserva Vintage 2022, Jaume Serra']
    };
  }
  return {
    reason: 'Легке біле або ігристе — універсальний початок до цієї позиції.',
    names: ['Cava Brut Nature Reserva Vintage 2022, Jaume Serra', 'Pinot Grigio, Pete\'s Pure', 'Sauvignon Blanc, Marlborough Sun']
  };
}

function getPairings(item) {
  if (PAGE_ID !== 'menu' || !store.wineItems?.length) return null;
  const profile = pairingProfile(item);
  const found = profile.names
    .map(name => store.wineItems.find(wine => wine.name === name))
    .filter(Boolean)
    .slice(0, 2);
  return found.length ? { ...profile, wines: found } : null;
}

function renderAllergyNotice(item) {
  if (PAGE_ID !== 'menu') return '';
  const codes = Array.isArray(item.allergenCodes) ? item.allergenCodes.filter(Boolean) : [];
  const sourceText = codes.length
    ? 'У джерелі наведені коди алергенів без словника їх розшифрування.'
    : 'У картці немає розшифрованого переліку алергенів.';
  return `
    <section class="sheet-warning" aria-label="Попередження про алергени">
      <span class="sheet-warning-icon" aria-hidden="true">!</span>
      <div><h3>Алергени · перевірити</h3>${codes.length ? `<div class="allergen-codes">${codes.map(code => `<span>Код ${escapeHtml(code)}</span>`).join('')}</div>` : ''}<p>${escapeHtml(sourceText)} Перед подачею обов’язково уточніть склад у кухні.</p></div>
    </section>`;
}

function renderPairings(item) {
  const pairing = getPairings(item);
  if (!pairing) return '';
  return `
    <section class="sheet-section pairing-section">
      <div class="sheet-section-heading"><span class="section-kicker">SOMMELIER NOTE</span><h3>Орієнтовна пара з винної карти</h3></div>
      <p class="pairing-reason">${escapeHtml(pairing.reason)}</p>
      <div class="pairing-list">${pairing.wines.map(wine => `
        <a class="pairing-item" href="./index.html" aria-label="Перейти до вина ${escapeHtml(wine.name)}">
          ${itemImage(wine, 'pairing-image', 'pairing-image pairing-image-empty')}
          <span><strong>${escapeHtml(wine.name)}</strong><small>${escapeHtml(wine.classificationGeneral)} · ${escapeHtml(wine.grapes)}</small></span>
          <span class="pairing-arrow" aria-hidden="true">↗</span>
        </a>`).join('')}</div>
    </section>`;
}

export function openItemSheet(itemId, trigger) {
  const item = store.items.find(entry => entry.id === itemId);
  if (!item) return;
  const root = document.getElementById('itemSheet');
  const dialog = document.getElementById('itemSheetDialog');
  const content = document.getElementById('sheetContent');
  returnFocus = trigger || document.activeElement;

  const tagGroups = itemTagGroups(item).filter(group => group.values.some(Boolean));
  const details = CONFIG.details
    .filter(detail => !(PAGE_ID === 'menu' && detail.label === 'Склад'))
    .map(detail => `
    <div class="detail-row ${detail.accent ? 'detail-row-accent' : ''}">
      <dt>${escapeHtml(detail.label)}</dt><dd>${escapeHtml(detail.value(item))}</dd>
    </div>`).join('');
  const image = item.image
    ? itemImage(item, 'sheet-hero-image', 'sheet-hero-image')
    : '';
  const notes = CONFIG.notes(item);
  const compositionLabel = PAGE_ID === 'menu' ? 'Склад · з картки меню' : PAGE_ID === 'cocktails' ? 'Склад коктейлю' : PAGE_ID === 'wine' ? 'Профіль смаку' : 'Смакові ноти';
  const heroLead = PAGE_ID !== 'menu' && notes
    ? `<p class="sheet-lead">${escapeHtml(notes)}</p>`
    : '';
  const menuServiceNotes = PAGE_ID === 'menu' && notes
    ? `<section class="sheet-section"><div class="sheet-section-heading"><span class="section-kicker">SERVICE NOTES</span><h3>Опис і подача з меню</h3></div><p class="sheet-service-notes">${escapeHtml(notes)}</p>${Number(item.preparationTime) > 0 ? `<p class="sheet-prep-time">Час приготування · ${escapeHtml(item.preparationTime)} хв</p>` : ''}</section>`
    : '';

  document.getElementById('sheetItemGroup').textContent = CONFIG.cardBadge(item) || CONFIG.text.subtitle;
  dialog.setAttribute('aria-label', item.name);
  root.dataset.itemId = item.id;
  content.innerHTML = `
    <div class="sheet-hero ${item.image ? 'has-image' : 'no-image'}">${image}<div class="sheet-hero-copy">
      <p class="sheet-price">${escapeHtml(CONFIG.cardCorner(item) || '')}</p>
      <h2 id="sheetItemName">${escapeHtml(item.name)}</h2>
      ${heroLead}
    </div></div>
    <dl class="sheet-details">${details}</dl>
    ${tagGroups.length ? `<section class="sheet-section"><div class="sheet-section-heading"><span class="section-kicker">COMPOSITION</span><h3>${escapeHtml(compositionLabel)}</h3></div>${tagGroups.map(group => `<div class="ingredient-group"><span class="ingredient-group-label">${escapeHtml(group.label)}</span><div class="ingredient-tags">${[...new Set(group.values.filter(Boolean))].map(tag => `<span class="ingredient-tag">${escapeHtml(tag)}</span>`).join('')}</div></div>`).join('')}</section>` : ''}
    ${menuServiceNotes}
    ${renderAllergyNotice(item)}
    ${renderPairings(item)}
  `;

  root.classList.add('is-open');
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sheet-is-open');
  requestAnimationFrame(() => dialog.focus({ preventScroll: true }));
}

export function closeItemSheet() {
  const root = document.getElementById('itemSheet');
  if (!root.classList.contains('is-open')) return;
  root.classList.remove('is-open');
  root.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sheet-is-open');
  if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
}

export function bindItemSheetGestures() {
  const dialog = document.getElementById('itemSheetDialog');
  let startY = null;
  dialog.addEventListener('touchstart', event => {
    if (dialog.scrollTop === 0) startY = event.touches[0].clientY;
  }, { passive: true });
  dialog.addEventListener('touchend', event => {
    if (startY !== null && event.changedTouches[0].clientY - startY > 100) closeItemSheet();
    startY = null;
  }, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeItemSheet();
  });
}
