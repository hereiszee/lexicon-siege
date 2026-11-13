// Letter upgrades (CONTRACT.md v2 §3). Each letter gets one bonus kind per level (from the
// level seed). Silver (tier 1) / gold (tier 2) values are per occurrence of the letter in a
// tower's word, captured when the tower is created.

import { makeRng } from '../core/rng.js';

const pct = (v) => `+${Math.round(v * 100)}%`;

/** kind → { silver, gold, label(v) }. Numbers are first-pass; BALANCE tunes them. */
export const LETTER_KINDS = {
  damage: { silver: 0.10, gold: 0.18, label: (v) => `${pct(v)} damage` },
  rate: { silver: 0.08, gold: 0.15, label: (v) => `${pct(v)} attack speed` },
  range: { silver: 0.25, gold: 0.4, label: (v) => `+${v} range` },
  hp: { silver: 0.15, gold: 0.3, label: (v) => `${pct(v)} tower hp` },
  splash: { silver: 0.25, gold: 0.4, label: (v) => `+${v} splash radius` },
  pierce: { silver: 1, gold: 2, label: (v) => `+${v} pierce` },
  chain: { silver: 1, gold: 2, label: (v) => `+${v} chain jump${v > 1 ? 's' : ''}` },
  crit: { silver: 0.05, gold: 0.1, label: (v) => `${pct(v)} crit chance` },
  burn: { silver: 2, gold: 4, label: (v) => `burn +${v} dps` },
  slow: { silver: 0.1, gold: 0.18, label: (v) => `slows ${Math.round(v * 100)}% more` },
  poison: { silver: 1.5, gold: 3, label: (v) => `poison +${v} dps` },
  ink: { silver: 1, gold: 2, label: (v) => `+${v} ink per kill` },
};
export const KIND_IDS = Object.keys(LETTER_KINDS);
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** Per-level letter → kind map. Every kind appears at least twice. */
export function letterKinds(seed) {
  const rng = makeRng((seed ^ 0x1e77e45) >>> 0);
  const pool = rng.shuffle([...KIND_IDS, ...KIND_IDS, ...rng.shuffle(KIND_IDS).slice(0, 2)]);
  const out = {};
  for (let i = 0; i < 26; i++) out[LETTERS[i]] = pool[i];
  return out;
}

export const tierValue = (kind, tier) => (tier >= 2 ? LETTER_KINDS[kind].gold : tier === 1 ? LETTER_KINDS[kind].silver : 0);

/** UI text, e.g. "Silver L: +10% damage per L". Tier 0 previews the silver value. */
export function bonusText(letter, kind, tier) {
  const L = letter.toUpperCase();
  const k = LETTER_KINDS[kind];
  if (!tier) return `${L}: ${k.label(k.silver)} per ${L} (silver), ${k.label(k.gold)} (gold)`;
  return `${tier >= 2 ? 'Gold' : 'Silver'} ${L}: ${k.label(tierValue(kind, tier))} per ${L} in new tower words`;
}

/** Sum the bonus values for a word: → { kind: total } (only upgraded letters). */
export function wordBonuses(word, kinds, tiers) {
  const out = {};
  for (const ch of word) {
    const tier = tiers[ch] || 0;
    if (!tier) continue;
    const k = kinds[ch];
    out[k] = (out[k] || 0) + tierValue(k, tier);
  }
  return out;
}

/** Apply summed bonuses to composed stats `s` and effects array `fx` (both mutated). */
export function applyLetterBonuses(b, s, fx, bonus) {
  const find = (type) => fx.find((e) => e.type === type);
  for (const kind in b) {
    const v = b[kind];
    switch (kind) {
      case 'damage': s.damage *= 1 + v; break;
      case 'rate': s.rate *= 1 + v; break;
      case 'range': if (s.range > 0) s.range += v; break;
      case 'hp': s.hp *= 1 + v; break;
      case 'splash': s.splash += v; break;
      case 'pierce': { const e = find('pierce'); if (e) e.count = (e.count || 0) + v; else fx.push({ type: 'pierce', count: v }); break; }
      case 'chain': { const e = find('chain'); if (e) e.jumps = (e.jumps || 0) + v; else fx.push({ type: 'chain', jumps: v, falloff: 0.7 }); break; }
      case 'crit': { const e = find('crit'); if (e) e.chance = (e.chance || 0) + v; else fx.push({ type: 'crit', chance: v, mult: 2 }); break; }
      case 'burn': { const e = find('burn'); if (e) e.dps = (e.dps || 0) + v; else fx.push({ type: 'burn', dps: v, duration: 2 }); break; }
      case 'poison': { const e = find('poison'); if (e) e.dps = (e.dps || 0) + v; else fx.push({ type: 'poison', dps: v, duration: 3 }); break; }
      case 'slow': { const e = find('slow'); if (e) e.factor = Math.max(0.2, (e.factor ?? 1) - v); else fx.push({ type: 'slow', factor: Math.max(0.2, 1 - v), duration: 1.5 }); break; }
      case 'ink': bonus.killInk = (bonus.killInk || 0) + v; break;
    }
  }
}
