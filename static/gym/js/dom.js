// Tiny DOM helpers. All user text goes in through text nodes, never innerHTML.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  setProps(el, props);
  return append(el, children);
}

function setProps(el, props) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'value' || key === 'checked' || key === 'selected') el[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === true) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) if (value != null) el.setAttribute(key, String(value));
  for (const child of children.flat(Infinity)) if (child) el.append(child);
  return el;
}

const ICONS = {
  today: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8' }]],
  history: [['path', { d: 'M9 6h11M9 12h11M9 18h11' }], ['circle', { cx: 4.5, cy: 6, r: 1, fill: 'currentColor' }], ['circle', { cx: 4.5, cy: 12, r: 1, fill: 'currentColor' }], ['circle', { cx: 4.5, cy: 18, r: 1, fill: 'currentColor' }]],
  progress: [['path', { d: 'M5 20v-6M11 20V9M17 20V4M3 20h18' }]],
  settings: [['path', { d: 'M4 7h9M19 7h1M4 17h3M13 17h7' }], ['circle', { cx: 16, cy: 7, r: 2.5 }], ['circle', { cx: 10, cy: 17, r: 2.5 }]],
  play: [['path', { d: 'M8 5.5v13l10.5-6.5z', fill: 'currentColor', stroke: 'none' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  check: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
  x: [['path', { d: 'M7 7l10 10M17 7L7 17' }]],
  trash: [['path', { d: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' }]],
  chevron: [['path', { d: 'M9 6l6 6-6 6' }]],
  back: [['path', { d: 'M15 6l-6 6 6 6' }]],
  share: [['path', { d: 'M12 3v12M8 7l4-4 4 4M5 11v9h14v-9' }]],
};

export function icon(name, size = 20) {
  const el = svg('svg', {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'icon',
  });
  for (const [tag, attrs] of ICONS[name] ?? []) el.append(svg(tag, attrs));
  return el;
}

// Shared building blocks

export function section(title, body, footer) {
  return h('section', { class: 'section' },
    title && h('h2', { class: 'section-title' }, title),
    body,
    footer && h('p', { class: 'section-footer' }, footer));
}

export function card(...rows) {
  return h('div', { class: 'card' }, rows);
}

/** Top bar for detail screens: { left: {label, onClick}, title, right: {label, onClick, bold} }. */
export function navBar({ left, title, right }) {
  const button = (spec, side) => spec
    ? h('button', { class: `nav-btn ${side}${spec.bold ? ' bold' : ''}`, onClick: spec.onClick }, spec.icon && icon(spec.icon, 22), spec.label)
    : h('span', { class: `nav-btn ${side}` });
  return h('header', { class: 'nav-bar' }, button(left, 'left'), h('div', { class: 'nav-title' }, title), button(right, 'right'));
}

/** options: [[value, label]]. Values compare as strings; '' means "not set". */
export function select({ value, options, onChange, className = '', label }) {
  return h('select', { class: className, 'aria-label': label, onChange: (e) => onChange(e.target.value) },
    options.map(([v, text]) => h('option', { value: String(v), selected: String(v) === String(value ?? '') }, text)));
}

/** Accepts "62.5" or "62,5" (iPhone keyboards in many regions type a comma). */
export function parseNumber(text) {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function numberInput({ value, decimal = false, label, onInput, className = '', placeholder = '0' }) {
  return h('input', {
    type: 'text',
    inputmode: decimal ? 'decimal' : 'numeric',
    class: `num ${className}`,
    value: value ? String(value) : '',
    placeholder,
    'aria-label': label,
    autocomplete: 'off',
    enterkeyhint: 'done',
    onInput: (e) => {
      const parsed = parseNumber(e.target.value);
      if (parsed != null) onInput(parsed);
    },
    onFocus: (e) => e.target.select(),
  });
}

export function stepper({ value, min, max, step = 1, onChange, format = String, label }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, v)));
  return h('div', { class: 'stepper', role: 'group', 'aria-label': label },
    h('button', { class: 'step', 'aria-label': `Decrease ${label ?? ''}`, disabled: value <= min, onClick: () => set(value - step) }, '−'),
    h('span', { class: 'step-value' }, format(value)),
    h('button', { class: 'step', 'aria-label': `Increase ${label ?? ''}`, disabled: value >= max, onClick: () => set(value + step) }, '+'));
}

export function toggle({ checked, onChange, label }) {
  return h('input', { type: 'checkbox', role: 'switch', class: 'switch', checked, 'aria-label': label, onChange: (e) => onChange(e.target.checked) });
}

export function segmented({ value, options, onChange, label }) {
  return h('div', { class: 'segmented', role: 'tablist', 'aria-label': label },
    options.map(([v, text]) => h('button', {
      role: 'tab', 'aria-selected': String(v === value), class: v === value ? 'on' : '', onClick: () => onChange(v),
    }, text)));
}
