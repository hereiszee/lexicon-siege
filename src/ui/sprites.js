// Shared drawing primitives for the flat graph-paper look: extruded letter towers,
// halftone range discs, vector chess-piece enemies, Scrabble tiles.
import { ELEMENT_COLORS } from '../core/constants.js';
import { hashString, mulberry32 } from '../core/rng.js';
import { mixHex, rgba } from './dom.js';

export const SANS = '"DIN Alternate", "DIN Next", "DIN 2014", "Barlow", "Avenir Next", "Helvetica Neue", Arial, sans-serif';
export const COND = '"DIN Condensed", "Avenir Next Condensed", "Barlow Condensed", "Roboto Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
export const HEAVY = '"Arial Black", "Avenir Next", "Helvetica Neue", Arial, sans-serif';

const TAU = Math.PI * 2;
/** Light comes from the upper right; shadows fall to the lower left. */
export const SHADOW_DIR = { x: -0.72, y: 0.69 };

export function elementColor(el, fallback = '#8a8f99') {
  return ELEMENT_COLORS[el] || fallback;
}

/* --------------------------------------------------------------- letter towers */

const letterCache = new Map();

/**
 * Cached sprite of one extruded capital letter (with its long shadow) for a cell size.
 * Returns { canvas, css, letterW } — `css` is the sprite's square size in CSS px, the letter
 * face is centred in it.
 */
export function letterSprite(letter, color, S, dpr, disabled = false) {
  const L = (letter || '?').toUpperCase();
  const key = `${L}|${color}|${Math.round(S * dpr)}|${disabled ? 1 : 0}`;
  let s = letterCache.get(key);
  if (s) return s;
  if (letterCache.size > 300) letterCache.clear();

  const css = S * 4;
  const W = Math.ceil(css * dpr);
  const face = disabled ? '#b9bcc2' : color;
  const side = mixHex(face, '#000000', 0.38);
  const fs = S * 2.05; // cap height ≈ 1.5 cells, as in the mockups
  const font = `900 ${fs}px ${HEAVY}`;

  const make = () => { const c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'); g.scale(dpr, dpr); return [c, g]; };
  const [out, o] = make();
  o.font = font;
  const m = o.measureText(L);
  const asc = m.actualBoundingBoxAscent || fs * 0.72;
  const desc = m.actualBoundingBoxDescent || 0;
  const lw = (m.actualBoundingBoxRight || m.width / 2) + (m.actualBoundingBoxLeft || m.width / 2);
  const cx = css / 2, cy = css / 2;
  o.textAlign = 'center';
  o.textBaseline = 'alphabetic';
  const by = cy + (asc - desc) / 2;

  // Long hard shadow: sweep the glyph along the light direction on its own layer.
  const [sh, sg] = make();
  sg.font = font; sg.textAlign = 'center'; sg.textBaseline = 'alphabetic';
  sg.fillStyle = '#000';
  const len = S * 0.75, step = 0.75 / dpr;
  for (let k = 0; k <= len; k += step) sg.fillText(L, cx + SHADOW_DIR.x * k, by + SHADOW_DIR.y * k);
  o.globalAlpha = 0.17;
  o.drawImage(sh, 0, 0, css, css);
  o.globalAlpha = 1;

  // Extrusion toward the lower-left.
  const depth = S * 0.17;
  o.fillStyle = side;
  for (let k = depth; k > 0; k -= step) o.fillText(L, cx - k * 0.85, by + k * 0.85);

  // Face, with a subtle brick texture clipped to the glyph.
  const [fc, fg] = make();
  fg.font = font; fg.textAlign = 'center'; fg.textBaseline = 'alphabetic';
  fg.fillStyle = face;
  fg.fillText(L, cx, by);
  fg.globalCompositeOperation = 'source-atop';
  const grad = fg.createLinearGradient(0, cy - asc / 2, 0, cy + asc / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.20)');
  grad.addColorStop(1, 'rgba(0,0,0,0.06)');
  fg.fillStyle = grad;
  fg.fillRect(0, 0, css, css);
  const brick = S * 0.2;
  fg.strokeStyle = 'rgba(0,0,0,0.10)';
  fg.lineWidth = Math.max(0.6, S * 0.016);
  const rnd = mulberry32(hashString(L + color));
  for (let row = 0, y = cy - asc; y < cy + asc; row++, y += brick) {
    fg.beginPath(); fg.moveTo(0, y); fg.lineTo(css, y); fg.stroke();
    for (let x = (row % 2) * brick * 0.8; x < css; x += brick * 1.6) {
      fg.beginPath(); fg.moveTo(x, y); fg.lineTo(x, y + brick); fg.stroke();
    }
  }
  fg.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 60; i++) fg.fillRect(cx - lw / 2 + rnd() * lw, cy - asc / 2 + rnd() * asc, S * 0.035, S * 0.035);
  o.drawImage(fc, 0, 0, css, css);

  s = { canvas: out, css, letterW: lw, asc };
  letterCache.set(key, s);
  return s;
}

/** Small six-spoke asterisk. */
export function drawAsterisk(ctx, x, y, r, color = '#111') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, r * 0.36);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI + Math.PI / 2;
    ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
}

/** Display name: augment words then the base word, upper-case. */
export function towerName(t) {
  const augs = (t.augments || []).map((a) => a.word);
  return [...augs, t.word].join(' ').toUpperCase();
}

/* ------------------------------------------------------------------ range disc */

const discCache = new Map();

/** Soft tinted disc with a halftone-dot dissolving edge. Returns { canvas, css }. */
export function rangeDisc(color, rCss, dpr, alpha = 0.3) {
  const r = Math.max(4, rCss);
  const key = `${color}|${Math.round(r)}|${alpha}|${dpr}`;
  let s = discCache.get(key);
  if (s) return s;
  if (discCache.size > 60) discCache.clear();
  const css = r * 2.2;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(css * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const cx = css / 2, cy = css / 2;
  g.fillStyle = rgba(color, alpha);
  g.beginPath(); g.arc(cx, cy, r * 0.76, 0, TAU); g.fill();
  // fine screen inside the disc
  const fine = Math.max(3, r * 0.035);
  g.fillStyle = rgba(color, alpha * 0.35);
  for (let y = cy - r * 0.76; y < cy + r * 0.76; y += fine) {
    for (let x = cx - r * 0.76 + ((Math.round((y - cy) / fine) & 1) * fine) / 2; x < cx + r * 0.76; x += fine) {
      if (Math.hypot(x - cx, y - cy) < r * 0.74) { g.beginPath(); g.arc(x, y, fine * 0.18, 0, TAU); g.fill(); }
    }
  }
  // halftone rim
  const sp = Math.max(4, r * 0.075);
  const rnd = mulberry32(Math.round(r) * 31 + 7);
  g.fillStyle = rgba(color, alpha);
  for (let row = 0, y = cy - r * 1.1; y < cy + r * 1.1; row++, y += sp * 0.866) {
    for (let x = cx - r * 1.1 + (row & 1) * sp / 2; x < cx + r * 1.1; x += sp) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < r * 0.7 || d > r * 1.06) continue;
      const t = (d - r * 0.7) / (r * 0.36);
      const dr = sp * 0.62 * (1 - t) * (0.75 + rnd() * 0.5);
      if (dr < 0.4) continue;
      g.beginPath(); g.arc(x, y, dr, 0, TAU); g.fill();
    }
  }
  s = { canvas: c, css };
  discCache.set(key, s);
  return s;
}

/* -------------------------------------------------------------- chess pieces */

// Silhouettes in a 100×100 box, base centred at (50,100).
const PIECE_SVG = {
  pawn: {
    body: 'M28 100 H72 V93 Q72 87 64 85 Q58 74 57 60 H65 V54 H58 A15 15 0 1 0 42 54 H35 V60 H43 Q42 74 36 85 Q28 87 28 93 Z',
  },
  rook: {
    body: 'M24 100 H76 V92 L70 86 V48 L76 42 V20 H66 V28 H58 V20 H42 V28 H34 V20 H24 V42 L30 48 V86 L24 92 Z',
  },
  bishop: {
    body: 'M28 100 H72 V93 Q72 87 64 86 Q60 70 60 58 H66 V52 H60 Q70 44 68 32 Q66 22 50 10 Q34 22 32 32 Q30 44 40 52 H34 V58 H40 Q40 70 36 86 Q28 87 28 93 Z M55 21 L45 35 L47.5 37 L57.5 23 Z',
    extra: 'M54 5 A4 4 0 1 0 46 5 A4 4 0 1 0 54 5 Z',
    evenodd: true,
  },
  knight: {
    body: 'M26 100 H76 V92 Q76 86 68 85 Q65 70 71 56 Q80 40 72 24 Q64 10 46 10 L43 3 L38 13 Q30 19 26 31 L17 49 Q15 58 23 60 Q30 61 35 55 L45 50 Q47 58 40 66 Q32 76 34 85 Q26 86 26 92 Z',
  },
  queen: {
    body: 'M26 100 H74 V92 Q74 86 66 85 Q60 66 62 50 H68 V45 L76 22 L64 36 L60 16 L54 34 L50 12 L46 34 L40 16 L36 36 L24 22 L32 45 V50 H38 Q40 66 34 85 Q26 86 26 92 Z',
    extra: 'M80 22 A4 4 0 1 0 72 22 A4 4 0 1 0 80 22 Z M64 16 A4 4 0 1 0 56 16 A4 4 0 1 0 64 16 Z M54 11 A4 4 0 1 0 46 11 A4 4 0 1 0 54 11 Z M44 16 A4 4 0 1 0 36 16 A4 4 0 1 0 44 16 Z M28 22 A4 4 0 1 0 20 22 A4 4 0 1 0 28 22 Z',
  },
  king: {
    body: 'M26 100 H74 V92 Q74 86 66 85 Q60 66 62 52 H68 V46 H60 Q74 40 72 30 Q70 20 58 24 Q54 18 50 18 Q46 18 42 24 Q30 20 28 30 Q26 40 40 46 H32 V52 H38 Q40 66 34 85 Q26 86 26 92 Z',
    extra: 'M47 19 V12 H42 V7 H47 V1 H53 V7 H58 V12 H53 V19 Z',
  },
};

let PIECES = null;
function pieces() {
  if (PIECES) return PIECES;
  PIECES = {};
  for (const [k, v] of Object.entries(PIECE_SVG)) {
    PIECES[k] = { body: new Path2D(v.body), extra: v.extra ? new Path2D(v.extra) : null, evenodd: !!v.evenodd };
  }
  return PIECES;
}

/** Enemy type → piece + height in cells. */
export const ENEMY_LOOK = {
  grunt:    { piece: 'pawn', h: 0.55 },
  swarm:    { piece: 'pawn', h: 0.42 },
  runner:   { piece: 'knight', h: 0.68 },
  flyer:    { piece: 'knight', h: 0.56, float: true },
  tank:     { piece: 'rook', h: 0.8 },
  armored:  { piece: 'rook', h: 0.72, band: true },
  healer:   { piece: 'bishop', h: 0.7, plus: true },
  stealth:  { piece: 'bishop', h: 0.66, ghost: true },
  vandal:   { piece: 'queen', h: 0.76 },
  splitter: { piece: 'queen', h: 0.7, split: true },
  boss:     { piece: 'king', h: 1.6 },
};

export function lookFor(e) {
  return ENEMY_LOOK[e.type] || (e.boss ? ENEMY_LOOK.boss : ENEMY_LOOK.grunt);
}

/**
 * Draw a chess-piece silhouette standing at (x, y) (y = base line), height h CSS px.
 * opts: { color, flip, alpha, rot (radians, tipping over around the base), halo }
 */
export function drawPiece(ctx, kind, x, y, h, opts = {}) {
  const P = pieces()[kind] || pieces().pawn;
  const k = h / 100;
  ctx.save();
  ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.scale(opts.flip ? -k : k, k);
  ctx.translate(-50, -100);
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  const rule = P.evenodd ? 'evenodd' : 'nonzero';
  if (opts.halo !== false) {
    ctx.strokeStyle = opts.haloColor || 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2.4 / k;
    ctx.lineJoin = 'round';
    ctx.stroke(P.body);
    if (P.extra) ctx.stroke(P.extra);
  }
  ctx.fillStyle = opts.color || '#121212';
  ctx.fill(P.body, rule);
  if (P.extra) ctx.fill(P.extra);
  if (opts.dashed) {
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(20,20,20,0.9)';
    ctx.lineWidth = 2 / k * 0.8;
    ctx.stroke(P.body);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Small standalone enemy icon as a data URL (wave previews). */
const iconCache = new Map();
export function enemyIcon(type, px = 26) {
  if (iconCache.has(type)) return iconCache.get(type);
  let url = '';
  try {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.width = c.height = Math.round(px * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const look = ENEMY_LOOK[type] || ENEMY_LOOK.grunt;
    const h = px * (0.5 + Math.min(0.45, look.h * 0.4));
    drawPiece(g, look.piece, px / 2, px * 0.96, Math.min(px * 0.95, h), { alpha: look.ghost ? 0.5 : 1, halo: false });
    url = c.toDataURL();
  } catch { /* ignore */ }
  iconCache.set(type, url);
  return url;
}

/** Tower icon (extruded letter) as a data URL, for cards. */
const towerIconCache = new Map();
export function towerIcon(spec, px = 64) {
  const key = `${spec.word?.[0]}|${spec.color || spec.element}|${px}`;
  if (towerIconCache.has(key)) return towerIconCache.get(key);
  const url = makeTowerIcon(spec, px);
  if (towerIconCache.size > 200) towerIconCache.clear();
  towerIconCache.set(key, url);
  return url;
}

function makeTowerIcon(spec, px) {
  try {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = px / 2.5;
    const spr = letterSprite(spec.word[0], spec.color || elementColor(spec.element), S, dpr);
    const c = document.createElement('canvas');
    c.width = c.height = Math.round(px * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const lx = px / 2 + S * 0.2, ly = px / 2 - S * 0.1;
    g.drawImage(spr.canvas, lx - spr.css / 2, ly - spr.css / 2, spr.css, spr.css);
    drawAsterisk(g, lx + spr.letterW / 2 + S * 0.08, ly - spr.asc / 2 + S * 0.04, S * 0.12);
    return c.toDataURL();
  } catch {
    return '';
  }
}
