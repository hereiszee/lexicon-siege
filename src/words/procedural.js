// Procedural meaning for words the lexicon and derivation can't resolve: suffix-based part of
// speech, letter-composition leanings and Greek/Latin root hints, then hashed weighted picks.

import { makeRng } from '../core/rng.js';
import { ELEMENTS } from '../core/constants.js';

// ---------------------------------------------------------------- part of speech heuristics
const NOUN_SUF = ['tion', 'sion', 'ness', 'ment', 'ity', 'ism', 'ist', 'ship', 'hood', 'dom', 'ance', 'ence',
  'ology', 'graphy', 'itis', 'osis', 'ery', 'ary', 'ure', 'age', 'ian', 'eer', 'ster', 'cracy', 'phobia', 'mania',
  'scope', 'meter', 'gram', 'graph', 'phone', 'cide', 'ite', 'oid', 'ium', 'um', 'us', 'ics', 'tude', 'let', 'ling',
  'ette', 'ee', 'ess', 'or', 'er', 'ide', 'ine', 'ma', 'ia', 'ty'];
const ADJ_SUF = ['ous', 'ful', 'ive', 'able', 'ible', 'al', 'ic', 'ical', 'less', 'ish', 'ary', 'ory', 'ent',
  'ant', 'oid', 'esque', 'ine', 'ile', 'ular', 'ar', 'ose', 'y', 'some', 'ward', 'like', 'ed', 'est', 'ern'];
const VERB_SUF = ['ize', 'ise', 'ify', 'ate', 'en', 'esce', 'ing', 'ed'];

const ends = (w, list) => list.some((s) => w.length > s.length + 1 && w.endsWith(s));

/** Heuristic POS for words without curated meaning. Never empty. */
export function heuristicPos(w) {
  const out = new Set();
  if (w.length > 4 && w.endsWith('ly') && !w.endsWith('ply') && !w.endsWith('ally') && !w.endsWith('ily')) out.add('adverb');
  else if (w.length > 5 && (w.endsWith('ally') || w.endsWith('ily'))) out.add('adverb');
  if (w.length > 4 && w.endsWith('ing')) { out.add('verb'); out.add('noun'); out.add('adjective'); }
  if (w.length > 4 && w.endsWith('ed') && !w.endsWith('eed')) { out.add('verb'); out.add('adjective'); }
  if (ends(w, ['ize', 'ise', 'ify', 'esce'])) out.add('verb');
  if (w.length > 5 && w.endsWith('ate')) { out.add('verb'); out.add('adjective'); }
  if (w.length > 5 && w.endsWith('en') && !w.endsWith('men') && !w.endsWith('een')) { out.add('verb'); out.add('adjective'); }
  if (ends(w, ['ous', 'ful', 'ive', 'able', 'ible', 'ical', 'less', 'ish', 'esque', 'ular', 'some', 'ose', 'ant', 'ent']) ||
      (w.length > 4 && /[^aeiou]ic$/.test(w)) || (w.length > 4 && /[^aeiou]al$/.test(w)) ||
      (w.length > 5 && w.endsWith('ory')) || (w.length > 4 && /[^aeiouy][^aeiouy]y$/.test(w) && !w.endsWith('ly'))) {
    out.add('adjective');
  }
  if (out.size === 0 || ends(w, NOUN_SUF) || ends(w, ['ant', 'ent', 'ic', 'al', 'ive', 'ate', 'ing'])) out.add('noun');
  if (out.has('adverb') && out.size > 1 && !w.endsWith('ly')) out.delete('adverb');
  if (/[^a]lly$/.test(w)) out.add('noun'); // jelly, holly, gully
  return ['noun', 'verb', 'adjective', 'adverb'].filter((p) => out.has(p));
}

// ---------------------------------------------------------------- letter features
const LETTER_ELEM = {
  a: { light: 0.3, water: 0.3 }, b: { earth: 0.5 }, c: { ice: 0.5, metal: 0.2 }, d: { earth: 0.4, shadow: 0.2 },
  e: { light: 0.3, arcane: 0.2 }, f: { fire: 0.8 }, g: { earth: 0.4, nature: 0.3 }, h: { fire: 0.3, storm: 0.3 },
  i: { ice: 0.5 }, j: { arcane: 0.7 }, k: { metal: 0.5, ice: 0.2 }, l: { nature: 0.4, water: 0.3 },
  m: { earth: 0.3, shadow: 0.3 }, n: { shadow: 0.4 }, o: { water: 0.3, shadow: 0.2 }, p: { fire: 0.2, metal: 0.3 },
  q: { arcane: 0.8 }, r: { fire: 0.4, earth: 0.2 }, s: { storm: 0.4, water: 0.3 }, t: { metal: 0.5 },
  u: { shadow: 0.3, water: 0.2 }, v: { nature: 0.4, arcane: 0.2 }, w: { storm: 0.4, water: 0.4 },
  x: { storm: 0.4, arcane: 0.3 }, y: { light: 0.4, arcane: 0.2 }, z: { storm: 0.8 },
};

export function letterFeatures(w) {
  const L = w.length || 1;
  let vowels = 0, sib = 0, plos = 0, rare = 0, doubles = 0, run = 0, maxRun = 0;
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const v = 'aeiou'.includes(c);
    if (v) { vowels++; run = 0; } else { run++; if (run > maxRun) maxRun = run; }
    if ('szx'.includes(c)) sib++;
    if ('bdgkpt'.includes(c)) plos++;
    if ('jqxz'.includes(c)) rare++;
    if (i > 0 && w[i - 1] === c) doubles++;
  }
  if (w.includes('sh')) sib++;
  return { L, vowelRatio: vowels / L, sibRatio: sib / L, plosRatio: plos / L, rare, doubles, maxRun };
}

// ---------------------------------------------------------------- root hints (Greek/Latin & English)
// [substring, element|null, archetype hint|null, effect hint|null, tags]
const ROOT_HINTS = [
  ['pyr', 'fire', null, 'burn', 'fire'], ['flam', 'fire', null, 'burn', 'fire'], ['therm', 'fire', 'aura', 'burn', 'heat'],
  ['igni', 'fire', null, 'burn', 'fire'], ['calor', 'fire', 'aura', 'burn', 'heat'], ['burn', 'fire', null, 'burn', 'fire'],
  ['fire', 'fire', null, 'burn', 'fire'], ['blaz', 'fire', null, 'burn', 'fire'], ['scorch', 'fire', null, 'burn', 'fire'],
  ['cryo', 'ice', null, 'freeze', 'ice cold'], ['frig', 'ice', 'aura', 'slow', 'cold'], ['glaci', 'ice', null, 'slow', 'ice cold'],
  ['frost', 'ice', null, 'slow', 'ice cold'], ['chill', 'ice', null, 'slow', 'cold'], ['snow', 'ice', null, 'slow', 'ice'],
  ['hiem', 'ice', null, 'slow', 'cold'], ['gelat', 'ice', null, 'slow', 'cold'],
  ['hydr', 'water', null, 'slow', 'water'], ['aqu', 'water', null, 'slow', 'water'], ['mari', 'water', null, 'knockback', 'sea'],
  ['naut', 'water', 'summon', null, 'sea'], ['pelag', 'water', null, 'slow', 'sea'], ['thalass', 'water', null, 'slow', 'sea'],
  ['fluvi', 'water', 'beam', 'slow', 'water'], ['ocean', 'water', 'aura', 'slow', 'sea'], ['wave', 'water', 'blast', 'knockback', 'water'],
  ['rain', 'water', 'aura', 'slow', 'weather'], ['limn', 'water', null, null, 'water'],
  ['geo', 'earth', null, 'knockback', 'earth'], ['lith', 'earth', 'blast', 'stun', 'stone'], ['petr', 'earth', null, 'stun', 'stone'],
  ['terra', 'earth', null, 'knockback', 'earth'], ['rock', 'earth', 'blast', 'knockback', 'stone'], ['stone', 'earth', 'blast', 'stun', 'stone'],
  ['lapid', 'earth', null, null, 'stone'], ['oro', 'earth', 'snipe', null, 'mountain'], ['seism', 'earth', 'pulse', 'stun', 'earth'],
  ['ferr', 'metal', null, 'armorBreak', 'metal'], ['metal', 'metal', null, 'armorBreak', 'metal'], ['chalc', 'metal', null, null, 'metal'],
  ['argent', 'metal', 'harvest', null, 'treasure'], ['plumb', 'metal', null, 'slow', 'metal'], ['steel', 'metal', null, 'pierce', 'metal'],
  ['iron', 'metal', null, 'armorBreak', 'metal'], ['cupr', 'metal', null, null, 'metal'], ['mechan', 'metal', null, 'crit', 'machine'],
  ['electr', 'storm', 'chain', 'stun', 'lightning'], ['fulm', 'storm', 'chain', 'stun', 'lightning'], ['volt', 'storm', 'chain', 'stun', 'lightning'],
  ['tonitr', 'storm', 'pulse', 'stun', 'storm'], ['aer', 'storm', 'snipe', null, 'sky'], ['anem', 'storm', 'rapid', 'knockback', 'wind'],
  ['storm', 'storm', 'chain', 'stun', 'storm'], ['thund', 'storm', 'chain', 'stun', 'storm'], ['baro', 'storm', null, null, 'weather'],
  ['meteor', 'fire', 'mortar', 'burn', 'sky'], ['wind', 'storm', 'rapid', 'knockback', 'wind'],
  ['phot', 'light', 'beam', 'reveal', 'light'], ['luc', 'light', null, 'reveal', 'light'], ['lumin', 'light', 'beam', 'reveal', 'light'],
  ['helio', 'light', 'beam', 'burn', 'sun'], ['solar', 'light', 'beam', 'burn', 'sun'], ['radia', 'light', 'aura', null, 'light'],
  ['candesc', 'light', 'beam', 'burn', 'light'], ['gleam', 'light', null, 'reveal', 'light'], ['bright', 'light', null, 'reveal', 'light'],
  ['glow', 'light', 'aura', 'reveal', 'light'], ['shine', 'light', null, 'reveal', 'light'], ['holy', 'light', 'support', null, 'holy'],
  ['sanct', 'light', 'support', 'heal', 'holy'], ['bened', 'light', 'support', 'buff', 'holy'], ['angel', 'light', 'summon', null, 'holy'],
  ['umbr', 'shadow', null, 'slow', 'dark'], ['noct', 'shadow', null, 'reveal', 'night'], ['necr', 'shadow', 'summon', 'execute', 'death'],
  ['tenebr', 'shadow', 'aura', 'slow', 'dark'], ['nigr', 'shadow', null, null, 'dark'], ['obscur', 'shadow', 'aura', 'slow', 'dark'],
  ['dark', 'shadow', null, 'execute', 'dark'], ['shad', 'shadow', null, 'slow', 'dark'], ['gloom', 'shadow', 'aura', 'slow', 'dark'],
  ['mort', 'shadow', null, 'execute', 'death'], ['thanat', 'shadow', null, 'execute', 'death'], ['murk', 'shadow', 'aura', 'slow', 'dark'],
  ['cide', 'shadow', null, 'execute', 'death'], ['cidal', 'shadow', null, 'execute', 'death'], ['death', 'shadow', null, 'execute', 'death'],
  ['dead', 'shadow', null, 'execute', 'death'], ['kill', 'shadow', null, 'execute', 'death'], ['demon', 'shadow', 'blast', 'burn', 'demon'],
  ['myst', 'arcane', null, 'crit', 'magic'], ['magi', 'arcane', null, 'crit', 'magic'], ['occult', 'arcane', null, 'execute', 'magic'],
  ['arcan', 'arcane', null, 'crit', 'magic'], ['sorc', 'arcane', 'chain', null, 'magic'], ['theur', 'arcane', 'support', 'buff', 'magic'],
  ['mancy', 'arcane', 'chain', null, 'magic'], ['psych', 'arcane', 'aura', 'stun', 'mind'], ['astro', 'arcane', 'snipe', null, 'cosmos'],
  ['astra', 'arcane', 'snipe', null, 'cosmos'], ['cosm', 'arcane', 'aura', null, 'cosmos'], ['chron', 'arcane', 'aura', 'slow', 'time'],
  ['spell', 'arcane', 'chain', null, 'magic'], ['rune', 'arcane', null, 'crit', 'magic'], ['ench', 'arcane', null, 'slow', 'magic'],
  ['quant', 'arcane', 'chain', null, 'science'], ['nucle', 'fire', 'blast', 'burn', 'science'], ['atom', 'arcane', 'blast', null, 'science'],
  ['bio', 'nature', null, 'poison', 'life'], ['phyt', 'nature', null, 'poison', 'plant'], ['botan', 'nature', null, null, 'plant'],
  ['herb', 'nature', 'support', 'heal', 'plant'], ['flor', 'nature', 'support', 'heal', 'plant'], ['zoo', 'nature', 'summon', null, 'animal'],
  ['sylv', 'nature', null, 'slow', 'forest'], ['dendr', 'nature', null, 'slow', 'forest'], ['arbor', 'nature', 'support', 'shield', 'forest'],
  ['agri', 'nature', 'harvest', null, 'farm'], ['agro', 'nature', 'harvest', null, 'farm'], ['ornith', 'nature', 'rapid', null, 'bird'],
  ['entom', 'nature', 'summon', 'poison', 'insect'], ['ichthy', 'water', 'rapid', null, 'fish'], ['myco', 'nature', 'aura', 'poison', 'fungus'],
  ['fung', 'nature', 'aura', 'poison', 'fungus'], ['leaf', 'nature', null, 'heal', 'plant'], ['root', 'nature', null, 'slow', 'plant'],
  ['tox', 'nature', null, 'poison', 'poison'], ['venom', 'nature', null, 'poison', 'poison'], ['path', 'shadow', 'aura', 'poison', 'disease'],
  ['virul', 'nature', 'aura', 'poison', 'disease'], ['sept', 'nature', null, 'poison', 'disease'], ['plague', 'shadow', 'aura', 'poison', 'disease'],
  ['medic', 'light', 'support', 'heal', 'medical'], ['therap', 'water', 'support', 'heal', 'medical'], ['sanat', 'light', 'support', 'heal', 'medical'],
  ['cura', 'light', 'support', 'heal', 'medical'], ['salub', 'water', 'support', 'heal', 'medical'], ['heal', 'light', 'support', 'heal', 'medical'],
  ['pharm', 'water', 'support', 'heal', 'medical'], ['surg', 'light', 'support', 'heal', 'medical'], ['nurs', 'light', 'support', 'heal', 'medical'],
  ['graph', 'arcane', 'harvest', 'tile', 'writing'], ['scrib', 'arcane', 'harvest', 'tile', 'writing'], ['scrip', 'arcane', 'harvest', 'tile', 'writing'],
  ['lexi', 'arcane', 'harvest', 'tile', 'writing'], ['logy', 'arcane', 'harvest', 'tile', 'scholar'], ['gram', 'arcane', 'harvest', 'tile', 'writing'],
  ['biblio', 'arcane', 'harvest', 'tile', 'writing'], ['litera', 'arcane', 'harvest', 'tile', 'writing'], ['lingu', 'arcane', 'harvest', 'tile', 'writing'],
  ['verb', 'arcane', 'harvest', 'tile', 'writing'], ['schol', 'arcane', 'harvest', 'tile', 'scholar'], ['sophy', 'arcane', 'harvest', 'tile', 'scholar'],
  ['merc', 'metal', 'harvest', 'ink', 'money'], ['pecun', 'metal', 'harvest', 'ink', 'money'], ['fisc', 'metal', 'harvest', 'ink', 'money'],
  ['numis', 'metal', 'harvest', 'ink', 'money'], ['commerc', 'metal', 'harvest', 'ink', 'money'], ['money', 'metal', 'harvest', 'ink', 'money'],
  ['gold', 'light', 'harvest', 'ink', 'treasure'], ['aur', 'light', null, null, 'gold'], ['trade', 'metal', 'harvest', 'ink', 'money'],
  ['milit', 'metal', 'summon', null, 'military'], ['legion', 'metal', 'summon', null, 'military'], ['soldi', 'metal', 'summon', null, 'military'],
  ['army', 'metal', 'summon', null, 'military'], ['war', 'fire', null, 'crit', 'war'], ['bellum', 'storm', null, null, 'war'],
  ['regal', 'light', 'support', 'buff', 'royal'], ['regn', 'light', 'support', 'buff', 'royal'], ['royal', 'light', 'support', 'buff', 'royal'],
  ['tele', 'storm', 'snipe', null, 'far'], ['scop', 'light', 'snipe', 'reveal', 'sight'], ['vis', 'light', 'snipe', 'reveal', 'sight'],
  ['opti', 'light', 'snipe', 'reveal', 'sight'], ['phon', 'storm', 'pulse', 'stun', 'sound'], ['acous', 'storm', 'pulse', 'stun', 'sound'],
  ['audi', 'storm', 'pulse', 'stun', 'sound'], ['sonic', 'storm', 'pulse', 'stun', 'sound'], ['kine', 'storm', 'rapid', null, 'motion'],
  ['dyna', 'storm', 'blast', 'knockback', 'power'], ['dromo', 'storm', 'rapid', null, 'speed'], ['tach', 'storm', 'rapid', null, 'speed'],
  ['mega', 'earth', 'blast', 'splash', 'big'], ['giga', 'earth', 'blast', 'splash', 'big'], ['macro', 'earth', 'blast', 'splash', 'big'],
  ['micro', 'arcane', 'rapid', null, 'small'], ['nano', 'metal', 'rapid', null, 'small'], ['hemo', 'nature', 'support', 'heal', 'blood'],
  ['haem', 'nature', 'support', 'heal', 'blood'], ['sangu', 'shadow', null, 'execute', 'blood'], ['blood', 'shadow', null, 'execute', 'blood'],
  ['crypt', 'shadow', null, 'execute', 'dark'], ['phant', 'shadow', 'snipe', 'slow', 'ghost'], ['spectr', 'arcane', 'beam', null, 'ghost'],
  ['ghost', 'shadow', 'snipe', 'slow', 'ghost'], ['sacr', 'light', 'support', 'heal', 'holy'], ['vulcan', 'fire', 'blast', 'burn', 'volcano'],
  ['lava', 'fire', 'aura', 'burn', 'volcano'], ['magma', 'fire', 'aura', 'burn', 'volcano'], ['crystal', 'ice', 'snipe', 'crit', 'gem'],
  ['gem', 'light', 'snipe', 'crit', 'gem'], ['ship', 'water', 'summon', null, 'sea'], ['saur', 'earth', 'blast', 'knockback', 'beast'],
  ['ped', 'earth', 'rapid', null, 'body'], ['cephal', 'arcane', 'harvest', 'tile', 'mind'], ['neur', 'storm', 'chain', null, 'mind'],
  ['card', 'nature', 'support', 'heal', 'body'], ['derm', 'earth', 'support', 'shield', 'body'], ['oste', 'earth', 'support', 'shield', 'bone'],
  ['dent', 'metal', 'rapid', 'crit', 'tooth'], ['ortho', 'light', 'support', 'heal', 'medical'], ['ophth', 'light', 'snipe', 'reveal', 'sight'],
  ['chrom', 'light', 'chain', null, 'color'], ['prism', 'light', 'chain', null, 'light'], ['hypn', 'arcane', 'aura', 'stun', 'sleep'],
  ['somn', 'arcane', 'aura', 'slow', 'sleep'], ['dorm', 'arcane', 'aura', 'slow', 'sleep'],
  // v2 kinds
  ['mur', 'earth', 'wall', null, 'wall'], ['vall', 'earth', 'wall', null, 'wall'], ['fort', 'earth', 'wall', null, 'wall'],
  ['barr', 'metal', 'wall', null, 'wall'], ['block', 'earth', 'wall', null, 'wall'], ['fenc', 'nature', 'wall', null, 'wall'],
  ['gate', 'metal', 'wall', null, 'wall'], ['door', 'earth', 'wall', null, 'wall'], ['brick', 'earth', 'wall', null, 'stone'],
  ['trap', 'metal', 'trap', 'stun', 'trap'], ['snar', 'metal', 'trap', 'stun', 'trap'], ['laque', 'metal', 'trap', 'slow', 'trap'],
  ['spik', 'metal', 'trap', 'armorBreak', 'trap'], ['mine', 'fire', 'trap', 'burn', 'trap'], ['pit', 'earth', 'trap', 'stun', 'trap'],
  ['ballist', 'earth', 'mortar', null, 'siege'], ['bomb', 'fire', 'mortar', 'burn', 'siege'], ['artill', 'earth', 'mortar', null, 'siege'],
  ['catapult', 'earth', 'mortar', null, 'siege'], ['lob', 'earth', 'mortar', null, 'siege'], ['rocket', 'fire', 'mortar', 'burn', 'sky'],
  ['vort', 'storm', 'vortex', null, 'vortex'], ['gyr', 'storm', 'vortex', null, 'vortex'], ['whirl', 'water', 'vortex', 'slow', 'vortex'],
  ['grav', 'arcane', 'vortex', 'slow', 'gravity'], ['magnet', 'metal', 'vortex', 'slow', 'gravity'], ['tract', 'metal', 'vortex', null, 'pull'],
  ['suct', 'water', 'vortex', null, 'pull'], ['siphon', 'water', 'vortex', null, 'pull'], ['cyclon', 'storm', 'vortex', null, 'vortex'],
  ['puls', 'storm', 'pulse', 'stun', 'sound'], ['pound', 'earth', 'pulse', 'stun', 'earth'], ['boom', 'storm', 'pulse', 'stun', 'sound'],
  ['tremo', 'earth', 'pulse', 'stun', 'earth'], ['quak', 'earth', 'pulse', 'stun', 'earth'], ['bell', 'metal', 'pulse', 'stun', 'sound'],
  ['orb', 'arcane', 'orbit', null, 'orbit'], ['rota', 'metal', 'orbit', null, 'spin'], ['rotor', 'metal', 'orbit', null, 'spin'],
  ['cycl', 'storm', 'orbit', null, 'spin'], ['circ', 'light', 'orbit', null, 'spin'], ['spher', 'arcane', 'orbit', null, 'orbit'],
  ['lun', 'light', 'orbit', 'crit', 'moon'], ['spin', 'storm', 'orbit', null, 'spin'], ['wheel', 'metal', 'orbit', null, 'spin'],
].map(([s, e, a, fx, tags]) => ({ s, e, a, fx, tags: tags.split(' ') }));

export function rootHints(w) {
  const out = [];
  for (const h of ROOT_HINTS) if (w.length >= h.s.length && w.includes(h.s)) out.push(h);
  return out;
}

// ---------------------------------------------------------------- picking
const BASE_ARCH = { bolt: 8, blast: 8, snipe: 7, rapid: 8, beam: 8, chain: 7, aura: 7, support: 3, harvest: 5, summon: 6,
  wall: 5, trap: 6, mortar: 5, vortex: 5, pulse: 6, orbit: 6 };

const ELEM_FX = {
  fire: [['burn', 3], ['splash', 1], ['crit', 0.5]],
  ice: [['slow', 3], ['freeze', 2]],
  nature: [['poison', 3], ['slow', 1], ['pierce', 0.5]],
  metal: [['armorBreak', 2], ['pierce', 2], ['crit', 1]],
  storm: [['stun', 2], ['chain', 1.5], ['knockback', 1]],
  earth: [['knockback', 2], ['stun', 1], ['armorBreak', 1], ['splash', 0.7]],
  light: [['reveal', 2], ['crit', 1.5], ['stun', 0.5], ['burn', 0.5]],
  shadow: [['execute', 1.5], ['poison', 1], ['slow', 1], ['reveal', 0.5]],
  arcane: [['crit', 1], ['slow', 1], ['bounty', 1], ['chain', 0.7], ['freeze', 0.5]],
  water: [['slow', 2], ['knockback', 1.5], ['splash', 0.5]],
};

const SUPPORT_FX = {
  fire: [['buff.damage', 3], ['heal', 1], ['shield', 0.5]], ice: [['shield', 3], ['heal', 1]],
  nature: [['heal', 3], ['shield', 1], ['buff.rate', 1]], metal: [['shield', 2], ['buff.damage', 2]],
  storm: [['buff.rate', 3], ['buff.range', 1]], earth: [['shield', 3], ['heal', 1]],
  light: [['heal', 3], ['buff.range', 1.5], ['buff.damage', 1]], shadow: [['buff.damage', 2], ['buff.range', 1.5], ['shield', 1]],
  arcane: [['buff.range', 2], ['buff.rate', 1.5], ['heal', 1]], water: [['heal', 3], ['shield', 1], ['buff.rate', 1]],
};

const ELEM_ADJ = {
  fire: ['fiery', 'blazing', 'ember'], ice: ['frost', 'frozen', 'icy'], nature: ['thorned', 'verdant', 'wild'],
  metal: ['iron', 'steel', 'brass'], storm: ['crackling', 'thunder', 'gale'], earth: ['stone', 'granite', 'earthen'],
  light: ['radiant', 'golden', 'gleaming'], shadow: ['shadow', 'dusky', 'umbral'], arcane: ['arcane', 'eldritch', 'runic'],
  water: ['tidal', 'briny', 'rippling'],
};

export const ELEM_GLYPHS = {
  fire: ['🔥', '♨', '☄'], ice: ['❄', '❅', '❆'], nature: ['❦', '☘', '❧'], metal: ['⚙', '⛓', '✠'],
  storm: ['ϟ', '☈', '⚡'], earth: ['⛰', '◆', '▲'], light: ['☀', '✦', '✧'], shadow: ['☾', '◐', '✶'],
  arcane: ['✺', '⚝', '❂'], water: ['≈', '♒', '◌'],
};

const ARCH_PHRASES = {
  bolt: ['Fires % bolts at the lead foe', 'Flings % darts', 'Looses % shots down the line'],
  blast: ['Lobs exploding % shells', 'Hurls % bombs that burst on impact', 'Pounds the path with % blasts'],
  snipe: ['Picks off distant foes with % shots', 'Snipes from afar with % lances'],
  rapid: ['Sprays rapid % shards', 'Peppers foes with quick % pellets'],
  beam: ['Focuses a steady % beam', 'Pours a % ray into one foe'],
  chain: ['Arcs % energy between foes', 'Sends % sparks leaping foe to foe'],
  aura: ['Radiates % harm at every nearby foe', 'Wraps nearby foes in % force'],
  support: { heal: 'Mends nearby towers with % warmth', buff: 'Rallies nearby towers with % zeal', shield: 'Wards nearby towers with % barriers' },
  harvest: { ink: 'Distills % ink from thin air', tile: 'Conjures fresh letter tiles from % runes' },
  summon: ['Calls % defenders onto the path', 'Musters % sentinels on the path'],
  wall: ['Raises a % wall across the path', 'Bars the path with % masonry', 'Plants a % bulwark in the way'],
  trap: ['Hides a % snare in the path', 'Sets a % trap that springs underfoot', 'Lays a % pit for passing foes'],
  mortar: ['Lobs % shells over the path', 'Arcs % bombs onto distant foes', 'Rains % payloads from afar'],
  vortex: ['Churns a % vortex that drags foes back', 'Hauls foes backward with a % pull', 'Spins a % eddy that reels foes in'],
  pulse: ['Throbs with % shockwaves', 'Booms out rings of % force', 'Pounds the ground with % pulses'],
  orbit: ['Circles itself with % orbs', 'Spins % motes in a tight ring', 'Whirls % shards around itself'],
};

export function archPhrase(arch, elem, fxType, sub, rng) {
  const adj = rng.pick(ELEM_ADJ[elem]);
  let t = ARCH_PHRASES[arch];
  if (arch === 'support') t = t[fxType] || t.buff;
  else if (arch === 'harvest') t = t[sub === 'tile' ? 'tile' : 'ink'];
  else t = rng.pick(t);
  return t.replace('%', adj).replace(/\ba ([aeiou])/g, 'an $1');
}

function weightedPick(rng, obj) {
  return rng.weighted(Object.entries(obj));
}

/**
 * Build a procedural template for w. Returns a template in the same normalized form as lexicon
 * concepts: { id, arch, elem, fx, tags, glyph, phrase, mods, conv, kind }.
 */
export function proceduralTemplate(w, pos, seed) {
  const rng = makeRng(seed ^ 0x5bd1e995);
  const ft = letterFeatures(w);
  const hints = rootHints(w);

  // element leanings from letters
  const ew = {};
  for (const e of ELEMENTS) ew[e] = 1;
  for (const c of w) {
    const m = LETTER_ELEM[c];
    if (m) for (const k in m) ew[k] += (3 * m[k]) / ft.L;
  }
  if (ft.maxRun >= 3) { ew.earth += 0.6; ew.metal += 0.6; }
  if (ft.sibRatio > 0.25) { ew.storm += 0.8; ew.water += 0.8; }
  if (ft.vowelRatio > 0.5) { ew.arcane += 0.5; ew.light += 0.5; ew.water += 0.4; }
  if (ft.rare > 0) { ew.arcane += 0.4 * ft.rare; ew.storm += 0.3 * ft.rare; }
  for (const k in ew) ew[k] = Math.pow(ew[k], 2.2);

  const hint = hints.length ? hints[hints.length - 1] : null;
  let elem = hint && hint.e && rng.chance(0.85) ? hint.e : weightedPick(rng, ew);

  // archetype leanings
  const aw = { ...BASE_ARCH };
  if (ft.L >= 10) { aw.snipe += 5; aw.beam += 4; }
  if (ft.L <= 4) { aw.rapid += 3; aw.bolt += 2; aw.trap += 2; aw.pulse += 2; aw.snipe -= 4; aw.mortar -= 3; }
  if (ft.L >= 8) { aw.mortar += 3; aw.vortex += 2; }
  if (ft.doubles > 0) { aw.rapid += 2 * ft.doubles; aw.orbit += 2 * ft.doubles; }
  const os = (w.match(/o/g) || []).length;
  if (os >= 2) aw.orbit += 3 * os;                               // round letters → orbs
  if (ft.maxRun >= 3) aw.wall += 4;                              // consonant clusters stack like bricks
  if (/^(sw|wh|tw|wr)|(irl|url|wl)/.test(w)) aw.vortex += 6;     // swirly sounds
  if (/(ump|oom|ong|ash|ang|um)$/.test(w)) aw.pulse += 6;        // booming endings
  if (ft.rare > 0) aw.chain += 4 * ft.rare;
  if (ft.plosRatio > 0.3) aw.blast += 6;
  if (ft.vowelRatio > 0.5) { aw.aura += 4; aw.support += 3; }
  if (pos.includes('adjective')) { aw.aura += 3; aw.beam += 2; }
  if (pos.includes('verb')) { aw.chain += 2; aw.bolt += 2; }
  if (/(er|or|ist|ian|eer|ant|man|men)$/.test(w) && w.length > 4) aw.summon += 8;
  if (/(ness|ity|ism|ment|ance|ence|tion|sion|hood|dom|ship)$/.test(w)) { aw.aura += 4; aw.support += 2; aw.pulse += 2; }
  if (/(logy|graph|graphy|ics|scope|meter|gram)$/.test(w)) aw.harvest += 10;
  if (/(age|ery|ary|ory|ure)$/.test(w)) aw.harvest += 3;
  if (hint && hint.a && rng.chance(0.7)) aw[hint.a] += 40;
  for (const k in aw) if (aw[k] < 1) aw[k] = 1;
  const arch = weightedPick(rng, aw);

  // effects
  const fx = [];
  let primaryType = null, sub = null;
  if (arch === 'support') {
    const pool = Object.fromEntries(SUPPORT_FX[elem]);
    if (hint && hint.fx === 'heal') pool.heal = (pool.heal || 0) + 6;
    const pick = weightedPick(rng, pool);
    const [t, s] = pick.split('.');
    fx.push({ type: t, sub: s || null, mult: rng.float(0.85, 1.1) });
    primaryType = t;
  } else if (arch === 'harvest') {
    sub = (hint && hint.fx === 'tile') || (hint && hint.fx !== 'ink' && rng.chance(0.25)) || (!hint && rng.chance(0.22)) ? 'tile' : 'ink';
    fx.push({ type: 'harvest', sub, mult: rng.float(0.9, 1.05) });
  } else if (arch === 'summon') {
    fx.push({ type: 'summon', sub: null, mult: rng.float(0.85, 1.1) });
  } else if (arch === 'wall') {
    if (rng.chance(0.35)) fx.push({ type: rng.weighted(ELEM_FX[elem]), sub: null, mult: rng.float(0.5, 0.8) }); // thorny walls
  } else {
    const roll = rng.next();
    const n = roll < 0.25 ? 0 : roll < 0.8 ? 1 : 2;
    const pool = ELEM_FX[elem].slice();
    if (hint && hint.fx && !['heal', 'tile', 'ink', 'buff', 'shield'].includes(hint.fx)) pool.push([hint.fx, 5]);
    const used = new Set();
    for (let i = 0; i < n + (hint && hint.fx && n === 0 ? 1 : 0); i++) {
      const t = rng.weighted(pool);
      if (used.has(t) || (arch === 'blast' && t === 'splash')) continue;
      used.add(t);
      fx.push({ type: t, sub: null, mult: rng.float(0.75, 1.1) });
    }
  }

  // augment template for verbs/adjectives
  let mods = null;
  const augFx = [];
  if (pos.includes('adjective') || pos.includes('adverb')) {
    const keys = ['damage', 'rate', 'range', 'hp'];
    const w1 = rng.pick(keys);
    let w2 = rng.pick(keys);
    if (w2 === w1) w2 = keys[(keys.indexOf(w1) + 1) % 4];
    mods = { [w1]: 1 + rng.float(0.12, 0.22), [w2]: 1 + rng.float(0.04, 0.1) };
    if (rng.chance(0.3)) augFx.push({ type: rng.weighted(ELEM_FX[elem]), sub: null, mult: 0.8 });
  } else if (pos.includes('verb')) {
    augFx.push({ type: rng.weighted(ELEM_FX[elem]), sub: null, mult: rng.float(0.8, 1) });
    mods = { damage: 1 + rng.float(0.02, 0.08) };
  }

  const tags = new Set([elem]);
  for (const h of hints) for (const t of h.tags) tags.add(t);

  return {
    id: 'proc',
    arch,
    elem,
    fx,
    tags: [...tags],
    glyph: rng.pick(ELEM_GLYPHS[elem]),
    phrase: archPhrase(arch, elem, primaryType, sub, rng),
    mods,
    augFx,
    conv: rng.chance(pos.includes('adjective') ? 0.3 : 0.2),
    kind: null,
    stat: null,
  };
}
