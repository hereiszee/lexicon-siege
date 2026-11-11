// Title, level select, dictionary (lexicon), result modal, error and loading screens.
import { h, clear, cap } from './dom.js';
import { towerCard } from './card.js';
import { ruleText, ENEMY_INFO, waveCounts } from './describe.js';
import { letterSprite, drawAsterisk, drawPiece, elementColor, SANS, enemyIcon } from './sprites.js';
import { RARITIES, LETTER_VALUES } from '../core/constants.js';

/* ----------------------------------------------------------- graph paper bg */
const gridCache = new Map();
/** Dotted graph-paper tile as a CSS url(): minor lines every `cell/4`, accented major lines. */
export function gridTile(minor = 'rgba(80,80,90,0.30)', major = 'rgba(214,150,80,0.42)', cell = 72) {
  const key = minor + major + cell;
  if (gridCache.has(key)) return gridCache.get(key);
  let url = 'none';
  try {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.width = c.height = Math.round(cell * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const step = cell / 4;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i === 0 ? major : minor;
      for (let p = 0; p < cell; p += 3.5) {
        g.fillRect(i * step, p, 1, 1.1);
        g.fillRect(p, i * step, 1.1, 1);
      }
    }
    url = `url(${c.toDataURL()})`;
  } catch { /* ignore */ }
  gridCache.set(key, url);
  return url;
}

export function paperBg(el, ground = '#f4f4f3', minor, major) {
  el.style.backgroundColor = ground;
  el.style.backgroundImage = gridTile(minor, major);
  el.style.backgroundSize = '72px 72px';
}

function modalShell({ title, sub, body, wide }) {
  return h('div', { class: 'modal-wrap' },
    h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' },
      h('header', { class: 'modal-bar' }, h('div', { class: 'modal-title' }, title), sub ? h('div', { class: 'modal-sub' }, sub) : null),
      h('div', { class: 'modal-body' }, body)));
}

/* -------------------------------------------------------------------- title */
export function titleScreen(root, { onPlay, onLevels, onDictionary, status, continueLevel }) {
  const canvas = h('canvas', { class: 'title-canvas' });
  const statusEl = h('div', { class: 'title-status' }, status || '');
  const btnPlay = h('button', { class: 'pill primary big', onclick: onPlay }, continueLevel > 1 ? `CONTINUE · LEVEL ${continueLevel}` : 'PLAY');
  const btnLevels = h('button', { class: 'pill slate big', onclick: onLevels }, 'LEVELS');
  const btnDict = h('button', { class: 'pill outline big', onclick: onDictionary }, 'DICTIONARY');
  const screen = h('div', { class: 'screen title' },
    canvas,
    h('div', { class: 'title-ui' },
      h('h1', { class: 'sr-only' }, 'Lexicon Siege'),
      h('p', { class: 'tagline' }, 'Every word is a tower. Spell to defend.'),
      h('div', { class: 'title-btns' }, btnPlay, btnLevels, btnDict),
      statusEl,
      h('p', { class: 'title-help' }, 'Type words from your tiles · Enter to make a word · click the map to build · Space starts a wave')));
  paperBg(screen, '#b9d3a0', 'rgba(55,85,45,0.30)', 'rgba(205,150,90,0.40)');
  root.appendChild(screen);

  let raf = 0, t0 = 0, alive = true;
  const word = 'LEXICON';
  const colors = ['#d9482b', '#d9a514', '#5aa9d6', '#4f9d4a', '#8a63d2', '#f0901e', '#c2478f'];
  function draw(ts) {
    if (!alive) return;
    raf = requestAnimationFrame(draw);
    if (!t0) t0 = ts;
    const t = (ts - t0) / 1000;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    const S = Math.min(r.width / (word.length + 2.2), r.height * 0.2, 140);
    const cy = r.height * 0.3;
    const x0 = r.width / 2 - (word.length - 1) * S * 0.5;
    // marching crowd under the title
    const lane = r.height * 0.56;
    for (let i = 0; i < 26; i++) {
      const sp = 30 + (i % 5) * 6;
      const x = ((i * 97 + t * sp) % (r.width + 160)) - 80;
      const y = lane + Math.sin(i * 1.7) * S * 0.25 + (i % 3) * 6;
      const kind = i % 9 === 0 ? 'knight' : i % 13 === 0 ? 'rook' : 'pawn';
      drawPiece(g, kind, x, y + Math.abs(Math.sin(t * 6 + i)) * -2, S * (kind === 'pawn' ? 0.3 : 0.38), { flip: true });
    }
    for (let i = 0; i < word.length; i++) {
      const spr = letterSprite(word[i], colors[i], S, dpr);
      const bob = Math.sin(t * 1.4 + i * 0.6) * S * 0.03;
      g.drawImage(spr.canvas, x0 + i * S - spr.css / 2, cy - spr.css / 2 + bob, spr.css, spr.css);
    }
    const last = letterSprite(word[word.length - 1], colors[word.length - 1], S, dpr);
    drawAsterisk(g, x0 + (word.length - 1) * S + last.letterW / 2 + S * 0.06, cy - S * 0.44, S * 0.08);
    g.font = `700 ${Math.max(16, S * 0.34)}px ${SANS}`;
    g.textAlign = 'center';
    g.fillStyle = '#111';
    g.save();
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(S * 0.12)}px`;
    g.fillText('SIEGE', r.width / 2, cy + S * 1.0);
    g.restore();
  }
  raf = requestAnimationFrame(draw);

  return {
    setStatus(text, kind = '') { statusEl.textContent = text; statusEl.className = 'title-status ' + kind; },
    destroy() { alive = false; cancelAnimationFrame(raf); screen.remove(); },
  };
}

/* ------------------------------------------------------------- level select */
export function levelSelectScreen(root, { levelFor, LEVEL_COUNT, chapterOf, save, onPick, onBack, onDictionary, initialLevel }) {
  const PAGE = 50;
  const pages = Math.ceil(LEVEL_COUNT / PAGE);
  let page = Math.floor(((initialLevel || save.highestUnlocked()) - 1) / PAGE);
  const cache = new Map();
  const spec = (n) => {
    if (!cache.has(n)) { try { cache.set(n, levelFor(n)); } catch { cache.set(n, null); } }
    return cache.get(n);
  };
  const pageBar = h('nav', { class: 'pages', 'aria-label': 'Level pages' });
  const grid = h('div', { class: 'ls-grid' });
  const info = h('div', { class: 'ls-info' }, 'Hover a level to see its rules.');
  const totals = h('div', { class: 'ls-totals' });
  const screen = h('div', { class: 'screen levels' },
    h('header', { class: 'ls-head' },
      h('button', { class: 'pill ghost small', onclick: onBack }, '‹ BACK'),
      h('h2', null, 'Levels'), totals, h('span', { class: 'flex' }),
      h('button', { class: 'pill slate small', onclick: onDictionary }, 'DICTIONARY')),
    pageBar, grid, info);
  paperBg(screen);
  root.appendChild(screen);

  function renderPages() {
    clear(pageBar);
    const hi = save.highestUnlocked();
    for (let p = 0; p < pages; p++) {
      const a = p * PAGE + 1, b = Math.min(LEVEL_COUNT, (p + 1) * PAGE);
      const locked = a > hi;
      pageBar.appendChild(h('button', {
        class: 'pg' + (p === page ? ' on' : '') + (locked ? ' locked' : ''),
        onclick: () => { page = p; render(); },
        title: `Levels ${a}–${b}`,
      }, `${a}–${b}`));
    }
  }

  function render() {
    renderPages();
    totals.textContent = `★ ${save.totalStars()} / ${LEVEL_COUNT * 3}`;
    clear(grid);
    const hi = save.highestUnlocked();
    for (let c = 0; c < PAGE / 10; c++) {
      const first = page * PAGE + c * 10 + 1;
      if (first > LEVEL_COUNT) break;
      const ch = chapterOf ? (() => { try { return chapterOf(first); } catch { return null; } })() : null;
      const row = h('div', { class: 'chapter' },
        h('div', { class: 'ch-label' }, h('span', { class: 'ch-n' }, `CHAPTER ${Math.ceil(first / 10)}`), ch?.theme ? h('span', { class: 'ch-t' }, ch.theme) : null));
      const tiles = h('div', { class: 'ch-tiles' });
      for (let n = first; n < first + 10 && n <= LEVEL_COUNT; n++) {
        const unlocked = save.isUnlocked(n);
        const stars = save.starsFor(n);
        const boss = n % 10 === 0;
        const lv = unlocked ? spec(n) : null;
        const word = lv ? (lv.title || lv.word || '') : '';
        const el = h('button', {
          class: 'lvl-tile' + (unlocked ? '' : ' locked') + (boss ? ' boss' : '') + (n === hi && unlocked ? ' current' : ''),
          disabled: !unlocked,
          onclick: () => unlocked && onPick(n),
          onmouseenter: () => showInfo(n, lv, unlocked),
          onfocus: () => showInfo(n, lv, unlocked),
          'aria-label': unlocked ? `Level ${n} ${word}, ${stars} stars` : `Level ${n}, locked`,
        },
        lv ? h('span', { class: 'stripe', style: { background: elementColor(lv.element) } }) : null,
        h('span', { class: 'num' }, String(n)),
        h('span', { class: 'word' }, unlocked ? word.toUpperCase() : 'LOCKED'),
        h('span', { class: 'stars' }, [1, 2, 3].map((i) => h('i', { class: i <= stars ? 'on' : '' }, '★'))),
        boss ? h('span', { class: 'crown', title: 'Boss level' }, '♚') : null);
        tiles.appendChild(el);
      }
      row.appendChild(tiles);
      grid.appendChild(row);
    }
  }

  function showInfo(n, lv, unlocked) {
    clear(info);
    if (!unlocked) { info.append(h('b', null, `Level ${n}`), ' — locked. Win the level before it to open it.'); return; }
    if (!lv) { info.append(`Level ${n}`); return; }
    const counts = new Map();
    for (const w of lv.waves || []) for (const [k, n] of waveCounts(w)) counts.set(k, (counts.get(k) || 0) + n);
    info.append(
      h('b', null, `${n} · ${(lv.title || lv.word).toUpperCase()}`),
      h('span', { class: 'sep' }, `${(lv.waves || []).length} waves · enemies are ${lv.element}`),
      h('span', { class: 'sep' }, (lv.rules || []).length ? lv.rules.map(ruleText).join(' · ') : 'No special rules'),
      lv.bonus?.text ? h('span', { class: 'sep' }, lv.bonus.text) : null,
      h('span', { class: 'sep icons' }, [...counts.keys()].slice(0, 6).map((k) => h('img', { src: enemyIcon(k), alt: ENEMY_INFO[k] || k, title: ENEMY_INFO[k] || k }))));
  }

  render();
  return { destroy() { screen.remove(); } };
}

/* ---------------------------------------------------------------- dictionary */
export function lexiconScreen(root, { towerFor, save, onBack, overlay = false }) {
  const entries = Object.entries(save.data.lexicon || {}).map(([word, e]) => ({ word, ...e }));
  const specs = new Map();
  const specOf = (w) => {
    if (!specs.has(w)) { try { specs.set(w, towerFor(w)); } catch { specs.set(w, null); } }
    return specs.get(w);
  };
  let query = '', sort = 'recent', limit = 120;
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search words, elements, types…', 'aria-label': 'Search played words' });
  const sel = h('select', { class: 'sort', 'aria-label': 'Sort' },
    [['recent', 'Recently played'], ['count', 'Most played'], ['az', 'A–Z'], ['rarity', 'Rarity'], ['cost', 'Cost'], ['length', 'Length']].map(([v, l]) => h('option', { value: v }, l)));
  const grid = h('div', { class: 'lex-grid' });
  const more = h('div', { class: 'lex-more' });
  const screen = h('div', { class: 'screen lexicon' + (overlay ? ' overlay' : '') },
    h('header', { class: 'ls-head' },
      h('button', { class: 'pill ghost small', onclick: onBack }, overlay ? '× CLOSE' : '‹ BACK'),
      h('h2', null, 'Dictionary'),
      h('div', { class: 'ls-totals' }, `${entries.length} word${entries.length === 1 ? '' : 's'} played`),
      h('span', { class: 'flex' }), search, sel),
    grid, more);
  paperBg(screen);
  root.appendChild(screen);

  search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); limit = 120; render(); });
  sel.addEventListener('change', () => { sort = sel.value; render(); });
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); onBack(); } }
  window.addEventListener('keydown', onKey);

  function render() {
    clear(grid); clear(more);
    if (!entries.length) {
      grid.appendChild(h('div', { class: 'lex-empty' }, h('p', null, 'No words yet.'), h('p', null, 'Every word you build or power up with is collected here, with its tower card.')));
      return;
    }
    let list = entries.map((e) => ({ ...e, spec: specOf(e.word) })).filter((e) => e.spec);
    if (query) {
      list = list.filter((e) => e.word.includes(query) || e.spec.element === query || e.spec.archetype === query || e.spec.rarity === query || (e.spec.tags || []).includes(query));
    }
    const rk = (r) => RARITIES.indexOf(r);
    const cmp = {
      recent: (a, b) => (b.last || b.at || 0) - (a.last || a.at || 0),
      count: (a, b) => b.count - a.count || a.word.localeCompare(b.word),
      az: (a, b) => a.word.localeCompare(b.word),
      rarity: (a, b) => rk(b.spec.rarity) - rk(a.spec.rarity) || a.word.localeCompare(b.word),
      cost: (a, b) => b.spec.cost - a.spec.cost,
      length: (a, b) => b.word.length - a.word.length || a.word.localeCompare(b.word),
    }[sort];
    list.sort(cmp);
    if (!list.length) { grid.appendChild(h('div', { class: 'lex-empty' }, h('p', null, `Nothing matches “${query}”.`))); return; }
    for (const e of list.slice(0, limit)) grid.appendChild(towerCard(e.spec, { compact: true, count: e.count }));
    if (list.length > limit) more.appendChild(h('button', { class: 'pill outline', onclick: () => { limit += 120; render(); } }, `Show more (${list.length - limit})`));
  }
  render();
  if (overlay) setTimeout(() => search.focus(), 0);
  return { destroy() { window.removeEventListener('keydown', onKey); screen.remove(); } };
}

/* -------------------------------------------------------------------- result */
export function resultModal({ level, levelNo, res, rec, levelCount, onNext, onRetry, onLevels }) {
  const won = !!res.won;
  const stars = won ? (res.stars || 1) : 0;
  const emblem = h('div', { class: 'emblem' }, [1, 2, 3].map((i) => h('span', { class: 'star' + (i <= stars ? ' on' : ''), style: { animationDelay: `${0.15 + i * 0.18}s` } }, '★')));
  const words = (res.wordsUsed || []).slice(0, 24);
  const body = h('div', { class: 'result' },
    emblem,
    h('div', { class: 'result-head ' + (won ? 'won' : 'lost') }, won ? 'VICTORY' : 'DEFEAT'),
    h('p', { class: 'result-copy' }, won
      ? `${res.livesLeft} ${res.livesLeft === 1 ? 'life' : 'lives'} left · score ${Math.round(res.score || 0).toLocaleString('en-US')}${rec?.newBest ? ' · new best' : ''}`
      : 'The pieces reached your base. Try different words — splash and slow help against crowds.'),
    words.length ? h('div', { class: 'result-words' }, words.map((w) => h('span', { class: 'mini-tile' }, w.toUpperCase()))) : null,
    h('div', { class: 'result-btns' },
      won && levelNo < levelCount ? h('button', { class: 'pill primary', onclick: onNext }, 'NEXT LEVEL') : null,
      h('button', { class: 'pill ' + (won ? 'slate' : 'primary'), onclick: onRetry }, won ? 'REPLAY' : 'TRY AGAIN'),
      h('button', { class: 'pill outline', onclick: onLevels }, 'LEVELS')));
  return modalShell({ title: `Level ${levelNo} · ${cap(level.title || level.word || '')}`, sub: won ? 'Level complete' : 'Level failed', body });
}

/* --------------------------------------------------------------- error/loading */
export function errorScreen(root, { title, lines, hint }) {
  const screen = h('div', { class: 'screen error' },
    modalShell({
      title: 'Something went wrong',
      sub: title,
      body: h('div', { class: 'err' },
        h('div', { class: 'result-head lost' }, 'COULD NOT START'),
        h('ul', { class: 'err-list' }, (lines || []).map((l) => h('li', null, l))),
        hint ? h('p', { class: 'result-copy' }, hint) : null,
        h('div', { class: 'result-btns' }, h('button', { class: 'pill primary', onclick: () => location.reload() }, 'RELOAD'))),
    }));
  paperBg(screen);
  root.appendChild(screen);
  return { destroy() { screen.remove(); } };
}

export function loadingVeil(root, text) {
  const el = h('div', { class: 'loading-veil' }, h('div', { class: 'loading-card' },
    h('div', { class: 'loading-tiles' }, 'WORDS'.split('').map((c, i) => h('span', { class: 'tile', style: { animationDelay: `${i * 0.09}s` } }, h('span', { class: 'l' }, c), h('span', { class: 'n' }, String(LETTER_VALUES[c.toLowerCase()]))))),
    h('div', { class: 'loading-text' }, text)));
  root.appendChild(el);
  return { set(t) { el.querySelector('.loading-text').textContent = t; }, destroy() { el.remove(); } };
}

