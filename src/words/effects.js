// Effect construction (template → concrete params scaled to a word's power) and plain-language
// descriptions used in flavor text.

export const ON_HIT = new Set(['burn', 'poison', 'slow', 'freeze', 'stun', 'pierce', 'chain', 'splash', 'crit',
  'execute', 'armorBreak', 'knockback', 'bounty', 'reveal']);
export const PASSIVE = new Set(['heal', 'buff', 'shield', 'harvest', 'summon']);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const r2 = (v) => Math.round(v * 100) / 100;
export const r1 = (v) => Math.round(v * 10) / 10;

/**
 * @param {{type,sub,mult}} t template
 * @param {{P:number,f:number,L:number,cost:number,j:()=>number}} ctx
 *   P = power multiplier (1 = common 3-letter word), f = length factor, j = jitter in ~[0.95,1.05]
 */
export function makeEffect(t, ctx) {
  const m = t.mult == null ? 1 : t.mult;
  const { P, f, j } = ctx;
  const g = clamp(Math.sqrt(Math.max(0.3, f)) * m, 0.4, 3); // gentle intensity for chances/durations
  const s = Math.pow(Math.max(0.2, P), 0.85) * m;            // strength for dps/hp-like numbers
  switch (t.type) {
    case 'burn': return { type: 'burn', dps: r2(2 * s * j()), duration: r2((2.5 + 0.4 * g) * j()) };
    case 'poison': return { type: 'poison', dps: r2(1.3 * s * j()), duration: r2((4 + 0.5 * g) * j()) };
    case 'slow': return { type: 'slow', factor: r2(clamp((1 - 0.26 * g) * j(), 0.3, 0.9)), duration: r2((1.4 + 0.4 * g) * j()) };
    case 'freeze': return { type: 'freeze', chance: r2(clamp(0.1 * g * j(), 0.04, 0.45)), duration: r2((0.7 + 0.25 * g) * j()) };
    case 'stun': return { type: 'stun', chance: r2(clamp(0.09 * g * j(), 0.04, 0.4)), duration: r2((0.45 + 0.15 * g) * j()) };
    case 'pierce': return { type: 'pierce', count: Math.max(1, Math.round(g + 0.2)) };
    case 'chain': return { type: 'chain', jumps: Math.max(1, Math.round(1.4 * g + 0.4)), falloff: r2(clamp((0.62 + 0.05 * g) * j(), 0.55, 0.85)) };
    case 'splash': return { type: 'splash', radius: r2(clamp((0.6 + 0.25 * g) * j(), 0.5, 2)) };
    case 'crit': return { type: 'crit', chance: r2(clamp((0.1 + 0.05 * g) * j(), 0.05, 0.5)), mult: r2((1.8 + 0.2 * g) * j()) };
    case 'execute': return { type: 'execute', threshold: r2(clamp((0.06 + 0.03 * g) * j(), 0.05, 0.25)) };
    case 'armorBreak': return { type: 'armorBreak', amount: Math.max(1, Math.round(1.4 * g)), duration: r2((3 + g) * j()) };
    case 'knockback': return { type: 'knockback', cells: r2((0.4 + 0.2 * g) * j()), chance: r2(clamp(0.12 * g * j(), 0.05, 0.5)) };
    case 'bounty': return { type: 'bounty', mul: r2((1.15 + 0.1 * g) * j()) };
    case 'reveal': return { type: 'reveal' };
    case 'heal': return { type: 'heal', hps: r2(2.6 * s * j()) };
    case 'buff': {
      const stat = t.sub === 'rate' || t.sub === 'range' ? t.sub : 'damage';
      return { type: 'buff', stat, mul: r2(clamp((1.08 + 0.05 * g) * j(), 1.05, 1.6)) };
    }
    case 'shield': return { type: 'shield', amount: r1(12 * s * j()), interval: r2(clamp(8 / Math.sqrt(g) * j(), 4, 12)) };
    case 'harvest': {
      if (t.sub === 'tile') return { type: 'harvest', resource: 'tile', amount: 1, interval: r1(clamp(22 / g * j(), 7, 30)) };
      // +4 ink every 5 s for a 30-ink tower; scales with cost, slightly better for long words
      const amount = 4 * (ctx.cost / 30) * Math.pow(Math.max(1, f), 0.12) * m;
      return { type: 'harvest', resource: 'ink', amount: r1(Math.max(1, amount * j())), interval: 5 };
    }
    case 'summon': {
      const count = clamp(1 + Math.floor((ctx.L - 2) / 4) + (t.sub === 'horde' ? 1 : 0), 1, 4);
      return {
        type: 'summon',
        hp: Math.round(30 * Math.pow(Math.max(0.3, P), 0.9) * m * j()),
        damage: r2(3 * Math.pow(Math.max(0.3, P), 0.85) * m * j() / Math.sqrt(count)),
        count,
        interval: r1(clamp(10 * j(), 7, 14)),
      };
    }
    default: return null;
  }
}

const pct = (x) => `${Math.round((x - 1) * 100)}%`;

/** Short clause for flavor text. */
export function describeEffect(e) {
  switch (e.type) {
    case 'burn': return 'sets foes ablaze';
    case 'poison': return 'poisons';
    case 'slow': return 'slows foes';
    case 'freeze': return 'may freeze foes solid';
    case 'stun': return 'may stun';
    case 'pierce': return `pierces ${e.count} foe${e.count > 1 ? 's' : ''}`;
    case 'chain': return `arcs to ${e.jumps} more foe${e.jumps > 1 ? 's' : ''}`;
    case 'splash': return 'splashes nearby foes';
    case 'crit': return 'lands critical hits';
    case 'execute': return 'finishes off the weak';
    case 'armorBreak': return 'shreds armor';
    case 'knockback': return 'knocks foes back';
    case 'bounty': return 'earns extra ink per kill';
    case 'reveal': return 'spots hidden foes';
    case 'heal': return `repairs nearby towers (${e.hps} hp/s)`;
    case 'buff': return `boosts nearby towers' ${e.stat} +${pct(e.mul)}`;
    case 'shield': return `shields nearby towers every ${Math.round(e.interval)}s`;
    case 'harvest': return e.resource === 'tile'
      ? `grants a free rack redraw every ${Math.round(e.interval)}s`
      : `yields +${e.amount} ink every ${e.interval}s`;
    case 'summon': return `sends ${e.count} defender${e.count > 1 ? 's' : ''} onto the path every ${Math.round(e.interval)}s`;
    default: return '';
  }
}
