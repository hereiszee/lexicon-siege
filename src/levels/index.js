// LEVELS module public API (see CONTRACT.md).

import { towerFor } from '../words/index.js';
import { makeLevel, LEVEL_COUNT, clampDifficulty } from './levelgen.js';
import { LEVEL_WORDS, CHAPTERS, chapterOf } from './levelWords.js';

export { LEVEL_COUNT, LEVEL_WORDS, CHAPTERS, chapterOf };
export { checkWordRules, themeBonus } from './rules.js';
export { levelThreat } from './waves.js';

/** n in 1..LEVEL_COUNT → LevelSpec (out-of-range n is clamped). */
export function levelFor(n) {
  const i = clampDifficulty(n);
  return makeLevel(LEVEL_WORDS[i - 1], i, towerFor, { id: i, chapter: chapterOf(i) });
}

/** Any word → LevelSpec at the given difficulty (id 0 = custom level). */
export function levelForWord(word, difficulty = 1) {
  return makeLevel(word, difficulty, towerFor, { id: 0 });
}
