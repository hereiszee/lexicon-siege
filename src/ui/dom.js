// Tiny DOM helpers. Strings passed as children are always inserted as text (never HTML).

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** Format a number compactly: 1.25 → "1.3", 2 → "2", 0.333 → "0.33". */
export function fmt(n, digits = 1) {
  if (n == null || !Number.isFinite(+n)) return '–';
  n = +n;
  if (Math.abs(n) >= 100) return String(Math.round(n));
  if (Math.abs(n) < 1 && n !== 0) return String(+n.toFixed(2));
  return String(+n.toFixed(digits));
}

export function pct(x) {
  return `${Math.round(x * 100)}%`;
}

/** Set textContent only when it changed (avoids layout churn in per-frame HUD updates). */
export function setText(el, text) {
  text = String(text);
  if (el.textContent !== text) el.textContent = text;
}

export function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function mixHex(a, b, t) {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function parseHex(c) {
  if (!c || typeof c !== 'string') return [120, 110, 100];
  if (c.startsWith('rgb')) {
    const m = c.match(/[\d.]+/g) || [];
    return [+m[0] || 0, +m[1] || 0, +m[2] || 0];
  }
  let s = c.replace('#', '');
  if (s.length === 3) s = s.split('').map((x) => x + x).join('');
  const v = parseInt(s, 16);
  if (!Number.isFinite(v)) return [120, 110, 100];
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function rgba(c, a) {
  const [r, g, b] = parseHex(c);
  return `rgba(${r},${g},${b},${a})`;
}
