// Canvas 2D board renderer — flat graph-paper diorama seen from above.
// Static ground (cached) + per-frame towers, chess-piece crowds, projectiles and FX.
import { hashString, mulberry32 } from '../core/rng.js';
import {
  letterSprite, rangeDisc, drawPiece, drawAsterisk, lookFor, elementColor,
  SANS, SHADOW_DIR,
} from './sprites.js';
import { rgba, mixHex } from './dom.js';

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------- biomes */
export const BIOMES = {
  paper:    { ground: '#eee8df', path: 'rgba(255,255,255,0.6)', minor: 'rgba(80,80,90,0.30)', major: 'rgba(214,150,80,0.42)', kinds: ['rock', 'water', 'rock', 'water', 'slab'] },
  sage:     { ground: '#b9d3a0', path: 'rgba(236,242,206,0.62)', minor: 'rgba(55,85,45,0.32)', major: 'rgba(205,150,90,0.40)', kinds: ['tree', 'tree', 'tree', 'rock'] },
  white:    { ground: '#f4f4f3', path: 'rgba(196,186,166,0.36)', minor: 'rgba(100,100,110,0.28)', major: 'rgba(205,160,110,0.30)', kinds: ['slab', 'slab', 'slab', 'slab', 'rock'] },
  lavender: { ground: '#dcd5ea', path: 'rgba(250,248,255,0.62)', minor: 'rgba(85,75,115,0.30)', major: 'rgba(205,140,120,0.32)', kinds: ['rock', 'slab', 'water'] },
};
export function biomeFor(element) {
  switch (element) {
    case 'nature': case 'earth': return 'sage';
    case 'water': case 'ice': return 'paper';
    case 'shadow': case 'arcane': return 'lavender';
    default: return 'white';
  }
}

/** Stable crowd offset for an enemy id: lateral in ±0.35 cells, small along-path jitter. */
function crowdOffset(id) {
  const h = hashString('e' + id);
  return { lat: ((h & 1023) / 1023 - 0.5) * 0.7, lon: (((h >>> 10) & 1023) / 1023 - 0.5) * 0.25 };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let level = null, biome = BIOMES.white;
  let cols = 16, rows = 10;
  let W = 0, H = 0, S = 1, dpr = 1, OX = 0, OY = 0;
  let staticLayer = null;
  let pathSet = new Set();
  const motion = new Map();   // enemy id → { x, y, dx, dy, sx, sy } (sx,sy = last drawn world pos)
  const trails = new Map();   // projectile id → [x,y,…]

  function setLevel(lvl) {
    level = lvl;
    cols = lvl.cols || 16;
    rows = lvl.rows || 10;
    biome = BIOMES[biomeFor(lvl.wordElement ?? lvl.element)];
    pathSet = new Set();
    for (const p of lvl.paths || []) for (const [x, y] of p) pathSet.add(x + ',' + y);
    motion.clear(); trails.clear();
    staticLayer = null;
    if (W > 0) layout();
  }

  function resize(cssW, cssH) {
    if (cssW == null) { cssW = W; cssH = H; staticLayer = null; }
    const nd = Math.min(2.5, window.devicePixelRatio || 1);
    if (Math.abs(cssW - W) < 0.5 && Math.abs(cssH - H) < 0.5 && nd === dpr && staticLayer) return;
    W = cssW; H = cssH; dpr = nd;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    if (level) layout();
  }

  function layout() {
    // keep a little air at the top so row-0 letters (which rise above their cell) aren't cut off
    S = Math.max(8, Math.min(W / cols, (H - 26) / rows));
    OX = Math.round((W - cols * S) / 2);
    OY = Math.round((H - rows * S) / 2);
    buildStatic();
  }

  const X = (x) => OX + x * S;
  const Y = (y) => OY + y * S;

  /* ------------------------------------------------------------ static layer */
  function cellRects(g, cells, inset, radius) {
    const set = new Set(cells.map(([x, y]) => x + ',' + y));
    const has = (x, y) => set.has(x + ',' + y);
    g.beginPath();
    for (const [x, y] of cells) {
      const l = has(x - 1, y), r = has(x + 1, y), t = has(x, y - 1), b = has(x, y + 1);
      const x0 = X(x) + (l ? 0 : inset), x1 = X(x + 1) - (r ? 0 : inset);
      const y0 = Y(y) + (t ? 0 : inset), y1 = Y(y + 1) - (b ? 0 : inset);
      const rr = [(!l && !t) ? radius : 0, (!r && !t) ? radius : 0, (!r && !b) ? radius : 0, (!l && !b) ? radius : 0];
      if (g.roundRect) g.roundRect(x0, y0, x1 - x0, y1 - y0, rr);
      else g.rect(x0, y0, x1 - x0, y1 - y0);
    }
  }

  function components(cells) {
    const set = new Map(cells.map((c) => [c[0] + ',' + c[1], c]));
    const seen = new Set();
    const out = [];
    for (const [k, c] of set) {
      if (seen.has(k)) continue;
      const comp = [];
      const stack = [c];
      seen.add(k);
      while (stack.length) {
        const [x, y] = stack.pop();
        comp.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nk = (x + dx) + ',' + (y + dy);
          if (set.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(set.get(nk)); }
        }
      }
      out.push(comp);
    }
    return out;
  }

  function buildStatic() {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const seed = level.seed ?? hashString(level.word || 'x');
    const rand = mulberry32(seed ^ 0x2c1b3c6d);

    g.fillStyle = biome.ground;
    g.fillRect(0, 0, W, H);

    // Worn path: slightly lighter ground, extended off-board from each spawn.
    const pathCells = [...pathSet].map((k) => k.split(',').map(Number));
    const ext = [];
    for (const p of level.paths || []) {
      if (p.length < 2) continue;
      const [x0, y0] = p[0], [x1, y1] = p[1];
      const dx = x0 - x1, dy = y0 - y1;
      for (let k = 1; k < 12; k++) ext.push([x0 + dx * k, y0 + dy * k]);
    }
    g.fillStyle = biome.path;
    cellRects(g, pathCells.concat(ext), S * 0.1, S * 0.32);
    g.fill();

    drawGrid(g, rand);

    // Scenery: blocked cells merged into components, plus decorative scenery in the margins.
    const items = [];
    const comps = components(level.blocked || []);
    for (const comp of comps) {
      const h = hashString(`${seed}:${comp[0][0]},${comp[0][1]}`);
      let kind = biome.kinds[h % biome.kinds.length];
      if (comp.length === 1 && (h >>> 8) % 3 === 0) kind = biome === BIOMES.sage ? 'bush' : 'cobble';
      items.push({ kind, cells: comp, h });
    }
    const mx0 = Math.floor(-OX / S) - 1, mx1 = Math.ceil((W - OX) / S) + 1;
    const my0 = Math.floor(-OY / S) - 1, my1 = Math.ceil((H - OY) / S) + 1;
    const extSet = new Set(ext.map(([x, y]) => x + ',' + y));
    for (let y = my0; y < my1; y++) {
      for (let x = mx0; x < mx1; x++) {
        if (x >= 0 && y >= 0 && x < cols && y < rows) continue;
        if (extSet.has(x + ',' + y)) continue;
        const h = hashString(`${seed}|m${x},${y}`);
        if (h % 100 < 22) items.push({ kind: biome.kinds[(h >>> 7) % biome.kinds.length], cells: [[x, y]], h, deco: true });
        else if (h % 100 < 28) items.push({ kind: biome === BIOMES.sage ? 'bush' : 'cobble', cells: [[x, y]], h, deco: true });
      }
    }

    // Shadows first, on one layer so overlaps don't double-darken.
    const sh = document.createElement('canvas');
    sh.width = c.width; sh.height = c.height;
    const sg = sh.getContext('2d');
    sg.setTransform(dpr, 0, 0, dpr, 0, 0);
    sg.fillStyle = '#000';
    for (const it of items) {
      const len = { slab: 0.42, rock: 0.55, tree: 0.95, bush: 0.08, cobble: 0.06, water: 0 }[it.kind] * S;
      if (!len) continue;
      const steps = Math.max(2, Math.ceil(len / 1.5));
      for (let i = 0; i <= steps; i++) {
        const k = (i / steps) * len;
        sg.save();
        sg.translate(SHADOW_DIR.x * k, SHADOW_DIR.y * k);
        silhouette(sg, it);
        sg.fill();
        sg.restore();
      }
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 0.16;
    g.drawImage(sh, 0, 0);
    g.restore();

    for (const it of items) drawItem(g, it);

    // Spawn chevrons and base markers.
    const bases = new Set();
    for (const p of level.paths || []) {
      if (!p.length) continue;
      drawSpawn(g, p);
      const key = p[p.length - 1].join(',');
      if (!bases.has(key)) { bases.add(key); drawBase(g, p[p.length - 1]); }
    }
    staticLayer = c;
  }

  function warp(x, y) {
    // a few soft hand-drawn wobbles
    return [x + Math.sin(y * 0.045 + 1.3) * 0.8 + Math.sin((x + y) * 0.013) * 1.4, y + Math.sin(x * 0.04 + 0.4) * 0.8 + Math.cos((x - y) * 0.011) * 1.4];
  }

  function drawGrid(g) {
    const minor = S / 4;
    const startX = OX - Math.ceil(OX / minor) * minor;
    const startY = OY - Math.ceil(OY / minor) * minor;
    g.lineWidth = 1;
    const seg = 10;
    const line = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len / seg));
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const [px, py] = warp(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    };
    g.setLineDash([1.1, 2.4]);
    for (let i = 0, x = startX; x <= W + 1; i++, x += minor) {
      const isMajor = Math.abs(((x - OX) / S) - Math.round((x - OX) / S)) < 0.01;
      g.strokeStyle = isMajor ? biome.major : biome.minor;
      line(x, 0, x, H);
    }
    for (let i = 0, y = startY; y <= H + 1; i++, y += minor) {
      const isMajor = Math.abs(((y - OY) / S) - Math.round((y - OY) / S)) < 0.01;
      g.strokeStyle = isMajor ? biome.major : biome.minor;
      line(0, y, W, y);
    }
    g.setLineDash([]);
  }

  /** Path of an item's outline (for shadows and fills). */
  function silhouette(g, it) {
    if (it.kind === 'slab' || it.kind === 'water') {
      cellRects(g, it.cells, it.kind === 'water' ? S * 0.04 : S * 0.07, it.kind === 'water' ? S * 0.42 : S * 0.06);
    } else if (it.kind === 'rock') {
      g.beginPath();
      for (const poly of rockPolys(it)) polyPath(g, poly[0]);
    } else if (it.kind === 'tree') {
      g.beginPath();
      for (const d of treeDiscs(it)) { g.moveTo(d.x + d.r, d.y); g.arc(d.x, d.y, d.r, 0, TAU); }
    } else if (it.kind === 'bush') {
      g.beginPath();
      for (const d of bushDots(it)) { g.moveTo(d.x + d.r, d.y); g.arc(d.x, d.y, d.r, 0, TAU); }
    } else if (it.kind === 'cobble') {
      g.beginPath();
      for (const q of cobbles(it)) g.rect(q.x, q.y, q.s, q.s);
    }
  }

  function polyPath(g, pts) {
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  }

  function rockPolys(it) {
    if (it._rocks) return it._rocks;
    const xs = it.cells.map((c) => c[0]), ys = it.cells.map((c) => c[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs) + 1, by0 = Math.min(...ys), by1 = Math.max(...ys) + 1;
    const rect = (bx1 - bx0) * (by1 - by0) === it.cells.length;
    const boxes = rect ? [[bx0, by0, bx1, by1]] : it.cells.map(([x, y]) => [x, y, x + 1, y + 1]);
    const rnd = mulberry32(it.h);
    it._rocks = boxes.map(([x0, y0, x1, y1]) => {
      const cx = X((x0 + x1) / 2), cy = Y((y0 + y1) / 2);
      const rx = (x1 - x0) * S * 0.47, ry = (y1 - y0) * S * 0.47;
      const n = 7 + Math.floor(rnd() * 3), a0 = rnd() * TAU;
      const base = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * TAU + (rnd() - 0.5) * 0.3, k = 0.86 + rnd() * 0.14;
        base.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
      }
      // concentric facets pulled toward a highlight point (upper right)
      const hx = cx + rx * 0.18, hy = cy - ry * 0.2;
      const ring = (f) => base.map(([x, y]) => [hx + (x - hx) * f, hy + (y - hy) * f]);
      return [base, ring(0.74), ring(0.42)];
    });
    return it._rocks;
  }

  function treeDiscs(it) {
    if (it._trees) return it._trees;
    const rnd = mulberry32(it.h);
    it._trees = it.cells.map(([x, y]) => ({
      x: X(x + 0.5) + (rnd() - 0.5) * S * 0.08, y: Y(y + 0.5) + (rnd() - 0.5) * S * 0.08, r: S * (0.43 + rnd() * 0.08),
    }));
    return it._trees;
  }

  function bushDots(it) {
    if (it._bush) return it._bush;
    const rnd = mulberry32(it.h);
    const [x, y] = it.cells[0];
    const out = [];
    const n = 6 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) out.push({ x: X(x + 0.2 + rnd() * 0.6), y: Y(y + 0.2 + rnd() * 0.6), r: S * (0.045 + rnd() * 0.04) });
    it._bush = out;
    return out;
  }

  function cobbles(it) {
    if (it._cob) return it._cob;
    const [x, y] = it.cells[0];
    const out = [];
    const s = S * 0.12, gap = S * 0.035;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out.push({ x: X(x + 0.5) - 1.5 * s - gap + i * (s + gap), y: Y(y + 0.5) - 1.5 * s - gap + j * (s + gap), s });
    it._cob = out;
    return out;
  }

  function drawItem(g, it) {
    g.save();
    switch (it.kind) {
      case 'slab': {
        silhouette(g, it);
        g.fillStyle = '#d8d8d8';
        g.fill();
        g.save();
        g.clip();
        g.strokeStyle = 'rgba(0,0,0,0.075)';
        g.lineWidth = 1.2;
        const span = W + H;
        for (let k = -span; k < span; k += 5) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke(); }
        g.strokeStyle = '#eeeeee';
        g.lineWidth = Math.max(3, S * 0.06);
        silhouette(g, it);
        g.stroke();
        g.restore();
        break;
      }
      case 'water': {
        silhouette(g, it);
        g.strokeStyle = '#8c96a0';
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = '#80b7dc';
        g.fill();
        const bands = [['#71aad4', 0.16], ['#629dca', 0.28]];
        for (const [col, ins] of bands) {
          if (it.cells.length < 2 && ins > 0.2) break;
          cellRects(g, it.cells, S * ins, S * 0.4);
          g.fillStyle = col;
          g.fill();
        }
        break;
      }
      case 'rock': {
        for (const [a, b, c] of rockPolys(it)) {
          g.beginPath(); polyPath(g, a);
          g.fillStyle = '#c9c7c4'; g.fill();
          g.strokeStyle = '#8f8d8a'; g.lineWidth = 1.6; g.stroke();
          g.beginPath(); polyPath(g, b); g.fillStyle = '#d8d6d3'; g.fill();
          g.beginPath(); polyPath(g, c); g.fillStyle = '#e8e6e3'; g.fill();
        }
        break;
      }
      case 'tree': {
        for (const d of treeDiscs(it)) {
          g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU);
          g.fillStyle = '#477a3b'; g.fill();
          g.strokeStyle = '#949c8d'; g.lineWidth = 2; g.stroke();
          g.beginPath(); g.arc(d.x + d.r * 0.04, d.y + d.r * 0.02, d.r * 0.72, 0, TAU); g.fillStyle = '#548848'; g.fill();
          g.beginPath(); g.arc(d.x + d.r * 0.06, d.y + d.r * 0.03, d.r * 0.42, 0, TAU); g.fillStyle = '#5f9353'; g.fill();
        }
        break;
      }
      case 'bush': {
        for (const d of bushDots(it)) {
          g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU);
          g.fillStyle = '#78c07a'; g.fill();
          g.beginPath(); g.arc(d.x + d.r * 0.25, d.y - d.r * 0.25, d.r * 0.45, 0, TAU);
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill();
        }
        break;
      }
      case 'cobble': {
        for (const q of cobbles(it)) {
          g.fillStyle = '#5a5c60';
          g.fillRect(q.x, q.y, q.s, q.s);
          g.strokeStyle = 'rgba(255,255,255,0.25)';
          g.lineWidth = 1;
          g.strokeRect(q.x + 1.5, q.y + 1.5, q.s - 3, q.s - 3);
        }
        break;
      }
      default: break;
    }
    g.restore();
  }

  function drawSpawn(g, p) {
    const [x0, y0] = p[0];
    const [x1, y1] = p[1] || [x0 + 1, y0];
    const ang = Math.atan2(y1 - y0, x1 - x0);
    g.save();
    g.translate(X(x0 + 0.5), Y(y0 + 0.5));
    g.rotate(ang);
    g.strokeStyle = 'rgba(30,30,30,0.35)';
    g.lineWidth = Math.max(2, S * 0.05);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 2; i++) {
      const ox = -S * 0.12 + i * S * 0.2;
      g.beginPath(); g.moveTo(ox - S * 0.08, -S * 0.12); g.lineTo(ox + S * 0.04, 0); g.lineTo(ox - S * 0.08, S * 0.12); g.stroke();
    }
    g.restore();
  }

  function drawBase(g, [bx, by]) {
    const cx = X(bx + 0.5), cy = Y(by + 0.5), r = S * 0.34;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.beginPath(); g.arc(cx + SHADOW_DIR.x * S * 0.08, cy + SHADOW_DIR.y * S * 0.08, r, 0, TAU); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.strokeStyle = '#9aa0a8'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(cx, cy, r * 0.78, 0, TAU); g.strokeStyle = '#d64933'; g.lineWidth = Math.max(1.5, S * 0.03); g.stroke();
    drawAsterisk(g, cx, cy, r * 0.45, '#111');
    g.restore();
  }

  /* --------------------------------------------------------------- per frame */
  function enemyView(e) {
    let m = motion.get(e.id);
    if (!m) { m = { x: e.x, y: e.y, dx: 1, dy: 0, sx: e.x, sy: e.y, off: crowdOffset(e.id) }; motion.set(e.id, m); }
    const dx = e.x - m.x, dy = e.y - m.y, d = Math.hypot(dx, dy);
    if (d > 0.0005 && d < 2) { m.dx += (dx / d - m.dx) * 0.25; m.dy += (dy / d - m.dy) * 0.25; }
    m.x = e.x; m.y = e.y;
    const n = Math.hypot(m.dx, m.dy) || 1;
    const ux = m.dx / n, uy = m.dy / n;
    let wx = e.x, wy = e.y;
    if (!e.boss) {
      const o = m.off;
      const prog = e.progress ?? 2;
      const k = Math.min(1, Math.max(0, prog / 1.2));
      const ease = k * k * (3 - 2 * k);
      wx += (-uy * o.lat + ux * o.lon) * ease;
      wy += (ux * o.lat + uy * o.lon) * ease;
    }
    m.sx = wx; m.sy = wy;
    m.ux = ux; m.uy = uy;
    return { x: wx, y: wy, ux, uy };
  }

  function draw(f) {
    const { state, t, fx } = f;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sh = fx.shake;
    const ox = sh > 0 ? (Math.random() - 0.5) * sh * S * 0.3 : 0;
    const oy = sh > 0 ? (Math.random() - 0.5) * sh * S * 0.3 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
    if (staticLayer) ctx.drawImage(staticLayer, 0, 0, W, H);
    else { ctx.fillStyle = '#f4f4f3'; ctx.fillRect(0, 0, W, H); }
    if (!state) return;

    // Grid bulges from blasts: magnify a disc of the ground for a moment.
    for (const b of fx.bulges()) {
      const r = b.r * S, k = b.k;
      const cx = X(b.x), cy = Y(b.y);
      const m = 1 - 0.14 * k;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
      ctx.drawImage(staticLayer, (cx - r * m) * dpr, (cy - r * m) * dpr, 2 * r * m * dpr, 2 * r * m * dpr, cx - r, cy - r, 2 * r, 2 * r);
      ctx.restore();
    }

    // Always-on fields for aura/support towers.
    for (const tw of state.towers) {
      const a = tw.spec?.archetype;
      if ((a === 'aura' || a === 'support') && !tw.disabled && tw.stats?.range) drawDisc(tw.x, tw.y, tw.stats.range, elementColor(tw.element), 0.16);
    }
    if (f.rangeTower) {
      const tw = f.rangeTower;
      drawDisc(tw.x, tw.y, tw.stats?.range || 0, elementColor(tw.element), 0.28);
    }
    const gh = f.ghost;
    if (gh && gh.mode === 'tower' && gh.spec?.stats?.range) {
      drawDisc(gh.cx + 0.5, gh.cy + 0.5, gh.spec.stats.range, gh.ok ? elementColor(gh.spec.element) : '#d0402b', gh.ok ? 0.3 : 0.22);
    }
    if (gh && gh.mode === 'augment') {
      const tw = state.towers.find((x) => x.id === gh.targetId);
      if (tw) drawDisc(tw.x, tw.y, (tw.stats?.range || 0) * (gh.spec?.augment?.mods?.range || 1), gh.ok ? '#f59a1b' : '#d0402b', 0.26);
    }

    // Buildable hints while a tower word is ready.
    if (f.buildable) {
      ctx.fillStyle = 'rgba(30,30,30,0.18)';
      for (const [cx, cy] of f.buildable) {
        const px = X(cx + 0.5), py = Y(cy + 0.5), s = S * 0.06;
        ctx.fillRect(px - s, py - 0.75, s * 2, 1.5);
        ctx.fillRect(px - 0.75, py - s, 1.5, s * 2);
      }
    }

    // Augment candidates.
    if (f.augmentable) {
      for (const tw of state.towers) {
        if (!f.augmentable.has(tw.id)) continue;
        const hot = gh && gh.targetId === tw.id;
        ctx.save();
        ctx.strokeStyle = hot ? (gh.ok ? '#f59a1b' : '#d0402b') : 'rgba(245,154,27,0.7)';
        ctx.lineWidth = hot ? 3 : 1.5;
        ctx.setLineDash(hot ? [] : [5, 4]);
        ctx.lineDashOffset = -t * 14;
        ctx.beginPath(); ctx.arc(X(tw.x), Y(tw.y), S * 0.58, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }

    // Tower letters (all letters first; labels later so clusters stay legible).
    const towers = state.towers.slice().sort((a, b) => a.y - b.y || b.x - a.x);
    for (const tw of towers) drawTowerLetter(tw, fx, t);
    if (gh && gh.mode === 'tower') {
      ctx.save();
      ctx.globalAlpha = gh.ok ? 0.7 : 0.45;
      const spr = letterSprite(gh.spec.word[0], gh.ok ? (gh.spec.color || elementColor(gh.spec.element)) : '#d0402b', S, dpr);
      ctx.drawImage(spr.canvas, X(gh.cx + 0.5) - spr.css / 2, Y(gh.cy + 0.5) - spr.css / 2 - S * 0.08, spr.css, spr.css);
      ctx.restore();
    }

    // Summoned defenders: white pawns.
    for (const u of state.units || []) {
      const px = X(u.x), py = Y(u.y) + S * 0.14;
      drawPiece(ctx, 'pawn', px, py, S * 0.3, { color: '#ffffff', haloColor: 'rgba(20,20,20,0.85)' });
      if (u.maxHp > 0 && u.hp < u.maxHp) hpBar(px, py - S * 0.36, S * 0.3, u.hp / u.maxHp, false);
    }

    // Enemies: black chess pieces in loose crowds.
    const views = [];
    for (const e of state.enemies) views.push([e, enemyView(e)]);
    views.sort((a, b) => a[1].y - b[1].y);
    for (const [e, v] of views) drawEnemy(e, v, t);
    if (motion.size > state.enemies.length + 60) {
      const live = new Set(state.enemies.map((e) => e.id));
      for (const id of motion.keys()) if (!live.has(id)) motion.delete(id);
    }

    // Projectiles: orange darts with a faint trail.
    const liveP = new Set();
    for (const p of state.projectiles || []) {
      liveP.add(p.id);
      let tr = trails.get(p.id);
      if (!tr) { tr = []; trails.set(p.id, tr); }
      tr.push(p.x, p.y);
      if (tr.length > 14) tr.splice(0, 2);
      const n = tr.length;
      const vx = n >= 4 ? tr[n - 2] - tr[n - 4] : (p.tx - p.x), vy = n >= 4 ? tr[n - 1] - tr[n - 3] : (p.ty - p.y);
      const ang = Math.atan2(vy, vx);
      const col = elementColor(p.element);
      if (n >= 4) {
        ctx.save();
        ctx.lineCap = 'round';
        const g = ctx.createLinearGradient(X(tr[0]), Y(tr[1]), X(p.x), Y(p.y));
        g.addColorStop(0, 'rgba(255,220,160,0)');
        g.addColorStop(1, 'rgba(255,214,150,0.55)');
        ctx.strokeStyle = g;
        ctx.lineWidth = S * (p.kind === 'blast' ? 0.09 : 0.05);
        ctx.beginPath(); ctx.moveTo(X(tr[0]), Y(tr[1]));
        for (let i = 2; i < n; i += 2) ctx.lineTo(X(tr[i]), Y(tr[i + 1]));
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(X(p.x), Y(p.y));
      if (p.kind === 'blast') {
        ctx.fillStyle = '#f07a1e';
        ctx.beginPath(); ctx.arc(0, 0, S * 0.075, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,200,0.9)';
        ctx.beginPath(); ctx.arc(-S * 0.02, -S * 0.02, S * 0.03, 0, TAU); ctx.fill();
      } else {
        ctx.rotate(ang);
        const l = S * (p.kind === 'rapid' ? 0.13 : 0.18), w = S * 0.035;
        ctx.fillStyle = mixHex('#ef5a1c', col, 0.25);
        ctx.beginPath(); ctx.moveTo(l * 0.5, 0); ctx.lineTo(-l * 0.1, -w); ctx.lineTo(-l * 0.5, 0); ctx.lineTo(-l * 0.1, w); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,245,220,0.8)';
        ctx.beginPath(); ctx.arc(l * 0.15, 0, w * 0.45, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    for (const id of trails.keys()) if (!liveP.has(id)) trails.delete(id);

    // Beams: continuous lines to the target.
    for (const tw of towers) {
      if (tw.spec?.archetype !== 'beam' || tw.disabled || tw.targetId == null) continue;
      const v = motion.get(tw.targetId);
      if (!v) continue;
      const vx = v.sx, vy = v.sy;
      const col = elementColor(tw.element);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(col, 0.45 + 0.15 * Math.sin(t * 30));
      ctx.lineWidth = S * 0.07;
      ctx.beginPath(); ctx.moveTo(X(tw.x), Y(tw.y) - S * 0.1); ctx.lineTo(X(vx), Y(vy) - S * 0.12); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = S * 0.022;
      ctx.stroke();
      ctx.restore();
    }

    fx.drawWorld(ctx, X, Y, S);

    // Labels, asterisks and health bars over everything else.
    for (const tw of towers) drawTowerLabel(tw);
    if (gh && gh.mode === 'augment') {
      const tw = state.towers.find((x) => x.id === gh.targetId);
      if (tw) {
        const label = gh.ok ? `+ ${gh.spec.word.toUpperCase()}` : (gh.reason || "Can't augment");
        ctx.save();
        ctx.font = `700 ${Math.max(11, S * 0.19)}px ${SANS}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = ctx.measureText(label).width + 18, h = Math.max(20, S * 0.32);
        const lx = X(tw.x), ly = Y(tw.y) - S * 0.85;
        ctx.fillStyle = gh.ok ? '#f59a1b' : '#d0402b';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lx - w / 2, ly - h / 2, w, h, h / 2); else ctx.rect(lx - w / 2, ly - h / 2, w, h);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(label, lx, ly + 1);
        ctx.restore();
      }
    }
    if (gh && gh.mode === 'tower' && !gh.ok) {
      const px = X(gh.cx + 0.5), py = Y(gh.cy + 0.5);
      ctx.strokeStyle = 'rgba(208,64,43,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px - S * 0.18, py + S * 0.24); ctx.lineTo(px + S * 0.18, py + S * 0.6);
      ctx.moveTo(px + S * 0.18, py + S * 0.24); ctx.lineTo(px - S * 0.18, py + S * 0.6);
      ctx.stroke();
    }
    if (f.hoverCell && !gh) {
      const { cx, cy } = f.hoverCell;
      ctx.strokeStyle = 'rgba(20,20,20,0.18)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(X(cx) + 3, Y(cy) + 3, S - 6, S - 6);
    }

    fx.drawTexts(ctx, X, Y, S);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.drawOverlay(ctx, W, H);
  }

  function drawDisc(x, y, range, col, alpha) {
    if (!range) return;
    const d = rangeDisc(col, range * S, dpr, alpha);
    ctx.drawImage(d.canvas, X(x) - d.css / 2, Y(y) - d.css / 2, d.css, d.css);
  }

  function drawTowerLetter(tw, fx, t) {
    const col = elementColor(tw.element, tw.spec?.color);
    const spr = letterSprite(tw.word[0], col, S, dpr, tw.disabled);
    const age = fx.stampAge(tw.id);
    let sc = 1, lift = 0;
    if (age < 0.32) { const k = 1 - age / 0.32; sc = 1 + k * k * 0.25; lift = -k * k * S * 0.35; }
    const size = spr.css * sc;
    ctx.save();
    if (tw.disabled) ctx.globalAlpha = 0.6;
    ctx.drawImage(spr.canvas, X(tw.x) - size / 2, Y(tw.y) - size / 2 - S * 0.08 + lift, size, size);
    ctx.restore();
    tw.__lw = spr.letterW;
  }

  function drawTowerLabel(tw) {
    const px = X(tw.x), py = Y(tw.y);
    const lw = tw.__lw || S * 0.7;
    drawAsterisk(ctx, px + lw / 2 + S * 0.04, py - S * 0.46, Math.max(3, S * 0.065), tw.disabled ? '#777' : '#111');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let fs = Math.max(9, S * 0.19);
    ctx.font = `700 ${fs}px ${SANS}`;
    const word = tw.word.toUpperCase();
    const maxW = S * 1.5;
    const w = ctx.measureText(word).width;
    if (w > maxW) { fs = Math.max(7, fs * maxW / w); ctx.font = `700 ${fs}px ${SANS}`; }
    const by = py + S * 0.3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeText(word, px, by);
    ctx.fillStyle = tw.disabled ? '#6b6b6b' : '#111';
    ctx.fillText(word, px, by);
    // augment words stack ABOVE the base word as tiny grey caps
    const augs = tw.augments || [];
    if (augs.length) {
      const afs = Math.max(7, S * 0.12);
      ctx.font = `600 ${afs}px ${SANS}`;
      for (let i = 0; i < augs.length; i++) {
        const txt = String(augs[augs.length - 1 - i].word || '').toUpperCase();
        const y = by - fs * 0.95 - i * afs * 1.02;
        ctx.strokeText(txt, px, y);
        ctx.fillStyle = '#6f7177';
        ctx.fillText(txt, px, y);
      }
    }
    ctx.restore();
    if (tw.maxHp > 0 && tw.hp < tw.maxHp) hpBar(px, by + S * 0.08, S * 0.6, tw.hp / tw.maxHp, false);
    if (tw.shield > 0) {
      ctx.strokeStyle = 'rgba(90,169,214,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, S * 0.55, 0, TAU); ctx.stroke();
    }
  }

  function hpBar(cx, y, w, frac, boss) {
    const h = boss ? Math.max(5, S * 0.07) : 3;
    frac = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = 'rgba(90,92,98,0.75)';
    ctx.fillRect(cx - w / 2, y, w, h);
    ctx.fillStyle = frac > 0.3 ? '#5cc15a' : '#e0612b';
    ctx.fillRect(cx - w / 2, y, w * frac, h);
  }

  function drawEnemy(e, v, t) {
    const look = lookFor(e);
    const h = look.h * S;
    const px = X(v.x);
    let py = Y(v.y) + h * 0.42;
    const st = e.statuses || {};
    const frozen = st.freeze > 0, slowed = st.slow > 0, poisoned = st.poison > 0, burning = st.burn > 0, stunned = st.stun > 0;
    let color = '#121212';
    if (frozen) color = '#5f86e8';
    else if (slowed) color = '#3d5aa8';
    else if (poisoned) color = '#2f5e2a';
    const bob = frozen || stunned ? 0 : Math.abs(Math.sin(t * 9 + e.id)) * S * 0.025;
    if (look.float) {
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      ctx.beginPath(); ctx.ellipse(px - S * 0.06, py + S * 0.04, h * 0.3, h * 0.1, 0, 0, TAU); ctx.fill();
      py -= S * 0.14 + Math.sin(t * 5 + e.id) * S * 0.02;
    }
    const ghost = look.ghost && !e.revealed;
    drawPiece(ctx, look.piece, px, py - bob, h, {
      color, flip: look.piece === 'knight' && v.ux > 0.2,
      alpha: look.ghost ? (e.revealed ? 0.6 : 0.28) : 1, dashed: look.ghost, halo: !ghost,
    });
    if (look.band) {
      ctx.fillStyle = '#a3a8b0';
      ctx.fillRect(px - h * 0.2, py - bob - h * 0.47, h * 0.4, h * 0.06);
    }
    if (look.plus) {
      ctx.fillStyle = '#5cc15a';
      const s = h * 0.1, cy = py - bob - h * 1.12;
      ctx.fillRect(px - s, cy - s * 0.35, s * 2, s * 0.7);
      ctx.fillRect(px - s * 0.35, cy - s, s * 0.7, s * 2);
    }
    if (look.split) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px, py - bob - h * 0.15); ctx.lineTo(px + h * 0.05, py - bob - h * 0.5); ctx.lineTo(px - h * 0.03, py - bob - h * 0.75); ctx.stroke();
    }
    if (burning) {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 2.4 + i / 3 + e.id * 0.17) % 1;
        ctx.fillStyle = i % 2 ? `rgba(255,170,40,${0.9 - ph * 0.8})` : `rgba(240,90,30,${0.9 - ph * 0.8})`;
        ctx.beginPath();
        ctx.arc(px + Math.sin(i * 2.3 + e.id) * h * 0.25, py - bob - h * (0.5 + ph * 0.7), h * 0.07 * (1 - ph * 0.5), 0, TAU);
        ctx.fill();
      }
    }
    if (stunned) {
      ctx.fillStyle = '#f2b616';
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i / 3) * TAU;
        ctx.beginPath(); ctx.arc(px + Math.cos(a) * h * 0.3, py - h * 1.08 + Math.sin(a) * h * 0.08, Math.max(1.5, h * 0.05), 0, TAU); ctx.fill();
      }
    }
    if (e.boss) hpBar(px, py - h * 1.12, Math.max(S * 0.9, h * 0.9), e.hp / e.maxHp, true);
    else if (e.maxHp > 0 && e.hp < e.maxHp && !ghost) hpBar(px, py - h * 1.08 - (look.plus ? h * 0.15 : 0), Math.max(S * 0.3, h * 0.7), e.hp / e.maxHp, false);
  }

  function cellAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left - OX) / S, y = (clientY - r.top - OY) / S;
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return null;
    return { cx, cy, x, y };
  }

  /** Canvas-relative CSS px of a world point. */
  function toScreen(x, y) { return { x: X(x), y: Y(y) }; }

  return {
    setLevel, resize, draw, cellAt, toScreen,
    /** Last drawn (crowd-offset) world position of an enemy, for death FX. */
    enemyPos(id) { const m = motion.get(id); return m ? { x: m.sx, y: m.sy } : null; },
  };
}

