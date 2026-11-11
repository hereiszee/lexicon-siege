// Engine: every archetype and every effect type.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCHETYPES, EFFECT_TYPES } from '../src/core/constants.js';
import { sandbox } from '../src/game/testkit.js';
import { effectStrength, mergeEffects } from '../src/game/stats.js';

const S = 1 / 60;
const snipe = (stats = {}, effects = [], over = {}) => ({ archetype: 'snipe', stats: { damage: 1, range: 9, rate: 1, ...stats }, effects, ...over });
const evs = (game, type) => game.drainEvents().filter((e) => e.type === type);

// ---------------------------------------------------------------- archetypes
test('bolt: projectile travels then hits', () => {
  const { game, place, enemy } = sandbox({ cat: { archetype: 'bolt', stats: { damage: 5, range: 9, projectileSpeed: 6 } } });
  place('cat', 5, 1); // 3 cells from path
  const e = enemy('grunt', 5, { hpMul: 10 });
  game.update(S);
  assert.equal(game.state.projectiles.length, 1);
  const p = game.state.projectiles[0];
  for (const k of ['id', 'x', 'y', 'tx', 'ty', 'element', 'kind']) assert.ok(k in p, k);
  assert.equal(p.kind, 'bolt');
  assert.equal(e.hp, e.maxHp);
  const shot = evs(game, 'shot')[0];
  assert.equal(shot.archetype, 'bolt');
  game.update(0.6);
  assert.equal(e.hp, e.maxHp - 5);
  assert.equal(game.state.projectiles.length, 0);
});

test('projectile retargets when its target dies, fizzles when nothing is near', () => {
  const { game, place, enemy } = sandbox({ cat: { archetype: 'bolt', stats: { damage: 5, range: 9, projectileSpeed: 3 } } });
  place('cat', 5, 0);
  const a = enemy('grunt', 5, { hpMul: 10 });
  const b = enemy('grunt', 6, { hpMul: 10 });
  game.update(S);
  const firstTarget = game.state.projectiles[0].target;
  firstTarget.dead = true; // killed by someone else
  game.update(1.5);
  const other = firstTarget === a ? b : a;
  assert.equal(other.hp, other.maxHp - 5);
  // fizzle
  const { game: g2, place: p2, enemy: e2 } = sandbox({ cat: { archetype: 'bolt', stats: { damage: 5, range: 9, projectileSpeed: 3 } } });
  p2('cat', 5, 0);
  const lone = e2('grunt', 5);
  const keep = e2('grunt', 14);
  g2.update(S);
  lone.dead = true;
  g2.update(2);
  assert.equal(g2.state.projectiles.length <= 1, true);
  assert.equal(keep.hp, keep.maxHp);
});

test('blast: splash hits nearby enemies', () => {
  const { game, place, enemy } = sandbox({ cat: { archetype: 'blast', stats: { damage: 4, range: 2, splash: 1.2, projectileSpeed: 50 } } });
  place('cat', 5, 3);
  const a = enemy('grunt', 5, { hpMul: 10 });
  const b = enemy('grunt', 5.8, { hpMul: 10 });
  const c = enemy('grunt', 9, { hpMul: 10 });
  game.update(0.2);
  assert.equal(a.maxHp - a.hp, 4);
  assert.equal(b.maxHp - b.hp, 4);
  assert.equal(c.hp, c.maxHp);
});

test('snipe: instant hit; rapid fires fast', () => {
  const { game, place, enemy } = sandbox({
    cat: snipe({ damage: 7 }),
    dog: { archetype: 'rapid', stats: { damage: 1, rate: 5, range: 9, projectileSpeed: 100 } },
  });
  place('cat', 5, 3);
  const e = enemy('grunt', 5, { hpMul: 100 });
  game.update(S);
  assert.equal(e.maxHp - e.hp, 7);
  place('dog', 6, 3);
  const before = e.hp;
  game.update(1 - S); // snipe cooldown not yet over
  assert.ok(Math.abs(before - e.hp - 5) < 1e-9, `rapid did ${before - e.hp}`);
});

test('beam: stats.damage is DPS on a single target', () => {
  const { game, place, enemy } = sandbox({ cat: { archetype: 'beam', stats: { damage: 10, rate: 2, range: 3 } } });
  const t = place('cat', 5, 3);
  const a = enemy('grunt', 5, { hpMul: 100 });
  const b = enemy('grunt', 4, { hpMul: 100 });
  game.update(1);
  assert.ok(Math.abs(a.maxHp - a.hp - 10) < 1e-6);
  assert.equal(b.hp, b.maxHp, 'only the first enemy');
  assert.equal(t.targetId, a.id);
  assert.ok(evs(game, 'shot').length >= 2);
});

test('aura: DPS to every enemy in range', () => {
  const { game, place, enemy } = sandbox({ cat: { archetype: 'aura', stats: { damage: 6, rate: 1, range: 2 } } });
  place('cat', 5, 3);
  const a = enemy('grunt', 5, { hpMul: 100 });
  const b = enemy('grunt', 6, { hpMul: 100 });
  const c = enemy('grunt', 10, { hpMul: 100 });
  game.update(1);
  assert.ok(Math.abs(a.maxHp - a.hp - 6) < 1e-6);
  assert.ok(Math.abs(b.maxHp - b.hp - 6) < 1e-6);
  assert.equal(c.hp, c.maxHp);
});

test('chain archetype jumps with falloff (default 2 jumps × 0.7); chain effect on other towers', () => {
  const { game, place, enemy } = sandbox({
    cat: { archetype: 'chain', stats: { damage: 10, range: 9 } },
    dog: snipe({ damage: 10 }, [{ type: 'chain', jumps: 1, falloff: 0.5 }]),
  });
  place('cat', 5, 3);
  const es = [5, 6, 7, 8].map((p) => enemy('grunt', p, { hpMul: 100 }));
  game.update(S);
  const dmg = es.map((e) => e.maxHp - e.hp);
  assert.deepEqual(dmg.slice().sort((x, y) => y - x).map((d) => Math.round(d * 100) / 100), [10, 7, 4.9, 0]);
  assert.ok(evs(game, 'shot').filter((s) => s.archetype === 'chain').length === 3);
  const s2 = sandbox({ dog: snipe({ damage: 10 }, [{ type: 'chain', jumps: 1, falloff: 0.5 }]) });
  s2.place('dog', 5, 3);
  const x = [5, 6, 7].map((p) => s2.enemy('grunt', p, { hpMul: 100 }));
  s2.game.update(S);
  assert.deepEqual(x.map((e) => e.maxHp - e.hp).sort((a, b) => b - a), [10, 5, 0]);
});

test('support/harvest/summon never attack', () => {
  for (const arch of ['support', 'harvest', 'summon']) {
    const { game, place, enemy } = sandbox({ cat: { archetype: arch, stats: { damage: 50, range: 9 } } });
    place('cat', 5, 3);
    const e = enemy('grunt', 5);
    game.update(1);
    assert.equal(e.hp, e.maxHp, arch);
  }
  assert.equal(ARCHETYPES.length, 10);
});

// ---------------------------------------------------------------- effects
test('burn: dps × duration, ignores armor, refreshes (no stacking)', () => {
  const { game, place, enemy } = sandbox({ cat: snipe({ damage: 1, rate: 0.01 }, [{ type: 'burn', dps: 6, duration: 2 }]) });
  place('cat', 5, 3);
  const e = enemy('armored', 5, { hpMul: 10 });
  game.update(S);
  assert.equal(e.statuses.burn, 2);
  game.update(3);
  assert.ok(Math.abs(e.maxHp - e.hp - (1 + 12)) < 1e-6, String(e.maxHp - e.hp));
  assert.equal(e.statuses.burn, 0);
});

test('burn from two sources: the higher-value application wins as a whole (no strong-for-long)', () => {
  const { game, place, enemy } = sandbox({
    hot: snipe({ damage: 1, rate: 0.01 }, [{ type: 'burn', dps: 10, duration: 1 }]),
    warm: snipe({ damage: 1, rate: 0.01 }, [{ type: 'burn', dps: 1, duration: 5 }]),
  });
  place('hot', 5, 3);
  place('warm', 6, 3);
  const e = enemy('grunt', 5, { hpMul: 100 });
  game.update(S); // both hit in the same tick: 10×1 = 10 beats 1×5 = 5
  assert.equal(e.burnDps, 10);
  assert.equal(e.statuses.burn, 1);
  game.update(6);
  assert.ok(Math.abs(e.maxHp - e.hp - (2 + 10)) < 1e-6, String(e.maxHp - e.hp)); // 2 hits + 10 burn, not 50
});

test('slow / armorBreak from two sources keep strength and duration together', () => {
  const { game, place, enemy } = sandbox({
    ice: snipe({ damage: 1, rate: 0.01 }, [{ type: 'slow', factor: 0.2, duration: 1 }, { type: 'armorBreak', amount: 5, duration: 1 }]),
    mud: snipe({ damage: 1, rate: 0.01 }, [{ type: 'slow', factor: 0.9, duration: 5 }, { type: 'armorBreak', amount: 1, duration: 3 }]),
  });
  place('ice', 5, 3);
  place('mud', 6, 3);
  const e = enemy('grunt', 5, { hpMul: 100 });
  game.update(S);
  assert.equal(e.slowFactor, 0.2);
  assert.equal(e.statuses.slow, 1);
  assert.equal(e.abAmount, 5);
  assert.equal(e.statuses.armorBreak, 1);
});

test('poison stacks up to 5', () => {
  const { game, place, enemy } = sandbox({ cat: snipe({ damage: 1, rate: 10 }, [{ type: 'poison', dps: 1, duration: 5 }]) });
  place('cat', 5, 3);
  const e = enemy('grunt', 5, { hpMul: 1000 });
  game.update(0.25);
  assert.equal(e.poisonStacks, 3);
  game.update(1);
  assert.equal(e.poisonStacks, 5);
  const before = e.hp;
  game.cellState; // noop
  const tw = game.state.towers[0];
  tw.cooldown = 1e9; // stop firing
  game.update(1);
  assert.ok(Math.abs(before - e.hp - 5) < 1e-6, 'five stacks × 1 dps');
});

test('slow: moves at factor speed for duration', () => {
  const { game, place, enemy } = sandbox({ cat: snipe({ rate: 0.01 }, [{ type: 'slow', factor: 0.5, duration: 10 }]) });
  place('cat', 5, 3);
  const e = enemy('grunt', 5, { hpMul: 100, speed: 1 });
  game.update(1 + S);
  assert.ok(Math.abs(e.progress - (5 + 1 / 60 + 0.5)) < 0.02, String(e.progress));
  assert.equal(e.slowFactor, 0.5);
});

test('freeze stops movement (boss immune); stun stops movement (boss affected)', () => {
  for (const [type, boss, moves] of [['freeze', 'grunt', false], ['freeze', 'boss', true], ['stun', 'boss', false]]) {
    const { game, place, enemy } = sandbox({ cat: snipe({ rate: 0.01 }, [{ type, chance: 1, duration: 5 }]) });
    place('cat', 5, 3);
    const e = enemy(boss, 5, { speed: 1, hpMul: 10 });
    game.update(S);
    const p0 = e.progress;
    game.update(1);
    assert.equal(e.progress > p0, moves, `${type} vs ${boss}`);
    assert.equal(e.statuses[type] > 0, !moves);
  }
});

test('pierce: projectile continues to further enemies', () => {
  const { game, place, enemy } = sandbox({ cat: { archetype: 'bolt', stats: { damage: 10, range: 9, projectileSpeed: 40 }, effects: [{ type: 'pierce', count: 2 }] } });
  place('cat', 5, 3);
  const es = [7, 6, 5, 1].map((p) => enemy('grunt', p, { hpMul: 100 }));
  game.update(0.5);
  const hit = es.map((e) => e.hp < e.maxHp);
  assert.deepEqual(hit, [true, true, true, false]);
});

test('splash effect adds splash to a non-blast tower', () => {
  const { game, place, enemy } = sandbox({ cat: snipe({ damage: 3 }, [{ type: 'splash', radius: 1.5 }]) });
  place('cat', 5, 3);
  const a = enemy('grunt', 5, { hpMul: 10 });
  const b = enemy('grunt', 6, { hpMul: 10 });
  game.update(S);
  assert.equal(b.maxHp - b.hp, 3);
  assert.equal(a.maxHp - a.hp, 3);
});

test('crit multiplies damage and flags the hit event', () => {
  const { game, place, enemy } = sandbox({ cat: snipe({ damage: 4 }, [{ type: 'crit', chance: 1, mult: 3 }]) });
  place('cat', 5, 3);
  const e = enemy('grunt', 5, { hpMul: 10 });
  game.update(S);
  const h = evs(game, 'hit')[0];
  assert.equal(h.crit, true);
  assert.equal(h.damage, 12);
  assert.equal(e.maxHp - e.hp, 12);
});

test('execute kills non-boss under threshold; boss immune', () => {
  for (const [type, dies] of [['grunt', true], ['boss', false]]) {
    const { game, place, enemy } = sandbox({ cat: snipe({ damage: 1 }, [{ type: 'execute', threshold: 0.5 }]) });
    place('cat', 5, 3);
    const e = enemy(type, 5);
    e.hp = e.maxHp * 0.45;
    game.update(S);
    assert.equal(!!e.dead, dies, type);
  }
});

test('armorBreak reduces armor for later hits', () => {
  const { game, place, enemy } = sandbox({ cat: snipe({ damage: 6, rate: 1 }, [{ type: 'armorBreak', amount: 4, duration: 5 }]) });
  place('cat', 5, 3);
  const e = enemy('armored', 5, { hpMul: 10 }); // armor 5
  game.update(S);
  assert.equal(e.maxHp - e.hp, 1);
  game.update(1);
  assert.equal(e.maxHp - e.hp, 1 + 5);
  assert.ok(e.statuses.armorBreak > 0);
});

test('knockback pushes back along the path (boss immune)', () => {
  for (const [type, pushed] of [['grunt', true], ['boss', false]]) {
    const { game, place, enemy } = sandbox({ cat: snipe({ damage: 1 }, [{ type: 'knockback', cells: 2, chance: 1 }]) });
    place('cat', 5, 3);
    const e = enemy(type, 6, { hpMul: 10 });
    game.update(S);
    assert.equal(e.progress < 5, pushed, type);
  }
});

test('bounty multiplies kill ink', () => {
  const { game, place, enemy } = sandbox({ cat: snipe({ damage: 100 }, [{ type: 'bounty', mul: 2 }]) });
  const t = place('cat', 5, 3);
  enemy('grunt', 5);
  const ink = game.state.ink;
  game.update(S);
  const k = evs(game, 'kill')[0];
  assert.equal(k.ink, 6);
  assert.equal(k.enemy, 'grunt');
  assert.equal(t.kills, 1);
  assert.equal(game.state.ink, ink + 6 + 12); // + wave end bonus 10+2×1
});

test('stealth: untargetable unless revealed (reveal effect) or within 1.5 cells of a tower', () => {
  const run = (effects, cy) => {
    const { game, place, enemy } = sandbox({ cat: snipe({ damage: 1 }, effects) });
    place('cat', 5, cy);
    const e = enemy('stealth', 5, { hpMul: 10 });
    game.update(0.1);
    return e;
  };
  const far = run([], 1);
  assert.equal(far.hp, far.maxHp);
  assert.equal(far.revealed, false);
  const near = run([], 3);
  assert.ok(near.hp < near.maxHp);
  const rev = run([{ type: 'reveal' }], 1);
  assert.ok(rev.hp < rev.maxHp);
  assert.equal(rev.revealed, true);
});

test('heal repairs towers in range in pulses', () => {
  const { game, place, enemy } = sandbox({
    cat: { stats: { damage: 0, hp: 100 } },
    medic: { archetype: 'support', stats: { damage: 0, range: 2 }, effects: [{ type: 'heal', hps: 10 }] },
  });
  const t = place('cat', 5, 3);
  place('medic', 6, 3);
  t.hp = 50;
  enemy('grunt', 14);
  game.update(1);
  assert.ok(Math.abs(t.hp - 60) < 1e-9, String(t.hp)); // 10 hps × 1 s, in 0.5 s pulses
});

test('harvest ink and tile', () => {
  const { game, place, enemy } = sandbox({
    ax: { archetype: 'harvest', stats: { damage: 0 }, effects: [{ type: 'harvest', resource: 'ink', amount: 4, interval: 5 }] },
    hoe: { archetype: 'harvest', stats: { damage: 0 }, effects: [{ type: 'harvest', resource: 'tile', amount: 1, interval: 2 }] },
  });
  place('ax', 5, 3);
  place('hoe', 6, 3);
  enemy('grunt', 1);
  const ink = game.state.ink;
  game.update(5.1);
  assert.equal(game.state.ink, ink + 4);
  assert.equal(game.state.freeRedraws, 2);
  const h = evs(game, 'harvest');
  assert.ok(h.some((x) => x.resource === 'ink' && x.amount === 4));
  assert.ok(h.some((x) => x.resource === 'tile' && x.amount === 1));
});

test('harvest only ticks during waves (no idle farming in build)', () => {
  const { game, place } = sandbox({ ax: { archetype: 'harvest', stats: { damage: 0 }, effects: [{ type: 'harvest', resource: 'ink', amount: 4, interval: 1 }] } });
  place('ax', 5, 3);
  const ink = game.state.ink;
  game.update(0.1);
  assert.equal(game.state.ink, ink);
});

test('summon: units stand on the path, block enemies, fight, die and respawn; flyers pass', () => {
  const { game, place, enemy } = sandbox({
    camp: { archetype: 'summon', stats: { damage: 0, range: 2 }, effects: [{ type: 'summon', hp: 10, damage: 4, count: 2, interval: 3 }] },
  });
  const t = place('camp', 8, 3);
  assert.equal(game.state.units.length, 1, 'first unit appears on placement');
  const u = game.state.units[0];
  for (const k of ['id', 'x', 'y', 'hp', 'maxHp', 'ownerId']) assert.ok(k in u, k);
  assert.equal(u.ownerId, t.id);
  assert.equal(u.y, 4.5);
  const fly = enemy('flyer', 6, { speed: 2, hpMul: 100 });
  const g = enemy('grunt', 6, { speed: 1, hpMul: 100 });
  game.update(2.5);
  assert.ok(fly.progress > u.progress + 1, 'flyer ignores units');
  assert.ok(g.progress < u.progress, 'grunt is held');
  assert.ok(g.hp < g.maxHp, 'unit fights');
  assert.ok(u.hp < u.maxHp, 'enemy fights back at 5 dps');
  game.update(1);
  assert.equal(game.state.units.length, 2, 'second unit summoned after interval');
  game.update(1);
  assert.ok(u.dead, 'unit dies after 10 hp / 5 dps');
  assert.ok(game.state.units.every((x) => !x.dead));
});

test('selling a summoner removes its units', () => {
  const { game, place } = sandbox({ camp: { archetype: 'summon', stats: { damage: 0 }, effects: [{ type: 'summon', hp: 10, damage: 4, count: 2, interval: 3 }] } });
  const t = place('camp', 8, 3);
  assert.equal(game.state.units.length, 1);
  game.sellTower(t.id);
  assert.equal(game.state.units.length, 0);
});

test('effect strengths and merging (all 19 effect types known)', () => {
  assert.equal(EFFECT_TYPES.length, 19);
  for (const t of EFFECT_TYPES) assert.equal(typeof effectStrength({ type: t }), 'number');
  const m = mergeEffects([{ type: 'slow', factor: 0.8, duration: 2 }], [{ type: 'slow', factor: 0.5, duration: 2 }]);
  assert.equal(m[0].factor, 0.5, 'lower slow factor is stronger');
  const b = mergeEffects([{ type: 'buff', stat: 'damage', mul: 1.2 }], [{ type: 'buff', stat: 'range', mul: 1.1 }]);
  assert.equal(b.length, 2, 'buffs on different stats do not merge');
  const u = mergeEffects([], [{ type: 'nonsense' }]);
  assert.equal(u.length, 0);
});

test('healer enemy heals neighbours; splitter spawns 3 swarm', () => {
  const { game, place, enemy } = sandbox({ cat: snipe({ damage: 100, range: 1.2 }) });
  const h = enemy('healer', 3);
  const g = enemy('grunt', 3.5);
  g.hp = 10;
  game.update(1);
  assert.ok(Math.abs(g.hp - 14) < 1e-6);
  void h;
  place('cat', 10, 3);
  const s = enemy('splitter', 10);
  game.update(S);
  assert.ok(s.dead);
  assert.equal(game.state.enemies.filter((e) => e.type === 'swarm').length, 3);
});
