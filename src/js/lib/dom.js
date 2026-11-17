/**
 * Small DOM toolkit: query helpers and an HTML template tag that escapes everything by default.
 *
 *   html`<p class="${tone}">${text}</p>`       text is escaped
 *   html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`   nested templates and arrays are kept
 *   raw('<b>trusted</b>')                      the explicit opt-out
 *
 * Keep attributes in double quotes so the escaping is always enough.
 */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Markup that has already been escaped or is trusted. */
export class SafeHtml {
  constructor(markup) {
    this.markup = markup;
  }

  toString() {
    return this.markup;
  }
}

export const raw = (markup) => new SafeHtml(String(markup));

function toMarkup(value) {
  if (value == null || typeof value === 'boolean') return '';
  if (value instanceof SafeHtml) return value.markup;
  if (Array.isArray(value)) return value.map(toMarkup).join('');
  return escapeHtml(value);
}

/**
 * Newlines and the indentation after them are layout for the author, not content. They are dropped
 * next to tags and between values, and become a single space inside text. Cached per template literal.
 */
const compiled = new WeakMap();
function compile(strings) {
  let parts = compiled.get(strings);
  if (!parts) {
    parts = strings.map((s) =>
      /^\s*\n\s*$/.test(s)
        ? '' // only layout between two values
        : s.replace(/>\s*\n\s*/g, '>').replace(/\s*\n\s*</g, '<').replace(/\s*\n\s*/g, ' '),
    );
    compiled.set(strings, parts);
  }
  return parts;
}

export function html(strings, ...values) {
  const parts = compile(strings);
  let out = parts[0];
  values.forEach((value, i) => {
    out += toMarkup(value) + parts[i + 1];
  });
  return new SafeHtml(out);
}

/** True for values that show nothing: null, '', 0, false and markup that is empty. */
export const isBlank = (value) => (value instanceof SafeHtml ? value.markup === '' : !value);

/** Joins markup (or text) with a separator, skipping blanks. */
export function joinHtml(items, separator = ' ') {
  const shown = items.filter((item) => !isBlank(item));
  return html`${shown.flatMap((item, index) => (index ? [separator, item] : [item]))}`;
}

/** Replaces the contents of an element with a template. */
export function render(element, template) {
  element.innerHTML = toMarkup(template);
}

/** Joins class names, skipping anything falsy. */
export const cx = (...names) => names.filter(Boolean).join(' ');

/** Runs handler(event, matchedElement) for events that start inside an element matching selector. */
export function delegate(root, type, selector, handler) {
  root.addEventListener(type, (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && root.contains(target)) handler(event, target);
  });
}
