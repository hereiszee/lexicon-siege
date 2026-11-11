// Wave generation and threat accounting.
//
// Every wave gets an HP budget  B(d) · (1 + perWave·w)  where B(d) grows geometrically but
// gently with difficulty d (TUNING.hpGrowth per level). Budgets are split across 1–3 enemy
// groups; long-range scaling goes partly into enemy count and partly into hpMul so counts
// stay readable. Bosses close every 10th level; mini-bosses appear later on.

import { ENEMIES } from '../core/constants.js';

/** Balance knobs — tune these in the balance pass. */
export const TUNING = {
  baseWaveHp: 120,      // wave-1 HP budget at difficulty 1
  hpGrowth: 1.0025,     // per-level geometric growth of the budget (≈12× over 1000 levels)
  perWave: 0.32,        // within-level ramp: wave w has budget × (1 + perWave·w)
  hpShare: 0.6,         // fraction of long-range growth (in log space) that goes into hpMul
  minWaves: 5,
  extraWaves: 17,       // waves → minWaves + extraWaves·(1 − e^(−d/waveScale))
  waveScale: 300,
  speedGrowth: 0.15,    // speedMul reaches 1 + speedGrowth at difficulty 1000
  bossHpExp: 0.9,       // boss hpMul = growth^bossHpExp
  miniBossFrom: 150,    // first difficulty with mini-bosses
  maxCount: 40,
};

/** Difficulty at which each enemy type starts appearing, in introduction order. */
export const ENEMY_UNLOCK = {
  grunt: 1, runner: 3, swarm: 6, tank: 12, armored: 20, stealth: 30,
  healer: 40, vandal: 55, splitter: 70, flyer: 85,
};

/** Base spawn intervals (seconds) per enemy type. */
const INTERVAL = {
  grunt: 0.9, runner: 0.6, swarm: 0.3, tank: 1.8, armored: 1.3, stealth: 0.9,
  healer: 1.6, vandal: 1.4, splitter: 1.3, flyer: 0.7, boss: 0,
};

/** Rough per-trait difficulty factor used for effective HP. */
const TRAIT_FACTOR = { stealth: 1.25, healer: 1.3, vandal: 1.15, flyer: 1.1, boss: 1 };

const round2 = (v) => Math.round(v * 100) / 100;

export function waveCountFor(d) {
  return Math.round(TUNING.minWaves + TUNING.extraWaves * (1 - Math.exp(-(d - 1) / TUNING.waveScale)));
}

/** Long-range growth factor (1 at d=1). */
export const growthFor = (d) => Math.pow(TUNING.hpGrowth, d - 1);

export function hpMulFor(d) {
  return round2(Math.pow(growthFor(d), TUNING.hpShare));
}

export function speedMulFor(d) {
  return round2(1 + TUNING.speedGrowth * (d - 1) / 999);
}

/** Effective HP of one enemy of `type` with hpMul (armor and traits included). */
export function effectiveHp(type, hpMul = 1) {
  const e = ENEMIES[type];
  if (!e) return 0;
  let hp = e.hp * hpMul * (1 + e.armor * 0.08);
  for (const t of e.traits) hp *= TRAIT_FACTOR[t] || 1;
  if (e.traits.includes('splitter')) hp += 3 * effectiveHp('swarm', hpMul);
  return hp;
}

function unlockedAt(d) {
  return Object.keys(ENEMY_UNLOCK).filter((t) => ENEMY_UNLOCK[t] <= d);
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
 * @param opts { boss:boolean, pathCount:1|2 }
 */
export function generateWaves(rng, d, { boss = false, pathCount = 1 } = {}) {
  const count = Math.max(TUNING.minWaves, waveCountFor(d) + (d > 20 ? rng.int(-1, 1) : 0));
  const growth = growthFor(d);
  const hpMul = hpMulFor(d);
  const baseSpeed = speedMulFor(d);
  const intervalMul = 1 - 0.3 * (d - 1) / 999;
  const unlocked = unlockedAt(d);
  const weights = typeWeights(d, unlocked);
  const newest = unlocked.filter((t) => d - ENEMY_UNLOCK[t] < 5 && t !== 'grunt');
  let pathCursor = rng.int(0, pathCount - 1);
  const waves = [];

  for (let w = 0; w < count; w++) {
    const last = w === count - 1;
    const budget = TUNING.baseWaveHp * growth * (1 + TUNING.perWave * w);
    // Group types for this wave
    let nGroups = 1 + (w >= count / 3 ? 1 : 0) + (w >= (2 * count) / 3 && d > 30 ? 1 : 0);
    nGroups = Math.min(nGroups, unlocked.length);
    const types = [];
    // skip types so weak that the budget would need more than 2× the count cap of them
    const maxShare = nGroups === 1 ? 1 : 0.7; // largest share a group can get below
    const fits = ([k]) => budget * maxShare / effectiveHp(k, hpMul) <= TUNING.maxCount * 2;
    if (w === 0) {
      const easy = ['grunt', 'runner', 'swarm'].filter((k) => unlocked.includes(k) && fits([k]));
      types.push(d < 40 || !easy.length ? 'grunt' : rng.pick(easy));
    } else if (w === 1 && newest.length) types.push(rng.pick(newest)); // show the new enemy early
    while (types.length < nGroups) {
      const free = weights.filter(([k]) => !types.includes(k));
      const pool = free.filter(fits);
      const t = rng.weighted(pool.length ? pool : free);
      types.push(t);
    }
    // Split budget: first group largest
    const shares = types.map((_, i) => (i === 0 ? 1.6 : 1) * rng.float(0.8, 1.2));
    const shareSum = shares.reduce((a, b) => a + b, 0);
    const groups = [];
    let delay = 0;
    types.forEach((type, i) => {
      const per = effectiveHp(type, hpMul);
      const raw = (budget * shares[i]) / shareSum / per;
      const n = Math.max(1, Math.min(TUNING.maxCount, Math.round(raw)));
      // if the count cap bites, put the excess budget into hp instead
      const gMul = raw > TUNING.maxCount ? round2(hpMul * raw / TUNING.maxCount) : hpMul;
      const interval = round2(INTERVAL[type] * intervalMul * rng.float(0.9, 1.1));
      groups.push({
        enemy: type, count: n, interval, delay: round2(delay),
        path: pathCursor, hpMul: gMul, speedMul: round2(baseSpeed * rng.float(0.95, 1.05)),
      });
      if (pathCount > 1) pathCursor = (pathCursor + 1) % pathCount;
      delay += n * interval * 0.5 + rng.float(1, 3);
    });

    // Mini-boss mid/late in long levels
    const miniBossWave = d >= TUNING.miniBossFrom && !last && w >= count / 2 &&
      rng.chance(0.12 + 0.18 * Math.min(1, (d - TUNING.miniBossFrom) / 600));
    if (miniBossWave) {
      groups.push({
        enemy: 'boss', count: 1, interval: 0, delay: round2(delay), path: pathCursor,
        hpMul: round2(Math.pow(growth, TUNING.bossHpExp) * 0.35 * (1 + 0.04 * w)),
        speedMul: round2(baseSpeed * 1.2), miniBoss: true,
      });
      if (pathCount > 1) pathCursor = (pathCursor + 1) % pathCount;
    }

    // Boss finale
    if (last && boss) {
      const bosses = d >= 500 && d % 100 === 0 ? 2 : 1;
      const bossMul = round2(Math.pow(growth, TUNING.bossHpExp) * (1 + 0.5 * Math.min(1, d / 200)) / bosses);
      for (let b = 0; b < bosses; b++) {
        groups.push({
          enemy: 'boss', count: 1, interval: 0, delay: round2(delay + 4 + b * 6),
          path: pathCount > 1 ? b % pathCount : 0, hpMul: bossMul, speedMul: round2(baseSpeed), boss: true,
        });
      }
    }
    waves.push({ groups });
  }
  return waves;
}

/**
 * Threat summary for the balance pass.
 * @returns { total, perWave:number[], byEnemy:{type:count}, enemies:number }
 */
export function levelThreat(level) {
  const perWave = [];
  const byEnemy = {};
  let enemies = 0;
  for (const wave of level.waves) {
    let hp = 0;
    for (const g of wave.groups) {
      hp += g.count * effectiveHp(g.enemy, g.hpMul);
      byEnemy[g.enemy] = (byEnemy[g.enemy] || 0) + g.count;
      enemies += g.count;
    }
    perWave.push(Math.round(hp));
  }
  return { total: perWave.reduce((a, b) => a + b, 0), perWave, byEnemy, enemies };
}
