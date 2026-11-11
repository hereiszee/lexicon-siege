// Engine: whole-game flow, determinism, win/loss, events, perf, bot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, STEP } from '../src/game/index.js';
import { playLevel, makeWordFinder } from '../src/game/bot.js';
import { ARCHETYPES, ELEMENTS } from '../src/core/constants.js';
import { hashString } from '../src/core/rng.js';
import { makeStubs, straightLevel, setRack, stubSpec } from '../src/game/testkit.js';

const waves3 = [
  { groups: [{ enemy: 'grunt', count: 6, interval: 0.8, delay: 0, path: 0, hpMul: 1, speedMul: 1 }] },
  { groups: [{ enemy: 'runner', count: 6, interval: 0.6, delay: 0, path: 0, hpMul: 1, speedMul: 1 },
    { enemy: 'splitter', count: 2, interval: 2, delay: 1, path: 0, hpMul: 1, speedMul: 1 }] },
  { groups: [{ enemy: 'tank', count: 3, interval: 1.5, delay: 0, path: 0, hpMul: 1, speedMul: 1 },
    { enemy: 'vandal', count: 2, interval: 1, delay: 2, path: 0, hpMul: 1, speedMul: 1 }] },
];

function scriptedGame(seed = 5, levelOver = {}) {
  const { dictionary, towerFor } = makeStubs({
    cat: { archetype: 'bolt', stats: { damage: 8, rate: 1.5, range: 3 }, effects: [{ type: 'crit', chance: 0.3, mult: 2 }] },
    dog: { archetype: 'blast', stats: { damage: 6, rate: 0.8, range: 3, splash: 1 }, effects: [{ type: 'burn', dps: 2, duration: 2 }] },
    elk: { archetype: 'chain', stats: { damage: 5, rate: 1, range: 3 }, effects: [{ type: 'freeze', chance: 0.2, duration: 1 }] },
  });
  const game = createGame({ level: straightLevel({ waves: waves3, startInk: 500, ...levelOver }), dictionary, towerFor, seed });
  setRack(game, 'cat'); game.placeTower('cat', 4, 3);
  setRack(game, 'dog'); game.placeTower('dog', 8, 5);
  setRack(game, 'elk'); game.placeTower('elk', 12, 3);
  return game;
}

function playScripted(game, chunker) {
  let guard = 0;
  while (game.state.phase !== 'won' && game.state.phase !== 'lost' && guard++ < 100000) {
    if (game.state.phase === 'build') game.startWave();
    game.update(chunker());
  }
  return game;
}

const snapshot = (g) => JSON.stringify({
  phase: g.state.phase, time: g.state.time.toFixed(6), ink: g.state.ink, lives: g.state.lives,
  wave: g.state.waveIndex, kills: g.state.towers.map((t) => [t.kills, t.damageDealt.toFixed(6), t.hp.toFixed(6)]),
});

test('deterministic regardless of dt chunking', () => {
  const a = playScripted(scriptedGame(), () => 0.1);
  const b = playScripted(scriptedGame(), () => STEP);
  let i = 0;
  const c = playScripted(scriptedGame(), () => [0.05, 0.1, 0.0333, 0.0167][i++ % 4]);
  assert.equal(snapshot(a), snapshot(b));
  assert.equal(snapshot(a), snapshot(c));
  // mid-wave state after equal elapsed time also matches
  const m1 = scriptedGame(); m1.startWave();
  const m2 = scriptedGame(); m2.startWave();
  for (let k = 0; k < 40; k++) m1.update(0.1);
  for (let k = 0; k < 80; k++) m2.update(0.05);
  assert.equal(JSON.stringify(m1.state.enemies.map((e) => [e.id, e.x, e.y, e.hp])), JSON.stringify(m2.state.enemies.map((e) => [e.id, e.x, e.y, e.hp])));
});

test('win path: wave events, bonus ink 10+2n, won, result with stars', () => {
  const game = scriptedGame(9);
  const all = [];
  let guard = 0;
  while (game.state.phase !== 'won' && game.state.phase !== 'lost' && guard++ < 10000) {
    if (game.state.phase === 'build') {
      assert.equal(game.update(1), undefined);
      game.startWave();
      assert.equal(game.startWave().ok, false, 'cannot start twice');
    }
    game.update(0.1);
    all.push(...game.drainEvents());
  }
  assert.equal(game.state.phase, 'won');
  const ends = all.filter((e) => e.type === 'waveEnd');
  assert.deepEqual(ends.map((e) => [e.index, e.bonusInk]), [[0, 12], [1, 14], [2, 16]]);
  assert.deepEqual(all.filter((e) => e.type === 'waveStart').map((e) => e.index), [0, 1, 2]);
  assert.equal(all.filter((e) => e.type === 'won').length, 1);
  const shot = all.find((e) => e.type === 'shot');
  for (const k of ['towerId', 'x', 'y', 'tx', 'ty', 'element', 'archetype']) assert.ok(k in shot, k);
  const kill = all.find((e) => e.type === 'kill');
  for (const k of ['x', 'y', 'enemy', 'ink']) assert.ok(k in kill, k);
  // splitters spawned swarm which had to be killed too
  assert.ok(all.some((e) => e.type === 'kill' && e.enemy === 'swarm'));
  const r = game.result();
  assert.equal(r.won, true);
  assert.equal(r.livesLeft, game.state.lives);
  assert.deepEqual(r.wordsUsed, ['cat', 'dog', 'elk']);
  assert.equal(r.stars, game.state.lives >= 20 ? 3 : game.state.lives >= 10 ? 2 : 1);
  assert.ok(r.score > 1000);
  assert.equal(game.placeTower('cat', 1, 1).ok, false, 'no building after the game ends');
});

test('loss path: leaks cost lives, lost event, result stars 0', () => {
  const { dictionary, towerFor } = makeStubs({});
  const level = straightLevel({ lives: 3, waves: [{ groups: [{ enemy: 'tank', count: 2, interval: 0.5, delay: 0, path: 0 }] }, { groups: [] }] });
  const game = createGame({ level, dictionary, towerFor, seed: 1 });
  assert.equal(game.result(), null);
  game.startWave();
  const evs = [];
  for (let i = 0; i < 400 && game.state.phase === 'wave'; i++) { game.update(0.1); evs.push(...game.drainEvents()); }
  assert.equal(game.state.phase, 'lost');
  const leaks = evs.filter((e) => e.type === 'leak');
  assert.equal(leaks[0].lives, 2); // tank leaks 2
  assert.ok(evs.some((e) => e.type === 'lost'));
  assert.equal(game.state.lives, 0);
  const r = game.result();
  assert.equal(r.won, false);
  assert.equal(r.stars, 0);
  // a tank walking 15 cells at 0.7 c/s takes ~21.4 s
  assert.ok(Math.abs(game.state.time - 15 / 0.7 - 0.5) < 0.1, String(game.state.time));
});

test('stars follow level.stars thresholds', () => {
  const { dictionary, towerFor } = makeStubs({ cat: { archetype: 'snipe', stats: { damage: 100, range: 20, rate: 5 } } });
  const mk = (livesLost) => {
    const level = straightLevel({ waves: [{ groups: [] }], stars: { two: { livesAtLeast: 15 }, three: { livesAtLeast: 20 } } });
    const g = createGame({ level, dictionary, towerFor, seed: 1 });
    g.state.lives -= livesLost;
    g.startWave();
    g.update(0.1);
    return g.result().stars;
  };
  assert.equal(mk(0), 3);
  assert.equal(mk(3), 2);
  assert.equal(mk(10), 1);
});

test('two paths: group.path routes enemies; enemies use level.element', () => {
  const p0 = []; for (let x = 0; x < 16; x++) p0.push([x, 2]);
  const p1 = []; for (let x = 0; x < 16; x++) p1.push([x, 7]);
  const { dictionary, towerFor } = makeStubs({});
  const level = straightLevel({ element: 'ice', paths: [p0, p1], waves: [{ groups: [{ enemy: 'grunt', count: 1, interval: 1, delay: 0, path: 1 }] }] });
  const g = createGame({ level, dictionary, towerFor, seed: 1 });
  g.startWave();
  g.update(1);
  const e = g.state.enemies[0];
  assert.equal(e.pathIndex, 1);
  assert.equal(e.y, 7.5);
  assert.equal(e.element, 'ice');
  for (const k of ['id', 'type', 'x', 'y', 'hp', 'maxHp', 'armor', 'speed', 'pathIndex', 'progress', 'element', 'statuses', 'revealed', 'boss']) assert.ok(k in e, k);
  assert.deepEqual(Object.keys(e.statuses).sort(), ['armorBreak', 'burn', 'freeze', 'poison', 'slow', 'stun']);
  assert.ok(Math.abs(e.progress - 1.2) < 0.02);
});

test('perf: 300 enemies + 60 towers', () => {
  const specs = {};
  const arches = ['bolt', 'blast', 'snipe', 'rapid', 'beam', 'chain', 'aura', 'support', 'harvest', 'summon'];
  const effs = [
    [{ type: 'burn', dps: 2, duration: 2 }], [{ type: 'poison', dps: 1, duration: 3 }], [{ type: 'slow', factor: 0.7, duration: 1 }],
    [{ type: 'pierce', count: 2 }], [{ type: 'crit', chance: 0.2, mult: 2 }], [{ type: 'heal', hps: 3 }],
    [{ type: 'buff', stat: 'damage', mul: 1.2 }], [{ type: 'harvest', resource: 'ink', amount: 4, interval: 5 }],
    [{ type: 'summon', hp: 30, damage: 3, count: 2, interval: 4 }], [{ type: 'chain', jumps: 2, falloff: 0.6 }],
  ];
  const words = [];
  for (let i = 0; i < 60; i++) {
    const w = 'w' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26));
    words.push(w);
    specs[w] = { archetype: arches[i % 10], stats: { damage: 0.5, rate: 2, range: 3, splash: i % 10 === 1 ? 1 : 0 }, effects: effs[i % 10] };
  }
  // snake path over the board so towers line it
  const path = [];
  for (let y = 0; y < 10; y += 3) {
    const row = [];
    for (let x = 0; x < 16; x++) row.push([x, y]);
    if ((y / 3) % 2) row.reverse();
    path.push(...row);
    if (y + 3 < 10) for (let k = 1; k < 3; k++) path.push([row[row.length - 1][0], y + k]);
  }
  const { dictionary, towerFor } = makeStubs(specs);
  const level = straightLevel({ paths: [path], blocked: [], waves: [{ groups: [{ enemy: 'grunt', count: 300, interval: 0.01, delay: 0, path: 0, hpMul: 1000, speedMul: 0.3 }] }] });
  const g = createGame({ level, dictionary, towerFor, seed: 1 });
  g.state.ink = 1e9;
  let n = 0;
  for (let cy = 0; cy < 10 && n < 60; cy++) for (let cx = 0; cx < 16 && n < 60; cx++) {
    if (!g.canBuild(cx, cy)) continue;
    setRack(g, words[n]);
    assert.ok(g.placeTower(words[n], cx, cy).ok);
    n++;
  }
  assert.equal(n, 60);
  g.startWave();
  g.update(3.5); // spawn all
  assert.ok(g.state.enemies.length >= 290, String(g.state.enemies.length));
  // spread the crowd along the whole path so every tower is engaged
  g.state.enemies.forEach((e, i) => { e.progress = (i / 300) * (path.length - 2); e._seg = 0; });
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) { g.update(0.1); g.drainEvents(); }
  const ms = performance.now() - t0;
  const perSec = ms / 10;
  const active = g.state.towers.filter((t) => t.damageDealt > 0).length;
  console.log(`# perf: ${active} towers dealt damage; ${g.state.enemies.length} enemies, ${g.state.towers.length} towers, ${g.state.units.length} units, ${g.state.projectiles.length} projectiles: ${perSec.toFixed(1)} ms per simulated second (${(perSec / 60).toFixed(3)} ms/tick)`);
  assert.ok(perSec < 250, `too slow: ${perSec} ms per simulated second`);
});

// --- bot with a synthetic dictionary ---------------------------------------------------------
function syntheticModules() {
  const words = [];
  const L = 'abcdefghijklmnopqrstuvwxyz';
  for (const a of L) for (const b of L) words.push(a + b);
  for (const a of L) for (const b of 'aeiou') for (const c of L) words.push(a + b + c);
  for (const a of L) for (const b of 'aeiou') for (const c of 'rstlnm') for (const d of 'aeiouy') words.push(a + b + c + d);
  const set = new Set(words);
  const sorted = [...set].sort();
  const dictionary = { size: sorted.length, has: (w) => set.has(w), words: sorted, byLength: (n) => sorted.filter((w) => w.length === n) };
  const towerFor = (word) => {
    const h = hashString(word);
    const archetype = ARCHETYPES[h % 7]; // attackers only, mostly
    const n = word.length;
    const power = 6 * Math.pow(1.45, n - 3) * (0.85 + (h % 31) / 100);
    const cont = archetype === 'beam' || archetype === 'aura';
    return stubSpec(word, {
      archetype, element: ELEMENTS[(h >>> 3) % ELEMENTS.length],
      cost: Math.round(30 * Math.pow(1.3, n - 3)),
      stats: { damage: cont ? power * 0.8 : power, rate: archetype === 'rapid' ? 3 : 1, range: archetype === 'snipe' ? 5 : 2.5, splash: archetype === 'blast' ? 1 : 0, hp: 60 },
      augment: (h & 7) === 0 ? { kind: 'verb', cost: 20, mods: { damage: 1.25 }, effects: [], element: null } : null,
    });
  };
  return { dictionary, towerFor };
}

test('makeWordFinder finds multiset-spellable words, longest first', () => {
  const { dictionary } = syntheticModules();
  const f = makeWordFinder(dictionary);
  const rack = ['b', 'a', 'r', 'e', 'x', 'x', 'x', 'x'];
  const found = f.find(rack);
  assert.ok(found.includes('bare') && found.includes('ab'));
  for (const w of found) {
    const r = rack.slice();
    for (const ch of w) { const i = r.indexOf(ch); assert.ok(i >= 0, w); r.splice(i, 1); }
  }
  for (let i = 1; i < found.length; i++) assert.ok(found[i - 1].length >= found[i].length);
  assert.ok(f.find(rack, { maxLen: 2 }).every((w) => w.length <= 2));
});

test('bot plays a level with stubs; skill matters; deterministic', () => {
  const { dictionary, towerFor } = syntheticModules();
  const waves = [];
  for (let i = 0; i < 8; i++) {
    waves.push({ groups: [
      { enemy: 'grunt', count: 6 + i * 2, interval: 0.8, delay: 0, path: 0, hpMul: 1 + i * 0.35, speedMul: 1 },
      { enemy: i % 2 ? 'runner' : 'armored', count: 2 + i, interval: 1.2, delay: 3, path: 0, hpMul: 1 + i * 0.3, speedMul: 1 },
    ] });
  }
  const level = straightLevel({ waves, startInk: 100, element: 'fire' });
  const finder = makeWordFinder(dictionary);
  const t0 = performance.now();
  const hi = playLevel({ level, dictionary, towerFor, seed: 3, skill: 1, finder });
  const ms = performance.now() - t0;
  const hi2 = playLevel({ level, dictionary, towerFor, seed: 3, skill: 1, finder });
  const lo = playLevel({ level, dictionary, towerFor, seed: 3, skill: 0, finder });
  console.log(`# bot: skill1 ${JSON.stringify({ ...hi, wordsUsed: hi.wordsUsed.length })} in ${ms.toFixed(0)} ms; skill0 ${JSON.stringify({ ...lo, wordsUsed: lo.wordsUsed.length })}`);
  assert.deepEqual(hi, hi2);
  assert.equal(hi.won, true);
  assert.ok(hi.wordsUsed.length > 2);
  assert.ok(hi.livesLeft >= lo.livesLeft);
  for (const k of ['won', 'livesLeft', 'stars', 'wavesCleared', 'wordsUsed', 'timeSimulated']) assert.ok(k in hi, k);
});

test('bot terminates on a zero-wave level', () => {
  const { dictionary, towerFor } = makeStubs({ cat: {} });
  const r = playLevel({ level: straightLevel({ waves: [] }), dictionary, towerFor, seed: 1, skill: 1 });
  assert.equal(r.won, false);
  assert.equal(r.wavesCleared, 0);
});
