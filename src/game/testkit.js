// Stubs for engine tests / sandboxes: hand-written TowerSpecs, a tiny dictionary, a straight level.

import { DEFAULTS, LETTER_WEIGHTS } from '../core/constants.js';
import { createGame } from './index.js';

export function stubSpec(word, over = {}) {
  const base = {
    word, pos: ['noun'], archetype: 'bolt', element: 'metal', rarity: 'common', score: word.length,
    cost: 30,
    stats: { damage: 6, rate: 1, range: 2.5, splash: 0, projectileSpeed: 12, hp: 60 },
    effects: [], augment: null, tags: [], glyph: '•', color: '#777', flavor: '', source: 'procedural',
  };
  return { ...base, ...over, stats: { ...base.stats, ...(over.stats || {}) } };
}

/** specs: { word: partialSpec } → { dictionary, towerFor }. Extra words get a default bolt. */
export function makeStubs(specs = {}, extraWords = []) {
  const words = [...new Set([...Object.keys(specs), ...extraWords])].sort();
  const set = new Set(words);
  const dictionary = {
    size: words.length,
    has: (w) => set.has(w),
    words,
    byLength: (n) => words.filter((w) => w.length === n),
  };
  const towerFor = (w) => stubSpec(w, specs[w] || {});
  return { dictionary, towerFor };
}

/** 16×10 board, single straight path along row 4 from x=0 to x=15 (length 15 cells). */
export function straightLevel(over = {}) {
  const path = [];
  for (let x = 0; x < 16; x++) path.push([x, 4]);
  return {
    id: 1, word: 'test', seed: 42, title: 'Test', difficulty: 1, element: 'earth',
    cols: 16, rows: 10, paths: [path], blocked: [[0, 0]],
    startInk: 1000, lives: 20, rackSize: DEFAULTS.rackSize,
    letterWeights: { ...LETTER_WEIGHTS },
    waves: [{ groups: [] }],
    rules: [], bonus: null,
    stars: { two: { livesAtLeast: 10 }, three: { livesAtLeast: 20 } },
    ...over,
  };
}

/** Put exactly these letters in the rack (padded with 'z' up to the rack size). */
export function setRack(game, letters) {
  const r = game.state.rack;
  for (let i = 0; i < r.length; i++) r[i] = letters[i] || 'z';
}

/** Game + helper to place a word anywhere regardless of rack. */
export function sandbox(specs, levelOver = {}, opts = {}) {
  const { dictionary, towerFor } = makeStubs(specs, opts.extraWords);
  const level = straightLevel(levelOver);
  const game = createGame({ level, dictionary, towerFor, seed: opts.seed ?? 7, ...opts.createOpts });
  const place = (word, cx, cy) => {
    setRack(game, word);
    const r = game.placeTower(word, cx, cy);
    if (!r.ok) throw new Error('place failed: ' + r.reason);
    return r.tower;
  };
  const augment = (word, tower) => {
    setRack(game, word);
    const r = game.augmentTower(word, tower.id);
    if (!r.ok) throw new Error('augment failed: ' + r.reason);
    return r.tower;
  };
  /** startWave and spawn a stationary (speed 0 unless given) enemy at `progress`. */
  const enemy = (type = 'grunt', progress = 5, { speed = 0, hpMul = 1 } = {}) => {
    if (game.state.phase === 'build') game.startWave();
    const e = game.spawnEnemy(type, 0, hpMul, 1, progress);
    if (speed != null) e.speed = speed;
    return e;
  };
  return { game, level, dictionary, towerFor, place, augment, enemy };
}
