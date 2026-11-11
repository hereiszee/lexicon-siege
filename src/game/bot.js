// Headless auto-player for balance passes. Deterministic for a given (level, seed, skill).

import { OPPOSITE, DEFAULTS, ENEMIES } from '../core/constants.js';
import { makeRng, hashString } from '../core/rng.js';
import { createGame } from './index.js';
import { composeTower } from './stats.js';

const A = 97;

function wordMask(w) {
  let m = 0;
  for (let i = 0; i < w.length; i++) m |= 1 << (w.charCodeAt(i) - A);
  return m;
}

/**
 * Precomputes a letter-mask index over the dictionary (once; reuse across games).
 * finder.find(rack, {maxLen, limit}) → words spellable from rack (multiset), longest first.
 */
export function makeWordFinder(dictionary) {
  let words = dictionary.words;
  if (!words || !words.length) {
    words = [];
    if (typeof dictionary.byLength === 'function') {
      for (let n = DEFAULTS.minWordLength; n <= DEFAULTS.maxWordLength; n++) words.push(...(dictionary.byLength(n) || []));
    }
  }
  const valid = words.filter((w) => /^[a-z]+$/.test(w));
  valid.sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
  const N = valid.length;
  const masks = new Int32Array(N);
  const lens = new Uint8Array(N);
  for (let i = 0; i < N; i++) { masks[i] = wordMask(valid[i]); lens[i] = valid[i].length; }
  // firstOfLen[n] = first index whose length <= n (list is length-descending)
  const firstOfLen = new Int32Array(64);
  for (let n = 63, i = 0; n >= 0; n--) {
    while (i < N && lens[i] > n) i++;
    firstOfLen[n] = i;
  }
  const have = new Int16Array(26);
  const cache = new Map();

  function find(rack, { maxLen = rack.length, limit = Infinity } = {}) {
    const key = rack.slice().sort().join('') + '|' + maxLen + '|' + limit;
    const hit = cache.get(key);
    if (hit) return hit;
    have.fill(0);
    let rmask = 0;
    for (const ch of rack) { const c = ch.charCodeAt(0) - A; have[c]++; rmask |= 1 << c; }
    const notRack = ~rmask;
    const out = [];
    const start = firstOfLen[Math.min(63, Math.min(maxLen, rack.length))];
    for (let i = start; i < N && out.length < limit; i++) {
      if (masks[i] & notRack) continue;
      const w = valid[i];
      let ok = true;
      const cnt = have.slice();
      for (let k = 0; k < w.length; k++) {
        const c = w.charCodeAt(k) - A;
        if (--cnt[c] < 0) { ok = false; break; }
      }
      if (ok) out.push(w);
    }
    if (cache.size > 5000) cache.clear();
    cache.set(key, out);
    return out;
  }
  return { find, size: N };
}

const finderCache = new WeakMap();
function finderFor(dictionary) {
  let f = finderCache.get(dictionary);
  if (!f) { f = makeWordFinder(dictionary); finderCache.set(dictionary, f); }
  return f;
}

const ATTACK = new Set(['bolt', 'blast', 'snipe', 'rapid', 'beam', 'chain', 'aura']);

/**
 * Rough "power" of a tower spec against this level. `foe` = { hp, armor } of a typical upcoming
 * enemy: when given, per-hit damage is capped at its hp (overkill) and armor is subtracted.
 */
export function towerValue(spec, level, theme = 1, foe = null) {
  const s = spec.stats || {};
  let em = 1;
  if (OPPOSITE[spec.element] === level.element) em = 1.5;
  else if (spec.element === level.element) em = 0.5;
  let v;
  if (ATTACK.has(spec.archetype)) {
    const cont = spec.archetype === 'beam' || spec.archetype === 'aura';
    let hit = (s.damage || 0) * em * theme;
    if (foe) hit = cont ? Math.max(1, hit - foe.armor) : Math.min(foe.hp, Math.max(1, hit - foe.armor));
    let dps = hit * (cont ? 1 : s.rate || 0);
    if (spec.archetype === 'aura') dps *= 1.6;
    if (spec.archetype === 'chain') dps *= 1.8;
    if (s.splash > 0) dps *= 1 + s.splash;
    v = dps * Math.sqrt(Math.max(0.5, s.range || 0) / 2.5);
  } else {
    v = 0;
    for (const e of spec.effects || []) {
      if (e.type === 'heal') v += (e.hps || 0) * 0.4;
      else if (e.type === 'buff') v += ((e.mul || 1) - 1) * 40;
      else if (e.type === 'shield') v += (e.amount || 0) / Math.max(1, e.interval || 5);
      else if (e.type === 'harvest') v += ((e.amount || 0) / Math.max(1, e.interval || 5)) * (e.resource === 'tile' ? 4 : 6);
      else if (e.type === 'summon') v += (e.damage || 0) * (e.count || 1) * 0.8 + (e.hp || 0) * 0.05;
    }
    v *= em * theme;
  }
  const fx = (spec.effects || []).length;
  return v * (1 + 0.12 * fx);
}

/**
 * Plays a level to completion.
 * → { won, livesLeft, stars, wavesCleared, wordsUsed, timeSimulated }
 */
export function playLevel({
  level, dictionary, towerFor, checkWordRules, themeBonus, seed, skill = 0.7,
  finder, maxTime = 3600, dt = 0.25,
}) {
  const sk = Math.max(0, Math.min(1, skill));
  const game = createGame({ level, dictionary, towerFor, checkWordRules, themeBonus, seed, quiet: true });
  const st = game.state;
  const wf = finder || finderFor(dictionary);
  const rng = makeRng((hashString('bot') ^ (typeof seed === 'number' ? seed : hashString(String(seed ?? level.seed ?? level.word)))) >>> 0);
  const rackSize = st.rack.length;
  const startLives = st.lives;
  // skill → longest word the player spots: 0.15 → 4 letters, 0.5 → 6, 1 → 9
  const maxLen = Math.max(2, Math.min(rackSize, Math.round(3 + sk * 6)));
  const samples = Math.round(4 + 60 * sk * sk * sk); // words weighed per decision: 4 casual, 11 decent, 64 expert
  const theme = (spec) => { try { return Number(themeBonus ? themeBonus(spec, level) : 1) || 1; } catch { return 1; } };
  const cols = level.cols ?? DEFAULTS.cols;
  const rows = level.rows ?? DEFAULTS.rows;

  // path cells weighted toward the base (later cells matter more)
  const pathPts = [];
  for (const p of level.paths || []) {
    p.forEach(([cx, cy], i) => pathPts.push({ x: cx + 0.5, y: cy + 0.5, w: 1 + (0.5 * i) / Math.max(1, p.length - 1) }));
  }
  const coverage = (cx, cy, r) => {
    const x = cx + 0.5, y = cy + 0.5, r2 = r * r;
    let s = 0;
    for (const p of pathPts) { const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy <= r2) s += p.w; }
    return s;
  };

  function bestCell(spec) {
    const arch = spec.archetype;
    const range = (spec.stats && spec.stats.range) || 2;
    let best = null, bestScore = -Infinity;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        if (!game.canBuild(cx, cy)) continue;
        let score;
        if (arch === 'harvest') score = -coverage(cx, cy, 2.5);
        else if (arch === 'support') {
          score = 0;
          const r2 = range * range;
          for (const t of st.towers) {
            const dx = t.x - (cx + 0.5), dy = t.y - (cy + 0.5);
            if (dx * dx + dy * dy <= r2) score += ATTACK.has(t.archetype) ? 3 : 1;
          }
          score += coverage(cx, cy, range) * 0.05;
        } else if (arch === 'summon') score = coverage(cx, cy, 1.5);
        else score = coverage(cx, cy, range);
        score += rng.next() * (0.01 + (1 - sk) * 4); // tie-break; low skill places sloppily
        if (score > bestScore) { bestScore = score; best = [cx, cy]; }
      }
    }
    return best;
  }

  // Spot quality: path coverage of the best free cell for this range relative to an empty board.
  // Experts see that cheap towers squeezed into poor spots are worth less than an augment on a
  // well-placed tower.
  const emptyBest = new Map();
  let freeBest = new Map();
  function spotQuality(range) {
    const k = Math.round(range * 10);
    if (!emptyBest.has(k) || !freeBest.has(k)) {
      let e = 0, f = 0;
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const cs = game.cellState(cx, cy);
          if (cs !== 'free' && cs !== 'tower') continue;
          const c = coverage(cx, cy, range);
          if (c > e) e = c;
          if (cs === 'free' && c > f) f = c;
        }
      }
      emptyBest.set(k, e);
      freeBest.set(k, f);
    }
    return emptyBest.get(k) > 0 ? freeBest.get(k) / emptyBest.get(k) : 1;
  }

  // Experts size their towers to the enemies coming next (overkill, armor); casual players don't.
  function foeNow() {
    if (sk < 0.5) return null;
    const w = level.waves && level.waves[Math.min(st.waveIndex, level.waves.length - 1)];
    let n = 0, hp = 0, armor = 0;
    for (const g of (w && w.groups) || []) {
      const e = ENEMIES[g.enemy];
      if (!e || g.boss || g.miniBoss) continue;
      n += g.count; hp += g.count * e.hp * (g.hpMul ?? 1); armor += g.count * e.armor;
    }
    return n ? { hp: hp / n, armor: armor / n } : null;
  }

  // casual players don't read element matchups or the theme bonus
  const seen = sk < 0.3 ? { element: null } : level;
  function towerScore(sp, attackers, foe) {
    let v = towerValue(sp, seen, sk < 0.3 ? 1 : theme(sp), foe);
    if (sp.archetype === 'harvest') {
      const harvestCount = st.towers.filter((t) => t.archetype === 'harvest').length;
      v *= Math.max(0, 1 - harvestCount * 0.4) * (st.waveIndex < st.waveCount / 2 ? 1 : 0.2);
    }
    if (sp.archetype === 'support' && attackers.length < 2) v *= 0.3;
    if (sk >= 0.75 && ATTACK.has(sp.archetype)) v *= spotQuality((sp.stats && sp.stats.range) || 2);
    return v / Math.max(1, sp.cost); // value per ink
  }

  // Affordable words fill the sample; sampling the longest words first and then discarding the
  // unaffordable ones left a high-skill bot with nothing to build. `dream` = the best tower word
  // on the rack that costs more than the ink in hand (what an expert would save for).
  function candidates(attackers, foe) {
    const words = wf.find(st.rack, { maxLen });
    const out = [];
    let dream = null, dreamS = 0, nDream = 0;
    for (let i = 0; i < words.length && out.length < samples; i++) {
      const c = game.checkWord(words[i]);
      if (!c.ok) continue;
      if (c.canTower || c.canAugment) out.push({ word: words[i], spec: c.spec, tower: c.canTower, aug: c.canAugment });
      else if (!c.towerReason && nDream++ < samples) {
        const sc = towerScore(c.spec, attackers, foe);
        if (sc > dreamS) { dreamS = sc; dream = c.spec; }
      }
    }
    return { out, dream, dreamS };
  }

  let actions = 0;
  function buildTurn(maxActions = 6) {
    let redraws = 0;
    for (let n = 0; n < maxActions; n++) {
      if (st.phase === 'won' || st.phase === 'lost') return;
      const attackers = st.towers.filter((t) => ATTACK.has(t.archetype) && !t.disabled && t.augments.length < DEFAULTS.maxAugments);
      const foe = foeNow();
      const { out: cands, dream, dreamS } = candidates(attackers, foe);
      if (!cands.length) {
        // between waves, keep redrawing a dead rack while there is ink to build with
        if (redraws < (st.phase === 'build' ? 3 : 1) && (st.freeRedraws > 0 || (st.phase === 'build' && st.ink >= st.redrawCost + 40))) {
          redraws++;
          game.redrawRack();
          n--;
          continue;
        }
        return;
      }
      let bestT = null, bestTS = 0;
      let bestA = null, bestAS = 0;
      for (const c of cands) {
        const sp = c.spec;
        if (c.tower) {
          const score = towerScore(sp, attackers, foe);
          if (score > bestTS) { bestTS = score; bestT = c; }
        }
        if (sp.augment && c.aug && (attackers.length >= 3 || !c.tower)) { // build a few towers before upgrading
          // gain = value of the tower with this augment minus its value now (mods, effects, element)
          for (const t of attackers) {
            const now = towerValue({ ...t.spec, stats: t._base, effects: t.effects, element: t.element }, seen, 1, foe);
            const c2 = composeTower(t.spec, [...t.augments, sp], t.themeMul);
            const after = towerValue({ ...t.spec, ...c2 }, seen, 1, foe);
            const score = (after - now) / Math.max(1, sp.augment.cost);
            if (score > bestAS) { bestAS = score; bestA = { ...c, towerId: t.id }; }
          }
        }
      }
      // Experts save up a little for a clearly better word once a defence is standing.
      if (sk >= 0.75 && dream && dream.cost <= st.ink + 40 && attackers.length >= 2 && st.lives > startLives / 2 && dreamS > Math.max(bestTS, bestAS) * (1.1 + (1 - sk))) return;
      const useAug = bestA && (!bestT || bestAS > bestTS || rng.next() < 0.3 * (1 - sk)); // casual players augment on a whim
      if (useAug) {
        if (game.augmentTower(bestA.word, bestA.towerId).ok) { actions++; continue; }
      }
      if (!bestT) return;
      const cell = bestCell(bestT.spec);
      if (!cell) return;
      if (!game.placeTower(bestT.word, cell[0], cell[1]).ok) return;
      freeBest = new Map();
      actions++;
    }
  }

  const react = 2 + (1 - sk) * 8; // seconds between mid-wave build checks: slower for casual players
  let lastTry = -Infinity;
  let lastInk = -1;
  let lastRack = '';
  while (st.phase !== 'won' && st.phase !== 'lost' && st.time < maxTime) {
    if (st.phase === 'build') {
      buildTurn(8);
      if (!game.startWave().ok) break;
      lastTry = st.time;
      continue;
    }
    game.update(dt);
    const rk = st.rack.join('');
    if (st.time - lastTry >= react && st.ink >= 30 && (st.ink >= lastInk + 15 || rk !== lastRack)) {
      lastTry = st.time;
      buildTurn(3);
      lastInk = st.ink;
      lastRack = st.rack.join('');
    }
  }
  const r = game.result();
  return {
    won: !!(r && r.won),
    livesLeft: st.lives,
    stars: r ? r.stars : 0,
    wavesCleared: st.waveIndex,
    wordsUsed: r ? r.wordsUsed : [...st.usedWords],
    timeSimulated: st.time,
    actions,
  };
}
