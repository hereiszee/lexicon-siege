// Headless auto-player for balance passes. Deterministic for a given (level, seed, skill).

import { OPPOSITE, DEFAULTS, ENEMIES, PATH_ARCHETYPES } from '../core/constants.js';
import { makeRng, hashString } from '../core/rng.js';
import { createGame } from './index.js';
import { composeTower } from './stats.js';
import { RELICS } from './relics.js';

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

const ATTACK = new Set(['bolt', 'blast', 'snipe', 'rapid', 'beam', 'chain', 'aura', 'trap', 'mortar', 'vortex', 'pulse', 'orbit']);
const CONT = new Set(['beam', 'aura', 'vortex']); // stats.damage is DPS
const MULTI = { aura: 1.6, chain: 1.8, pulse: 1.8, vortex: 1.4 }; // traps: measured no better than single-target

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
  const arch = spec.archetype;
  if (ATTACK.has(arch)) {
    const cont = CONT.has(arch);
    let hit = (s.damage || 0) * em * theme;
    if (foe) hit = cont ? Math.max(1, hit - foe.armor) : Math.min(foe.hp, Math.max(1, hit - foe.armor));
    let dps = hit * (cont ? 1 : arch === 'orbit' ? 1.2 * Math.max(1, s.orbs || 1) : s.rate || 0);
    dps *= MULTI[arch] || 1;
    if (s.splash > 0) dps *= 1 + s.splash;
    if (arch === 'vortex') dps += (s.pull || 0) * 12; // time bought for every other tower
    let range = s.range || 0;
    if (arch === 'trap') range = 1.6; // every walker passes it, but it only fires when armed and touched
    else if (arch === 'orbit') range += 0.35;
    else if (arch === 'mortar') range = Math.max(0, range - (s.minRange || 0) * 0.5);
    v = dps * Math.sqrt(Math.max(0.5, range) / 2.5);
  } else if (arch === 'wall') {
    v = (s.hp || 0) * 0.03;
  } else {
    v = 0;
    for (const e of spec.effects || []) {
      if (e.type === 'heal') v += (e.hps || 0) * 0.4;
      else if (e.type === 'buff') v += ((e.mul || 1) - 1) * 40;
      else if (e.type === 'shield') v += (e.amount || 0) / Math.max(1, e.interval || 5);
      else if (e.type === 'harvest') v += ((e.amount || 0) / Math.max(1, e.interval || 5)) * (e.resource === 'tile' ? 4 : 6);
      else if (e.type === 'summon') v += (e.damage || 0) * (e.count || 1) * 0.8 + (e.hp || 0) * 0.05;
      else if (e.type === 'interest') v += (Math.min(e.cap ?? 100, (e.pct || 0) * 100) / 30) * 6;
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
  forceRelic, // balance only: null = never take a relic, id = take that relic at the first relic offer
  banArch,    // balance only: never build or augment towers of this archetype
  skipLetters, // balance only: refuse every letter upgrade
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
  const pathFrac = new Map(); // cell → how far along its path (0..1)
  const nPaths = Math.max(1, (level.paths || []).length);
  const pathW = new Array(nPaths).fill(0); // summed cell weight per path
  (level.paths || []).forEach((p, pi) => {
    p.forEach(([cx, cy], i) => {
      const f = i / Math.max(1, p.length - 1);
      pathPts.push({ x: cx + 0.5, y: cy + 0.5, w: 1 + 0.5 * f, p: pi });
      pathW[pi] += 1 + 0.5 * f;
      pathFrac.set(cy * cols + cx, Math.max(f, pathFrac.get(cy * cols + cx) || 0));
    });
  });
  // Several paths: weight each by the threat on it and by how little of it the towers already
  // cover (a strong defence on one lane is wasted while the other leaks). One path: pw = [1].
  const share = new Array(nPaths).fill(0);
  for (const wv of level.waves || []) for (const g of wv.groups) if (share[g.path ?? 0] !== undefined) share[g.path ?? 0] += g.count * (ENEMIES[g.enemy]?.hp || 1) * (g.hpMul ?? 1);
  const shareSum = share.reduce((a, b) => a + b, 0) || 1;
  const wTot = pathW.reduce((a, b) => a + b, 0);
  let pw = new Array(nPaths).fill(1);
  const rawCoverage = (cx, cy, r, out) => {
    const x = cx + 0.5, y = cy + 0.5, r2 = r * r;
    for (const p of pathPts) { const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy <= r2) out[p.p] += p.w; }
    return out;
  };
  function updatePathWeights() {
    if (nPaths < 2) return;
    const cov = new Array(nPaths).fill(0); // summed covered fraction per path by attack towers
    for (const t of st.towers) {
      if (t.disabled || !ATTACK.has(t.archetype) || PATH_ARCHETYPES.includes(t.archetype)) continue;
      rawCoverage(Math.floor(t.x), Math.floor(t.y), t.stats.range || 2, cov);
    }
    const c = cov.map((v, i) => v / Math.max(1, pathW[i]));
    const s = share.map((v) => v / shareSum);
    const cMean = c.reduce((a, v, i) => a + v * s[i], 0);
    pw = pathW.map((w, i) => s[i] * (wTot / Math.max(1, w)) * ((1 + cMean) / (1 + c[i])) ** 2);
  }
  const coverage = (cx, cy, r) => {
    const x = cx + 0.5, y = cy + 0.5, r2 = r * r;
    let s = 0;
    for (const p of pathPts) { const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy <= r2) s += p.w * pw[p.p]; }
    return s;
  };

  function bestCell(spec) {
    const arch = spec.archetype;
    const range = (spec.stats && spec.stats.range) || 2;
    let best = null, bestScore = -Infinity;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        if (!game.canBuild(cx, cy, arch)) continue;
        let score;
        if (PATH_ARCHETYPES.includes(arch)) {
          // on the path where many attackers can reach what it holds / hits
          score = (pathFrac.get(cy * cols + cx) || 0) * (arch === 'wall' ? 0.5 : 1);
          for (const t of st.towers) {
            if (t.disabled || !ATTACK.has(t.archetype) || PATH_ARCHETYPES.includes(t.archetype)) continue;
            const dx = t.x - (cx + 0.5), dy = t.y - (cy + 0.5), r = t.stats.range;
            if (dx * dx + dy * dy <= r * r) score += 1;
          }
        } else if (arch === 'harvest') score = -coverage(cx, cy, 2.5);
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
  let emptyBest = new Map();
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
    if (sk >= 0.3 && (sp.effects || []).some((e) => e.type === 'heal')) {
      // healing is worth what is being chipped off the towers (slingers, vandals, stomps)
      let lost = 0;
      for (const t of st.towers) lost += 1 - t.hp / Math.max(1, t.maxHp);
      v *= 1 + lost;
    }
    if (sp.archetype === 'vortex') v /= 1 + st.towers.filter((t) => t.archetype === 'vortex').length * 0.5; // pulls don't stack
    if (sp.archetype === 'wall') {
      // a wall is worth a share of the firepower that can shoot what it holds
      const nWalls = st.towers.filter((t) => t.archetype === 'wall' && !t.disabled).length;
      let fire = 0;
      for (const t of attackers) fire += towerValue({ ...t.spec, stats: t._base, effects: t.effects, element: t.element }, seen, 1, foe);
      v = 0.05 * fire * Math.min(1, ((sp.stats && sp.stats.hp) || 0) / 200) / (1 + nWalls * nWalls);
    }
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
      if (noCell.has(words[i])) continue;
      const c = game.checkWord(words[i]);
      if (!c.ok || (banArch && c.spec.archetype === banArch)) continue;
      if (c.canTower || c.canAugment) out.push({ word: words[i], spec: c.spec, tower: c.canTower, aug: c.canAugment });
      else if (!c.towerReason && nDream++ < samples) {
        const sc = towerScore(c.spec, attackers, foe);
        if (sc > dreamS) { dreamS = sc; dream = c.spec; }
      }
    }
    return { out, dream, dreamS };
  }

  const noCell = new Set(); // tower words that found no legal cell (e.g. a wall with the path full)
  let actions = 0;
  function refreshWeights() {
    updatePathWeights();
    emptyBest = new Map();
    freeBest = new Map();
  }
  function buildTurn(maxActions = 6) {
    let redraws = 0;
    if (nPaths > 1) refreshWeights();
    // a disabled tower no healer reaches is dead weight: sell it and build again (casual players don't)
    if (sk >= 0.3) {
      const healers = st.towers.filter((h) => !h.disabled && h.fx && h.fx.heal);
      for (const t of st.towers.slice()) {
        if (t.disabled && !healers.some((h) => (h.x - t.x) ** 2 + (h.y - t.y) ** 2 <= h.stats.range ** 2)) game.sellTower(t.id);
      }
    }
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
      if (!cell) { noCell.add(bestT.word); n--; if (noCell.size > 50) return; continue; }
      if (!game.placeTower(bestT.word, cell[0], cell[1]).ok) return;
      refreshWeights();
      actions++;
    }
  }

  // Rewards: casual players grab any option; better players take what fits their towers and
  // reroll a weak offer once. Always resolves the offer so startWave never stalls.
  const RELIC_BASE = {
    farsighted: 2, luckyStar: 1.6, deepPockets: 1.5, inkwell: 1.4, patron: 1.2, bulwark: 1, secondWind: 1,
    scholar: 0.8, headsman: 0.8, saved: 0.4, pawnbroker: 0.3,
  };
  const KIND_VALUE = { damage: 1.2, rate: 1.1, range: 1, crit: 0.9, splash: 0.9, chain: 0.8, burn: 0.8, poison: 0.8, ink: 0.8, pierce: 0.7, slow: 0.7, hp: 0.4 };
  const weights = level.letterWeights || {};
  function optionScore(kind, o) {
    if (kind === 'letter') {
      const inRack = st.rack.filter((c) => c === o.letter).length;
      return (KIND_VALUE[o.bonus] || 0.5) * (1 + inRack * 0.5 + (weights[o.letter] || 1) / 8) * (o.tier >= 2 ? 1.3 : 1);
    }
    const r = RELICS[o];
    if (r.fit) {
      const all = st.towers.filter((t) => !t.disabled);
      return all.length ? (3 * all.filter((t) => r.fit(t)).length) / all.length : 0.2;
    }
    return RELIC_BASE[o] ?? 0.6;
  }
  function takeReward() {
    const r = st.reward;
    if (!r) return;
    if (skipLetters && r.kind === 'letter') { game.skipReward(); return; }
    if (forceRelic !== undefined && r.kind === 'relic') {
      if (forceRelic && !st.relics.includes(forceRelic)) { r.options[0] = forceRelic; game.chooseReward(0); } else game.skipReward();
      return;
    }
    let pick = 0;
    if (sk < 0.3) pick = Math.floor(rng.next() * r.options.length);
    else {
      let scores = r.options.map((o) => optionScore(r.kind, o));
      if (sk >= 0.5 && r.rerolls > 0 && Math.max(...scores) < 1) {
        const worst = scores.indexOf(Math.min(...scores));
        if (game.rerollReward(worst).ok) scores = r.options.map((o) => optionScore(r.kind, o));
      }
      pick = scores.indexOf(Math.max(...scores));
    }
    if (!game.chooseReward(pick).ok) game.skipReward();
  }

  const react = 2 + (1 - sk) * 8; // seconds between mid-wave build checks: slower for casual players
  let lastTry = -Infinity;
  let lastInk = -1;
  let lastRack = '';
  while (st.phase !== 'won' && st.phase !== 'lost' && st.time < maxTime) {
    if (st.phase === 'build') {
      takeReward();
      buildTurn(8);
      if (!game.startWave().ok) break;
      lastTry = st.time;
      continue;
    }
    game.update(dt);
    // a vortex that out-pulls slowed walkers can hold a pack of healers forever: a player would sell it
    if (st.waveTime > 240) for (const t of st.towers.filter((x) => x.archetype === 'vortex')) game.sellTower(t.id);
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
    relics: st.relics.slice(),
    letterTiers: { ...st.letterTiers },
    archetypes: st.towers.map((t) => t.archetype), // towers standing at the end
  };
}

/**
 * Hints (CONTRACT v2 §4): up to n { word, use:'tower'|'augment', spec, score, towerId? }, best first.
 * Spellable, rule-legal and affordable right now; ranked by value per ink (augments by the real
 * gain on their best target). Looks at ≤ 40 words per length and stops after ~20 ms.
 */
export function suggestWords(game, finder, n = 3) {
  const st = game.state;
  if (st.phase === 'won' || st.phase === 'lost') return [];
  const t0 = performance.now();
  const level = game.level;
  const w = level.waves && level.waves[Math.min(st.waveIndex, level.waves.length - 1)];
  let cnt = 0, hp = 0, armor = 0;
  for (const g of (w && w.groups) || []) {
    const e = ENEMIES[g.enemy];
    if (!e) continue;
    cnt += g.count; hp += g.count * e.hp * (g.hpMul ?? 1); armor += g.count * e.armor;
  }
  const foe = cnt ? { hp: hp / cnt, armor: armor / cnt } : null;
  const targets = st.towers.filter((t) => ATTACK.has(t.archetype) && !t.disabled && t.augments.length < DEFAULTS.maxAugments);
  const cols = level.cols ?? DEFAULTS.cols, rows = level.rows ?? DEFAULTS.rows;
  const cellOk = new Map();
  const hasCell = (arch) => {
    const k = PATH_ARCHETYPES.includes(arch) ? arch : '';
    if (!cellOk.has(k)) {
      let ok = false;
      for (let i = 0; i < cols * rows && !ok; i++) ok = game.canBuild(i % cols, Math.floor(i / cols), k || undefined);
      cellOk.set(k, ok);
    }
    return cellOk.get(k);
  };
  const best = new Map(); // word → best suggestion
  const perLen = new Map();
  for (const word of finder.find(st.rack)) {
    const used = perLen.get(word.length) || 0;
    if (used >= 40) continue;
    if (performance.now() - t0 > 20) break;
    const c = game.checkWord(word);
    if (!c.ok) continue;
    perLen.set(word.length, used + 1);
    const sp = c.spec;
    if (c.canTower && hasCell(sp.archetype)) {
      const score = towerValue(sp, level, game.themeFor ? game.themeFor(sp) : 1, foe) / Math.max(1, sp.cost);
      best.set(word, { word, use: 'tower', spec: sp, score });
    }
    if (c.canAugment) {
      for (const t of targets) {
        const now = towerValue({ ...t.spec, stats: t._base, effects: t.effects, element: t.element }, level, 1, foe);
        const c2 = composeTower(t.spec, [...t.augments, sp], t.themeMul);
        const score = (towerValue({ ...t.spec, ...c2 }, level, 1, foe) - now) / Math.max(1, sp.augment.cost ?? 1);
        const cur = best.get(word);
        if (score > 0 && (!cur || score > cur.score)) best.set(word, { word, use: 'augment', spec: sp, score, towerId: t.id });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score || (a.word < b.word ? -1 : 1)).slice(0, n);
}
