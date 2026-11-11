import { test } from 'node:test';
import assert from 'node:assert/strict';
import { towerFor, scoreWord, posOf, createDictionary } from '../src/words/index.js';
import { loadDictionaryNode } from '../src/words/node.js';
import { CONCEPTS, CURATED_WORDS, LEXICON } from '../src/words/lexicon/index.js';
import { pluralize, verbForms } from '../src/words/morph.js';
import { makeRng } from '../src/core/rng.js';
import { validateSpec, fingerprint, dps, isAttacker } from './words-helpers.mjs';

const dict = loadDictionaryNode();
const rng = makeRng(20261111);
const sample5k = Array.from({ length: 5000 }, () => rng.pick(dict.words));

test('dictionary loads and has the expected shape', () => {
  assert.ok(dict.size > 200000, `size ${dict.size}`);
  assert.ok(dict.has('ax') && dict.has('doctor') && dict.has('medic') && dict.has('quixotic'));
  assert.ok(!dict.has('Doctor!') && !dict.has(''));
  assert.ok(dict.byLength(2).every((w) => w.length === 2));
  for (let i = 1; i < 2000; i++) assert.ok(dict.words[i - 1] < dict.words[i]);
  assert.ok(dict.words.every((w) => /^[a-z]{2,15}$/.test(w)));
  const small = createDictionary(['Bee', 'ant', 'ant', 'x-ray', 'cat']);
  assert.deepEqual(small.words, ['ant', 'bee', 'cat']);
  assert.equal(small.size, 3);
  assert.deepEqual(small.byLength(3), ['ant', 'bee', 'cat']);
});

test('lexicon size: ≥150 concepts, ≥4000 distinct curated words, all well-formed', () => {
  assert.ok(CONCEPTS.length >= 150, `${CONCEPTS.length} concepts`);
  assert.ok(CURATED_WORDS.size >= 4000, `${CURATED_WORDS.size} curated words`);
  for (const c of CONCEPTS) for (const w of c.words) assert.match(w, /^[a-z]{2,15}$/, `${c.id}: ${w}`);
  const ids = new Set(CONCEPTS.map((c) => c.id));
  assert.equal(ids.size, CONCEPTS.length, 'duplicate concept ids');
  // every curated word is in the shipped dictionary
  const missing = [...CURATED_WORDS].filter((w) => !dict.has(w));
  assert.deepEqual(missing, []);
});

test('contract shape: 5,000 random dictionary words', () => {
  const problems = [];
  for (const w of sample5k) problems.push(...validateSpec(towerFor(w), w, scoreWord));
  assert.deepEqual(problems.slice(0, 20), []);
});

test('contract shape: every curated word', () => {
  const problems = [];
  for (const w of CURATED_WORDS) problems.push(...validateSpec(towerFor(w), w, scoreWord));
  assert.deepEqual(problems.slice(0, 20), []);
});

test('towerFor never throws and stays valid for odd a–z strings', () => {
  const odd = ['a', 'z', 'q', 'xx', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', 'aeiouaeiou', 'bcdfghjklmnpqrstvwxz',
    'qqqq', 'unununununun', 'sssssss', 'ing', 'ed', 'less', 'ness', 'antidisestablishmentarianism'];
  const r = makeRng(99);
  for (let i = 0; i < 2000; i++) {
    let w = '';
    const n = r.int(1, 18);
    for (let k = 0; k < n; k++) w += String.fromCharCode(97 + r.int(0, 25));
    odd.push(w);
  }
  for (const w of odd) {
    const s = towerFor(w);
    assert.deepEqual(validateSpec(s, w, scoreWord), []);
    assert.deepEqual(posOf(w), s.pos);
  }
  // non a–z input degrades gracefully instead of throwing
  for (const junk of ['', 'Doctor', 'AX', 'abc123', null, undefined, 42]) assert.doesNotThrow(() => towerFor(junk));
  assert.equal(towerFor('Doctor').word, 'doctor');
});

test('deterministic: same word → same spec, regardless of call order or mutation', () => {
  const words = sample5k.slice(0, 500);
  const first = words.map((w) => JSON.stringify(towerFor(w)));
  const s = towerFor(words[0]);
  s.stats.damage = -1; s.effects.push({ type: 'x' }); s.tags.push('mutated');
  if (s.augment) s.augment.mods.damage = 99;
  const second = words.slice().reverse().map((w) => JSON.stringify(towerFor(w))).reverse();
  assert.deepEqual(second, first);
});

test('unique specs across a 20k sample', () => {
  const r = makeRng(4242);
  const words = new Set();
  while (words.size < 20000) words.add(r.pick(dict.words));
  const seen = new Map();
  const dupes = [];
  for (const w of words) {
    const f = fingerprint(towerFor(w));
    if (seen.has(f)) dupes.push([seen.get(f), w]);
    seen.set(f, w);
  }
  assert.deepEqual(dupes, []);
});

test("the user's examples: ax harvests, doctor & medic heal", () => {
  for (const w of ['ax', 'axe', 'saw', 'hatchet']) {
    const s = towerFor(w);
    assert.equal(s.archetype, 'harvest', w);
    assert.equal(s.effects[0].type, 'harvest');
    assert.equal(s.effects[0].resource, 'ink');
  }
  for (const w of ['doctor', 'medic', 'nurse', 'healer', 'doctors', 'surgeon']) {
    const s = towerFor(w);
    assert.equal(s.archetype, 'support', w);
    assert.ok(s.effects.some((e) => e.type === 'heal'), w);
  }
  assert.equal(towerFor('doctors').source, 'derived');
  assert.equal(towerFor('doctor').source, 'lexicon');
});

test('curated meanings feel like the word', () => {
  const expect = {
    cannon: { archetype: 'blast' }, bow: { archetype: 'snipe' }, sword: { archetype: 'bolt' },
    gun: { archetype: 'rapid' }, lightning: { archetype: 'chain', element: 'storm' },
    king: { archetype: 'support', fx: 'buff' }, queen: { archetype: 'support', fx: 'buff' },
    soldier: { archetype: 'summon' }, knight: { archetype: 'summon' }, wolf: { archetype: 'summon' },
    bank: { archetype: 'harvest', resource: 'ink' }, gold: { archetype: 'harvest', resource: 'ink' },
    coin: { archetype: 'harvest', resource: 'ink' }, pen: { archetype: 'harvest', resource: 'tile' },
    book: { archetype: 'harvest', resource: 'tile' }, scribe: { archetype: 'harvest', resource: 'tile' },
    fire: { element: 'fire', fx: 'burn' }, ice: { element: 'ice', fx: 'slow' }, poison: { fx: 'poison' },
    shield: { archetype: 'support', fx: 'shield' }, wall: { archetype: 'support', fx: 'shield' },
    trap: { fx: 'stun' }, plague: { archetype: 'aura', fx: 'poison' }, sun: { element: 'light' },
    shark: { element: 'water' }, eagle: { archetype: 'snipe' }, bee: { fx: 'poison' }, dragon: { element: 'fire' },
    ghost: { element: 'shadow' }, wizard: { element: 'arcane' }, drum: { fx: 'buff' }, hospital: { fx: 'heal' },
  };
  for (const [w, e] of Object.entries(expect)) {
    const s = towerFor(w);
    assert.equal(s.source, 'lexicon', w);
    if (e.archetype) assert.equal(s.archetype, e.archetype, w);
    if (e.element) assert.equal(s.element, e.element, w);
    if (e.fx) assert.ok(s.effects.some((x) => x.type === e.fx), `${w} lacks ${e.fx}: ${JSON.stringify(s.effects)}`);
    if (e.resource) assert.equal(s.effects[0].resource, e.resource, w);
  }
});

test('verbs and adjectives make augments with sensible content', () => {
  const burn = towerFor('burn').augment;
  assert.equal(burn.kind, 'verb');
  assert.ok(burn.effects.some((e) => e.type === 'burn'));
  assert.equal(burn.element, 'fire');
  const frozen = towerFor('frozen').augment;
  assert.equal(frozen.kind, 'adjective');
  assert.equal(frozen.element, 'ice');
  assert.ok(towerFor('big').augment.mods.damage > 1);
  assert.ok(towerFor('fast').augment.mods.rate > 1);
  assert.ok(towerFor('far').augment.mods.range > 1);
  assert.ok(towerFor('sharp').augment.effects.some((e) => e.type === 'crit'));
  assert.ok(towerFor('pierce').augment.effects.some((e) => e.type === 'pierce'));
  assert.ok(towerFor('stun').augment.effects.some((e) => e.type === 'stun'));
  assert.ok(towerFor('shatter').augment.effects.some((e) => e.type === 'armorBreak'));
  assert.ok(towerFor('quickly').augment.mods.rate > 1);
  assert.equal(towerFor('cannon').augment, null);
});

test('derivation resolves inflections, affixes and compounds to curated roots', () => {
  const cases = {
    doctors: 'healers', burning: 'fiery', burned: 'burn', fiery: 'fiery', icy: 'frozen', woodcutter: 'woodcutting',
    woodcutters: 'woodcutting', snowman: 'frost', snowmen: 'frost', swords: 'blades', hammering: 'smithing',
    froze: 'freeze', wolves: 'packs', firebird: 'mythic',
  };
  for (const [w, concept] of Object.entries(cases)) {
    const s = towerFor(w);
    assert.notEqual(s.source, 'procedural', w);
  }
  assert.equal(towerFor('snowman').element, 'ice');
  assert.equal(towerFor('swords').source, 'derived');
  assert.equal(towerFor('swords').archetype, towerFor('sword').archetype);
  // -less inverts the element; -est strengthens
  assert.equal(towerFor('fireless').element, 'ice');
  assert.equal(towerFor('fireless').source, 'derived');
  const big = towerFor('bigger'), biggest = towerFor('biggest');
  assert.equal(big.source, 'derived');
  assert.ok(biggest.augment.mods.damage >= big.augment.mods.damage * 0.95);
  // pos follows the affix
  assert.deepEqual(towerFor('quickness').pos, ['noun']);
  assert.ok(towerFor('burning').pos.includes('verb'));
  assert.ok(towerFor('fiercely').pos.includes('adverb'));
});

test('procedural fallback: suffix POS heuristics', () => {
  assert.ok(posOf('quixotic').includes('adjective'));
  assert.ok(posOf('obfuscate').includes('verb'));
  assert.ok(posOf('xyzzification').includes('noun'));
  assert.ok(posOf('zorbingly').includes('adverb'));
  assert.ok(posOf('glorptastic').includes('adjective'));
  assert.ok(posOf('blorpize').includes('verb'));
  assert.equal(towerFor('quixotic').source, 'procedural');
});

test('balance baselines: common 3-letter bolt ≈ dmg 6 / rate 1 / range 2.5 / hp 60 / cost 30', () => {
  const bolts = dict.byLength(3).map((w) => towerFor(w)).filter((s) => s.archetype === 'bolt' && s.rarity === 'common');
  assert.ok(bolts.length > 20, `${bolts.length} common 3-letter bolts`);
  const avg = (f) => bolts.reduce((a, s) => a + f(s), 0) / bolts.length;
  const near = (v, target, tol) => assert.ok(Math.abs(v - target) / target < tol, `${v} vs ${target}`);
  near(avg((s) => s.stats.damage), 6, 0.3);
  near(avg((s) => s.stats.rate), 1, 0.2);
  near(avg((s) => s.stats.range), 2.5, 0.2);
  near(avg((s) => s.stats.hp), 60, 0.3);
  near(avg((s) => s.cost), 30, 0.3);
  // harvest baseline: ≈ +4 ink every 5 s for a ~30-ink tower
  const h = dict.byLength(3).map((w) => towerFor(w)).filter((s) => s.archetype === 'harvest' && s.effects[0].resource === 'ink');
  const rate = h.reduce((a, s) => a + s.effects[0].amount / s.effects[0].interval / s.cost, 0) / h.length;
  near(rate * 30 * 5, 4, 0.3);
});

test('cost and power rise with length; power per ink rises gently', () => {
  const byLen = new Map();
  for (const w of sample5k.concat(dict.byLength(2), dict.byLength(3))) {
    const s = towerFor(w);
    if (!isAttacker(s)) continue;
    const b = byLen.get(w.length) || { n: 0, cost: 0, dps: 0 };
    b.n++; b.cost += s.cost; b.dps += dps(s);
    byLen.set(w.length, b);
  }
  let prev = null;
  const rows = [];
  for (let L = 2; L <= 13; L++) {
    const b = byLen.get(L);
    if (!b || b.n < 15) continue;
    const row = { L, cost: b.cost / b.n, dps: b.dps / b.n };
    rows.push(row);
    if (prev) {
      assert.ok(row.cost > prev.cost, `cost not rising at ${L}`);
      assert.ok(row.dps > prev.dps, `dps not rising at ${L}`);
    }
    prev = row;
  }
  const r3 = rows.find((r) => r.L === 3), r7 = rows.find((r) => r.L === 7);
  const costRatio = r7.cost / r3.cost, dpsRatio = r7.dps / r3.dps;
  assert.ok(costRatio > 2 && costRatio < 3.2, `7-letter cost ×${costRatio.toFixed(2)}`);
  assert.ok(dpsRatio > 2.6 && dpsRatio < 4.8, `7-letter dps ×${dpsRatio.toFixed(2)}`);
  assert.ok(r7.dps / r7.cost > r3.dps / r3.cost, 'power per ink should rise with length');
});

test('towerFor is fast (memoised)', () => {
  const words = sample5k.slice(0, 2000);
  for (const w of words) towerFor(w);
  const t0 = performance.now();
  for (let k = 0; k < 5; k++) for (const w of words) towerFor(w);
  const per = ((performance.now() - t0) / (5 * words.length)) * 1000;
  assert.ok(per < 20, `${per.toFixed(1)}µs per cached call`);
});

test('morphology helpers', () => {
  assert.equal(pluralize('wolf'), 'wolves');
  assert.equal(pluralize('box'), 'boxes');
  assert.equal(pluralize('army'), 'armies');
  assert.equal(pluralize('swordsman'), 'swordsmen');
  assert.equal(pluralize('human'), 'humans');
  assert.equal(pluralize('monarch'), 'monarchs');
  assert.equal(pluralize('hero'), 'heroes');
  assert.deepEqual(verbForms('stop').sort(), ['stopped', 'stopping', 'stops']);
  assert.deepEqual(verbForms('freeze').sort(), ['freezes', 'freezing', 'froze', 'frozen']);
  assert.deepEqual(verbForms('bake').sort(), ['baked', 'bakes', 'baking']);
  assert.deepEqual(verbForms('carry').sort(), ['carried', 'carries', 'carrying']);
  assert.ok(verbForms('heal').includes('healed'));
  assert.ok(LEXICON.has('doctor') && !LEXICON.has('doctors'));
});

test('word meanings: audited everyday words feel like their word', () => {
  const m = (w) => { const s = towerFor(w); return `${s.archetype}/${s.element}`; };
  assert.equal(m('ash'), 'aura/fire');
  assert.equal(m('freezer'), 'aura/ice');
  assert.equal(m('bed'), 'support/earth');
  assert.equal(m('chili'), 'bolt/fire');
  assert.ok(posOf('jelly').includes('noun'));
});

// Same-kind words listed in two concepts: the first concept silently wins. All current ones were
// reviewed (winner = the more natural meaning); a new one must be reviewed before raising this cap.
test('concept collisions do not grow unreviewed', () => {
  const seen = new Map();
  let n = 0;
  for (const c of CONCEPTS) for (const w of new Set(c.words)) {
    const first = seen.get(w);
    if (!first) seen.set(w, c);
    else if (first !== c && !!first.kind === !!c.kind) n++;
  }
  assert.ok(n <= 360, `${n} concept collisions (cap 360): review the new ones`);
});
