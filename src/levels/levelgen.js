// Level assembly. `towerFor` is injected so this module has no hard dependency on src/words.

import { DEFAULTS, ELEMENTS } from '../core/constants.js';
import { hashString, makeRng } from '../core/rng.js';
import { generateMap } from './mapgen.js';
import { generateWaves, newEnemiesAt } from './waves.js';
import { generateRules, makeLetterWeights, makeBonus, enemyElementFor } from './rules.js';

export const LEVEL_COUNT = 1000;

/** Lowercase a–z only; never empty. */
export function cleanWord(word) {
  const w = String(word ?? '').toLowerCase().replace(/[^a-z]/g, '').slice(0, DEFAULTS.maxWordLength);
  return w || 'void';
}

export function clampDifficulty(d) {
  const n = Math.round(Number(d));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(LEVEL_COUNT, n));
}

function safeSpec(word, towerFor) {
  const spec = typeof towerFor === 'function' ? towerFor(word) : null;
  const element = spec && ELEMENTS.includes(spec.element) ? spec.element : ELEMENTS[hashString(word) % ELEMENTS.length];
  const tags = Array.isArray(spec?.tags) ? spec.tags.filter((t) => typeof t === 'string') : [];
  return { element, tags };
}

/**
 * Build a LevelSpec.
 * @param word        level word (any string; cleaned to a–z)
 * @param difficulty  1..1000
 * @param towerFor    word → TowerSpec (injected)
 * @param meta        { id, chapter } optional extras
 */
export function makeLevel(word, difficulty, towerFor, meta = {}) {
  const w = cleanWord(word);
  const d = clampDifficulty(difficulty);
  const seed = (hashString(w) ^ Math.imul(d, 0x9e3779b1)) >>> 0;
  const sub = (tag) => makeRng((seed ^ hashString(tag)) >>> 0);

  const spec = safeSpec(w, towerFor);
  const boss = d % 10 === 0;
  const element = enemyElementFor(spec.element);

  const twoPathChance = d < 150 ? 0 : Math.min(0.4, 0.15 + (d - 150) / 3400);
  const mapRng = sub('map');
  const twoPaths = mapRng.chance(twoPathChance);
  const { paths, blocked, style } = generateMap(mapRng, { cols: DEFAULTS.cols, rows: DEFAULTS.rows, difficulty: d, twoPaths });

  const waves = generateWaves(sub('waves'), d, { boss, pathLengths: paths.map((p) => p.length - 1) });
  const bonus = makeBonus(spec, spec.element, d);
  const rules = generateRules(sub('rules'), d, { word: w, bonusElement: bonus.element, waveCount: waves.length });

  const lives = DEFAULTS.lives + Math.floor(d / 70); // +1 every 70 levels (smooth, no 250-level steps)
  // late waves are tough from the start: the opening ink grows with difficulty (100 → 500);
  // "must contain X" starves the rack, so those levels open with more ink to stay level with their neighbours
  const mustInk = rules.some((r) => r.type === 'mustContain') ? 1.6 : 1;
  const startInk = Math.round((DEFAULTS.startInk + Math.round(d * 0.4) + (boss ? 10 : 0)) * mustInk);

  return {
    id: meta.id ?? 0,
    word: w,
    seed,
    title: w[0].toUpperCase() + w.slice(1),
    difficulty: d,
    element,
    cols: DEFAULTS.cols,
    rows: DEFAULTS.rows,
    paths,
    blocked,
    startInk,
    lives,
    rackSize: DEFAULTS.rackSize,
    letterWeights: makeLetterWeights(w, rules),
    waves,
    newEnemies: newEnemiesAt(d), // enemy types first unlocked at this difficulty (at most one)
    rules,
    bonus,
    stars: { two: { livesAtLeast: Math.ceil(lives / 2) }, three: { livesAtLeast: lives } },
    wordElement: spec.element, // the level word's own element (board biome); `element` = enemy attunement
    // extras (not in the contract, safe to ignore)
    boss,
    chapter: meta.chapter ?? null,
    mapStyle: style,
  };
}
