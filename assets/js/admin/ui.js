/* Small UI helpers for admin.html (the admin panel does not load the trainer's page context). */

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDate = value => (value ? dateFormat.format(new Date(value)) : '—');

const relative = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' });
export function formatAgo(value) {
  if (!value) return 'ще не було';
  const minutes = Math.round((new Date(value) - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
}

export const percent = (part, total) => (total ? Math.round((part / total) * 100) : null);

/* Colour class for an accuracy value: good ≥ 85%, ok ≥ 60%, otherwise low. */
export const accuracyTone = value => (value == null ? '' : value >= 85 ? 'is-good' : value >= 60 ? 'is-ok' : 'is-low');

let toastTimer = null;
export function toast(message, tone = 'ok') {
  const box = document.getElementById('adminToast');
  box.textContent = message;
  box.dataset.tone = tone;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, tone === 'error' ? 7000 : 3500);
}

/* Button that shows a busy state while an async action runs. */
export async function withBusy(button, label, action) {
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = label;
  try {
    return await action();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: ''
};
/* Same slugs as scripts/build_quiz_data.mjs: "Б’янка міні" → "b-ianka-mini". */
export function slug(text) {
  return String(text).replace(/\s+/g, ' ').trim().toLowerCase()
    .split('').map(ch => TRANSLIT[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
}

/* Readable random password for a new account: e.g. "kava-7342-Lime". */
export function generatePassword() {
  const words = ['kava', 'vino', 'lime', 'mint', 'bar', 'menu', 'tost', 'rum', 'jin', 'sirop', 'chai', 'sous'];
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
  const digits = String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
  const last = pick();
  return `${pick()}-${digits}-${last[0].toUpperCase()}${last.slice(1)}`;
}

/* ------------------------------------------------------- form errors
   Errors are { name?: form field name, message }. Each is shown under its field (the field is outlined),
   all of them are listed in the form's .admin-form-error box, and the first invalid field gets focus.
   Forms use `novalidate`, so the browser's own vague bubbles ("Виберіть потрібний формат") never appear. */

const fieldLabel = input => (input.closest('.admin-field')?.querySelector(':scope > span, :scope > legend')?.textContent || input.name)
  .replace('*', '').trim();

/* Messages for the browser's built-in checks (required, minlength, maxlength…), in Ukrainian and per field. */
export function validityErrors(form) {
  const errors = [];
  for (const input of form.elements) {
    if (!input.name || input.disabled || input.validity.valid) continue;
    const label = fieldLabel(input);
    const v = input.validity;
    const message = v.valueMissing ? `${label}: обов’язкове поле`
      : v.tooShort ? `${label}: щонайменше ${input.minLength} символів (зараз ${input.value.length})`
      : v.tooLong ? `${label}: не більше ${input.maxLength} символів`
      : `${label}: неправильне значення`;
    errors.push({ name: input.name, message });
  }
  return errors;
}

export function clearFormErrors(form) {
  form.querySelectorAll('.admin-field-error').forEach(note => note.remove());
  form.querySelectorAll('.is-invalid').forEach(field => field.classList.remove('is-invalid'));
  form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  const box = form.querySelector('.admin-form-error');
  if (box) box.hidden = true;
}

export function showFormErrors(form, errors) {
  clearFormErrors(form);
  if (!errors.length) return;
  let first = null;
  for (const { name, message } of errors) {
    const element = name ? form.elements[name] : null;
    const input = element instanceof RadioNodeList ? element[0] : element;
    const field = input?.closest('.admin-field');
    if (!field) continue;
    field.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    const note = document.createElement('small');
    note.className = 'admin-field-error';
    note.textContent = message;
    field.append(note);
    first ||= input;
  }
  const box = form.querySelector('.admin-form-error');
  if (box) {
    box.innerHTML = errors.length === 1 ? escapeHtml(errors[0].message)
      : `<strong>Виправте, будь ласка:</strong><ul>${errors.map(e => `<li>${escapeHtml(e.message)}</li>`).join('')}</ul>`;
    box.hidden = false;
  }
  (first || box)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  first?.focus({ preventScroll: true });

  // The note under a field disappears as soon as that field is edited.
  if (!form.dataset.errorReset) {
    form.dataset.errorReset = '1';
    form.addEventListener('input', event => {
      const field = event.target.closest('.admin-field.is-invalid');
      if (!field) return;
      field.classList.remove('is-invalid');
      field.querySelector('.admin-field-error')?.remove();
      event.target.removeAttribute('aria-invalid');
    });
  }
}

export function openDialog(dialog) {
  dialog.showModal();
  dialog.querySelector('[autofocus], input, select, textarea')?.focus();
}
