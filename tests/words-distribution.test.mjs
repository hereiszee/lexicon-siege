import { test } from 'node:test';
import assert from 'node:assert/strict';
import { towerFor } from '../src/words/index.js';
import { loadDictionaryNode } from '../src/words/node.js';
import { ARCHETYPES, ELEMENTS } from '../src/core/constants.js';

test('distribution sanity over the whole dictionary', () => {
  const dict = loadDictionaryNode();
  const arch = {}, elem = {}, src = {}, rarity = {}, procArch = {};
  let procN = 0;
  const t0 = performance.now();
  for (const w of dict.words) {
    const s = towerFor(w);
    arch[s.archetype] = (arch[s.archetype] || 0) + 1;
    elem[s.element] = (elem[s.element] || 0) + 1;
    src[s.source] = (src[s.source] || 0) + 1;
    rarity[s.rarity] = (rarity[s.rarity] || 0) + 1;
    if (s.source === 'procedural') { procN++; procArch[s.archetype] = (procArch[s.archetype] || 0) + 1; }
  }
  const ms = performance.now() - t0;
  const n = dict.size;
  const fmt = (o, total = n) => Object.entries(o).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${(100 * v / total).toFixed(1)}%`).join(', ');
  console.log(`\n# ${n} words in ${(ms / 1000).toFixed(1)}s (${(ms * 1000 / n).toFixed(1)}µs/word uncached)`);
  console.log(`# archetype: ${fmt(arch)}`);
  console.log(`# element:   ${fmt(elem)}`);
  console.log(`# source:    ${fmt(src)}`);
  console.log(`# rarity:    ${fmt(rarity)}`);
  console.log(`# procedural archetypes: ${fmt(procArch, procN)}`);

  for (const a of ARCHETYPES) {
    const share = (arch[a] || 0) / n;
    assert.ok(share < 0.45 && share > 0.01, `${a} at ${(share * 100).toFixed(1)}%`);
  }
  for (const e of ELEMENTS) assert.ok((elem[e] || 0) / n > 0.03, `${e} too rare`);
  const procAttack = ['bolt', 'blast', 'snipe', 'rapid', 'beam', 'chain', 'aura', 'trap', 'mortar', 'vortex', 'pulse', 'orbit']
    .reduce((a, k) => a + (procArch[k] || 0), 0);
  assert.ok(procAttack / procN > 0.6, 'most procedural words should be attackers');
  // v2 variety target: among words of 2–8 letters no archetype above 12% or below 3%
  const short = {};
  let ns = 0;
  for (const w of dict.words) if (w.length <= 8) { const a = towerFor(w).archetype; short[a] = (short[a] || 0) + 1; ns++; }
  console.log(`# 2–8 letters: ${fmt(short, ns)}`);
  for (const a of ARCHETYPES) {
    const share = (short[a] || 0) / ns;
    assert.ok(share <= 0.12 && share >= 0.03, `${a} at ${(share * 100).toFixed(1)}% of 2–8 letter words`);
  }
  assert.ok((src.lexicon || 0) > 4000 && (src.derived || 0) > 10000 && (src.procedural || 0) > 100000);
});
