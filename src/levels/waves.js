// Wave generation and threat accounting.
//
// Budgets are in "pressure": effective HP per second an enemy spends on its path
// (count · effHp · speed / pathLength). A level's pressure depends only on its difficulty,
// so path length, two paths, enemy mix and bosses can't make one level spike above its
// neighbours: longer paths and slower enemies get proportionally more HP, and bosses and
// mini-bosses take a share of their wave's budget instead of adding to it.
//
// A level's total budget is baseLevelHp · G(d): G grows ~exponentially at hpRate0 per level at
// first (a gentle tutorial), turning into a power law d^hpExp later. It is split over the
// waves in proportion to (1 + perWave·w) · ramp(w), ramp rising linearly from firstWaveHp to 1
// (Bloons-style: wave 1 trivial, each wave a little harder), so adding a wave never adds a
// step in total threat. Each new enemy type is introduced on its unlock level as a small group
// of its own in wave 2, then mixes in.

import { ENEMIES } from '../core/constants.js';

/** Balance knobs — tune these in the balance pass. */
export const TUNING = {
  baseLevelHp: 2620,    // (2500 before the rule/two-path credits, 2700 with count-based two-path credit) whole-level HP budget at difficulty 1 on a reference path
  hpRate0: 0.05,        // growth G(d) = exp(hpExp · asinh(hpRate0·(d−1)/hpExp)): +5%/level at first,
  hpExp: 1.46,          //   ≈ d^1.46 later (≈17× at 100, ≈175× at 500, ≈480× at 1000)
  perWave: 0.32,        // within-level shape: wave w gets a share ∝ (1 + perWave·w) · ramp(w)
  firstWaveHp: 0.15,    // ramp(w) rises linearly from this (wave 1) to 1 (last wave); also scales hpMul
  refPathLen: 39,       // path length (cells travelled) the budget is quoted for; ≈ the average path
  pathLenExp: 0.5,      // hp grows as (path length)^pathLenExp: linear left 48+-cell paths ~10–23 pts below their neighbours
  refSpeed: 1.2,        // enemy speed the budget is quoted for (a grunt)
  twoPathHp: 0.7,       // pressure multiplier on two-path levels, taken off enemy hp (defences are split across both lanes)
  mustContainHp: 0.8,   // restrictive rules leave fewer usable words: pressure multiplier per "must contain X" (0.7 sat ~8 pts high)
  towerLimitHp: 0.95,   //   … per tower limit
  maxLength5Hp: 0.8,    //   … and per "at most 5 letters" (without the credit both sat ~10–18 pts below their neighbours)
  hpShare: 0.85,        // fraction of the per-wave budget growth (in log space) that goes into hpMul;
                        // the rest adds enemies, and with them bounty ink
  minWaves: 6,          // waves → minWaves + extraWaves·((d − 1)/999)^waveExp  (6 → 25)
  extraWaves: 19,
  waveExp: 0.75,
  speedGrowth: 0.3,     // speedMul reaches 1 + speedGrowth at difficulty 1000
  bossShare: 0.35,      // share of the boss level's final-wave budget taken by the boss
  miniBossShare: 0.3,   // share of a wave's budget taken by a mini-boss
  miniBossFrom: 150,    // first difficulty with mini-bosses
  introMax: 12,         // largest group a newly unlocked enemy is introduced with
  earlyTypes: 3,        // Bloons-style: wave w prefers the first max(earlyTypes, unlocked·((w+1)/waves)²)
                        // types in unlock order, so a level's early waves are the easy kinds
  maxCount: 40,
};

/** Difficulty at which each enemy type starts appearing, in introduction order (one per level, never on a boss level). */
export const ENEMY_UNLOCK = {
  grunt: 1, runner: 3, vandal: 7, swarm: 12, slinger: 18, tank: 26, armored: 37,
  healer: 49, stealth: 63, splitter: 79, flyer: 97,
};

/** Base spawn intervals (seconds) per enemy type. */
const INTERVAL = {
  grunt: 0.9, runner: 0.6, swarm: 0.3, tank: 1.8, armored: 1.3, stealth: 0.9,
  healer: 1.6, vandal: 1.4, slinger: 1.3, splitter: 1.3, flyer: 0.7, boss: 0,
};

/** Rough per-trait difficulty factor used for effective HP (boss: stomp + 10-life leak). */
const TRAIT_FACTOR = { stealth: 1.25, healer: 1.3, vandal: 1.6, slinger: 1.6, flyer: 1.1, boss: 1.5 };

const round2 = (v) => Math.round(v * 100) / 100;

/** Path length as the budget sees it: long paths are harder to cover than their length says. */
const effLen = (len) => TUNING.refPathLen * (Math.max(1, len) / TUNING.refPathLen) ** TUNING.pathLenExp;

const wavesExact = (d) => TUNING.minWaves + TUNING.extraWaves * Math.pow((Math.max(1, d) - 1) / 999, TUNING.waveExp);

export function waveCountFor(d) {
  return Math.round(wavesExact(d));
}

/** Long-range growth of the whole-level budget (1 at d=1). */
export const growthFor = (d) => Math.exp(TUNING.hpExp * Math.asinh(TUNING.hpRate0 * (Math.max(1, d) - 1) / TUNING.hpExp));

/** Pressure credit for a level's word rules (1 = none); generateWaves applies it, levelThreat counts it back. */
export function ruleHpFor(rules = []) {
  let m = 1;
  for (const r of rules) {
    if (r.type === 'mustContain') m *= TUNING.mustContainHp;
    else if (r.type === 'towerLimit') m *= TUNING.towerLimitHp;
    else if (r.type === 'maxLength' && r.n <= 5) m *= TUNING.maxLength5Hp;
  }
  return m;
}

/** Enemy hp multiplier of a level's last wave: follows the per-wave budget growth. */
export function hpMulFor(d) {
  return round2(Math.max(1, Math.pow(growthFor(d) * TUNING.minWaves / wavesExact(d), TUNING.hpShare)));
}

export function speedMulFor(d) {
  return round2(1 + TUNING.speedGrowth * (d - 1) / 999);
}

/**
 * Tower hp doesn't grow with the level, so tower damage mustn't grow with the budget: slinger shots
 * and boss stomps scale with hpMul; vandal damage is flat but their numbers grow with the budget.
 * Effective HP grows as hpMul^hpPow (addGroup and the boss solve for hpMul with the same power).
 */
const hpPow = (type) => {
  const t = ENEMIES[type].traits;
  return t.includes('slinger') || t.includes('stomp') ? 2 : t.includes('vandal') ? 1.5 : 1;
};

/** Effective HP of one enemy of `type` with hpMul (armor and traits included). */
export function effectiveHp(type, hpMul = 1) {
  const e = ENEMIES[type];
  if (!e) return 0;
  let hp = e.hp * hpMul * (1 + e.armor * 0.08);
  for (const t of e.traits) hp *= TRAIT_FACTOR[t] || 1;
  if (!e.traits.includes('boss')) hp *= e.leak; // a tank that slips through costs 2 lives
  hp *= Math.max(1, hpMul) ** (hpPow(type) - 1);
  if (e.traits.includes('splitter')) hp += 3 * effectiveHp('swarm', hpMul);
  return hp;
}

function unlockedAt(d) {
  return Object.keys(ENEMY_UNLOCK).filter((t) => ENEMY_UNLOCK[t] <= d);
}

/** Enemy types first unlocked at exactly this difficulty (at most one). */
export function newEnemiesAt(d) {
  return Object.keys(ENEMY_UNLOCK).filter((t) => ENEMY_UNLOCK[t] === d);
}

/** Type weights for a difficulty: newly unlocked types are featured for a few levels. */
function typeWeights(d, unlocked) {
  return unlocked.map((t) => {
    const age = d - ENEMY_UNLOCK[t];
    let w = t === 'grunt' ? Math.max(1, 6 - d / 20) : 3;
    if (age < 5) w += 6;            // featured
    else if (age < 30) w += 1.5;
    return [t, w];
  });
}

/**
 * Build the wave list.
 * @param rng  makeRng instance
 * @param d    difficulty 1..1000
 * @param opts { boss:boolean, pathLengths:number[] (cells travelled per path), rules: the level's rules }
 */
export function generateWaves(rng, d, { boss = false, pathLengths = [TUNING.refPathLen], rules = [] } = {}) {
  const pathCount = pathLengths.length;
  const count = waveCountFor(d);
  const pathHp = pathCount > 1 ? TUNING.twoPathHp : 1;
  const levelHpMul = hpMulFor(d);
  const baseSpeed = speedMulFor(d);
  const intervalMul = 1 - 0.5 * (d - 1) / 999; // denser spawns late keep long levels short
  const unlocked = unlockedAt(d);
  const weights = typeWeights(d, unlocked);
  const intro = newEnemiesAt(d).filter((t) => t !== 'grunt')[0];
  let pathCursor = rng.int(0, pathCount - 1);
  // HP that `pressure` buys for an enemy of `type` moving at `speed` cells/s (before baseSpeed) on path p
  const hpFor = (pressure, p, speed) => pressure * pathHp * effLen(pathLengths[p]) / TUNING.refPathLen * (TUNING.refSpeed / speed);
  const rampOf = (w) => TUNING.firstWaveHp + (1 - TUNING.firstWaveHp) * w / Math.max(1, count - 1);
  const shapeOf = (w) => (1 + TUNING.perWave * w) * rampOf(w);
  let shapeSum = 0;
  for (let w = 0; w < count; w++) shapeSum += shapeOf(w);
  // reference pressure of the whole level: HP on a reference path at reference speed
  const levelBudget = TUNING.baseLevelHp * growthFor(d) * ruleHpFor(rules);
  const waves = [];

  for (let w = 0; w < count; w++) {
    const last = w === count - 1;
    // the two-path credit comes off each enemy's hp, not the head count: fewer enemies would also mean
    // half the bounty ink (two-path levels without a rule credit sat ~13 pts below their neighbours)
    const hpMul = round2(Math.max(1, levelHpMul * rampOf(w) * pathHp));
    let budget = levelBudget * shapeOf(w) / shapeSum;
    const groups = [];
    let delay = 0;
    const addGroup = (type, pressure, maxCount = TUNING.maxCount, maxBoost = 2) => {
      const speedMul = round2(baseSpeed * rng.float(0.95, 1.05));
      const raw = hpFor(pressure, pathCursor, ENEMIES[type].speed * speedMul / baseSpeed) / effectiveHp(type, hpMul);
      const n = Math.max(1, Math.min(maxCount, Math.round(raw)));
      // rounding and the count cap go into hp, so the wave keeps its exact budget (capped at maxBoost×)
      const gMul = round2(Math.max(0.05, hpMul * Math.min(raw / n, maxBoost) ** (1 / hpPow(type))));
      const interval = round2(INTERVAL[type] * intervalMul * rng.float(0.9, 1.1));
      groups.push({ enemy: type, count: n, interval, delay: round2(delay), path: pathCursor, hpMul: gMul, speedMul });
      if (pathCount > 1) pathCursor = (pathCursor + 1) % pathCount;
      delay += n * interval * 0.5 + rng.float(1, 3);
    };

    // Specials take their share of the wave budget (never add to it)
    const special = [];
    if (last && boss) special.push(['boss', TUNING.bossShare]);
    else if (d >= TUNING.miniBossFrom && w >= count / 2 &&
      rng.chance(0.12 + 0.18 * Math.min(1, (d - TUNING.miniBossFrom) / 600))) special.push(['miniBoss', TUNING.miniBossShare]);
    for (const [, share] of special) budget *= 1 - share;

    if (intro && w === 1) {
      addGroup(intro, budget, TUNING.introMax, Infinity); // the new type alone, in a small (tougher) group
    } else {
      // Group types for this wave
      let nGroups = 1 + (w >= count / 3 ? 1 : 0) + (w >= (2 * count) / 3 && d > 30 ? 1 : 0);
      const pool0 = unlocked.filter((t) => w > 1 || t !== intro); // nothing new before its intro
      nGroups = Math.min(nGroups, pool0.length);
      const types = [];
      // skip types so weak that the budget would need more than the count cap of them (a capped
      // group gets up to 2× hp: a spike, and late fast swarms of them leak)
      const maxShare = nGroups === 1 ? 1 : 0.7; // largest share a group can get below
      const fits = ([k]) => hpFor(budget * maxShare, pathCursor, ENEMIES[k].speed) / effectiveHp(k, hpMul) <= TUNING.maxCount;
      // Bloons-style: prefer the first max(earlyTypes, unlocked·((w+1)/waves)²) types in unlock order,
      // so a level's early waves are the easy kinds; the newest type mixes in from wave 3
      const early = Math.max(TUNING.earlyTypes, Math.ceil(unlocked.length * ((w + 1) / count) ** 2));
      const easyType = ([k]) => unlocked.indexOf(k) < early || k === intro;
      if (w === 0) {
        const easy = ['grunt', 'runner', 'swarm'].filter((k) => pool0.includes(k) && fits([k]));
        types.push(d < 40 || !easy.length ? 'grunt' : rng.pick(easy));
      }
      while (types.length < nGroups) {
        const free = weights.filter(([k]) => pool0.includes(k) && !types.includes(k));
        const pool = free.filter((e) => fits(e) || e[0] === intro); // the newest type always mixes in
        const easy = pool.filter(easyType);
        types.push(rng.weighted(easy.length ? easy : pool.length ? pool : free));
      }
      // Split budget: first group largest
      const shares = types.map((_, i) => (i === 0 ? 1.6 : 1) * rng.float(0.8, 1.2));
      const shareSum = shares.reduce((a, b) => a + b, 0);
      types.forEach((type, i) => addGroup(type, (budget * shares[i]) / shareSum));
    }

    for (const [kind, share] of special) {
      const isBoss = kind === 'boss';
      const pressure = budget / (1 - share) * share;
      const speedMul = round2(baseSpeed * (isBoss ? 1 : 1.1));
      const hp = hpFor(pressure, pathCursor, ENEMIES.boss.speed * speedMul / baseSpeed);
      groups.push({
        enemy: 'boss', count: 1, interval: 0, delay: round2(delay + (isBoss ? 4 : 0)), path: pathCursor,
        hpMul: round2(Math.max(0.05, (hp / effectiveHp('boss', 1)) ** (1 / hpPow('boss')))), speedMul, [kind]: true,
      });
      if (pathCount > 1) pathCursor = (pathCursor + 1) % pathCount;
    }
    waves.push({ groups });
  }
  return waves;
}

/**
 * Threat summary for the balance pass.
 * `pressure` = Σ count · effectiveHp · speed / pathLength over every group: effective HP per
 * second of time on the path (the DPS a defence needs), with two-path levels counted back up
 * by 1/twoPathHp. It is what the generator holds smooth and monotone across levels.
 * @returns { total, perWave:number[], pressure, pressurePerWave:number[], byEnemy:{type:count}, enemies:number }
 */
export function levelThreat(level) {
  const perWave = [];
  const pressurePerWave = [];
  const byEnemy = {};
  let enemies = 0;
  // two-path levels get less hp because the defence is split; count that back in as threat
  // (and restrictive rules less: count that back in too)
  const pathMul = ((level.paths?.length ?? 1) > 1 ? 1 / TUNING.twoPathHp : 1) / ruleHpFor(level.rules);
  for (const wave of level.waves) {
    let hp = 0;
    let pr = 0;
    for (const g of wave.groups) {
      const h = g.count * effectiveHp(g.enemy, g.hpMul);
      const len = effLen((level.paths?.[g.path]?.length ?? TUNING.refPathLen + 1) - 1);
      hp += h;
      pr += h * (ENEMIES[g.enemy]?.speed ?? 1) * (g.speedMul ?? 1) / len;
      byEnemy[g.enemy] = (byEnemy[g.enemy] || 0) + g.count;
      enemies += g.count;
    }
    perWave.push(Math.round(hp * pathMul));
    pressurePerWave.push(round2(pr * pathMul));
  }
  return {
    total: perWave.reduce((a, b) => a + b, 0), perWave,
    pressure: round2(pressurePerWave.reduce((a, b) => a + b, 0)), pressurePerWave,
    byEnemy, enemies,
  };
}
