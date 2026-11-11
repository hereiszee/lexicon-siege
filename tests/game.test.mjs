// Engine: rack rules, validation reasons, building, augments, selling, buffs, disabled towers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, elementMul } from '../src/game/index.js';
import { DEFAULTS, VOWELS } from '../src/core/constants.js';
import { makeStubs, straightLevel, setRack, sandbox, stubSpec } from '../src/game/testkit.js';

const vowelsIn = (rack) => rack.filter((c) => VOWELS.includes(c)).length;

test('rack is sized from level.rackSize, falling back to DEFAULTS.rackSize', () => {
  const { dictionary, towerFor } = makeStubs({});
  const g1 = createGame({ level: straightLevel({ rackSize: 7 }), dictionary, towerFor, seed: 1 });
  assert.equal(g1.state.rack.length, 7);
  const lvl = straightLevel();
  delete lvl.rackSize;
  const g2 = createGame({ level: lvl, dictionary, towerFor, seed: 1 });
  assert.equal(g2.state.rack.length, DEFAULTS.rackSize);
});

test('rack draws only weighted letters, guarantees vowels, deterministic per seed', () => {
  const { dictionary, towerFor } = makeStubs({});
  const weights = { a: 0, b: 50, c: 50, e: 1 }; // consonant-heavy; only b, c, e can appear
  const level = straightLevel({ letterWeights: weights, startInk: 100000 });
  const g = createGame({ level, dictionary, towerFor, seed: 3 });
  for (let i = 0; i < 200; i++) {
    for (const ch of g.state.rack) assert.ok('bce'.includes(ch), `unexpected ${ch}`);
    assert.ok(vowelsIn(g.state.rack) >= DEFAULTS.minVowelsInRack);
    g.redrawRack();
  }
  const a = createGame({ level: straightLevel(), dictionary, towerFor, seed: 99 });
  const b = createGame({ level: straightLevel(), dictionary, towerFor, seed: 99 });
  assert.deepEqual(a.state.rack, b.state.rack);
});

test('placing refills used slots immediately, keeps others, and records usedWords', () => {
  const { game } = sandbox({ cat: {} });
  setRack(game, 'catqqqqqqqqqqq');
  const before = game.state.rack.slice();
  const r = game.placeTower('cat', 5, 3);
  assert.ok(r.ok, r.reason);
  assert.equal(game.state.rack.length, before.length);
  for (let i = 3; i < before.length; i++) {
    // untouched consonant slots stay unless converted by the vowel guarantee
    if (game.state.rack[i] !== before[i]) assert.ok(VOWELS.includes(game.state.rack[i]));
  }
  assert.ok(vowelsIn(game.state.rack) >= DEFAULTS.minVowelsInRack);
  assert.ok(game.state.usedWords.has('cat'));
  const evs = game.drainEvents().map((e) => e.type);
  assert.ok(evs.includes('rack') && evs.includes('towerPlaced'));
});

test('multiset spelling: repeated letters need repeated tiles', () => {
  const { game } = sandbox({ book: {} });
  setRack(game, 'bokxxxxxxxx');
  assert.match(game.checkWord('book').reason, /missing O/);
  setRack(game, 'bookxxxxxxx');
  assert.ok(game.checkWord('book').ok);
});

test('redraw: costs redrawCost then +5; free redraws consumed first; shuffle keeps multiset', () => {
  const { game } = sandbox({}, { startInk: 100 });
  const s = game.state;
  assert.equal(s.redrawCost, DEFAULTS.redrawCost);
  assert.ok(game.redrawRack().ok);
  assert.equal(s.ink, 100 - DEFAULTS.redrawCost);
  assert.equal(s.redrawCost, DEFAULTS.redrawCost + 5);
  s.freeRedraws = 1;
  assert.ok(game.redrawRack().ok);
  assert.equal(s.freeRedraws, 0);
  assert.equal(s.ink, 100 - DEFAULTS.redrawCost);
  s.ink = 0;
  const r = game.redrawRack();
  assert.equal(r.ok, false);
  assert.match(r.reason, /ink/i);
  const sorted = s.rack.slice().sort().join('');
  game.shuffleRack();
  assert.equal(s.rack.slice().sort().join(''), sorted);
  // shuffle is cosmetic: it must not change future draws
  const { game: g1 } = sandbox({}, { startInk: 100 });
  const { game: g2 } = sandbox({}, { startInk: 100 });
  g2.shuffleRack();
  g1.redrawRack(); g2.redrawRack();
  assert.deepEqual(g1.state.rack, g2.state.rack);
});

test('checkWord validation order and friendly reasons', () => {
  const { dictionary, towerFor } = makeStubs({ cat: {}, dog: {}, egg: {} });
  let rule = { ok: true };
  const game = createGame({
    level: straightLevel(), dictionary, towerFor, seed: 1,
    checkWordRules: () => rule,
  });
  setRack(game, 'catdogxyzw');
  assert.match(game.checkWord('a').reason, /short/i);
  assert.match(game.checkWord('a'.repeat(16)).reason, /long/i);
  assert.match(game.checkWord('tac').reason, /dictionary/i);
  assert.match(game.checkWord('egg').reason, /missing E, G$/);
  rule = { ok: false, reason: 'Every word must contain E' };
  assert.equal(game.checkWord('cat').reason, 'Every word must contain E');
  rule = { ok: true };
  const c = game.checkWord('CAT');
  assert.equal(c.ok, true);
  assert.equal(c.spec.word, 'cat');
  assert.equal(c.canTower, true);
  assert.equal(c.canAugment, false);
  assert.ok(game.placeTower('cat', 5, 3).ok);
  setRack(game, 'catdogxyzw');
  assert.match(game.checkWord('cat').reason, /already/i);
  // invalid words still carry a spec for preview when well-formed
  assert.ok(game.checkWord('tac').spec);
});

test('checkWordRules receives ctx {usedWords, towerCount, wave}', () => {
  const { dictionary, towerFor } = makeStubs({ cat: {}, dog: {} });
  let seen;
  const game = createGame({
    level: straightLevel(), dictionary, towerFor, seed: 1,
    checkWordRules: (w, spec, lvl, ctx) => { seen = { w, spec, lvl, ctx }; return { ok: true }; },
  });
  setRack(game, 'cat');
  game.placeTower('cat', 5, 3);
  setRack(game, 'dog');
  game.checkWord('dog');
  assert.equal(seen.w, 'dog');
  assert.equal(seen.ctx.towerCount, 1);
  assert.equal(seen.ctx.wave, 0);
  assert.ok(seen.ctx.usedWords.has('cat'));
});

test('rules are checked per action: towerLimit blocks towers but not augments', () => {
  const { dictionary, towerFor } = makeStubs({
    cat: {}, dog: {},
    fast: { augment: { kind: 'adjective', cost: 5, mods: { rate: 1.2 }, effects: [], element: null } },
  });
  const game = createGame({
    level: straightLevel(), dictionary, towerFor, seed: 1,
    checkWordRules: (w, s, l, ctx) => (ctx.action !== 'augment' && ctx.towerCount >= 1 ? { ok: false, reason: 'Tower limit reached (1)' } : { ok: true }),
  });
  setRack(game, 'cat');
  const t = game.placeTower('cat', 5, 3).tower;
  setRack(game, 'dog');
  assert.equal(game.checkWord('dog').reason, 'Tower limit reached (1)');
  setRack(game, 'fast');
  const c = game.checkWord('fast');
  assert.equal(c.ok, true);
  assert.equal(c.canTower, false);
  assert.equal(c.canAugment, true);
  assert.equal(game.placeTower('fast', 6, 3).reason, 'Tower limit reached (1)');
  assert.ok(game.augmentTower('fast', t.id).ok);
});

test('placeTower: cell and ink reasons; canBuild', () => {
  const { game } = sandbox({ cat: { cost: 30 }, dog: {}, pricey: { cost: 5000 } });
  setRack(game, 'cat');
  assert.match(game.placeTower('cat', 3, 4).reason, /path/i);
  assert.match(game.placeTower('cat', 0, 0).reason, /blocked/i);
  assert.match(game.placeTower('cat', 16, 0).reason, /off the board/i);
  assert.equal(game.canBuild(3, 4), false);
  assert.equal(game.canBuild(0, 0), false);
  assert.equal(game.canBuild(5, 3), true);
  assert.ok(game.placeTower('cat', 5, 3).ok);
  assert.equal(game.canBuild(5, 3), false);
  setRack(game, 'dog');
  assert.match(game.placeTower('dog', 5, 3).reason, /already a tower/i);
  setRack(game, 'pricey');
  const r = game.placeTower('pricey', 6, 3);
  assert.match(r.reason, /Not enough ink/);
  assert.equal(game.state.ink, 1000 - 30);
});

test('augments: reasons, mods multiply, same-type effects keep stronger, element converts, max 3', () => {
  const aug = (o) => ({ cost: 20, mods: {}, effects: [], element: null, kind: 'verb', ...o });
  const { game, place, augment } = sandbox({
    cat: { effects: [{ type: 'burn', dps: 2, duration: 2 }] },
    dog: {},
    swift: { augment: aug({ mods: { rate: 1.5, damage: 1.2 } }) },
    blaze: { augment: aug({ effects: [{ type: 'burn', dps: 5, duration: 3 }], element: 'fire' }) },
    weak: { augment: aug({ effects: [{ type: 'burn', dps: 1, duration: 1 }] }) },
    huge: { augment: aug({ mods: { range: 2 } }) },
    rich: { augment: aug({ cost: 99999 }) },
  });
  setRack(game, 'dog');
  assert.match(game.augmentTower('dog', 1).reason, /can't be used as an augment/);
  setRack(game, 'swift');
  assert.match(game.augmentTower('swift', 12345).reason, /No such tower/);
  const t = place('cat', 5, 3);
  setRack(game, 'rich');
  assert.match(game.augmentTower('rich', t.id).reason, /Not enough ink/);
  augment('swift', t);
  assert.ok(Math.abs(t.stats.rate - 1.5) < 1e-9);
  assert.ok(Math.abs(t.stats.damage - 7.2) < 1e-9);
  augment('blaze', t);
  assert.equal(t.element, 'fire');
  assert.deepEqual(t.effects.filter((e) => e.type === 'burn'), [{ type: 'burn', dps: 5, duration: 3 }]);
  augment('weak', t);
  assert.deepEqual(t.effects.filter((e) => e.type === 'burn'), [{ type: 'burn', dps: 5, duration: 3 }]);
  assert.equal(t.augments.length, 3);
  setRack(game, 'huge');
  assert.match(game.augmentTower('huge', t.id).reason, /already has 3 augments/);
  assert.equal(t.spent, 30 + 60);
  const evs = game.drainEvents().filter((e) => e.type === 'towerAugmented');
  assert.equal(evs.length, 3);
  assert.equal(evs[0].word, 'swift');
  // selling refunds 60% of everything spent, incl. augments
  const ink = game.state.ink;
  const s = game.sellTower(t.id);
  assert.equal(s.refund, Math.floor(90 * DEFAULTS.sellRefund));
  assert.equal(game.state.ink, ink + s.refund);
  assert.equal(game.state.towers.length, 0);
  assert.ok(game.canBuild(5, 3));
  assert.ok(game.drainEvents().some((e) => e.type === 'towerSold' && e.towerId === t.id && e.x === 5.5 && e.y === 3.5));
});

test('themeBonus folds into damage and output effects; uses converted element', () => {
  const { dictionary, towerFor } = makeStubs({
    cat: { effects: [{ type: 'heal', hps: 4 }] },
    hot: { augment: { cost: 1, mods: {}, effects: [], element: 'fire', kind: 'adjective' } },
  });
  const game = createGame({
    level: straightLevel(), dictionary, towerFor, seed: 1,
    themeBonus: (spec) => (spec.element === 'fire' ? 2 : 1),
  });
  setRack(game, 'cat');
  const t = game.placeTower('cat', 5, 3).tower;
  assert.equal(t.stats.damage, 6);
  setRack(game, 'hot');
  game.augmentTower('hot', t.id);
  assert.equal(t.themeMul, 2);
  assert.equal(t.stats.damage, 12);
  assert.equal(t.effects.find((e) => e.type === 'heal').hps, 8);
});

test('buffs: strongest per stat, no stacking, not on self; disabled providers stop buffing', () => {
  const { game, place } = sandbox({
    cat: {},
    aid: { archetype: 'support', stats: { damage: 0, range: 3 }, effects: [{ type: 'buff', stat: 'damage', mul: 1.3 }] },
    big: { archetype: 'support', stats: { damage: 0, range: 3 }, effects: [{ type: 'buff', stat: 'damage', mul: 1.5 }, { type: 'buff', stat: 'range', mul: 1.2 }] },
  });
  const t = place('cat', 5, 3);
  const a = place('aid', 6, 3);
  assert.ok(Math.abs(t.stats.damage - 7.8) < 1e-9);
  const b = place('big', 4, 3);
  assert.ok(Math.abs(t.stats.damage - 9) < 1e-9, 'strongest wins, no stacking');
  assert.ok(Math.abs(t.stats.range - 3) < 1e-9);
  assert.equal(b.buffs.damage, 1.3, 'support buffed by the other support, not by itself');
  game.sellTower(b.id);
  assert.ok(Math.abs(t.stats.damage - 7.8) < 1e-9);
  void a;
});

test('elementMul', () => {
  assert.equal(elementMul('fire', 'ice'), 1.5);
  assert.equal(elementMul('fire', 'fire'), 0.5);
  assert.equal(elementMul('fire', 'earth'), 1);
});

test('element multipliers and armor in actual hits', () => {
  for (const [el, expected] of [['storm', 15], ['earth', 5], ['metal', 10]]) {
    const { game, place, enemy } = sandbox({ zap: { archetype: 'snipe', element: el, stats: { damage: 10, range: 9, rate: 1 } } });
    place('zap', 5, 3); // level element is earth; storm is its opposite
    const e = enemy('grunt', 5, { hpMul: 100 });
    game.update(1 / 60);
    const hit = game.drainEvents().find((x) => x.type === 'hit');
    assert.equal(hit.damage, expected, el);
    assert.equal(e.maxHp - e.hp, expected);
  }
  const { game, place, enemy } = sandbox({ pea: { archetype: 'snipe', stats: { damage: 3, range: 9 } } });
  place('pea', 5, 3);
  enemy('armored', 5);
  game.update(1 / 60);
  assert.equal(game.drainEvents().find((x) => x.type === 'hit').damage, 1, 'min 1 damage vs armor');
});

test('vandal disables tower; disabled tower does nothing; heal revives above 30%; disabled can be sold', () => {
  const { game, place, enemy } = sandbox({
    cat: { archetype: 'snipe', stats: { damage: 1, range: 0.1, hp: 10 } },
    medic: { archetype: 'support', stats: { damage: 0, range: 3, hp: 100 }, effects: [{ type: 'heal', hps: 4 }] },
    dog: { stats: { hp: 10 } },
  });
  const t = place('cat', 5, 3);
  const v = enemy('vandal', 5);
  game.update(1.0);
  assert.ok(t.hp < 10 && t.hp > 0);
  game.update(1.5);
  assert.equal(t.disabled, true);
  assert.equal(t.hp, 0);
  assert.ok(game.drainEvents().some((e) => e.type === 'towerDown' && e.towerId === t.id));
  v.dead = true; // remove vandal pressure
  v.hp = 0;
  // healer brings it back
  const keep = game.spawnEnemy('grunt', 0, 1000, 1, 1); // keep wave alive, far away
  keep.speed = 0;
  const m = place('medic', 6, 3);
  game.update(0.6); // 2 pulses x 2 hp = 4 hp → 40% > 30%
  assert.equal(t.disabled, false);
  assert.ok(game.drainEvents().some((e) => e.type === 'heal' && e.towerId === t.id));
  // disabled towers can be sold
  t.hp = 0; t.disabled = true;
  game.sellTower(m.id);
  assert.ok(game.sellTower(t.id).ok);
});

test('shield absorbs vandal damage', () => {
  const { game, place, enemy } = sandbox({
    cat: { stats: { damage: 0, hp: 50 } },
    ward: { archetype: 'support', stats: { damage: 0, range: 3, hp: 999 }, effects: [{ type: 'shield', amount: 20, interval: 100 }] },
  });
  const t = place('cat', 5, 3);
  place('ward', 5, 2); // vandal at (5.5,4.5) is 2 cells from ward → only cat in reach
  const v = enemy('vandal', 14); // out of reach for the first tick
  game.update(1 / 60);
  assert.equal(t.shield, 20);
  v.progress = 5;
  game.update(2);
  assert.ok(Math.abs(t.shield - (20 - 5 * (2 + 1 / 60))) < 0.2);
  assert.equal(t.hp, 50);
  game.update(3);
  assert.ok(t.hp < 50);
});

test('damageDealt totals hits, DoT and summoned units; hit events carry towerId', () => {
  const { game, place, enemy } = sandbox({
    zap: { archetype: 'snipe', stats: { damage: 10, range: 9, rate: 1 }, effects: [{ type: 'burn', dps: 4, duration: 2 }] },
    guard: { archetype: 'summon', stats: { damage: 0, range: 2 }, effects: [{ type: 'summon', hp: 1000, damage: 6, count: 1, interval: 5 }] },
  });
  const z = place('zap', 2, 3);
  const g = place('guard', 9, 5);
  const e = enemy('grunt', 1, { hpMul: 100 });
  game.update(1 / 60);
  assert.equal(z.damageDealt, 10); // hit applies burn; DoT starts next tick
  const hits = game.drainEvents().filter((x) => x.type === 'hit');
  assert.ok(hits.length && hits.every((h) => h.towerId === z.id));
  game.update(1); // 60 more ticks: one more shot (at tick 61) + 60 ticks of burn
  assert.ok(Math.abs(z.damageDealt - (20 + 4)) < 1e-6, String(z.damageDealt));
  assert.ok(Math.abs(z.damageDealt - (e.maxHp - e.hp)) < 1e-6);
  // unit damage credited to the summoner
  const u = game.state.units[0];
  e.progress = u.progress - 0.2;
  e.speed = 1;
  game.update(1);
  assert.ok(g.damageDealt > 0);
  assert.ok(game.drainEvents().some((h) => h.type === 'hit' && h.towerId === g.id));
  const total = game.state.towers.reduce((s, t) => s + t.damageDealt, 0);
  assert.ok(Math.abs(total - (e.maxHp - e.hp)) < 1e-6);
});

test('stubSpec sanity', () => {
  assert.equal(stubSpec('x').stats.damage, 6);
});
