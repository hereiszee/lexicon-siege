// Plain-language descriptions of towers, effects, augments and enemies.
import { fmt, pct, cap } from './dom.js';

export const ARCHETYPE_INFO = {
  bolt:    { name: 'Bolt',    desc: 'Fires single shots at the leading enemy.' },
  blast:   { name: 'Blast',   desc: 'Lobs shells that burst, hitting everything nearby.' },
  snipe:   { name: 'Snipe',   desc: 'Very long reach. Slow, but hits instantly.' },
  rapid:   { name: 'Rapid',   desc: 'Fires quick, light shots.' },
  beam:    { name: 'Beam',    desc: 'Locks onto one enemy and burns it steadily.' },
  chain:   { name: 'Chain',   desc: 'Each shot leaps from enemy to enemy.' },
  aura:    { name: 'Aura',    desc: 'Harms every enemy in range, all the time.' },
  support: { name: 'Support', desc: 'Does not attack. Helps towers in range.' },
  harvest: { name: 'Harvest', desc: 'Does not attack. Gathers ink or tiles.' },
  summon:  { name: 'Summon',  desc: 'Sends defenders out to block the path.' },
  wall:    { name: 'Wall',    desc: 'Built ON the path. Walkers stop and chew on it instead of moving. Does not attack.', icon: '▦' },
  trap:    { name: 'Trap',    desc: 'Built ON the path. Snaps shut on everything standing on it, then re-arms. Flyers pass over.', icon: '✕' },
  mortar:  { name: 'Mortar',  desc: 'Lobs slow shells far across the map for a big blast. Cannot hit enemies right next to it.', icon: '⌒' },
  vortex:  { name: 'Vortex',  desc: 'Drags enemies in range backwards along the path while wearing them down.', icon: '@' },
  pulse:   { name: 'Pulse',   desc: 'Sends out a shockwave that hits every enemy in range at once.', icon: '◉' },
  orbit:   { name: 'Orbit',   desc: 'Orbs circle the tower and strike whatever they touch.', icon: '⊙' },
};
// small glyphs for hint chips
const ARCH_ICONS = { bolt: '➶', blast: '✹', snipe: '⌖', rapid: '⁘', beam: '━', chain: 'ϟ', aura: '◎', support: '✚', harvest: '❦', summon: '♟' };
export function archetypeIcon(a) { return ARCHETYPE_INFO[a]?.icon || ARCH_ICONS[a] || '•'; }

export function archetypeInfo(a) {
  return ARCHETYPE_INFO[a] || { name: cap(a || 'tower'), desc: '' };
}

export const RARITY_COLORS = {
  common: '#8a7d6b', uncommon: '#4f8a4a', rare: '#2f6fb5', epic: '#8a4fb0', legendary: '#c48a12',
};

export const ENEMY_INFO = {
  grunt: 'Grunt', runner: 'Runner', swarm: 'Swarm', tank: 'Tank', armored: 'Armored',
  stealth: 'Stealth', healer: 'Healer', vandal: 'Vandal', slinger: 'Slinger', splitter: 'Splitter', flyer: 'Flyer', boss: 'Boss',
};
export const ENEMY_NOTES = {
  grunt: 'Ordinary foot soldier.',
  runner: 'Fast and fragile.',
  swarm: 'Tiny, comes in numbers.',
  tank: 'Slow, tough, some armor.',
  armored: 'Heavy armor: many small hits barely scratch it.',
  stealth: 'Hidden unless revealed or close to a tower.',
  healer: 'Heals nearby enemies.',
  vandal: 'Damages towers it passes.',
  slinger: 'Shoots your towers from range.',
  splitter: 'Bursts into swarm when killed.',
  flyer: 'Flies over walls, traps and your summoned defenders.',
  boss: 'Huge. Stomps nearby towers. Immune to execute, freeze and knockback.',
};

const secs = (d) => `${fmt(d)}s`;

/** One effect → one plain-language sentence fragment. */
export function effectText(e) {
  if (!e || !e.type) return '';
  const d = e.duration;
  switch (e.type) {
    case 'burn': return `Sets enemies alight: ${fmt(e.dps)} dmg/s for ${secs(d)}`;
    case 'poison': return `Poisons: ${fmt(e.dps)} dmg/s for ${secs(d)} (stacks up to 5)`;
    case 'slow': return `Slows enemies to ${pct(e.factor)} speed for ${secs(d)}`;
    case 'freeze': return `${pct(e.chance)} chance to freeze an enemy for ${secs(d)}`;
    case 'stun': return `${pct(e.chance)} chance to stun for ${secs(d)}`;
    case 'pierce': return `Shots pass through ${fmt(e.count)} more ${e.count === 1 ? 'enemy' : 'enemies'}`;
    case 'chain': return `Leaps to ${fmt(e.jumps)} more ${e.jumps === 1 ? 'enemy' : 'enemies'}` +
      (e.falloff != null && e.falloff < 1 ? `, each jump at ${pct(e.falloff)} power` : '');
    case 'splash': return `Splashes everything within ${fmt(e.radius)} cells`;
    case 'crit': return `${pct(e.chance)} chance of a critical hit for ×${fmt(e.mult)} damage`;
    case 'execute': return `Finishes off non-boss enemies below ${pct(e.threshold)} health`;
    case 'armorBreak': return `Strips ${fmt(e.amount)} armor for ${secs(d)}`;
    case 'knockback': return `${pct(e.chance)} chance to knock enemies back ${fmt(e.cells)} cells`;
    case 'bounty': return `Kills pay ×${fmt(e.mul)} ink`;
    case 'reveal': return 'Spots stealthy enemies and reveals them to all towers';
    case 'heal': return `Repairs towers in range, ${fmt(e.hps)} hp/s`;
    case 'buff': return `Boosts ${e.stat || 'damage'} of towers in range by ${pct((e.mul || 1) - 1)}`;
    case 'shield': return `Shields towers in range for ${fmt(e.amount)} damage every ${secs(e.interval)}`;
    case 'harvest':
      if (e.resource === 'tile') return `Earns ${e.amount > 1 ? fmt(e.amount) + ' free rack redraws' : 'a free rack redraw'} every ${secs(e.interval)}`;
      return `Makes ${fmt(e.amount)} ink every ${secs(e.interval)}`;
    case 'interest': return `Each wave end, earns ${pct(e.pct)} interest on your ink (up to ${fmt(e.cap)})`;
    case 'summon': return `Sends ${fmt(e.count)} defender${e.count === 1 ? '' : 's'} (${fmt(e.hp)} hp, ${fmt(e.damage)} dmg/s) every ${secs(e.interval)}`;
    default: {
      const params = Object.entries(e).filter(([k]) => k !== 'type').map(([k, v]) => `${k} ${typeof v === 'number' ? fmt(v) : v}`).join(', ');
      return `${cap(e.type)}${params ? ' (' + params + ')' : ''}`;
    }
  }
}

/** Augment mods → ["+15% damage", "−10% rate"]. */
export function modsText(mods) {
  if (!mods) return [];
  const out = [];
  for (const [k, v] of Object.entries(mods)) {
    if (v == null || v === 1) continue;
    const d = v - 1;
    out.push(`${d > 0 ? '+' : '−'}${Math.round(Math.abs(d) * 100)}% ${k === 'hp' ? 'health' : k}`);
  }
  return out;
}

/** One-line summary of an augment for "can also augment" hints. */
export function augmentSummary(aug) {
  if (!aug) return '';
  const parts = [...modsText(aug.mods)];
  for (const e of aug.effects || []) parts.push(effectText(e).replace(/^./, (c) => c.toLowerCase()));
  if (aug.element) parts.push(`turns the tower ${aug.element}`);
  return parts.length ? parts.join('; ') : 'a small all-round boost';
}

export function isAttacker(archetype) {
  return !['support', 'harvest', 'summon', 'wall'].includes(archetype);
}

export function isContinuous(archetype) {
  return archetype === 'beam' || archetype === 'aura' || archetype === 'vortex';
}

/** Effective DPS estimate for display. */
export function dpsOf(archetype, stats) {
  if (!stats || !isAttacker(archetype)) return 0;
  if (isContinuous(archetype)) return stats.damage || 0;
  if (archetype === 'orbit') return 0; // depends on how often enemies cross the orbs
  return (stats.damage || 0) * (stats.rate || 0);
}

export function ruleText(rule) {
  if (!rule) return '';
  if (rule.text) return rule.text;
  switch (rule.type) {
    case 'minLength': return `Words must be at least ${rule.n} letters`;
    case 'maxLength': return `Words may be at most ${rule.n} letters`;
    case 'mustContain': return `Every word must contain ${String(rule.letter).toUpperCase()}`;
    case 'banLetter': return `No words with ${String(rule.letter).toUpperCase()}`;
    case 'towerLimit': return `At most ${rule.n} towers`;
    case 'banElement': return `No ${rule.element} towers`;
    default: return rule.type;
  }
}

/** Enemy type → total count for one wave. */
export function waveCounts(wave) {
  const counts = new Map();
  for (const g of wave?.groups || []) counts.set(g.enemy, (counts.get(g.enemy) || 0) + (g.count || 0));
  return counts;
}
