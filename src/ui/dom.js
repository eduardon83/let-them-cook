// dom.js — tiny helpers and an inline icon set (no icon fonts, no network).
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function html(strings, ...values) {
  return strings.reduce((out, s, i) => out + s + (i < values.length ? values[i] ?? '' : ''), '');
}

export function el(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function toast(message) {
  let zone = $('.toast-zone');
  if (!zone) { zone = el('<div class="toast-zone" role="status" aria-live="polite"></div>'); $('#app').append(zone); }
  const t = el(`<div class="toast">${esc(message)}</div>`);
  zone.append(t);
  setTimeout(() => t.remove(), 3700);
}

export function download(filename, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Keeps keyboard focus inside a dialog and restores it on close. */
export function trapFocus(root) {
  const previous = document.activeElement;
  const handler = (e) => {
    if (e.key !== 'Tab') return;
    const items = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', root).filter((n) => !n.disabled && n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  root.addEventListener('keydown', handler);
  return () => { root.removeEventListener('keydown', handler); previous?.focus?.(); };
}

const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18z"/>',
  rain: '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
  auto: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11h5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6"/>',
  calm: '<path d="M3 8c3-2 5 2 8 0s5-2 8 0M3 13c3-2 5 2 8 0s5-2 8 0M3 18c3-2 5 2 8 0s5-2 8 0"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  village: '<path d="M3 20V11l5-4 5 4v9"/><path d="M13 20v-6l4-3 4 3v6"/><path d="M2 20h20M7 20v-4h2v4"/>',
  hills: '<path d="M2 19c3-6 6-9 9-9s5 3 6 5c1-1 2-2 3-2 1 0 2 1 2 6"/><path d="M2 19h20"/><path d="M14 6l2-3 2 3"/>',
  river: '<path d="M3 7c3-2 5 2 8 0s5-2 8 0"/><path d="M5 12c3-2 5 2 8 0s4-1 6 0"/><path d="M3 17c3-2 5 2 8 0s5-2 8 0"/>',
  mountain: '<path d="m2 20 7-12 4 6 3-4 6 10z"/><path d="m7.5 11 1.5 1.5L11 10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
  skip: '<path d="M5 5v14l9-7zM16 5v14"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 3.5v5h5"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 5h16"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  hat: '<path d="M7 14c-2.5 0-4-2-4-4.3A4.2 4.2 0 0 1 7.6 5.6 4.8 4.8 0 0 1 12 3a4.8 4.8 0 0 1 4.4 2.6A4.2 4.2 0 0 1 21 9.7c0 2.3-1.5 4.3-4 4.3"/><path d="M7 14v6h10v-6"/><path d="M7 17h10"/>',
  spark: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
  warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".7" fill="currentColor"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  shuffle: '<path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  utensils: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-2 2-2.5 5-2.5 8h2.5v10"/>',
  idea: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.5 1 .5 1.6V16h6v-.5c0-.6 0-1.2.5-1.6A6 6 0 0 0 12 3z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  seal: '<circle cx="12" cy="10" r="6"/><path d="m8.5 15-1.5 6 5-2.5 5 2.5-1.5-6"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  lang: '<path d="M4 5h9M8.5 3v2c0 4-2 7-5 8.5"/><path d="M6 9c1 2.5 3.5 4.3 6 5"/><path d="m12 21 4.5-10 4.5 10M13.5 18h6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  projector: '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="15" cy="12" r="3"/><path d="M6 17v3M18 17v3"/>'
};

export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

export const STEAM = '<svg class="steam-svg" width="60" height="40" viewBox="0 0 60 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M14 38c-6-8 6-12 0-20s6-12 0-18"/><path d="M30 38c-6-8 6-12 0-20s6-12 0-18"/><path d="M46 38c-6-8 6-12 0-20s6-12 0-18"/></svg>';

export const LOGO = `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
  <defs><linearGradient id="lg-pot" x1="0" x2="1"><stop offset="0" stop-color="#f2a33a"/><stop offset="1" stop-color="#e4572e"/></linearGradient></defs>
  <circle cx="32" cy="32" r="30" fill="#2b2a33"/>
  <path d="M21 33c-5 0-8-3.6-8-8 0-5 4.4-8.6 9-7.8C23.6 12.6 27.3 10 32 10s8.4 2.6 10 7.2c4.6-.8 9 2.8 9 7.8 0 4.4-3 8-8 8v9H21z" fill="#fff8ec"/>
  <path d="M21 42h22v6H21z" fill="url(#lg-pot)"/>
  <path d="M26 36v3M32 35v4M38 36v3" stroke="#2b2a33" stroke-width="2" stroke-linecap="round"/>
  <circle cx="47" cy="47" r="3" fill="#ffd27a"/><circle cx="16" cy="45" r="2" fill="#ffd27a"/>
</svg>`;

/** Taste-scale faces for self-assessment / feedback (1 = not yet … 5 = delicious). */
export function tasteFace(level, size = 40) {
  const mouths = ['M14 30c4-4 12-4 16 0', 'M14 29c4-2 12-2 16 0', 'M14 28h16', 'M14 27c4 3 12 3 16 0', 'M13 26c4 6 14 6 18 0'];
  const colors = ['#c9c3d6', '#f6cf9a', '#f2c14e', '#f2a33a', '#e4572e'];
  return `<svg viewBox="0 0 44 44" width="${size}" height="${size}" aria-hidden="true"><circle cx="22" cy="22" r="19" fill="${colors[level - 1]}" stroke="#2b2a33" stroke-width="2"/><circle cx="16" cy="18" r="2.2" fill="#2b2a33"/><circle cx="28" cy="18" r="2.2" fill="#2b2a33"/><path d="${mouths[level - 1]}" stroke="#2b2a33" stroke-width="2.4" fill="none" stroke-linecap="round"/>${level === 5 ? '<path d="M33 9l1.5 3 3 .5-2.2 2 .6 3-2.9-1.5" fill="#fff8ec"/>' : ''}</svg>`;
}

// 24-point starburst around (60,60), generated so it always closes.
const SEAL_PATH = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 51 : 57;
  return `${i ? 'L' : 'M'}${(60 + Math.cos(a) * r).toFixed(1)} ${(60 + Math.sin(a) * r).toFixed(1)}`;
}).join(' ') + 'Z';

/** A round wax-seal emblem for a mission. */
export function sealSVG(lesson, done = true, size = 120) {
  const color = { market: '#f2a33a', pantry: '#c9a227', school: '#3f8f5b', bakery: '#e88c6a', cafe: '#3b8fc4', festival: '#d64f8b', tower: '#6b4fa0', grand: '#e0b13a' }[lesson.id] || '#f2a33a';
  const name = esc(lesson.seal?.name || lesson.location);
  const id = `seal-${lesson.id}-${Math.random().toString(36).slice(2, 7)}`;
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${name}">
    <defs><path id="${id}" d="M60 60 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0"/></defs>
    <g opacity="${done ? 1 : 0.35}">
      <path d="${SEAL_PATH}" fill="${color}"/>
      <circle cx="60" cy="60" r="44" fill="none" stroke="#fff8ec" stroke-width="2" stroke-dasharray="3 4"/>
      <text font-family="Lexend Variable, Lexend, sans-serif" font-size="9.5" font-weight="700" letter-spacing="1.5" fill="#fff8ec"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${name.toUpperCase()}</textPath></text>
      <circle cx="60" cy="60" r="24" fill="#fff8ec"/>
      <text x="60" y="68" text-anchor="middle" font-family="Fraunces Variable, Fraunces, serif" font-size="24" font-weight="800" fill="${color}">${lesson.order ?? ''}</text>
    </g>
  </svg>`;
}
