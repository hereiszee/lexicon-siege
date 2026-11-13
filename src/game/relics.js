// Relics: permanent (per level) boons offered as rewards. See CONTRACT.md v2 §3.
// Each relic is { name, text, icon } plus optional engine hooks read by src/game/index.js:
//   stats(t, s, effects)  mutate a tower's composed stats / effects (t: {archetype, element, word})
//   dmg(t, e)             damage multiplier when tower t hits enemy e
//   killInk               extra ink per kill
//   waveInkMul            multiplier on the wave-end bonus ink
//   refund                sell refund fraction (replaces DEFAULTS.sellRefund when higher)
//   take(game)            one-off effect when taken (game = engine internals, see index.js)
//   waveRedraws           free rack redraws granted at every wave start
//   savedHp               +max hp per 10 hp healed on a tower
//   unitHpMul             summoned unit hp multiplier
//   briarDps              DPS dealt back to every enemy biting a wall
//   fit(t)                (bot only) does this relic help tower t
// Numbers are first-pass; the BALANCE worker tunes them.

const withArch = (arches, f) => (t, s, fx) => { if (arches.includes(t.archetype)) f(s, fx); };

export const RELICS = {
  // ---- economy / rack
  inkwell: { name: 'Inkwell', icon: 'coin', text: '+1 ink for every kill.', killInk: 1 },
  patron: { name: 'Patron', icon: 'crown', text: 'Wave-end bonus ink +50%.', waveInkMul: 1.5 },
  pawnbroker: { name: 'Pawnbroker', icon: 'key', text: 'Selling a tower refunds 75% of its ink.', refund: 0.75 },
  scholar: { name: 'Scholar', icon: 'book', text: 'Gain a free rack redraw at the start of every wave.', waveRedraws: 1 },
  deepPockets: { name: 'Deep Pockets', icon: 'gem', text: '+1 rack tile.', take: (g) => g.addRackTile() },
  secondWind: { name: 'Second Wind', icon: 'heart', text: '+5 lives.', take: (g) => { g.state.lives += 5; } },
  // ---- defence / tower health
  farsighted: {
    name: 'Farsighted', icon: 'eye', text: 'All towers +0.5 range.',
    stats: (t, s) => { if (s.range > 0 && t.archetype !== 'wall' && t.archetype !== 'trap') s.range += 0.5; },
  },
  bulwark: { name: 'Bulwark', icon: 'shield', text: 'All towers +50% max hp.', stats: (t, s) => { s.hp *= 1.5; } },
  saved: { name: 'Saved', icon: 'heart', text: 'Every 10 hp healed on a tower gives it +2 max hp for good.', savedHp: 2 },
  mason: { name: 'Mason', icon: 'shield', text: 'Walls +100% hp.', stats: withArch(['wall'], (s) => { s.hp *= 2; }), fit: (t) => t.archetype === 'wall' },
  briar: { name: 'Briar', icon: 'leaf', text: 'Enemies biting a wall take 8 damage per second.', briarDps: 8, fit: (t) => t.archetype === 'wall' },
  garrison: { name: 'Garrison', icon: 'anchor', text: 'Summoned defenders have double hp.', unitHpMul: 2, fit: (t) => !!t.fx?.summon },
  // ---- archetypes
  trapper: { name: 'Trapper', icon: 'hourglass', text: 'Traps rearm 2× faster.', stats: withArch(['trap'], (s) => { s.rate *= 2; }), fit: (t) => t.archetype === 'trap' },
  eagleEye: {
    name: 'Eagle Eye', icon: 'bird', text: 'Snipers and mortars deal +30% damage.',
    stats: withArch(['snipe', 'mortar'], (s) => { s.damage *= 1.3; }), fit: (t) => t.archetype === 'snipe' || t.archetype === 'mortar',
  },
  maelstrom: { name: 'Maelstrom', icon: 'wave', text: 'Vortexes pull 50% harder.', stats: withArch(['vortex'], (s) => { s.pull *= 1.5; }), fit: (t) => t.archetype === 'vortex' },
  warDrum: { name: 'War Drum', icon: 'bolt', text: 'Pulse towers fire 30% faster.', stats: withArch(['pulse'], (s) => { s.rate *= 1.3; }), fit: (t) => t.archetype === 'pulse' },
  orrery: { name: 'Orrery', icon: 'star', text: 'Orbit towers gain an extra orb.', stats: withArch(['orbit'], (s) => { s.orbs += 1; }), fit: (t) => t.archetype === 'orbit' },
  quickdraw: {
    name: 'Quickdraw', icon: 'bolt', text: 'Bolt and rapid towers fire 20% faster.',
    stats: withArch(['bolt', 'rapid'], (s) => { s.rate *= 1.2; }), fit: (t) => t.archetype === 'bolt' || t.archetype === 'rapid',
  },
  // ---- conditional damage
  stunning: { name: 'Stunning', icon: 'star', text: '+150% damage to stunned enemies.', dmg: (t, e) => (e.statuses.stun > 0 ? 2.5 : 1), fit: (t) => !!t.fx?.stun },
  frostbite: {
    name: 'Frostbite', icon: 'snowflake', text: '+30% damage to slowed or frozen enemies.',
    dmg: (t, e) => (e.statuses.slow > 0 || e.statuses.freeze > 0 ? 1.3 : 1), fit: (t) => !!(t.fx?.slow || t.fx?.freeze),
  },
  headsman: { name: 'Headsman', icon: 'skull', text: '+50% damage to bosses.', dmg: (t, e) => (e.boss ? 1.5 : 1) },
  luckyStar: {
    name: 'Lucky Star', icon: 'star', text: 'All towers +10% critical-hit chance.',
    stats: (t, s, fx) => {
      const c = fx.find((e) => e.type === 'crit');
      if (c) c.chance = (c.chance || 0) + 0.1;
      else fx.push({ type: 'crit', chance: 0.1, mult: 2 });
    },
  },
};

// ---- one relic per element: +25% damage for towers of that element
const ELEMENT_RELICS = [
  ['emberHeart', 'Ember Heart', 'fire', 'flame'], ['rimeCrown', 'Rime Crown', 'ice', 'snowflake'],
  ['oldRoot', 'Old Root', 'nature', 'leaf'], ['whetstone', 'Whetstone', 'metal', 'anchor'],
  ['stormglass', 'Stormglass', 'storm', 'bolt'], ['bedrock', 'Bedrock', 'earth', 'gem'],
  ['halo', 'Halo', 'light', 'star'], ['nightshade', 'Nightshade', 'shadow', 'skull'],
  ['grimoire', 'Grimoire', 'arcane', 'book'], ['tidecaller', 'Tidecaller', 'water', 'wave'],
];
for (const [id, name, el, icon] of ELEMENT_RELICS) {
  RELICS[id] = {
    name, icon, element: el, text: `${el[0].toUpperCase() + el.slice(1)} towers deal +25% damage.`,
    stats: (t, s) => { if (t.element === el) s.damage *= 1.25; },
    fit: (t) => t.element === el,
  };
}

export const RELIC_IDS = Object.keys(RELICS);
