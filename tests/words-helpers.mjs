// Shared helpers for words*.test.mjs (not itself a test file).
import { ARCHETYPES, ELEMENTS, EFFECT_TYPES, RARITIES, ELEMENT_COLORS } from '../src/core/constants.js';

const POS = ['noun', 'verb', 'adjective', 'adverb'];
// classic projectile/beam/aura attackers (dps() is defined for these)
const ATTACKERS = new Set(['bolt', 'blast', 'snipe', 'rapid', 'beam', 'chain', 'aura']);
// everything that deals damage (v2 adds trap, mortar, vortex, pulse, orbit); walls, support, harvest, summon don't
const DAMAGERS = new Set([...ATTACKERS, 'trap', 'mortar', 'vortex', 'pulse', 'orbit']);
const ON_HIT_ARCH = new Set([...DAMAGERS, 'wall']); // walls apply on-hit effects to whatever bites them
const ON_HIT = new Set(['burn', 'poison', 'slow', 'freeze', 'stun', 'pierce', 'chain', 'splash', 'crit', 'execute',
  'armorBreak', 'knockback', 'bounty', 'reveal']);

const pos = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0;
const frac = (x) => pos(x) && x <= 1;
const int1 = (x) => Number.isInteger(x) && x >= 1;

const EFFECT_CHECK = {
  burn: (e) => pos(e.dps) && pos(e.duration),
  poison: (e) => pos(e.dps) && pos(e.duration),
  slow: (e) => pos(e.factor) && e.factor < 1 && pos(e.duration),
  freeze: (e) => frac(e.chance) && pos(e.duration),
  stun: (e) => frac(e.chance) && pos(e.duration),
  pierce: (e) => int1(e.count),
  chain: (e) => int1(e.jumps) && frac(e.falloff),
  splash: (e) => pos(e.radius),
  crit: (e) => frac(e.chance) && pos(e.mult) && e.mult > 1,
  execute: (e) => pos(e.threshold) && e.threshold < 1,
  armorBreak: (e) => pos(e.amount) && pos(e.duration),
  knockback: (e) => pos(e.cells) && frac(e.chance),
  bounty: (e) => pos(e.mul) && e.mul > 1,
  reveal: () => true,
  heal: (e) => pos(e.hps),
  buff: (e) => ['damage', 'rate', 'range'].includes(e.stat) && pos(e.mul) && e.mul > 1,
  shield: (e) => pos(e.amount) && pos(e.interval),
  harvest: (e) => ['ink', 'tile'].includes(e.resource) && pos(e.amount) && pos(e.interval),
  summon: (e) => pos(e.hp) && pos(e.damage) && int1(e.count) && pos(e.interval),
  interest: (e) => frac(e.pct) && e.pct <= 0.2 && int1(e.cap),
};

function checkEffect(e, where) {
  if (!e || !EFFECT_TYPES.includes(e.type) || !EFFECT_CHECK[e.type]) return `${where}: bad effect type ${JSON.stringify(e)}`;
  if (!EFFECT_CHECK[e.type](e)) return `${where}: bad params ${JSON.stringify(e)}`;
  return null;
}

/** Returns an array of problems (empty if the spec satisfies the contract). */
export function validateSpec(s, word, scoreWord) {
  const p = [];
  const bad = (m) => p.push(`${word}: ${m}`);
  if (!s || typeof s !== 'object') return [`${word}: not an object`];
  if (s.word !== word) bad(`word ${s.word}`);
  if (!Array.isArray(s.pos) || !s.pos.length || !s.pos.every((x) => POS.includes(x))) bad(`pos ${s.pos}`);
  if (!ARCHETYPES.includes(s.archetype)) bad(`archetype ${s.archetype}`);
  if (!ELEMENTS.includes(s.element)) bad(`element ${s.element}`);
  if (!RARITIES.includes(s.rarity)) bad(`rarity ${s.rarity}`);
  if (s.score !== scoreWord(word)) bad(`score ${s.score}`);
  if (!Number.isInteger(s.cost) || s.cost <= 0) bad(`cost ${s.cost}`);
  const st = s.stats || {};
  for (const k of ['damage', 'rate', 'range', 'splash', 'projectileSpeed', 'hp']) {
    if (typeof st[k] !== 'number' || !Number.isFinite(st[k]) || st[k] < 0) bad(`stats.${k} ${st[k]}`);
  }
  for (const k of ['rate', 'range', 'projectileSpeed', 'hp']) if (!(st[k] > 0)) bad(`stats.${k} not positive`);
  const attacker = DAMAGERS.has(s.archetype);
  if (attacker && !(st.damage > 0)) bad('attacker without damage');
  if (!attacker && st.damage !== 0) bad('non-attacker with damage');
  if ((s.archetype === 'blast' || s.archetype === 'mortar') && !(st.splash > 0)) bad(`${s.archetype} without splash`);
  // v2 archetype-specific stats; extra keys appear only where they mean something
  const a = s.archetype;
  if (a === 'mortar' && !(st.minRange >= 1 && st.minRange <= st.range / 2)) bad(`mortar minRange ${st.minRange}`);
  if (a === 'vortex' && !(st.pull >= 0.3 && st.pull <= 1.2)) bad(`vortex pull ${st.pull}`);
  if (a === 'orbit' && !(Number.isInteger(st.orbs) && st.orbs >= 1 && st.orbs <= 4)) bad(`orbit orbs ${st.orbs}`);
  if ((a === 'wall' || a === 'trap') && !(st.range > 0 && st.range <= 1)) bad(`${a} contact range ${st.range}`);
  if (a !== 'mortar' && 'minRange' in st) bad('minRange on non-mortar');
  if (a !== 'vortex' && 'pull' in st) bad('pull on non-vortex');
  if (a !== 'orbit' && 'orbs' in st) bad('orbs on non-orbit');
  for (const k of ['minRange', 'pull', 'orbs']) if (k in st && !Number.isFinite(st[k])) bad(`stats.${k} ${st[k]}`);
  if (!Array.isArray(s.effects)) bad('effects not array');
  else {
    for (const e of s.effects) { const m = checkEffect(e, 'effect'); if (m) bad(m); }
    const types = s.effects.map((e) => e.type);
    if (ON_HIT_ARCH.has(s.archetype) && types.some((t) => !ON_HIT.has(t))) bad(`${s.archetype} with passive effect ${types}`);
    if (!ON_HIT_ARCH.has(s.archetype) && types.some((t) => ON_HIT.has(t))) bad(`${s.archetype} with on-hit effect ${types}`);
    if (s.archetype === 'chain' && !types.includes('chain')) bad('chain without chain effect');
    if (s.archetype === 'support' && !types.some((t) => ['heal', 'buff', 'shield'].includes(t))) bad('support without heal/buff/shield');
    if (s.archetype === 'harvest' && !types.includes('harvest')) bad('harvest without harvest effect');
    if (s.archetype === 'summon' && !types.includes('summon')) bad('summon without summon effect');
  }
  const augmentable = s.pos.some((x) => x !== 'noun');
  if (augmentable !== (s.augment != null)) bad(`augment presence mismatch (pos ${s.pos})`);
  if (s.augment) {
    const a = s.augment;
    if (!['verb', 'adjective'].includes(a.kind)) bad(`augment.kind ${a.kind}`);
    if (a.kind === 'verb' && !s.pos.includes('verb')) bad('verb augment without verb pos');
    if (!Number.isInteger(a.cost) || a.cost <= 0) bad(`augment.cost ${a.cost}`);
    for (const k of ['damage', 'rate', 'range', 'hp']) if (!pos(a.mods && a.mods[k])) bad(`augment.mods.${k}`);
    if (!Array.isArray(a.effects)) bad('augment.effects');
    else for (const e of a.effects) { const m = checkEffect(e, 'augment'); if (m) bad(m); }
    if (!(a.element === null || ELEMENTS.includes(a.element))) bad(`augment.element ${a.element}`);
  }
  if (!Array.isArray(s.tags) || !s.tags.length || !s.tags.every((t) => typeof t === 'string' && t === t.toLowerCase() && t)) bad(`tags ${s.tags}`);
  if (typeof s.glyph !== 'string' || !s.glyph.length || [...s.glyph].length > 2) bad(`glyph ${s.glyph}`);
  if (s.color !== ELEMENT_COLORS[s.element]) bad(`color ${s.color}`);
  if (typeof s.flavor !== 'string' || s.flavor.length < 10 || s.flavor.length > 160 || !s.flavor.endsWith('.')) bad(`flavor "${s.flavor}"`);
  if (!['lexicon', 'derived', 'procedural'].includes(s.source)) bad(`source ${s.source}`);
  return p;
}

/** Spec fingerprint excluding the word itself (for uniqueness). */
export function fingerprint(s) {
  const { word, flavor, tags, pos: _p, ...rest } = s;
  return JSON.stringify(rest);
}

export function dps(s) {
  return s.archetype === 'beam' || s.archetype === 'aura' ? s.stats.damage : s.stats.damage * s.stats.rate;
}

export const isAttacker = (s) => ATTACKERS.has(s.archetype);
export const isDamager = (s) => DAMAGERS.has(s.archetype);
