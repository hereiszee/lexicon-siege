// Effective tower composition: spec + augments (+ theme multiplier). Buffs are applied later by
// the engine because they depend on neighbouring towers.

import { EFFECT_TYPES } from '../core/constants.js';

export const STAT_KEYS = ['damage', 'rate', 'range', 'splash', 'projectileSpeed', 'hp'];
export const DEFAULT_PROJECTILE_SPEED = 8;
const KNOWN = new Set(EFFECT_TYPES);

/** Effects with the same key merge (stronger wins). buff/harvest are keyed by stat/resource. */
export function effectKey(e) {
  if (e.type === 'buff') return 'buff:' + e.stat;
  if (e.type === 'harvest') return 'harvest:' + e.resource;
  return e.type;
}

const iv = (x) => Math.max(0.1, x || 1);

/** Scalar "how strong is this effect" used to merge same-type effects. */
export function effectStrength(e) {
  switch (e.type) {
    case 'burn':
    case 'poison': return (e.dps || 0) * (e.duration || 0);
    case 'slow': return (1 - (e.factor ?? 1)) * (e.duration || 0);
    case 'freeze':
    case 'stun': return (e.chance || 0) * (e.duration || 0);
    case 'pierce': return e.count || 0;
    case 'chain': return (e.jumps || 0) * (e.falloff ?? 0.7);
    case 'splash': return e.radius || 0;
    case 'crit': return (e.chance || 0) * ((e.mult || 1) - 1);
    case 'execute': return e.threshold || 0;
    case 'armorBreak': return (e.amount || 0) * (e.duration || 0);
    case 'knockback': return (e.cells || 0) * (e.chance ?? 1);
    case 'bounty': return e.mul || 1;
    case 'reveal': return 1;
    case 'heal': return e.hps || 0;
    case 'buff': return e.mul || 1;
    case 'shield': return (e.amount || 0) / iv(e.interval);
    case 'harvest': return (e.amount || 0) / iv(e.interval);
    case 'summon': return (e.hp || 0) * (e.damage || 0) * (e.count || 1) / iv(e.interval);
    default: return 0;
  }
}

/** Merge `add` into `list` in place (copies effects). Unknown types are ignored. */
export function mergeEffects(list, add) {
  if (!add) return list;
  for (const e of add) {
    if (!e || !KNOWN.has(e.type)) continue;
    const k = effectKey(e);
    let idx = -1;
    for (let i = 0; i < list.length; i++) if (effectKey(list[i]) === k) { idx = i; break; }
    if (idx < 0) list.push({ ...e });
    else if (effectStrength(e) > effectStrength(list[idx])) list[idx] = { ...e };
  }
  return list;
}

/**
 * spec + augment specs → { stats, effects, element } before buffs.
 * `elementTheme(element)` returns the theme multiplier for the resulting element.
 * Theme multiplies stats.damage and the "output" params of effects (burn/poison dps, heal hps,
 * shield amount, summon damage, ink harvest amount).
 */
export function composeTower(spec, augments, theme = 1) {
  const s = spec.stats || {};
  const stats = {
    damage: s.damage || 0,
    rate: s.rate || 0,
    range: s.range || 0,
    splash: s.splash || 0,
    projectileSpeed: s.projectileSpeed || DEFAULT_PROJECTILE_SPEED,
    hp: s.hp || 1,
  };
  const effects = mergeEffects([], spec.effects);
  let element = spec.element;
  for (const a of augments) {
    const aug = a.augment;
    if (!aug) continue;
    if (aug.mods) for (const k of STAT_KEYS) if (aug.mods[k] != null) stats[k] *= aug.mods[k];
    mergeEffects(effects, aug.effects);
    if (aug.element) element = aug.element;
  }
  if (theme !== 1) {
    stats.damage *= theme;
    for (let i = 0; i < effects.length; i++) {
      const e = effects[i];
      switch (e.type) {
        case 'burn': case 'poison': e.dps = (e.dps || 0) * theme; break;
        case 'heal': e.hps = (e.hps || 0) * theme; break;
        case 'shield': e.amount = (e.amount || 0) * theme; break;
        case 'summon': e.damage = (e.damage || 0) * theme; break;
        case 'harvest': if (e.resource === 'ink') e.amount = (e.amount || 0) * theme; break;
      }
    }
  }
  return { stats, effects, element };
}

/** Fast per-type lookup built from an effects array. */
export function indexEffects(effects) {
  const fx = {
    burn: null, poison: null, slow: null, freeze: null, stun: null, pierce: null, chain: null,
    splash: null, crit: null, execute: null, armorBreak: null, knockback: null, bounty: null,
    reveal: null, heal: null, shield: null, summon: null, buffs: [], harvests: [], onHit: false,
  };
  for (const e of effects) {
    if (e.type === 'buff') fx.buffs.push(e);
    else if (e.type === 'harvest') fx.harvests.push(e);
    else fx[e.type] = e;
  }
  fx.onHit = !!(fx.burn || fx.poison || fx.slow || fx.freeze || fx.stun || fx.armorBreak || fx.knockback || fx.execute);
  return fx;
}
