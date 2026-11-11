// Balance harness: plays a sample of levels with the auto-player at three skills.
// Usage: node scripts/balance.mjs [levels,comma,separated] [seeds]
//   e.g. node scripts/balance.mjs 1,10,100 8
import { loadDictionaryNode } from '../src/words/node.js';
import { towerFor } from '../src/words/index.js';
import { levelFor, checkWordRules, themeBonus } from '../src/levels/index.js';
import { playLevel, makeWordFinder } from '../src/game/bot.js';

const LEVELS = process.argv[2]
  ? process.argv[2].split(',').map(Number)
  : [1, 2, 3, 5, 8, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500, 650, 800, 1000];
const SEEDS = Number(process.argv[3]) || 5;
const SKILLS = [0.15, 0.5, 1.0];

const t0 = performance.now();
const dictionary = loadDictionaryNode();
const finder = makeWordFinder(dictionary);
const pct = (x) => String(Math.round(x * 100)).padStart(3) + '%';

console.log(`seeds ${SEEDS}; per skill: win% / mean lives-left fraction; words and sim minutes are the skill-0.5 means`);
console.log('level  waves | ' + SKILLS.map((s) => `skill ${s}`.padEnd(13)).join(' | ') + ' | words | min@0.5');
for (const n of LEVELS) {
  const level = levelFor(n);
  const cols = [];
  let words = 0, time = 0;
  for (const skill of SKILLS) {
    let wins = 0, lives = 0;
    for (let s = 0; s < SEEDS; s++) {
      const r = playLevel({ level, dictionary, towerFor, checkWordRules, themeBonus, seed: level.seed + s * 7919, skill, finder });
      if (r.won) wins++;
      lives += r.livesLeft / level.lives;
      if (skill === 0.5) { words += r.wordsUsed.length; time += r.timeSimulated; }
    }
    cols.push(`${pct(wins / SEEDS)} / ${(lives / SEEDS).toFixed(2)}`.padEnd(13));
  }
  console.log(`${String(n).padStart(5)} ${String(level.waves.length).padStart(6)} | ${cols.join(' | ')} | ${(words / SEEDS).toFixed(1).padStart(5)} | ${(time / SEEDS / 60).toFixed(1).padStart(5)}`);
}
console.log(`# ${((performance.now() - t0) / 1000).toFixed(1)}s`);
