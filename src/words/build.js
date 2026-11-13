// TowerSpec construction from a resolved meaning + the word's own length/letters/hash.

import { ELEMENT_COLORS, OPPOSITE, LETTER_VALUES } from '../core/constants.js';
import { makeRng, hashString } from '../core/rng.js';
import { makeEffect, describeEffect, ON_HIT, r2, r1 } from './effects.js';
import { TWISTS } from './derive.js';
import { archPhrase, ELEM_GLYPHS } from './procedural.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function scoreWord(word) {
  let s = 0;
  const w = String(word == null ? '' : word).toLowerCase();
  for (let i = 0; i < w.length; i++) s += LETTER_VALUES[w[i]] || 0;
  return s;
}

/** Per-archetype base stats at power 1 (a common 3-letter word). damage is DPS for beam/aura. */
export const ARCH_BASE = {
  bolt: { damage: 6, rate: 1, range: 2.5, splash: 0, projectileSpeed: 8, hp: 60, cost: 1 },
  blast: { damage: 10, rate: 0.55, range: 2.3, splash: 0.9, projectileSpeed: 6, hp: 65, cost: 1.12 },
  snipe: { damage: 20, rate: 0.3, range: 4.5, splash: 0, projectileSpeed: 30, hp: 50, cost: 1.08 },
  rapid: { damage: 2.2, rate: 2.9, range: 2.2, splash: 0, projectileSpeed: 12, hp: 55, cost: 1 },
  beam: { damage: 5.6, rate: 1, range: 2.2, splash: 0, projectileSpeed: 40, hp: 60, cost: 1.04 },
  chain: { damage: 5.5, rate: 0.85, range: 2.5, splash: 0, projectileSpeed: 14, hp: 55, cost: 1.12 },
  aura: { damage: 3.2, rate: 1, range: 1.6, splash: 0, projectileSpeed: 10, hp: 75, cost: 1.06 },
  support: { damage: 0, rate: 1, range: 2, splash: 0, projectileSpeed: 10, hp: 70, cost: 1.05 },
  harvest: { damage: 0, rate: 1, range: 1, splash: 0, projectileSpeed: 10, hp: 50, cost: 1 },
  summon: { damage: 0, rate: 1, range: 1.8, splash: 0, projectileSpeed: 10, hp: 65, cost: 1.08 },
  // v2. wall: no attack, ≈4× a bolt's hp; range = contact radius. trap: damage per trigger, rate = rearms/s,
  // range = fixed 0.6 trigger radius. mortar: minRange + big splash. vortex: damage is DPS + pull.
  // pulse: damage per shockwave. orbit: damage per orb touch, range = orbit radius, orbs 1–4.
  wall: { damage: 0, rate: 1, range: 0.5, splash: 0, projectileSpeed: 10, hp: 240, cost: 1.1 },
  trap: { damage: 16, rate: 0.4, range: 0.6, splash: 0, projectileSpeed: 10, hp: 80, cost: 1.05 },
  mortar: { damage: 12, rate: 0.3, range: 5, splash: 1.2, projectileSpeed: 4, hp: 60, cost: 1.15, minRange: 1.5 },
  vortex: { damage: 1.6, rate: 1, range: 1.8, splash: 0, projectileSpeed: 10, hp: 70, cost: 1.2, pull: 0.6 },
  pulse: { damage: 7, rate: 0.45, range: 1.7, splash: 0, projectileSpeed: 10, hp: 75, cost: 1.08 },
  orbit: { damage: 5, rate: 1, range: 1.2, splash: 0, projectileSpeed: 10, hp: 65, cost: 1.06 },
};
/** Archetypes that deal damage (stats.damage > 0) and carry on-hit effects. */
export const ATTACKERS = new Set(['bolt', 'blast', 'snipe', 'rapid', 'beam', 'chain', 'aura', 'trap', 'mortar', 'vortex', 'pulse', 'orbit']);
/** Archetypes whose effects are on-hit (walls apply theirs to whatever bites them). */
const ON_HIT_ARCH = new Set([...ATTACKERS, 'wall']);
/** Placed on the path: their reach is a fixed contact radius, not a stat that scales. */
const FIXED_RANGE = new Set(['wall', 'trap']);

export function lengthFactor(L) {
  return Math.max(0.5, 1 + 0.375 * (Math.min(L, 20) - 3));
}
export function scoreFactor(L, score) {
  return clamp(1 + 0.035 * (score - 1.7 * Math.min(L, 20)), 0.85, 1.5);
}
export function rarityOf(L, score) {
  const v = 0.6 * L + 0.35 * score;
  return v < 6.5 ? 'common' : v < 8.3 ? 'uncommon' : v < 9.6 ? 'rare' : v < 11 ? 'epic' : 'legendary';
}

function composeTwists(list) {
  const t = { power: 1, cost: 1, rate: 1, range: 1, hp: 1, invert: false };
  for (const id of list) {
    const tw = TWISTS[id];
    if (!tw) continue;
    for (const k of ['power', 'cost', 'rate', 'range', 'hp']) if (tw[k]) t[k] *= tw[k];
    if (tw.invert) t.invert = !t.invert;
  }
  return t;
}

const ELEM_NOUN = { fire: 'flame', ice: 'frost', nature: 'thorns', metal: 'steel', storm: 'lightning', earth: 'stone',
  light: 'radiance', shadow: 'shadow', arcane: 'arcana', water: 'brine' };

/**
 * @param {string} word normalized a–z word
 * @param {object} m meaning: { source, tpl, augTpl, twists, pos, modTpl, tagPerson, root }
 */
export function buildSpec(word, m) {
  const seed = hashString(word);
  const rng = makeRng(seed);
  const j = (a = 0.92, b = 1.08) => rng.float(a, b);
  const jEff = () => rng.float(0.95, 1.05);

  const L = word.length;
  const score = scoreWord(word);
  const f = lengthFactor(L);
  const sf = scoreFactor(L, score);
  const tw = composeTwists(m.twists || []);
  const tpl = m.tpl;
  const arch = tpl.arch;
  const base = ARCH_BASE[arch];

  let element = tpl.elem;
  const modTpl = m.modTpl;
  let elemFromMod = false;
  if (modTpl && modTpl.elem !== element && (modTpl.conv || !ATTACKERS.has(arch) || rng.chance(0.5))) {
    element = modTpl.elem;
    elemFromMod = true;
  }
  if (tw.invert) element = OPPOSITE[element];

  const P = Math.pow(f, 1.4) * Math.pow(sf, 1.25) * tw.power;
  const cost = Math.max(10, Math.round(30 * f * sf * base.cost * tw.cost * j(0.96, 1.04)));
  const st = tpl.stat || {};

  const stats = {
    damage: 0,
    rate: r2(base.rate * (st.rate || 1) * tw.rate * j()),
    range: r2(base.range * (1 + 0.04 * (f - 1)) * (st.range || 1) * tw.range * j()),
    splash: 0,
    projectileSpeed: r2(base.projectileSpeed * j()),
    hp: Math.round(base.hp * Math.pow(f, 0.85) * (st.hp || 1) * tw.hp * j()),
  };
  if (ATTACKERS.has(arch)) {
    // rate twists shouldn't inflate DPS beyond the power budget: compensate damage
    const rateComp = 1 / Math.sqrt(tw.rate * (st.rate || 1));
    stats.damage = r2(base.damage * P * (st.damage || 1) * rateComp * j());
  }
  if (arch === 'blast') stats.splash = r2(clamp(base.splash * (1 + 0.06 * (f - 1)) * j(), 0.6, 2.2));
  if (arch === 'mortar') {
    stats.splash = r2(clamp(base.splash * (1 + 0.06 * (f - 1)) * j(), 0.9, 2.4));
    stats.minRange = r2(clamp(base.minRange * j(0.95, 1.05), 1, stats.range * 0.5));
  }
  if (arch === 'vortex') stats.pull = r2(clamp(base.pull * (st.pull || 1) * (1 + 0.05 * (f - 1)) * j(), 0.3, 1.2));
  if (arch === 'orbit') {
    stats.orbs = clamp(Math.round(1 + (L - 3) / 2.5) + (st.orbs || 0), 1, 4);
    stats.damage = r2(stats.damage / Math.sqrt(stats.orbs)); // more orbs, lighter each
  }
  if (FIXED_RANGE.has(arch)) stats.range = base.range;

  // effects
  const ctx = { P, f, L, cost, j: jEff };
  const effects = [];
  const seen = new Set();
  let tplFx = tpl.fx.slice();
  if (tw.invert) tplFx = tplFx.map((t) => (INVERT_FX[t.type] ? { ...t, type: INVERT_FX[t.type] } : t));
  if (modTpl && elemFromMod) {
    const extra = modTpl.fx.find((x) => ON_HIT.has(x.type));
    if (extra && ON_HIT_ARCH.has(arch)) tplFx.push({ ...extra, mult: (extra.mult || 1) * 0.7 });
  }
  for (const t of tplFx) {
    if (seen.has(t.type) || effects.length >= 3) continue;
    if (ON_HIT_ARCH.has(arch) ? !ON_HIT.has(t.type) : ON_HIT.has(t.type)) continue;
    if ((arch === 'blast' || arch === 'mortar') && t.type === 'splash') {
      stats.splash = r2(clamp(stats.splash * (1 + 0.25 * (t.mult || 1)), 0.6, 2.4));
      continue;
    }
    if (arch === 'chain' && t.type === 'chain') continue; // added below
    const e = makeEffect(t, ctx);
    if (e) { effects.push(e); seen.add(t.type); }
  }
  if (arch === 'chain') effects.unshift(makeEffect({ type: 'chain', mult: 1 }, ctx));
  if (arch === 'support' && !effects.length) effects.push(makeEffect({ type: 'buff', sub: 'damage', mult: 1 }, ctx));
  if (arch === 'harvest' && !effects.length) effects.push(makeEffect({ type: 'harvest', sub: 'ink', mult: 1 }, ctx));
  if (arch === 'summon' && !effects.length) effects.push(makeEffect({ type: 'summon', mult: 1 }, ctx));

  // augment
  const pos = m.pos;
  let augment = null;
  const canVerb = pos.includes('verb');
  const canAdj = pos.includes('adjective') || pos.includes('adverb');
  if (canVerb || canAdj) {
    const at = m.augTpl;
    let kind;
    if (at && at.kind === 'adjective' && canAdj) kind = 'adjective';
    else if (at && at.kind === 'verb' && canVerb) kind = 'verb';
    else kind = canVerb ? 'verb' : 'adjective';
    augment = buildAugment(kind, at || tpl, tpl, element, { L, sf, P, f, cost, j: jEff, rng, hasExplicit: !!at, twistPower: tw.power });
  }

  // tags
  const tags = new Set(tpl.tags);
  tags.add(element);
  if (modTpl) for (const t of modTpl.tags) tags.add(t);
  if (m.tagPerson) tags.add('person');
  if (tw.invert) tags.add('inverted');

  // flavor
  let phrase = m.say || tpl.phrase;
  let glyph = tpl.glyph;
  if (tw.invert) {
    phrase = archPhrase(arch, element, effects[0] && effects[0].type, effects[0] && effects[0].resource, rng);
    glyph = rng.pick(ELEM_GLYPHS[element]);
  } else if (elemFromMod) {
    phrase = `${phrase}, steeped in ${ELEM_NOUN[element]}`;
  }
  const flavor = makeFlavor(phrase, arch, effects, stats);

  return {
    word,
    pos: pos.slice(),
    archetype: arch,
    element,
    rarity: rarityOf(L, score),
    score,
    cost,
    stats,
    effects,
    augment,
    tags: [...tags].map((t) => t.toLowerCase()),
    glyph,
    color: ELEMENT_COLORS[element],
    flavor,
    source: m.source,
  };
}

function makeFlavor(phrase, arch, effects, stats) {
  if (arch === 'wall') {
    const bite = effects.map(describeEffect).filter(Boolean);
    return `${phrase} (${stats.hp} hp)${bite.length ? `; biters get hurt: ${bite.join(' and ')}` : ''}.`;
  }
  if (!ATTACKERS.has(arch)) {
    // passive towers: the phrase says what it does; add the numbers
    return `${phrase} (${effects.map(passiveNumbers).join('; ')}).`;
  }
  const clauses = effects.map(describeEffect).filter(Boolean);
  if (!clauses.length) {
    const how = { bolt: ' at the lead foe', blast: ', splashing nearby foes', snipe: ' from long range', rapid: ' in quick volleys',
      beam: ' without pause', chain: '', aura: ' around itself', trap: ' when stepped on', mortar: ' from far away',
      vortex: ', dragging foes back', pulse: ' in shockwaves', orbit: ` with ${stats.orbs} circling orb${stats.orbs > 1 ? 's' : ''}` }[arch];
    return how && !phrase.includes(how.trim()) && !/foe|range|nearby|around/.test(phrase) ? `${phrase}${how}.` : `${phrase}.`;
  }
  const list = clauses.length === 1 ? clauses[0] : clauses.slice(0, -1).join(', ') + ' and ' + clauses[clauses.length - 1];
  return `${phrase}; ${list}.`;
}

function passiveNumbers(e) {
  switch (e.type) {
    case 'heal': return `${r1(e.hps)} hp/s`;
    case 'buff': return `+${Math.round((e.mul - 1) * 100)}% ${e.stat}`;
    case 'shield': return `${Math.round(e.amount)} shield every ${Math.round(e.interval)}s`;
    case 'harvest': return e.resource === 'tile' ? `free redraw every ${Math.round(e.interval)}s` : `+${e.amount} ink every ${e.interval}s`;
    case 'summon': return `${e.count} defender${e.count > 1 ? 's' : ''} every ${Math.round(e.interval)}s`;
    case 'interest': return `+${Math.round(e.pct * 100)}% interest per wave, max ${e.cap}`;
    default: return describeEffect(e);
  }
}

// Inverted words ("fireless", "unfrozen") swap their on-hit effects for counterparts.
const INVERT_FX = { burn: 'slow', slow: 'burn', freeze: 'burn', poison: 'reveal', reveal: 'poison', execute: 'bounty',
  bounty: 'execute', knockback: 'stun', stun: 'knockback', armorBreak: 'pierce', pierce: 'armorBreak' };

const STAT_KEYS = ['damage', 'rate', 'range', 'hp'];

function buildAugment(kind, at, towerTpl, element, c) {
  const k = clamp(0.75 + 0.07 * (c.L - 3), 0.6, 1.6) * Math.sqrt(c.sf * (c.twistPower || 1));
  const mods = { damage: 1, rate: 1, range: 1, hp: 1 };
  const fxT = [];
  let conv = !!at.conv;

  if (c.hasExplicit || at.id === 'proc') {
    if (at.mods) for (const s of STAT_KEYS) if (at.mods[s]) mods[s] = at.mods[s];
    for (const t of at.id === 'proc' ? at.augFx || [] : at.fx) fxT.push(t);
  } else {
    // synthesize from a noun concept
    const a = at.arch;
    if (ATTACKERS.has(a)) {
      for (const t of at.fx) if (ON_HIT.has(t.type)) fxT.push(t);
      const am = { blast: { damage: 1.12 }, snipe: { range: 1.18 }, rapid: { rate: 1.18 }, beam: { damage: 1.12 },
        chain: {}, aura: { range: 1.1 }, bolt: { damage: 1.1 }, trap: { damage: 1.1 }, mortar: { range: 1.15, damage: 1.05 },
        vortex: {}, pulse: { damage: 1.08 }, orbit: { rate: 1.12 } }[a];
      Object.assign(mods, am);
      if (a === 'vortex' && !fxT.length) fxT.push({ type: 'slow', mult: 0.8 });
      if (a === 'chain' && !fxT.some((t) => t.type === 'chain')) fxT.push({ type: 'chain', mult: 0.8 });
      if (!fxT.length && Object.keys(am).length === 0) mods.damage = 1.12;
    } else if (a === 'support') {
      const t = at.fx[0] || { type: 'buff', sub: 'damage' };
      if (t.type === 'heal') { mods.hp = 1.25; fxT.push({ type: 'heal', mult: 0.5 }); }
      else if (t.type === 'shield') { mods.hp = 1.3; fxT.push({ type: 'shield', mult: 0.5 }); }
      else mods[t.sub || 'damage'] = 1.14;
    } else if (a === 'harvest') {
      fxT.push({ type: 'bounty', mult: 1 });
    } else if (a === 'summon') {
      mods.damage = 1.1; mods.hp = 1.15;
    } else if (a === 'wall') {
      mods.hp = 1.3;
      for (const t of at.fx) if (ON_HIT.has(t.type)) fxT.push(t);
    }
  }
  // scale mods by intensity k, jitter
  for (const s of STAT_KEYS) {
    if (mods[s] !== 1) mods[s] = Math.round((1 + (mods[s] - 1) * k * c.j()) * 1000) / 1000;
  }
  if (!fxT.length && STAT_KEYS.every((s) => mods[s] === 1)) {
    mods[kind === 'verb' ? 'rate' : 'damage'] = Math.round((1 + 0.1 * k) * c.j() * 1000) / 1000;
  }
  const actx = { P: c.P * 0.6, f: c.f * 0.8, L: c.L, cost: c.cost * 0.5, j: c.j };
  const effects = [];
  const seen = new Set();
  for (const t of fxT) {
    if (seen.has(t.type) || effects.length >= 2) continue;
    const e = makeEffect(t, actx);
    if (e) { effects.push(e); seen.add(t.type); }
  }
  return {
    kind,
    cost: Math.max(10, Math.round((10 + c.cost * 0.32) * c.j())),
    mods,
    effects,
    element: conv ? element : null,
  };
}
