/* Edit forms for menu items, per section. The fields are the ones the quiz pages read (assets/js/pages.js);
   select options come from the quiz config so an item can't get an answer the quiz doesn't know.
   Field types: text · textarea · select · datalist (free text + suggestions) · list (one per line)
                · components (kitchen groups) · allergens (checkboxes) · checkbox */
import { MENU_ALLERGENS, PAGES } from '../pages.js';
import { escapeHtml } from './ui.js';

const optionsOf = (page, key) => {
  const spec = PAGES[page].questions.find(q => q.key === key)?.options || {};
  return spec.all || spec.list || [];
};

const MAX_QUIZ_INGREDIENT = 42; // longer phrases are kept in the card but not offered in the quiz checklist

export const ITEM_FORMS = {
  wine: [
    { key: 'name', label: 'Назва', type: 'text', required: true },
    { key: 'category', label: 'Категорія меню', type: 'datalist', required: true },
    { key: 'country', label: 'Країна', type: 'datalist', required: true, suggestions: optionsOf('wine', 'country'), hint: 'Відповідь на питання «Країна походження».' },
    { key: 'region', label: 'Регіон', type: 'text' },
    { key: 'classification', label: 'Класифікація (відповідь у квізі)', type: 'select', required: true, options: optionsOf('wine', 'classification') },
    { key: 'classificationGeneral', label: 'Класифікація повністю', type: 'text', required: true, hint: 'Показується в розборі відповіді, напр. «Червоне, сухе (кошерне)».' },
    { key: 'grapes', label: 'Сортовий склад (правильна відповідь)', type: 'text', required: true },
    { key: 'distractors', label: 'Неправильні варіанти сорту', type: 'list', exact: 3, hint: 'Рівно 3, по одному на рядок.' },
    { key: 'priceHint', label: 'Ціна', type: 'text', hint: 'Напр. «250 ₴ (100 мл)».' },
    { key: 'volume', label: 'Об’єм / міцність', type: 'text' },
    { key: 'tastingNotes', label: 'Дегустаційні ноти', type: 'textarea' }
  ],
  bar: [
    { key: 'name', label: 'Назва', type: 'text', required: true },
    { key: 'group', label: 'Категорія меню', type: 'datalist', required: true },
    { key: 'type', label: 'Вид напою (відповідь у квізі)', type: 'select', required: true, options: optionsOf('bar', 'type') },
    { key: 'country', label: 'Країна', type: 'datalist', hint: 'Порожнє — питання про країну для цієї позиції не ставиться.' },
    { key: 'style', label: 'Стиль / особливість', type: 'text', required: true },
    { key: 'volume', label: 'Порція', type: 'text', hint: 'Напр. «50 мл».' },
    { key: 'price', label: 'Ціна', type: 'text', hint: 'Напр. «180 ₴».' },
    { key: 'notes', label: 'Смакові ноти / опис', type: 'textarea' }
  ],
  cocktails: [
    { key: 'name', label: 'Назва', type: 'text', required: true },
    { key: 'group', label: 'Група в меню', type: 'select', required: true, options: optionsOf('cocktails', 'group') },
    { key: 'base', label: 'Основа', type: 'select', required: true, options: optionsOf('cocktails', 'base') },
    { key: 'ingredients', label: 'Склад', type: 'text', required: true, hint: 'Через кому, напр. «Джин, вермут, біттер».' },
    { key: 'volume', label: 'Об’єм', type: 'text' },
    { key: 'price', label: 'Ціна', type: 'text' },
    { key: 'notes', label: 'Опис', type: 'textarea' }
  ],
  menu: [
    { key: 'name', label: 'Назва', type: 'text', required: true },
    { key: 'group', label: 'Розділ меню', type: 'datalist', required: true },
    { key: 'isNew', label: 'Новинка', type: 'checkbox' },
    { key: 'weight', label: 'Вихід', type: 'text', hint: 'Напр. «350 г».' },
    { key: 'price', label: 'Ціна', type: 'text', hint: 'Напр. «325 ₴» або «197 ₴ / 100 г».' },
    { key: 'ingredients', label: 'Інгредієнти (для квізу)', type: 'list', min: 2, hint: 'По одному на рядок, щонайменше 2. Короткі назви — довгі фрази в квіз не потрапляють.' },
    { key: 'components', label: 'Склад по групах (картка страви)', type: 'components', hint: 'Рядок = група: «Основа: лосось; шпинат». Значення через крапку з комою.' },
    { key: 'allergens', label: 'Алергени', type: 'allergens' },
    { key: 'notes', label: 'Опис з меню', type: 'textarea' }
  ]
};

/* ------------------------------------------------------------- rendering */

const componentsToText = groups => (groups || []).map(g => `${g.label}: ${(g.values || []).join('; ')}`).join('\n');

function fieldHtml(field, data, suggestions) {
  const value = data[field.key];
  const name = `f_${field.key}`;
  const hint = field.hint ? `<small>${escapeHtml(field.hint)}</small>` : '';
  const required = field.required ? 'required' : '';
  const label = `${escapeHtml(field.label)}${field.required ? ' <span class="admin-required" aria-hidden="true">*</span>' : ''}`;

  switch (field.type) {
    case 'textarea':
      return `<label class="admin-field is-wide"><span>${label}</span><textarea name="${name}" rows="4" ${required}>${escapeHtml(value || '')}</textarea>${hint}</label>`;
    case 'select': {
      const options = [...new Set([...(field.options || []), value].filter(Boolean))];
      return `<label class="admin-field"><span>${label}</span><select name="${name}" ${required}>
        <option value="">— оберіть —</option>${options.map(o => `<option ${o === value ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}</select>${hint}</label>`;
    }
    case 'datalist': {
      const listId = `dl_${field.key}`;
      const options = [...new Set([...(field.suggestions || []), ...suggestions(field.key)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uk'));
      return `<label class="admin-field"><span>${label}</span><input name="${name}" list="${listId}" value="${escapeHtml(value || '')}" ${required} autocomplete="off">
        <datalist id="${listId}">${options.map(o => `<option value="${escapeHtml(o)}">`).join('')}</datalist>${hint}</label>`;
    }
    case 'list':
      return `<label class="admin-field is-wide"><span>${label}</span><textarea name="${name}" rows="${field.exact || 6}">${escapeHtml((value || []).join('\n'))}</textarea>${hint}</label>`;
    case 'components':
      return `<label class="admin-field is-wide"><span>${label}</span><textarea name="${name}" rows="6">${escapeHtml(componentsToText(value))}</textarea>${hint}</label>`;
    case 'allergens':
      return `<fieldset class="admin-field is-wide"><legend>${label}</legend><div class="admin-checks">${MENU_ALLERGENS.map(a => `
        <label class="admin-check"><input type="checkbox" name="${name}" value="${escapeHtml(a)}" ${(value || []).includes(a) ? 'checked' : ''}><span>${escapeHtml(a)}</span></label>`).join('')}</div>
        <small>Перевірені кухнею. Автоматично визначені алергени були лише підказкою.</small></fieldset>`;
    case 'checkbox':
      return `<label class="admin-check"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}><span>${label}</span></label>`;
    default:
      return `<label class="admin-field"><span>${label}</span><input name="${name}" value="${escapeHtml(value ?? '')}" ${required} autocomplete="off">${hint}</label>`;
  }
}

export function renderItemFields(page, data, suggestions) {
  return ITEM_FORMS[page].map(field => fieldHtml(field, data, suggestions)).join('');
}

/* ---------------------------------------------------------- reading back */

const lines = text => String(text || '').split(/\r?\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);

function parseComponents(text) {
  return lines(text).map(line => {
    const at = line.indexOf(':');
    const label = at > 0 ? line.slice(0, at).trim() : 'Склад';
    const values = (at > 0 ? line.slice(at + 1) : line).split(';').map(v => v.trim()).filter(Boolean);
    return { label, values };
  }).filter(group => group.values.length);
}

/* Form → item data (keeps fields the form doesn't show, e.g. choiceqrPhoto). Returns { data, errors }. */
export function readItemForm(page, form, previous) {
  const data = { ...previous };
  const errors = [];
  for (const field of ITEM_FORMS[page]) {
    const name = `f_${field.key}`;
    if (field.type === 'checkbox') { data[field.key] = form.elements[name].checked; continue; }
    if (field.type === 'allergens') {
      data[field.key] = MENU_ALLERGENS.filter(a => [...form.querySelectorAll(`[name="${name}"]:checked`)].some(box => box.value === a));
      continue;
    }
    const raw = form.elements[name].value;
    if (field.type === 'list') {
      const values = [...new Set(lines(raw))];
      if (field.exact && values.length !== field.exact) errors.push(`${field.label}: потрібно рівно ${field.exact}`);
      if (field.min && values.length < field.min) errors.push(`${field.label}: щонайменше ${field.min}`);
      data[field.key] = values;
    } else if (field.type === 'components') {
      data[field.key] = parseComponents(raw);
    } else {
      const value = raw.replace(/\s+/g, ' ').trim();
      if (field.required && !value) errors.push(`${field.label}: обов’язкове поле`);
      data[field.key] = value;
    }
  }

  if (page === 'wine' && (data.distractors || []).some(d => d.toLowerCase() === String(data.grapes).toLowerCase())) {
    errors.push('Неправильні варіанти сорту не можуть збігатися з правильною відповіддю');
  }
  if (page === 'menu') {
    data.quizIngredients = data.ingredients.filter(i => i.length <= MAX_QUIZ_INGREDIENT);
    if (data.ingredients.length >= 2 && data.quizIngredients.length < 2) {
      errors.push(`Інгредієнти: щонайменше 2 мають бути коротшими за ${MAX_QUIZ_INGREDIENT} символи`);
    }
    // Where each allergen comes from (shown in the dish card); allergens ticked here are marked as such.
    const sources = previous.allergenSources || {};
    data.allergenSources = Object.fromEntries(data.allergens.map(a => [a, sources[a] || ['позначено адміністратором']]));
  }
  return { data, errors };
}
