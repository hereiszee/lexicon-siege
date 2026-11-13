// Engine v2: new archetypes, tower damage, rewards (relics + letters), hints, bot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame, STEP } from '../src/game/index.js';
import { playLevel, makeWordFinder, suggestWords } from '../src/game/bot.js';
import { RELICS, RELIC_IDS } from '../src/game/relics.js';
import { LETTER_KINDS, KIND_IDS, letterKinds, applyLetterBonuses, wordBonuses } from '../src/game/letters.js';
import { ELEMENTS } from '../src/core/constants.js';
import { hashString } from '../src/core/rng.js';
import { sandbox, makeStubs, straightLevel, setRack, stubSpec } from '../src/game/testkit.js';
import { missingLetters } from '../src/game/rack.js';

const S = 1 / 60;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const evs = (game, type) => game.drainEvents().filter((e) => e.type === type);

const SPECS = {
  cat: { archetype: 'bolt', stats: { damage: 0 } },
  eye: { archetype: 'snipe', stats: { damage: 10, range: 9, rate: 1 } },
  wall: { archetype: 'wall', stats: { damage: 0, hp: 10000 } },
  weak: { archetype: 'wall', stats: { damage: 0, hp: 5 } },
  trap: { archetype: 'trap', stats: { damage: 10, rate: 1 } },
  shell: { archetype: 'mortar', stats: { damage: 10, rate: 1, range: 5, minRange: 2, splash: 1 } },
  swirl: { archetype: 'vortex', stats: { damage: 2, range: 3, pull: 0.6, rate: 1 } },
  drift: { archetype: 'vortex', stats: { damage: 0, range: 3, pull: 0.3, rate: 1 } },
  drum: { archetype: 'pulse', stats: { damage: 5, rate: 1, range: 2 }, effects: [{ type: 'slow', factor: 0.5, duration: 3 }] },
  moon: { archetype: 'orbit', stats: { damage: 1, range: 1, orbs: 1 } },
  twin: { archetype: 'orbit', stats: { damage: 1, range: 1, orbs: 2 } },
  medic: { archetype: 'support', stats: { damage: 0, range: 3 }, effects: [{ type: 'heal', hps: 20 }] },
  camp: { archetype: 'summon', stats: { damage: 0, range: 2 }, effects: [{ type: 'summon', hp: 30, damage: 0, count: 1, interval: 3 }] },
  bank: { archetype: 'harvest', stats: { damage: 0 }, effects: [{ type: 'interest', pct: 0.1, cap: 20 }] },
  fire: { archetype: 'snipe', element: 'fire', stats: { damage: 10, range: 9 } },
};
const sb = (levelOver, opts) => sandbox(SPECS, levelOver, opts);
const grant = (game, id) => { game.state.reward = { kind: 'relic', options: [id], rerolls: 0 }; assert.ok(game.chooseReward(0).ok); };

// ---------------------------------------------------------------- placement
test('canBuild(cx, cy, archetype): walls/traps on inner path cells only; placeTower uses the spec archetype', () => {
  const { game, place } = sb();
  assert.equal(game.canBuild(5, 4), false, 'path refused without archetype');
  assert.equal(game.canBuild(5, 4, 'bolt'), false);
  assert.equal(game.canBuild(5, 4, 'wall'), true);
  assert.equal(game.canBuild(5, 4, 'trap'), true);
  assert.equal(game.canBuild(5, 3, 'wall'), false, 'non-path refused');
  assert.equal(game.canBuild(0, 4, 'wall'), false, 'first cell');
  assert.equal(game.canBuild(15, 4, 'trap'), false, 'last cell');
  assert.equal(game.canBuild(5, 3), true);
  setRack(game, 'wall');
  assert.match(game.placeTower('wall', 5, 3).reason, /path/);
  const w = place('wall', 5, 4);
  assert.equal(w.archetype, 'wall');
  assert.equal(game.cellState(5, 4), 'tower');
  assert.equal(game.towerAt(5, 4), w);
  assert.equal(game.canBuild(5, 4, 'trap'), false, 'occupied');
  setRack(game, 'cat');
  assert.match(game.placeTower('cat', 6, 4).reason, /path/);
  game.sellTower(w.id);
  assert.equal(game.canBuild(5, 4, 'wall'), true);
});

// ---------------------------------------------------------------- walls, bite, thorns
test('wall blocks walkers (not flyers); bite = ENEMIES.bite × hpMul, +10%/s while blocked', () => {
  const { game, place, enemy } = sb();
  const w = place('wall', 8, 4);
  const g = enemy('grunt', 7.45, { speed: 0, hpMul: 2 });
  g.hp = g.maxHp = 1e6;
  g.speed = 1.2;
  const f = enemy('flyer', 7, { speed: 2, hpMul: 100 });
  game.update(1);
  const first = w.maxHp - w.hp;
  assert.ok(g.progress < 7.46, 'grunt stopped at the wall');
  assert.ok(g.blocked);
  assert.ok(f.progress > 8.5, 'flyer flies over');
  game.update(1);
  // Σ 8 × (1 + 0.1 t_k) dt over 120 steps
  const expected = 8 * (2 + 0.1 * (120 * 121 / 2) * S * S);
  assert.ok(near(w.maxHp - w.hp, expected, 1e-6), `${w.maxHp - w.hp} vs ${expected}`);
  assert.ok(w.maxHp - w.hp - first > first, 'second second hurts more than the first');
  const hits = evs(game, 'towerHit').filter((e) => e.towerId === w.id);
  assert.ok(hits.length >= 6 && hits.every((e) => e.source === 'bite' && e.damage > 0));
  assert.ok(near(hits.reduce((s, e) => s + e.damage, 0), w.maxHp - w.hp, 1e-6), 'towerHit totals match');
});

test('disabled wall stops blocking; heal above 30% blocks again', () => {
  const { game, place, enemy } = sb();
  const w = place('weak', 8, 4);
  const g = enemy('grunt', 7, { speed: 1.2, hpMul: 1 });
  g.hp = g.maxHp = 1e6;
  game.update(3);
  assert.ok(w.disabled);
  assert.ok(g.progress > 8.5, 'walks through a broken wall');
});

test('thorns: a wall with on-hit effects applies them to biters (once per second)', () => {
  const { game, place, augment, enemy } = sandbox({
    ...SPECS,
    spiky: { archetype: 'bolt', augment: { kind: 'verb', cost: 5, mods: {}, effects: [{ type: 'slow', factor: 0.5, duration: 2 }, { type: 'burn', dps: 5, duration: 1 }] } },
  });
  const w = place('wall', 8, 4);
  augment('spiky', w);
  const g = enemy('grunt', 7.45, { speed: 0, hpMul: 10 });
  game.update(S);
  assert.ok(g.statuses.slow > 0 && g.statuses.burn > 0, 'thorns applied on first bite');
  game.update(0.5);
  assert.ok(g.hp < g.maxHp);
  assert.ok(w.damageDealt > 0);
});

test('summoned units take bite × hpMul too', () => {
  const { game, place, enemy } = sb();
  place('camp', 8, 3);
  const u = game.state.units[0];
  const g = enemy('tank', u.progress - 0.3, { speed: 0, hpMul: 1 });
  game.update(1);
  const expected = 10 * (1 + 0.1 * (60 * 61 / 2) * S * S);
  assert.ok(near(u.maxHp - u.hp, expected, 1e-6), `${u.maxHp - u.hp}`);
  void g;
});

// ---------------------------------------------------------------- trap
test('trap: triggers on a walker within 0.5, hits all walkers within 0.6, rearms after 1/rate; flyers ignored', () => {
  const { game, place, enemy } = sb();
  place('trap', 8, 4); // centre x 8.5 = progress 8
  const a = enemy('grunt', 7.2, { hpMul: 10 }); // 0.8 away
  const fl = enemy('flyer', 8.0, { hpMul: 10 }); // flyer on the trap
  game.update(0.5);
  assert.equal(a.hp, a.maxHp, 'nothing triggered yet (flyer does not trigger)');
  const b = enemy('grunt', 7.6, { hpMul: 10 }); // 0.4 → triggers
  const c = enemy('grunt', 8.45, { hpMul: 10 }); // 0.45 → hit
  const d = enemy('grunt', 7.35, { hpMul: 10 }); // 0.65 → not hit
  game.update(S);
  assert.equal(b.maxHp - b.hp, 10);
  assert.equal(c.maxHp - c.hp, 10);
  assert.equal(d.hp, d.maxHp);
  assert.equal(a.hp, a.maxHp);
  assert.equal(fl.hp, fl.maxHp, 'flyers are not hit');
  game.update(0.9);
  assert.equal(b.maxHp - b.hp, 10, 'rearming');
  game.update(0.15);
  assert.equal(b.maxHp - b.hp, 20, 'rearmed after 1 s');
});

// ---------------------------------------------------------------- mortar
test('mortar: lobbed shell lands after ~1.2 s with splash; leads movers; nothing inside minRange', () => {
  const { game, place, enemy } = sb();
  place('shell', 8, 1); // (8.5, 1.5); path y 4.5 → 3 cells away
  const e1 = enemy('grunt', 8, { hpMul: 10 });
  const e2 = enemy('grunt', 8.6, { hpMul: 10 });
  game.update(S);
  const p = game.state.projectiles.find((x) => x.kind === 'mortar');
  assert.ok(p && 'sx' in p && 'age' in p && p.flight === 1.2);
  game.update(1.1);
  assert.equal(e1.hp, e1.maxHp, 'still in the air');
  game.update(0.15);
  assert.ok(e1.hp < e1.maxHp && e2.hp < e2.maxHp, 'splash hits both');

  const s2 = sb();
  s2.place('shell', 8, 3); // 1 cell from the path, minRange 2
  const n = s2.enemy('grunt', 8, { hpMul: 10 });
  s2.game.update(1);
  assert.equal(evs(s2.game, 'shot').length, 0);
  assert.equal(n.hp, n.maxHp);

  const s3 = sb();
  s3.place('shell', 8, 1);
  const m = s3.enemy('grunt', 6, { speed: 1, hpMul: 10 });
  s3.game.update(S);
  const shot = evs(s3.game, 'shot')[0];
  assert.ok(near(shot.tx, m.x + 1.2, 0.05), 'aims where the target will be');
  s3.game.update(1.25);
  assert.ok(m.hp < m.maxHp, 'leading shot hits a walker');
});

// ---------------------------------------------------------------- vortex
test('vortex: walkers in range drift back at pull c/s (bosses 25%), DPS, strongest wins, never past spawn', () => {
  const { game, place, enemy } = sb();
  place('swirl', 8, 3);
  const g = enemy('grunt', 7, { speed: 1.2, hpMul: 100 });
  const b = enemy('boss', 7.5, { speed: 0.5, hpMul: 100 });
  const f = enemy('flyer', 7, { speed: 1.8, hpMul: 100 });
  game.update(1);
  assert.ok(near(g.progress, 7 + 1.2 - 0.6 * 59 / 60, 1e-6), String(g.progress));
  assert.ok(near(b.progress, 7.5 + 0.5 - 0.15 * 59 / 60, 1e-6), String(b.progress));
  assert.ok(near(f.progress, 7 + 1.8, 1e-6), 'flyers are not pulled');
  assert.ok(g.hp < g.maxHp, 'vortex DPS');
  g.statuses.freeze = 5;
  const p0 = g.progress;
  game.update(1);
  assert.ok(g.progress < p0 - 0.55, 'held walkers move backwards');

  const s2 = sb();
  s2.place('swirl', 1, 3);
  s2.place('drift', 2, 3);
  const e = s2.enemy('grunt', 0.2, { speed: 0, hpMul: 100 });
  const e2 = s2.enemy('grunt', 1.5, { speed: 1, hpMul: 100 });
  s2.game.update(1);
  assert.equal(e.progress, 0, 'never past spawn');
  assert.ok(near(e2.progress, 1.5 + 1 - 0.6 * 59 / 60, 1e-6), 'two vortexes do not stack');
});

// ---------------------------------------------------------------- pulse
test('pulse: one burst hits every enemy in range once per 1/rate s, with on-hit effects', () => {
  const { game, place, enemy } = sb();
  place('drum', 8, 3);
  const ins = [7, 8, 9].map((p) => enemy('grunt', p, { hpMul: 10 }));
  const out = enemy('grunt', 12, { hpMul: 10 });
  game.update(S);
  for (const e of ins) { assert.equal(e.maxHp - e.hp, 5); assert.ok(e.statuses.slow > 0); }
  assert.equal(out.hp, out.maxHp);
  game.update(0.5);
  assert.equal(ins[0].maxHp - ins[0].hp, 5);
  game.update(0.5);
  assert.equal(ins[0].maxHp - ins[0].hp, 10);
  assert.ok(evs(game, 'shot').every((e) => e.archetype === 'pulse'));
});

// ---------------------------------------------------------------- orbit
test('orbit: orbs circle at radius range (lap 1.5 s), hit on contact, one hit per orb per pass', () => {
  for (const [word, orbs] of [['moon', 1], ['twin', 2]]) {
    const { game, place, enemy } = sb();
    const t = place(word, 8, 3); // centre (8.5, 3.5); enemy at (8.5, 4.5) is exactly 1 away
    const e = enemy('grunt', 8, { hpMul: 100 });
    game.drainEvents();
    game.update(3);
    const hits = game.drainEvents().filter((x) => x.type === 'hit' && x.towerId === t.id).length;
    assert.ok(hits >= 2 * orbs && hits <= 2 * orbs + 1, `${word}: ${hits} hits`);
    assert.equal(e.maxHp - e.hp, hits);
    assert.ok(typeof t.orbAngle === 'number' && t.stats.orbs === orbs);
  }
});

// ---------------------------------------------------------------- interest
test('interest: at wave end gain floor(ink × pct) up to cap', () => {
  const { game, place } = sb();
  place('bank', 2, 2);
  game.state.ink = 50;
  game.startWave();
  game.update(S);
  assert.equal(game.state.ink, 50 + 12 + 6);
  const h = evs(game, 'harvest').find((e) => e.resource === 'ink');
  assert.equal(h.amount, 6);
  const g2 = sb({ waves: [{ groups: [] }, { groups: [] }] });
  g2.place('bank', 2, 2);
  g2.game.state.ink = 1000;
  g2.game.startWave();
  g2.game.update(S);
  assert.equal(g2.game.state.ink, 1000 + 12 + 20, 'capped');
});

// ---------------------------------------------------------------- slinger, stomp, vandal
test('slinger: every 2 s shoots the nearest tower within 2.5 for 6 × hpMul as a visible projectile', () => {
  const { game, place, enemy } = sb();
  const t = place('cat', 8, 3);
  const far = place('eye', 8, 0);
  far.stats.damage = 0;
  enemy('slinger', 7.5, { hpMul: 2 });
  game.update(1.9);
  assert.equal(t.hp, t.maxHp);
  game.update(0.15);
  assert.ok(game.state.projectiles.some((p) => p.kind === 'sling'));
  assert.equal(evs(game, 'enemyShot').length, 1);
  game.update(0.3);
  assert.equal(t.maxHp - t.hp, 12);
  assert.equal(far.hp, far.maxHp);
  const hit = evs(game, 'towerHit').find((e) => e.source === 'shot');
  assert.equal(hit.damage, 12);
  assert.equal(hit.towerId, t.id);
});

test('boss stomp: every 4 s, 20 × hpMul to towers within 1.5', () => {
  const { game, place, enemy } = sb();
  const t = place('cat', 8, 3);
  const far = place('drum', 8, 1);
  enemy('boss', 8, { hpMul: 1.5 });
  game.update(3.9);
  assert.equal(t.hp, t.maxHp);
  game.update(0.2);
  assert.equal(t.maxHp - t.hp, 30);
  assert.equal(far.hp, far.maxHp);
  const all = game.drainEvents();
  assert.equal(all.filter((e) => e.type === 'stomp').length, 1);
  assert.ok(all.some((e) => e.type === 'towerHit' && e.source === 'stomp' && e.damage === 30));
});

test('vandal damage is reported as towerHit source vandal', () => {
  const { game, place, enemy } = sb();
  const t = place('cat', 8, 3);
  enemy('vandal', 8, { hpMul: 100 });
  game.update(1);
  const hits = evs(game, 'towerHit').filter((e) => e.source === 'vandal');
  assert.ok(hits.length >= 3);
  assert.ok(near(hits.reduce((s, e) => s + e.damage, 0), t.maxHp - t.hp, 1e-6));
});

// ---------------------------------------------------------------- rewards
const emptyWaves = (n) => Array.from({ length: n }, () => ({ groups: [] }));
function clearWave(game) {
  assert.ok(game.startWave().ok);
  game.update(S);
}

test('reward flow: relic after wave 3, letter after wave 6, none after the last; startWave blocked; reroll once', () => {
  const { game, place } = sb({ waves: emptyWaves(7) });
  for (let i = 0; i < 2; i++) clearWave(game);
  assert.equal(game.state.reward, null);
  clearWave(game);
  const r = game.state.reward;
  assert.equal(r.kind, 'relic');
  assert.equal(r.rerolls, 1);
  assert.equal(r.options.length, 3);
  assert.equal(new Set(r.options).size, 3);
  assert.ok(r.options.every((id) => RELICS[id]));
  assert.deepEqual(evs(game, 'reward').map((e) => e.kind), ['relic']);
  assert.deepEqual(game.startWave(), { ok: false, reason: 'Choose your reward first' });
  place('eye', 3, 3); // building still works
  const before = r.options.slice();
  assert.ok(game.rerollReward(0).ok);
  assert.notEqual(r.options[0], before[0]);
  assert.equal(new Set(r.options).size, 3);
  assert.ok(!before.includes(r.options[0]));
  assert.equal(game.rerollReward(1).ok, false, 'only one reroll');
  const pick = r.options[1];
  assert.ok(game.chooseReward(1).ok);
  assert.deepEqual(game.state.relics, [pick]);
  assert.equal(game.state.reward, null);
  assert.deepEqual(evs(game, 'rewardTaken').map((e) => [e.kind, e.id]), [['relic', pick]]);
  for (let i = 0; i < 3; i++) clearWave(game);
  const lr = game.state.reward;
  assert.equal(lr.kind, 'letter');
  for (const o of lr.options) {
    assert.match(o.letter, /^[a-z]$/);
    assert.ok(KIND_IDS.includes(o.bonus));
    assert.equal(o.tier, 1);
  }
  assert.equal(new Set(lr.options.map((o) => o.letter)).size, 3);
  const L = lr.options[2].letter;
  assert.ok(game.chooseReward(2).ok);
  assert.equal(game.state.letterTiers[L], 1);
  assert.deepEqual(game.letterBonus(L), { kind: lr.options[2].bonus, tier: 1, text: game.letterBonus(L).text });
  assert.match(game.letterBonus(L).text, /Silver/);
  clearWave(game);
  assert.equal(game.state.phase, 'won');
  assert.equal(game.state.reward, null);
});

test('rewards: skip works; no offer after the final wave; never an owned relic', () => {
  const { game } = sb({ waves: emptyWaves(6) });
  for (let i = 0; i < 3; i++) clearWave(game);
  assert.ok(game.skipReward().ok);
  assert.equal(game.skipReward().ok, false);
  for (let i = 0; i < 3; i++) clearWave(game);
  assert.equal(game.state.phase, 'won');
  assert.equal(game.state.reward, null);

  const g2 = sb({ waves: emptyWaves(4) }).game;
  g2.state.relics = RELIC_IDS.slice(2);
  for (let i = 0; i < 3; i++) clearWave(g2);
  assert.deepEqual(g2.state.reward.options.slice().sort(), RELIC_IDS.slice(0, 2).sort());
  assert.equal(g2.rerollReward(0).ok, false, 'nothing else to offer');
});

test('rewards are deterministic from the seed and never perturb tile draws', () => {
  const run = (reroll) => {
    const { game } = sb({ waves: emptyWaves(10) }, { seed: 99 });
    const offers = [];
    for (let i = 0; i < 9; i++) {
      clearWave(game);
      if (game.state.reward) {
        offers.push(JSON.stringify(game.state.reward.options));
        if (reroll) game.rerollReward(0);
        game.chooseReward(0);
      }
    }
    game.redrawRack();
    return { offers, rack: game.state.rack.join('') };
  };
  const a = run(false), b = run(false), c = run(true);
  assert.deepEqual(a, b);
  assert.equal(a.offers.length, 3);
  assert.equal(a.rack, c.rack, 'rerolls do not touch the bag');
});

test('letter offers favour letters in the current rack', () => {
  let hits = 0;
  for (let seed = 0; seed < 20; seed++) {
    const { game } = sb({ waves: emptyWaves(8) }, { seed });
    for (let i = 0; i < 3; i++) clearWave(game);
    game.skipReward();
    for (let i = 0; i < 2; i++) clearWave(game);
    setRack(game, 'qqqqqqqqqq');
    clearWave(game);
    assert.equal(game.state.reward.kind, 'letter');
    if (game.state.reward.options.some((o) => o.letter === 'q')) hits++;
  }
  assert.ok(hits >= 14, `q offered in ${hits}/20`);
});

// ---------------------------------------------------------------- letters
test('letter kinds are per-level seeded; every kind used; silver/gold values defined', () => {
  const a = letterKinds(1), b = letterKinds(1), c = letterKinds(2);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(Object.keys(a).length, 26);
  for (const k of KIND_IDS) assert.ok(Object.values(a).filter((x) => x === k).length >= 2, k);
  assert.deepEqual(KIND_IDS.sort(), ['burn', 'chain', 'crit', 'damage', 'hp', 'ink', 'pierce', 'poison', 'range', 'rate', 'slow', 'splash']);
  for (const k of KIND_IDS) assert.ok(LETTER_KINDS[k].gold > LETTER_KINDS[k].silver, k);
});

test('applyLetterBonuses: every kind changes something', () => {
  for (const kind of KIND_IDS) {
    const s = { damage: 10, rate: 1, range: 2, splash: 0, hp: 60 };
    const fx = [];
    const extra = {};
    applyLetterBonuses({ [kind]: LETTER_KINDS[kind].silver }, s, fx, extra);
    const changed = s.damage !== 10 || s.rate !== 1 || s.range !== 2 || s.splash !== 0 || s.hp !== 60 || fx.length > 0 || extra.killInk > 0;
    assert.ok(changed, kind);
  }
  assert.deepEqual(wordBonuses('hill', { h: 'hp', i: 'damage', l: 'range' }, { l: 1 }), { range: 0.5 });
});

test('letter bonus applies once per occurrence, only to towers created afterwards', () => {
  const kinds = letterKinds(42); // straightLevel seed 42
  const L = Object.keys(kinds).find((l) => kinds[l] === 'damage' && l !== 'z');
  const w1 = L + 'zz', w2 = L + L + 'z';
  const { game, place } = sandbox({ [w1]: { archetype: 'snipe', stats: { damage: 10 } }, [w2]: { archetype: 'snipe', stats: { damage: 10 } }, old: { archetype: 'snipe', stats: { damage: 10 } } }, { waves: emptyWaves(4) });
  const before = place('old', 2, 2);
  assert.equal(game.letterBonus(L).tier, 0);
  game.state.reward = { kind: 'letter', options: [{ letter: L, bonus: 'damage', tier: 1 }], rerolls: 1 };
  assert.ok(game.chooseReward(0).ok);
  const a = place(w1, 3, 2);
  const b = place(w2, 4, 2);
  assert.equal(before.stats.damage, 10, 'existing towers unaffected');
  assert.ok(near(a.stats.damage, 11));
  assert.ok(near(b.stats.damage, 12), 'twice for two occurrences');
  game.state.reward = { kind: 'letter', options: [{ letter: L, bonus: 'damage', tier: 2 }], rerolls: 1 };
  assert.ok(game.chooseReward(0).ok);
  assert.ok(near(a.stats.damage, 11), 'upgrading to gold does not touch earlier towers');
  assert.equal(game.letterBonus(L).tier, 2);
  assert.match(game.letterBonus(L).text, /Gold/);
});

// ---------------------------------------------------------------- relics
const RELIC_CASES = {
  inkwell: (g) => { g.place('eye', 8, 3); g.enemy('grunt', 8, { hpMul: 0.5 }); const i = g.game.state.ink; g.game.update(0.1); return g.game.state.ink - i; },
  patron: (g) => { g.game.startWave(); const i = g.game.state.ink; g.game.update(S); return g.game.state.ink - i; },
  pawnbroker: (g) => g.game.sellTower(g.place('eye', 2, 2).id).refund,
  scholar: (g) => { g.game.startWave(); return g.game.state.freeRedraws; },
  deepPockets: (g) => g.game.state.rack.length,
  secondWind: (g) => g.game.state.lives,
  farsighted: (g) => g.place('eye', 2, 2).stats.range,
  bulwark: (g) => g.place('eye', 2, 2).maxHp,
  saved: (g) => { const t = g.place('eye', 8, 3); g.place('medic', 9, 3); g.enemy('grunt', 0, { speed: 0, hpMul: 1000 }); t.hp = 10; g.game.update(3); return t.maxHp; },
  mason: (g) => g.place('wall', 8, 4).maxHp,
  briar: (g) => { g.place('wall', 8, 4); const e = g.enemy('grunt', 7.45, { hpMul: 10 }); g.game.update(1); return e.hp; },
  garrison: (g) => { g.place('camp', 8, 3); return g.game.state.units[0].maxHp; },
  trapper: (g) => g.place('trap', 8, 4).stats.rate,
  eagleEye: (g) => g.place('eye', 2, 2).stats.damage,
  maelstrom: (g) => g.place('swirl', 2, 2).stats.pull,
  warDrum: (g) => g.place('drum', 2, 2).stats.rate,
  orrery: (g) => g.place('moon', 2, 2).stats.orbs,
  quickdraw: (g) => g.place('cat', 2, 2).stats.rate,
  stunning: (g) => { g.place('eye', 8, 3); const e = g.enemy('grunt', 8, { hpMul: 10 }); e.statuses.stun = 5; g.game.update(S); return e.hp; },
  frostbite: (g) => { g.place('eye', 8, 3); const e = g.enemy('grunt', 8, { hpMul: 10 }); e.statuses.slow = 5; e.slowFactor = 0.5; g.game.update(S); return e.hp; },
  headsman: (g) => { g.place('eye', 8, 3); const e = g.enemy('boss', 8); g.game.update(S); return e.hp; },
  luckyStar: (g) => g.place('eye', 2, 2).effects.filter((e) => e.type === 'crit').length,
};
for (const id of RELIC_IDS.filter((r) => RELICS[r].element)) {
  const el = RELICS[id].element;
  RELIC_CASES[id] = (g) => {
    const { game } = g;
    const spec = { archetype: 'snipe', element: el, stats: { damage: 10 } };
    const other = { archetype: 'snipe', element: el === 'fire' ? 'ice' : 'fire', stats: { damage: 10 } };
    const s2 = sandbox({ aa: spec, bb: other });
    for (const r of game.state.relics) grant(s2.game, r);
    const t = s2.place('aa', 2, 2), u = s2.place('bb', 3, 2);
    assert.equal(u.stats.damage, 10, `${id}: other elements unaffected`);
    return t.stats.damage;
  };
}

test(`relics: ≥ 24, each well-formed, each with a measurable effect (${RELIC_IDS.length})`, () => {
  const ICONS = 'shield bird star coin eye flame snowflake bolt heart hourglass book crown skull leaf wave anchor gem key'.split(' ');
  assert.ok(RELIC_IDS.length >= 24);
  for (const id of RELIC_IDS) {
    const r = RELICS[id];
    assert.ok(r.name && r.text && ICONS.includes(r.icon), id);
    const fn = RELIC_CASES[id];
    assert.ok(fn, `test case for ${id}`);
    const base = fn(sb());
    const g = sb();
    grant(g.game, id);
    const withIt = fn(g);
    assert.notEqual(withIt, base, `${id} changed nothing (${base})`);
  }
});

test('relics apply to existing towers when taken', () => {
  const { game, place } = sb();
  const t = place('eye', 2, 2);
  const r0 = t.stats.range;
  grant(game, 'farsighted');
  assert.equal(t.stats.range, r0 + 0.5);
});

// ---------------------------------------------------------------- determinism + perf
function v2Game(seed = 5) {
  const waves = [
    { groups: [{ enemy: 'grunt', count: 8, interval: 0.6, delay: 0, path: 0, hpMul: 3, speedMul: 1 }, { enemy: 'slinger', count: 3, interval: 1, delay: 1, path: 0, hpMul: 2, speedMul: 1 }] },
    { groups: [{ enemy: 'boss', count: 1, interval: 1, delay: 0, path: 0, hpMul: 0.5, speedMul: 1 }, { enemy: 'flyer', count: 4, interval: 0.5, delay: 0, path: 0, hpMul: 1, speedMul: 1 }] },
    { groups: [{ enemy: 'tank', count: 4, interval: 1, delay: 0, path: 0, hpMul: 2, speedMul: 1 }] },
  ];
  const { dictionary, towerFor } = makeStubs({ ...SPECS, wall: { archetype: 'wall', stats: { hp: 200 } } });
  const game = createGame({ level: straightLevel({ waves, startInk: 5000 }), dictionary, towerFor, seed });
  const put = (w, cx, cy) => { setRack(game, w); assert.ok(game.placeTower(w, cx, cy).ok, w); };
  put('wall', 11, 4); put('trap', 6, 4); put('shell', 8, 1); put('swirl', 4, 3); put('drum', 9, 5);
  put('moon', 12, 3); put('medic', 10, 5); put('eye', 12, 5); put('camp', 3, 5); put('bank', 0, 9);
  return game;
}
const snap = (g) => JSON.stringify({
  phase: g.state.phase, time: g.state.time.toFixed(6), ink: g.state.ink, lives: g.state.lives, wave: g.state.waveIndex,
  t: g.state.towers.map((t) => [t.kills, t.damageDealt.toFixed(6), t.hp.toFixed(6), t.disabled]),
  e: g.state.enemies.map((e) => [e.id, e.progress.toFixed(6), e.hp.toFixed(6)]),
});

test('v2 determinism regardless of dt chunking', () => {
  const play = (chunk) => {
    const g = v2Game();
    let guard = 0;
    while (g.state.phase !== 'won' && g.state.phase !== 'lost' && guard++ < 100000) {
      if (g.state.phase === 'build') { if (g.state.reward) g.chooseReward(0); g.startWave(); }
      g.update(chunk());
    }
    return g;
  };
  let i = 0;
  const a = play(() => 0.1), b = play(() => STEP), c = play(() => [0.05, 0.1, 0.0333, 0.0167][i++ % 4]);
  assert.equal(snap(a), snap(b));
  assert.equal(snap(a), snap(c));
  const m1 = v2Game(); m1.startWave();
  const m2 = v2Game(); m2.startWave();
  for (let k = 0; k < 60; k++) m1.update(0.1);
  for (let k = 0; k < 120; k++) m2.update(0.05);
  assert.equal(snap(m1), snap(m2));
});

test('perf: 300 enemies + 60 towers with orbits, vortexes, mortars, pulses, walls, traps', () => {
  const specs = {};
  const kinds = [
    ['orbit', { damage: 0.5, range: 1.2, orbs: 4 }], ['vortex', { damage: 0.5, range: 3, pull: 0.3, rate: 1 }],
    ['mortar', { damage: 0.5, rate: 1, range: 6, minRange: 1.5, splash: 1.2 }], ['pulse', { damage: 0.5, rate: 2, range: 2.5 }],
    ['bolt', { damage: 0.5, rate: 2, range: 3 }], ['aura', { damage: 0.5, rate: 1, range: 3 }],
  ];
  const words = [];
  for (let i = 0; i < 54; i++) {
    const w = 'w' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26));
    words.push(w);
    specs[w] = { archetype: kinds[i % kinds.length][0], stats: kinds[i % kinds.length][1], effects: i % 3 ? [] : [{ type: 'slow', factor: 0.8, duration: 1 }] };
  }
  for (let i = 0; i < 6; i++) specs['p' + 'abcdef'[i]] = { archetype: i % 2 ? 'trap' : 'wall', stats: { damage: 0.5, rate: 1, hp: 1e9 } };
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
  for (let cy = 0; cy < 10 && n < 54; cy++) for (let cx = 0; cx < 16 && n < 54; cx++) {
    if (!g.canBuild(cx, cy)) continue;
    setRack(g, words[n]);
    assert.ok(g.placeTower(words[n], cx, cy).ok);
    n++;
  }
  for (let i = 0; i < 6; i++) {
    const [cx, cy] = path[10 + i * 9];
    setRack(g, 'p' + 'abcdef'[i]);
    assert.ok(g.placeTower('p' + 'abcdef'[i], cx, cy).ok);
  }
  assert.equal(g.state.towers.length, 60);
  g.startWave();
  g.update(3.5);
  g.state.enemies.forEach((e, i) => { e.progress = (i / 300) * (path.length - 2); e._seg = 0; });
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) { g.update(0.1); g.drainEvents(); }
  const perSec = (performance.now() - t0) / 10;
  const active = g.state.towers.filter((t) => t.damageDealt > 0).length;
  console.log(`# perf v2: ${active} towers dealt damage; ${g.state.enemies.length} enemies, ${g.state.projectiles.length} projectiles: ${perSec.toFixed(1)} ms per simulated second`);
  assert.ok(g.state.enemies.length >= 250);
  assert.ok(perSec < 250, `too slow: ${perSec}`);
});

// ---------------------------------------------------------------- hints
test('suggestWords: spellable, rule-legal, affordable, best first, both uses', () => {
  const specs = {
    cat: { archetype: 'bolt', cost: 30, stats: { damage: 6 } },
    act: { archetype: 'bolt', cost: 30, stats: { damage: 12 } },
    tact: { archetype: 'snipe', cost: 999, stats: { damage: 99 } },
    at: { archetype: 'bolt', cost: 20, stats: { damage: 3 }, augment: { kind: 'verb', cost: 10, mods: { damage: 2 }, effects: [] } },
    ta: { archetype: 'bolt', cost: 20, stats: { damage: 3 } },
    dog: { archetype: 'bolt', cost: 10, stats: { damage: 50 } },
  };
  const { dictionary, towerFor } = makeStubs(specs);
  const level = straightLevel({ startInk: 100 });
  const checkWordRules = (w) => (w === 'ta' ? { ok: false, reason: 'banned' } : { ok: true });
  const game = createGame({ level, dictionary, towerFor, checkWordRules, seed: 1 });
  setRack(game, 'tacatxxxxx');
  const finder = makeWordFinder(dictionary);
  const s = suggestWords(game, finder, 10);
  const words = s.map((x) => x.word);
  assert.ok(!words.includes('tact'), 'unaffordable');
  assert.ok(!words.includes('ta'), 'rule-illegal');
  assert.ok(!words.includes('dog'), 'not spellable');
  assert.equal(s[0].word, 'act');
  for (const x of s) {
    assert.deepEqual(missingLetters(game.state.rack, x.word), []);
    assert.ok(game.checkWord(x.word).ok);
    assert.ok(['tower', 'augment'].includes(x.use) && x.spec && typeof x.score === 'number');
  }
  for (let i = 1; i < s.length; i++) assert.ok(s[i - 1].score >= s[i].score);
  assert.equal(suggestWords(game, finder).length, 3);
  // with a tower standing, the augment use appears with a target
  setRack(game, 'cat'); game.placeTower('cat', 3, 3);
  setRack(game, 'atxxxxxxxx');
  const s2 = suggestWords(game, finder, 3);
  const aug = s2.find((x) => x.use === 'augment');
  assert.ok(aug && aug.word === 'at' && aug.towerId === game.state.towers[0].id);
});

const WORDS_TXT = new URL('../data/words.txt', import.meta.url);
test('suggestWords with the real dictionary takes < 30 ms', { skip: existsSync(WORDS_TXT) ? false : 'no words.txt' }, async () => {
  const words = await import('../src/words/index.js');
  const node = await import('../src/words/node.js');
  const levels = await import('../src/levels/index.js');
  const dictionary = await node.loadDictionaryNode();
  const finder = makeWordFinder(dictionary);
  const level = levels.levelFor(5);
  const game = createGame({ level, dictionary, towerFor: words.towerFor, checkWordRules: levels.checkWordRules, themeBonus: levels.themeBonus });
  game.state.ink = 500;
  const times = [];
  for (let i = 0; i < 25; i++) {
    const t0 = performance.now();
    const s = suggestWords(game, finder, 3);
    times.push(performance.now() - t0);
    assert.ok(s.length > 0 && s.every((x) => game.checkWord(x.word).ok));
    game.state.freeRedraws = 1;
    game.redrawRack();
  }
  // a rich rack (many anagrams)
  setRack(game, 'aeinrstlod');
  let t0 = performance.now();
  suggestWords(game, finder, 3);
  times.push(performance.now() - t0);
  t0 = performance.now();
  suggestWords(game, finder, 3);
  times.push(performance.now() - t0);
  const max = Math.max(...times), mean = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`# suggestWords: mean ${mean.toFixed(1)} ms, max ${max.toFixed(1)} ms (first ${times[0].toFixed(1)} ms)`);
  assert.ok(max < 30, `max ${max} ms`);
});

// ---------------------------------------------------------------- bot
function v2Modules() {
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
    const archetype = ['bolt', 'blast', 'snipe', 'rapid', 'beam', 'chain', 'aura', 'wall', 'trap', 'mortar', 'vortex', 'pulse', 'orbit'][h % 13];
    const n = word.length;
    const power = 6 * Math.pow(1.45, n - 3) * (0.85 + (h % 31) / 100);
    const cont = archetype === 'beam' || archetype === 'aura' || archetype === 'vortex';
    return stubSpec(word, {
      archetype, element: ELEMENTS[(h >>> 3) % ELEMENTS.length],
      cost: Math.round(30 * Math.pow(1.3, n - 3)),
      stats: {
        damage: cont ? power * 0.8 : power, rate: archetype === 'rapid' ? 3 : 1,
        range: { snipe: 5, mortar: 5, orbit: 1.2 }[archetype] ?? 2.5, splash: archetype === 'blast' ? 1 : archetype === 'mortar' ? 1.2 : 0,
        hp: archetype === 'wall' ? 240 : 60, minRange: 1.5, pull: 0.6, orbs: 1 + (h % 3),
      },
      augment: (h & 7) === 0 ? { kind: 'verb', cost: 20, mods: { damage: 1.25 }, effects: [], element: null } : null,
    });
  };
  return { dictionary, towerFor };
}

test('bot (v2): uses walls/traps on the path, takes rewards, never stalls, deterministic', () => {
  const { dictionary, towerFor } = v2Modules();
  const waves = [];
  for (let i = 0; i < 10; i++) {
    waves.push({ groups: [
      { enemy: 'grunt', count: 6 + i * 2, interval: 0.8, delay: 0, path: 0, hpMul: 1 + i * 0.35, speedMul: 1 },
      { enemy: i % 2 ? 'slinger' : 'armored', count: 2 + i, interval: 1.2, delay: 3, path: 0, hpMul: 1 + i * 0.3, speedMul: 1 },
    ] });
  }
  waves.push({ groups: [{ enemy: 'boss', count: 1, interval: 1, delay: 0, path: 0, hpMul: 1, speedMul: 1 }] });
  const level = straightLevel({ waves, startInk: 100, element: 'fire' });
  const finder = makeWordFinder(dictionary);
  const runs = [];
  for (const skill of [0.15, 0.5, 1]) {
    for (const seed of [1, 2, 3]) {
      const t0 = performance.now();
      const r = playLevel({ level, dictionary, towerFor, seed, skill, finder });
      runs.push({ skill, seed, ...r, ms: performance.now() - t0 });
      assert.ok(r.won || r.livesLeft <= 0, `skill ${skill} seed ${seed}: finished (waves ${r.wavesCleared})`);
      if (r.wavesCleared >= 3) assert.ok(r.relics.length + Object.keys(r.letterTiers).length >= 1, 'took a reward');
    }
  }
  const pathUsers = runs.filter((r) => r.archetypes.some((a) => a === 'wall' || a === 'trap')).length;
  console.log('# ' + runs.map((r) => `s${r.skill}/${r.seed}: ${r.won ? 'W' : 'L'} lives ${r.livesLeft} waves ${r.wavesCleared} relics ${r.relics.join(',')} letters ${Object.keys(r.letterTiers).join('')} [${r.archetypes.join(' ')}] ${r.ms.toFixed(0)}ms`).join('\n# '));
  assert.ok(pathUsers >= 3, `walls/traps placed in ${pathUsers} runs`);
  const hi = runs.filter((r) => r.skill === 1), lo = runs.filter((r) => r.skill === 0.15);
  const lives = (r) => r.livesLeft - (r.relics.includes('secondWind') ? 5 : 0); // a random +5-lives relic isn't skill
  assert.ok(hi.reduce((s, r) => s + lives(r), 0) >= lo.reduce((s, r) => s + lives(r), 0), 'skill matters');
  const again = playLevel({ level, dictionary, towerFor, seed: 2, skill: 0.5, finder });
  const ref = runs.find((r) => r.skill === 0.5 && r.seed === 2);
  assert.deepEqual(again.wordsUsed, ref.wordsUsed);
  assert.equal(again.livesLeft, ref.livesLeft);
});
