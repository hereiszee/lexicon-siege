// Shared vocabulary for all modules. See CONTRACT.md. Do not rename ids;
// numeric values may be tuned during the balance pass only.

export const ELEMENTS = ['fire', 'ice', 'nature', 'metal', 'storm', 'earth', 'light', 'shadow', 'arcane', 'water'];

/** Attacking with X against an enemy attuned to OPPOSITE[X] deals ×1.5; against X itself ×0.5. */
export const OPPOSITE = {
  fire: 'ice', ice: 'fire',
  nature: 'metal', metal: 'nature',
  storm: 'earth', earth: 'storm',
  light: 'shadow', shadow: 'light',
  arcane: 'water', water: 'arcane',
};

export const ELEMENT_COLORS = {
  fire: '#d9482b', ice: '#5aa9d6', nature: '#4f9d4a', metal: '#7d8791', storm: '#8a63d2',
  earth: '#9a6b3c', light: '#d9a514', shadow: '#4a3f5c', arcane: '#c2478f', water: '#2f6fb5',
};

/** How a tower acts. */
export const ARCHETYPES = [
  'bolt',    // single-target projectile
  'blast',   // projectile with splash
  'snipe',   // long range, slow, instant hit
  'rapid',   // fast, low damage projectile
  'beam',    // continuous damage on one target (stats.damage is DPS)
  'chain',   // hit jumps between enemies
  'aura',    // affects every enemy in range (stats.damage is DPS)
  'support', // no attack; affects towers in range (heal / buff / shield)
  'harvest', // no attack; produces ink or letter tiles
  'summon',  // spawns defender units onto the path
  // v2 (see CONTRACT.md "v2"):
  'wall',    // placed ON a path cell; blocks walkers, who stop and bite it; no attack
  'trap',    // placed ON a path cell; walkers pass over it; hits everything on its cell, rearms at stats.rate
  'mortar',  // very long range, can't hit inside stats.minRange; slow lobbed shell with big splash
  'vortex',  // drags walkers in range backwards along the path at stats.pull cells/s, plus DPS
  'pulse',   // every 1/rate s a shockwave hits ALL enemies in range once (burst, unlike aura's DoT)
  'orbit',   // stats.orbs orbs circle the tower at radius stats.range, hitting what they touch
];

/** Archetypes that are placed on path cells instead of beside them. */
export const PATH_ARCHETYPES = ['wall', 'trap'];

/**
 * Effect objects: { type, ...params }. Durations in seconds, distances in cells.
 * On-hit (attacking archetypes):
 *   burn {dps,duration}          poison {dps,duration} (stacks up to 5)
 *   slow {factor,duration}       (factor 0.6 = moves at 60%)
 *   freeze {chance,duration}     stun {chance,duration}
 *   pierce {count}               chain {jumps,falloff}
 *   splash {radius}              crit {chance,mult}
 *   execute {threshold}          (instantly kills non-boss below this hp fraction)
 *   armorBreak {amount,duration} knockback {cells,chance}
 *   bounty {mul}                 (ink multiplier for kills by this tower)
 *   reveal {}                    (can target stealth enemies; also reveals in range)
 * Passive (support / harvest / summon):
 *   heal {hps}                   (repairs towers in range)
 *   buff {stat:'damage'|'rate'|'range', mul}   (towers in range; strongest wins, no stacking)
 *   shield {amount,interval}     (grants towers in range a damage shield)
 *   harvest {resource:'ink'|'tile', amount, interval}
 *   summon {hp,damage,count,interval}          (damage is DPS of each unit)
 *   interest {pct,cap}           (v2: at each wave end gain floor(ink × pct), at most cap)
 */
export const EFFECT_TYPES = [
  'burn', 'poison', 'slow', 'freeze', 'stun', 'pierce', 'chain', 'splash', 'crit', 'execute',
  'armorBreak', 'knockback', 'bounty', 'reveal', 'heal', 'buff', 'shield', 'harvest', 'summon', 'interest',
];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** Scrabble letter values. */
export const LETTER_VALUES = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
  n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10,
};

/** Default bag weights (Scrabble tile counts). The bag is infinite: draws are weighted-random. */
export const LETTER_WEIGHTS = {
  a: 9, b: 2, c: 2, d: 4, e: 12, f: 2, g: 3, h: 2, i: 9, j: 1, k: 1, l: 4, m: 2,
  n: 6, o: 8, p: 2, q: 1, r: 6, s: 4, t: 6, u: 4, v: 2, w: 2, x: 1, y: 2, z: 1,
};

export const VOWELS = 'aeiou';

/**
 * Enemy base stats. speed = cells/sec. leak = lives lost if it reaches the end.
 * armor = flat reduction per hit (min 1 damage; damage-over-time ignores armor).
 * traits are implemented by the engine.
 */
export const ENEMIES = {
  // bite = DPS dealt to a wall / summoned unit blocking it (v2)
  grunt:    { hp: 20,  speed: 1.2, armor: 0, bounty: 3,  leak: 1,  bite: 4,  traits: [] },
  runner:   { hp: 10,  speed: 2.4, armor: 0, bounty: 3,  leak: 1,  bite: 2,  traits: [] },
  swarm:    { hp: 5,   speed: 1.6, armor: 0, bounty: 1,  leak: 1,  bite: 1,  traits: [] },
  tank:     { hp: 80,  speed: 0.7, armor: 2, bounty: 8,  leak: 2,  bite: 10, traits: [] },
  armored:  { hp: 40,  speed: 1.0, armor: 5, bounty: 6,  leak: 1,  bite: 6,  traits: [] },
  stealth:  { hp: 15,  speed: 1.5, armor: 0, bounty: 5,  leak: 1,  bite: 3,  traits: ['stealth'] },   // untargetable unless revealed or within 1.5 cells of a tower
  healer:   { hp: 30,  speed: 1.0, armor: 0, bounty: 6,  leak: 1,  bite: 2,  traits: ['healer'] },    // heals enemies within 1.5 cells, 4 hp/s
  vandal:   { hp: 35,  speed: 1.0, armor: 0, bounty: 6,  leak: 1,  bite: 8,  traits: ['vandal'] },    // deals 5 dps to nearest tower within 1.5 cells
  slinger:  { hp: 22,  speed: 1.0, armor: 0, bounty: 5,  leak: 1,  bite: 3,  traits: ['slinger'] },   // v2: every 2 s shoots the nearest tower within 2.5 cells for 6 damage
  splitter: { hp: 30,  speed: 1.0, armor: 0, bounty: 4,  leak: 1,  bite: 4,  traits: ['splitter'] },  // spawns 3 swarm on death
  flyer:    { hp: 14,  speed: 1.8, armor: 0, bounty: 4,  leak: 1,  bite: 0,  traits: ['flyer'] },     // ignores walls, traps and summoned units
  boss:     { hp: 600, speed: 0.5, armor: 3, bounty: 60, leak: 10, bite: 30, traits: ['boss', 'stomp'] }, // immune to execute/freeze/knockback (pull at 25%); v2 stomp: every 4 s, 20 damage to every tower within 1.5 cells
};

export const DEFAULTS = {
  cols: 16,
  rows: 10,
  rackSize: 10,
  startInk: 100,
  lives: 20,
  maxAugments: 3,
  redrawCost: 10,       // first rack redraw; +5 each subsequent redraw in the level
  sellRefund: 0.6,
  minVowelsInRack: 2,
  minWordLength: 2,
  maxWordLength: 15,
};
