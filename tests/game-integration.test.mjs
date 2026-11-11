// Engine + real WORDS and LEVELS modules. Skipped gracefully while those modules are absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game/index.js';
import { playLevel, makeWordFinder } from '../src/game/bot.js';

import { existsSync } from 'node:fs';

// Skip only while the word list hasn't been built; any other failure (bad import, bad data) fails.
const WORDS_TXT = new URL('../data/words.txt', import.meta.url);
const skip = existsSync(WORDS_TXT) ? false : 'data/words.txt not built yet';
let mods = null;
if (!skip) {
  const words = await import('../src/words/index.js');
  const node = await import('../src/words/node.js');
  const levels = await import('../src/levels/index.js');
  const dictionary = await node.loadDictionaryNode();
  mods = { words, levels, dictionary };
}

test('level 1 with real modules: engine accepts the LevelSpec and towers', { skip }, () => {
  const { words, levels, dictionary } = mods;
  const level = levels.levelFor(1);
  const game = createGame({
    level, dictionary, towerFor: words.towerFor,
    checkWordRules: levels.checkWordRules, themeBonus: levels.themeBonus, seed: level.seed,
  });
  assert.equal(game.state.rack.length, level.rackSize);
  assert.equal(game.state.waveCount, level.waves.length);
  const finder = makeWordFinder(dictionary);
  const w = finder.find(game.state.rack).find((x) => game.checkWord(x).ok);
  assert.ok(w, 'some word is spellable from the opening rack');
  let placed = false;
  for (let cy = 0; cy < level.rows && !placed; cy++) {
    for (let cx = 0; cx < level.cols && !placed; cx++) {
      if (game.canBuild(cx, cy)) {
        const r = game.placeTower(w, cx, cy);
        if (r.ok) placed = true;
        else assert.match(r.reason, /ink/i);
      }
    }
  }
  assert.ok(game.startWave().ok);
  for (let i = 0; i < 600 && game.state.phase === 'wave'; i++) game.update(0.1);
  assert.ok(game.drainEvents().length > 0);
});

test('bot plays levels 1–10 with real modules', { skip }, () => {
  const { words, levels, dictionary } = mods;
  const finder = makeWordFinder(dictionary);
  const rows = [];
  for (let n = 1; n <= 10; n++) {
    const level = levels.levelFor(n);
    const t0 = performance.now();
    const r = playLevel({
      level, dictionary, towerFor: words.towerFor, checkWordRules: levels.checkWordRules,
      themeBonus: levels.themeBonus, seed: level.seed, skill: 0.8, finder,
    });
    rows.push(`L${n} ${level.word}: ${r.won ? 'WON' : 'lost'} lives ${r.livesLeft} stars ${r.stars} waves ${r.wavesCleared}/${level.waves.length} words ${r.wordsUsed.length} sim ${r.timeSimulated.toFixed(0)}s ${(performance.now() - t0).toFixed(0)}ms`);
    assert.ok(r.won || r.livesLeft === 0 || r.timeSimulated >= 3600, 'game ran to completion');
  }
  console.log('# ' + rows.join('\n# '));
});

test('difficulty curve: tutorial is easy for a casual bot, level 1000 is not', { skip }, () => {
  const { words, levels, dictionary } = mods;
  const finder = makeWordFinder(dictionary);
  const play = (n, skill, s) => {
    const level = levels.levelFor(n);
    const r = playLevel({
      level, dictionary, towerFor: words.towerFor, checkWordRules: levels.checkWordRules,
      themeBonus: levels.themeBonus, seed: level.seed + s * 7919, skill, finder,
    });
    return { ...r, frac: r.livesLeft / level.lives };
  };
  for (const n of [1, 2, 3]) {
    for (const s of [0, 1]) {
      const r = play(n, 0.15, s);
      assert.ok(r.won && r.frac >= 0.9, `level ${n} seed ${s}: casual should win comfortably (won ${r.won}, lives ${r.frac})`);
    }
  }
  for (const s of [0, 1]) assert.ok(!play(1000, 0.15, s).won, `level 1000 seed ${s} won by a casual bot`);
});
