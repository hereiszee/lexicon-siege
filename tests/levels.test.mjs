// LEVELS module tests. Run: node --test tests/levels.test.mjs
// Uses the real src/words towerFor when present, otherwise a TowerSpec-shaped stub.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ELEMENTS, ENEMIES, DEFAULTS, VOWELS, LETTER_WEIGHTS } from '../src/core/constants.js';
import { hashString, makeRng } from '../src/core/rng.js';
import { makeLevel, LEVEL_COUNT as GEN_COUNT } from '../src/levels/levelgen.js';
import { LEVEL_WORDS, CHAPTERS } from '../src/levels/levelWords.js';
import { pathProblem, fallbackPath, growPath, PATH_STYLES } from '../src/levels/mapgen.js';
import { levelThreat, ENEMY_UNLOCK, hpMulFor } from '../src/levels/waves.js';
import { checkWordRules, themeBonus, RULE_TYPES } from '../src/levels/rules.js';

// ---- collaborator: real words module if available, else a stub ----------------------------
function stubTowerFor(word) {
  const h = hashString(word);
  return {
    word, pos: ['noun'], archetype: 'bolt', element: ELEMENTS[h % ELEMENTS.length], rarity: 'common',
    score: word.length, cost: 30, stats: { damage: 6, rate: 1, range: 2.5, splash: 0, projectileSpeed: 8, hp: 60 },
    effects: [], augment: null, tags: ['tag' + (h % 7)], glyph: '*', color: '#000', flavor: '', source: 'procedural',
  };
}

let api;
let usingReal = false;
try {
  api = await import('../src/levels/index.js'); // fails while src/words/index.js does not exist
  usingReal = true;
} catch (err) {
  // only a missing module under src/words/ may fall back to the stub; anything else is a real bug
  const msg = String(err?.message || '');
  if (err?.code !== 'ERR_MODULE_NOT_FOUND' || !/\/src\/words\//.test(msg.split(' imported from ')[0])) throw err;
  console.log(`# WARNING: words module unavailable (${msg.split('\n')[0]})`);
  api = {
    LEVEL_COUNT: GEN_COUNT,
    levelFor: (n) => makeLevel(LEVEL_WORDS[n - 1], n, stubTowerFor, { id: n }),
    levelForWord: (w, d = 1) => makeLevel(w, d, stubTowerFor, { id: 0 }),
    checkWordRules, themeBonus, levelThreat,
  };
}
console.log(`# levels tests using ${usingReal ? 'REAL src/words towerFor' : 'stub towerFor'}`);
const towerFor = usingReal ? (await import('../src/words/index.js')).towerFor : stubTowerFor;

// ---- helpers -------------------------------------------------------------------------------
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const key = ([x, y]) => `${x},${y}`;
const COMMON = new Set(['e', 'a', 'r', 's', 't', 'n', 'o', 'i', 'l']);

/** Returns a list of invariant violations for a LevelSpec. */
function problems(l, { n = null } = {}) {
  const out = [];
  const bad = (m) => out.push(`${l.word}@${l.difficulty}: ${m}`);
  for (const k of ['id', 'word', 'seed', 'title', 'difficulty', 'element', 'cols', 'rows', 'paths', 'blocked',
    'startInk', 'lives', 'rackSize', 'letterWeights', 'waves', 'rules', 'bonus', 'stars']) {
    if (!(k in l)) bad(`missing ${k}`);
  }
  if (!/^[a-z]+$/.test(l.word)) bad('word not a–z');
  if (!Number.isInteger(l.seed) || l.seed < 0) bad('seed');
  if (!ELEMENTS.includes(l.element)) bad('element');
  if (l.cols !== 16 || l.rows !== 10) bad('grid size');
  if (l.rackSize !== DEFAULTS.rackSize) bad('rackSize');
  if (!(l.startInk >= DEFAULTS.startInk && l.startInk <= DEFAULTS.startInk * 2.5)) bad('startInk');
  if (!(l.lives >= DEFAULTS.lives && l.lives <= DEFAULTS.lives * 2)) bad('lives');
  if (!(l.stars.two.livesAtLeast > 0 && l.stars.two.livesAtLeast <= l.stars.three.livesAtLeast && l.stars.three.livesAtLeast <= l.lives)) bad('stars');

  // paths
  if (!(l.paths.length === 1 || l.paths.length === 2)) bad('path count');
  const base = key(l.paths[0].at(-1));
  const p1 = new Set(l.paths[0].map(key));
  l.paths.forEach((p, i) => {
    const pr = pathProblem(p, l.cols, l.rows);
    if (pr) bad(`path ${i}: ${pr}`);
    if (key(p.at(-1)) !== base) bad(`path ${i} ends elsewhere`);
    if (i === 0 && (p.length < 28 || p.length > 60)) bad(`path 0 length ${p.length}`);
    if (i === 1) {
      if (p.length < 22 || p.length > 60) bad(`path 1 length ${p.length}`);
      for (const c of p.slice(0, -1)) {
        if (p1.has(key(c))) bad('paths overlap');
        for (const [dx, dy] of DIRS) {
          const nk = key([c[0] + dx, c[1] + dy]);
          if (nk !== base && p1.has(nk)) bad('paths touch');
        }
      }
    }
  });
  const pathCells = new Set(l.paths.flatMap((p) => p.map(key)));
  const blocked = new Set();
  for (const c of l.blocked) {
    if (!(c[0] >= 0 && c[1] >= 0 && c[0] < l.cols && c[1] < l.rows)) bad('blocked out of bounds');
    if (pathCells.has(key(c))) bad('blocked on path');
    if (blocked.has(key(c))) bad('blocked dup');
    blocked.add(key(c));
  }
  // buildable cells next to the path
  const adj = new Set();
  for (const k of pathCells) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of DIRS) {
      const c = [x + dx, y + dy];
      if (c[0] < 0 || c[1] < 0 || c[0] >= l.cols || c[1] >= l.rows || pathCells.has(key(c))) continue;
      adj.add(key(c));
    }
  }
  const free = [...adj].filter((k) => !blocked.has(k)).length;
  if (free < 20 || free < adj.size * 0.8) bad(`only ${free}/${adj.size} buildable path-adjacent cells`);

  // waves
  if (l.waves.length < 5 || l.waves.length > 30) bad(`wave count ${l.waves.length}`);
  let bossGroups = 0;
  l.waves.forEach((w, wi) => {
    if (!w.groups.length) bad(`wave ${wi} empty`);
    for (const g of w.groups) {
      if (!ENEMIES[g.enemy]) bad(`unknown enemy ${g.enemy}`);
      if (g.enemy !== 'boss' && ENEMY_UNLOCK[g.enemy] > l.difficulty) bad(`${g.enemy} before unlock`);
      if (!(Number.isInteger(g.count) && g.count >= 1 && g.count <= 40)) bad('count');
      for (const f of ['interval', 'delay', 'hpMul', 'speedMul']) if (!(Number.isFinite(g[f]) && g[f] >= 0)) bad(`group.${f}`);
      if (!(g.hpMul > 0 && g.speedMul > 0.5 && g.speedMul < 1.5)) bad('mul range');
      if (!(Number.isInteger(g.path) && g.path >= 0 && g.path < l.paths.length)) bad('group.path');
      if (g.enemy === 'boss' && g.boss) {
        bossGroups++;
        if (wi !== l.waves.length - 1) bad('boss not in final wave');
      }
      if (g.miniBoss && l.difficulty < 150) bad('early mini-boss');
    }
  });
  const isBoss = l.difficulty % 10 === 0;
  if (isBoss !== bossGroups > 0) bad(`boss cadence (boss groups ${bossGroups})`);

  // rules
  if (l.rules.length > 2) bad('too many rules');
  if (l.difficulty <= 10 && l.rules.length) bad('rules in tutorial');
  const types = l.rules.map((r) => r.type);
  const bannedLetters = l.rules.filter((r) => r.type === 'banLetter').map((r) => r.letter);
  const must = l.rules.find((r) => r.type === 'mustContain');
  for (const r of l.rules) {
    if (!RULE_TYPES.includes(r.type)) bad(`rule type ${r.type}`);
    if (typeof r.text !== 'string' || r.text.length < 8) bad('rule text');
    if (r.type !== 'banLetter' && types.filter((t) => t === r.type).length > 1) bad('duplicate rule');
    if (r.type === 'minLength' && !(r.n >= 2 && r.n <= 4)) bad('minLength');
    if (r.type === 'maxLength' && !(r.n >= 5)) bad('maxLength');
    if (r.type === 'towerLimit' && !(r.n >= 8)) bad('towerLimit');
    if (r.type === 'mustContain' && !COMMON.has(r.letter)) bad('mustContain letter');
    if (r.type === 'banElement' && (!ELEMENTS.includes(r.element) || r.element === l.bonus.element)) bad('banElement');
    if (r.type === 'banLetter') {
      if ('ae'.includes(r.letter)) bad('banned a/e');
      if (VOWELS.includes(r.letter) && l.difficulty < 100) bad('vowel banned early');
      if (l.word.includes(r.letter)) bad('banned a letter of the level word');
    }
  }
  if (bannedLetters.length > 2) bad('too many bans');
  if (bannedLetters.filter((c) => VOWELS.includes(c)).length > 1) bad('two vowels banned');
  if (must && bannedLetters.includes(must.letter)) bad('mustContain banned');
  if (types.includes('minLength') && types.includes('maxLength')) {
    const mn = l.rules.find((r) => r.type === 'minLength').n, mx = l.rules.find((r) => r.type === 'maxLength').n;
    if (mx < mn + 2) bad('min/max conflict');
  }
  // letter bag
  const lw = l.letterWeights;
  if (Object.keys(lw).length !== 26) bad('letterWeights keys');
  for (const c of Object.keys(LETTER_WEIGHTS)) if (!(lw[c] >= 0)) bad(`weight ${c}`);
  for (const c of bannedLetters) if (lw[c] !== 0) bad('banned letter still in bag');
  for (const c of 'aeio') if (!bannedLetters.includes(c) && !(lw[c] >= LETTER_WEIGHTS[c])) bad(`vowel ${c} weight`);
  if (must && !(lw[must.letter] > LETTER_WEIGHTS[must.letter])) bad('mustContain not boosted');
  if (must) {
    const total = Object.values(lw).reduce((a, b) => a + b, 0);
    const pMiss = Math.pow(1 - lw[must.letter] / total, l.rackSize);
    if (!(pMiss < 0.25)) bad(`rack misses required ${must.letter} with p=${pMiss.toFixed(2)}`);
  }
  if (!ELEMENTS.includes(l.wordElement) || l.bonus.element !== l.wordElement) bad('wordElement');
  // bonus
  const b = l.bonus;
  if (!b || !ELEMENTS.includes(b.element) || !Array.isArray(b.tags) || !(b.mul > 1 && b.mul <= 1.5) || typeof b.text !== 'string' || !b.text) bad('bonus');
  if (n !== null) {
    if (l.id !== n) bad('id');
    if (l.word !== LEVEL_WORDS[n - 1]) bad('word');
    if (l.difficulty !== n) bad('difficulty');
  }
  return out;
}

// ---- generate everything once ---------------------------------------------------------------
const t0 = performance.now();
const LEVELS = [];
for (let n = 1; n <= api.LEVEL_COUNT; n++) LEVELS.push(api.levelFor(n));
const genMs = performance.now() - t0;

// ---- tests ---------------------------------------------------------------------------------
test('LEVEL_COUNT and generation speed', () => {
  assert.equal(api.LEVEL_COUNT, 1000);
  assert.equal(LEVELS.length, 1000);
  assert.ok(genMs < 3000, `generating 1000 levels took ${genMs.toFixed(0)} ms`);
});

test('level words: 1000 distinct a–z words in 100 chapters of 10', () => {
  assert.equal(LEVEL_WORDS.length, 1000);
  assert.equal(CHAPTERS.length, 100);
  for (const c of CHAPTERS) {
    assert.equal(c.words.length, 10, c.theme);
    assert.ok(c.theme);
  }
  assert.equal(new Set(LEVEL_WORDS).size, 1000);
  for (const w of LEVEL_WORDS) assert.match(w, /^[a-z]{2,15}$/);
  // friendly start: first chapter words are short
  for (const w of LEVEL_WORDS.slice(0, 30)) assert.ok(w.length <= 7, w);
});

test('level words exist in the game dictionary sources', (t) => {
  const sources = ['/usr/share/dict/words', new URL('../data/words.txt', import.meta.url)];
  let checked = 0;
  for (const src of sources) {
    // data/words.txt may be mid-build by the WORDS worker; only trust it once it's sizeable
    if (typeof src !== 'string' && fs.existsSync(src) && fs.statSync(src).size < 500_000) continue;
    if (!fs.existsSync(src)) continue;
    const dict = new Set(fs.readFileSync(src, 'utf8').split(/\r?\n/));
    const missing = LEVEL_WORDS.filter((w) => !dict.has(w));
    assert.deepEqual(missing, [], `missing from ${src}`);
    checked++;
  }
  if (!checked) t.skip('no dictionary file available');
});

test('all 1000 levels satisfy invariants', () => {
  const all = [];
  LEVELS.forEach((l, i) => all.push(...problems(l, { n: i + 1 })));
  assert.deepEqual(all.slice(0, 20), []);
});

test('determinism: same level number → identical level', () => {
  for (const n of [1, 7, 10, 137, 500, 999, 1000]) {
    assert.deepEqual(api.levelFor(n), LEVELS[n - 1]);
  }
  assert.deepEqual(api.levelForWord('zebra', 300), api.levelForWord('zebra', 300));
});

test('waves scale with difficulty and enemy types are introduced gradually', () => {
  assert.equal(LEVELS[0].waves.length, 5);
  assert.ok(LEVELS[0].waves.every((w) => w.groups.every((g) => g.enemy === 'grunt')), 'level 1 is all grunts');
  const late = LEVELS.slice(900).reduce((a, l) => a + l.waves.length, 0) / 100;
  assert.ok(late >= 20, `late average wave count ${late}`);
  // each type appears at least once soon after its unlock
  for (const [type, at] of Object.entries(ENEMY_UNLOCK)) {
    const seen = LEVELS.slice(at - 1, at + 9).some((l) => l.waves.some((w) => w.groups.some((g) => g.enemy === type)));
    assert.ok(seen, `${type} should appear within 10 levels of ${at}`);
  }
  assert.ok(LEVELS.some((l) => l.waves.some((w) => w.groups.some((g) => g.miniBoss))), 'mini-bosses appear');
  // the count cap may push extra budget into hp, but never more than ~2× (swarms stay swarms)
  for (const l of LEVELS) {
    const base = hpMulFor(l.difficulty);
    for (const w of l.waves) for (const g of w.groups) if (g.enemy !== 'boss') assert.ok(g.hpMul <= base * 2.05, `${l.word}: ${g.enemy} hpMul ${g.hpMul}`);
  }
  assert.ok(LEVELS.some((l) => l.paths.length === 2), 'some two-path levels');
  assert.ok(LEVELS.slice(0, 149).every((l) => l.paths.length === 1), 'no two-path levels early');
});

test('threat grows smoothly and roughly geometrically', () => {
  const threat = LEVELS.map((l) => api.levelThreat(l));
  for (const t of threat) {
    assert.ok(t.total > 0 && t.perWave.length > 0);
    assert.equal(t.perWave.reduce((a, b) => a + b, 0), t.total);
  }
  // chapter averages (non-boss levels) never drop by more than 10%
  const chapterAvg = [];
  for (let c = 0; c < 100; c++) {
    const ts = threat.slice(c * 10, c * 10 + 9).map((t) => t.total);
    chapterAvg.push(ts.reduce((a, b) => a + b) / ts.length);
  }
  for (let c = 1; c < 100; c++) assert.ok(chapterAvg[c] >= chapterAvg[c - 1] * 0.9, `chapter ${c + 1} dips`);
  const ratio = chapterAvg[99] / chapterAvg[0];
  assert.ok(ratio > 20 && ratio < 400, `late/early threat ratio ${ratio.toFixed(1)}`);
  // per-decile growth factor stays gentle (no cliff)
  for (let k = 1; k < 10; k++) {
    const a = chapterAvg.slice((k - 1) * 10, k * 10).reduce((x, y) => x + y) / 10;
    const b = chapterAvg.slice(k * 10, k * 10 + 10).reduce((x, y) => x + y) / 10;
    assert.ok(b / a < 3.5 && b / a > 1, `decile ${k} growth ${(b / a).toFixed(2)}`);
  }
});

test('rules are introduced gradually', () => {
  assert.ok(LEVELS.slice(0, 10).every((l) => l.rules.length === 0));
  const seenAt = {};
  LEVELS.forEach((l) => l.rules.forEach((r) => { seenAt[r.type] ??= l.difficulty; }));
  for (const t of RULE_TYPES) assert.ok(seenAt[t], `${t} used somewhere`);
  assert.ok(seenAt.banLetter > 50 && seenAt.banElement > 70);
  assert.ok(LEVELS.slice(100).some((l) => l.rules.length === 2));
});

test('levelForWord handles 500 arbitrary strings', () => {
  const rng = makeRng(42);
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCXYZ0123456789 -_!?é漢😀';
  const all = [];
  for (let i = 0; i < 500; i++) {
    const len = rng.int(0, 40);
    let s = '';
    for (let j = 0; j < len; j++) s += alphabet[rng.int(0, alphabet.length - 1)];
    const d = i % 50 === 0 ? [0, -5, NaN, 5000, 'x', undefined][i / 50 % 6] : rng.int(1, 1000);
    const l = api.levelForWord(s, d);
    assert.ok(l.difficulty >= 1 && l.difficulty <= 1000);
    all.push(...problems(l));
  }
  assert.deepEqual(all.slice(0, 20), []);
  assert.equal(api.levelForWord('Hello World').word, 'helloworld');
  assert.equal(api.levelForWord('').word, 'void');
  assert.equal(api.levelForWord('ember').difficulty, 1);
});

test('fallback path and every style are valid', () => {
  for (const fx of [false, true]) for (const fy of [false, true]) {
    const p = fallbackPath(16, 10, fx, fy);
    assert.equal(pathProblem(p, 16, 10), null);
    assert.ok(p.length >= 28);
  }
  for (const style of PATH_STYLES) {
    let ok = 0;
    for (let s = 0; s < 40; s++) {
      const p = growPath(makeRng(s * 7 + 1), 16, 10, { base: [7, 5], minLen: 30, maxLen: 50, style, forbidden: null });
      if (p) { ok++; assert.equal(pathProblem(p.reverse(), 16, 10), null); }
    }
    assert.ok(ok > 10, `${style} succeeds sometimes (${ok}/40)`);
  }
  // impossible request terminates and returns null
  assert.equal(growPath(makeRng(1), 16, 10, { base: [7, 5], minLen: 200, maxLen: 220, style: 'wander', forbidden: null }), null);
});

test('map styles vary across levels', () => {
  const styles = new Set(LEVELS.map((l) => l.mapStyle));
  for (const s of PATH_STYLES) assert.ok(styles.has(s), s);
  const shapes = new Set(LEVELS.map((l) => JSON.stringify(l.paths)));
  assert.ok(shapes.size > 990);
});

test('checkWordRules enforces every rule type with friendly reasons', () => {
  const lvl = (rules) => ({ rules, bonus: null });
  const ctx = { usedWords: new Set(), towerCount: 0, wave: 0 };
  const spec = { element: 'fire', tags: [] };
  const no = (r) => { assert.equal(r.ok, false); assert.ok(r.reason && r.reason.length > 5); };
  assert.deepEqual(checkWordRules('cat', spec, lvl([]), ctx), { ok: true });
  no(checkWordRules('cat', spec, lvl([{ type: 'minLength', n: 4 }]), ctx));
  assert.ok(checkWordRules('cats', spec, lvl([{ type: 'minLength', n: 4 }]), ctx).ok);
  no(checkWordRules('elephant', spec, lvl([{ type: 'maxLength', n: 6 }]), ctx));
  assert.ok(checkWordRules('lion', spec, lvl([{ type: 'maxLength', n: 6 }]), ctx).ok);
  no(checkWordRules('cat', spec, lvl([{ type: 'mustContain', letter: 'e' }]), ctx));
  assert.ok(checkWordRules('bee', spec, lvl([{ type: 'mustContain', letter: 'e' }]), ctx).ok);
  no(checkWordRules('quiz', spec, lvl([{ type: 'banLetter', letter: 'z' }]), ctx));
  assert.ok(checkWordRules('quit', spec, lvl([{ type: 'banLetter', letter: 'z' }]), ctx).ok);
  no(checkWordRules('cat', spec, lvl([{ type: 'towerLimit', n: 3 }]), { ...ctx, towerCount: 3 }));
  assert.ok(checkWordRules('cat', spec, lvl([{ type: 'towerLimit', n: 3 }]), { ...ctx, towerCount: 2 }).ok);
  assert.ok(checkWordRules('cat', spec, lvl([{ type: 'towerLimit', n: 3 }]), { ...ctx, towerCount: 3, action: 'augment' }).ok);
  no(checkWordRules('flame', spec, lvl([{ type: 'banElement', element: 'fire' }]), ctx));
  assert.ok(checkWordRules('frost', { element: 'ice' }, lvl([{ type: 'banElement', element: 'fire' }]), ctx).ok);
  // tolerant of missing ctx/spec
  assert.ok(checkWordRules('cat', null, lvl([{ type: 'banElement', element: 'fire' }])).ok);
  // generated levels: the level word's own tower obeys a banElement rule (never bans the theme)
  for (const l of LEVELS) {
    const r = checkWordRules('zzzzzzzzzzzzzzzzzz', { element: l.bonus.element }, { rules: l.rules.filter((x) => x.type === 'banElement') }, ctx);
    assert.ok(r.ok, `level ${l.id} bans its own theme element`);
  }
});

test('themeBonus matches element or shared tag', () => {
  const level = { bonus: { element: 'fire', tags: ['heat', 'light'], mul: 1.25, text: '' } };
  assert.equal(themeBonus({ element: 'fire', tags: [] }, level), 1.25);
  assert.equal(themeBonus({ element: 'ice', tags: ['heat'] }, level), 1.25);
  assert.equal(themeBonus({ element: 'ice', tags: ['cold'] }, level), 1);
  assert.equal(themeBonus({ element: 'ice' }, level), 1);
  assert.equal(themeBonus(null, level), 1);
  assert.equal(themeBonus({ element: 'fire' }, { bonus: null }), 1);
  // the level word itself always earns its own level's bonus
  for (const l of LEVELS.slice(0, 200)) assert.ok(themeBonus(towerFor(l.word), l) > 1, l.word);
});
