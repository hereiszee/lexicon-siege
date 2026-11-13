// Reward modals (relic choice, letter upgrade), relic emblems, inventory, new-enemy intro card.
import { h, clear } from './dom.js';
import { LETTER_VALUES } from '../core/constants.js';
import { enemyIcon } from './sprites.js';
import { ENEMY_INFO, ENEMY_NOTES } from './describe.js';
import { LETTER_KINDS } from '../game/letters.js';

const PCT_KINDS = new Set(['damage', 'rate', 'hp', 'crit', 'slow']);
const kindValue = (kind, tier) => { const k = LETTER_KINDS[kind]; return k ? (tier >= 2 ? k.gold : k.silver) : 0; };
/** "+10%" / "+0.25" — the number shown on the letter-upgrade cards. */
function shortValue(kind, tier) {
  const v = kindValue(kind, tier);
  return PCT_KINDS.has(kind) ? `+${Math.round(v * 100)}%` : `+${v}`;
}
/** "+10% damage" — one letter's bonus at a tier, for tower cards. */
export function letterLine(kind, tier) {
  const k = LETTER_KINDS[kind];
  return k ? k.label(kindValue(kind, tier)) : String(kind || 'bonus');
}

/* ------------------------------------------------------------------ emblems */
// White glyphs on a 24×24 grid; "C" is replaced by the emblem colour (cut-outs).
const GLYPHS = {
  shield: '<path d="M12 2 20 5v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/><path d="M12 6v12" stroke="C" stroke-width="2"/>',
  bird: '<path d="M2 13c3-4 7-5 10-2 2-4 6-6 10-6-2 2-3 5-5 8-3 4-10 6-15 0z"/><circle cx="18" cy="8" r="1" fill="C"/>',
  star: '<path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/>',
  coin: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7" fill="none" stroke="C" stroke-width="1.6"/><path d="M12 7.5v9" stroke="C" stroke-width="2"/>',
  eye: '<path d="M1.5 12C5 5.5 19 5.5 22.5 12 19 18.5 5 18.5 1.5 12z"/><circle cx="12" cy="12" r="4" fill="C"/><circle cx="13.3" cy="10.7" r="1.3"/>',
  flame: '<path d="M12 1.5c2 5.5 7.5 8 7.5 14 0 4-3.3 7-7.5 7s-7.5-3-7.5-7c0-4 3-5.5 4-9.5 1 3 2 4.5 3 5.5 1-3 .5-6.5.5-10z"/><path d="M12 22c-2 0-3.5-1.4-3.5-3.3 0-2 1.7-3 2.5-5 .8 1.8 4.5 3 4.5 5 0 1.9-1.5 3.3-3.5 3.3z" fill="C"/>',
  snowflake: '<g stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10"/><path d="M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3 10.5l3.7-.7-1.2-3.6M21 13.5l-3.7.7 1.2 3.6M3 13.5l3.7.7-1.2 3.6M21 10.5l-3.7-.7 1.2-3.6"/></g>',
  bolt: '<path d="M14 1 4 14h7l-2 9 11-14h-7z"/>',
  heart: '<path d="M12 21.5C5 15.5 2 12.5 2 8.2 2 5.2 4.4 3 7.2 3c2 0 3.7 1.1 4.8 2.8C13.1 4.1 14.8 3 16.8 3 19.6 3 22 5.2 22 8.2c0 4.3-3 7.3-10 13.3z"/>',
  hourglass: '<path d="M5 2h14v2.5c0 4-4 6-5 7.5 1 1.5 5 3.5 5 7.5V22H5v-2.5c0-4 4-6 5-7.5-1-1.5-5-3.5-5-7.5z"/><path d="M8.5 19.5c0-2 2.5-3.5 3.5-4.5 1 1 3.5 2.5 3.5 4.5z" fill="C"/>',
  book: '<path d="M2.5 5c3-1.3 6.3-1.3 9 .8V21c-2.7-1.8-6-1.8-9-.6zM12.5 5.8c2.7-2.1 6-2.1 9-.8v15.4c-3-1.2-6.3-1.2-9 .6z"/>',
  crown: '<path d="M2.5 18 1.5 6.5l6 4.5L12 3.5l4.5 7.5 6-4.5-1 11.5z"/><path d="M2.5 19.5h19v2.5h-19z"/>',
  skull: '<path d="M12 1.5c-5.5 0-9 4-9 8.8 0 3 1.5 5 4 6.2v3.8c0 1 .6 1.7 1.6 1.7h6.8c1 0 1.6-.7 1.6-1.7v-3.8c2.5-1.2 4-3.2 4-6.2 0-4.8-3.5-8.8-9-8.8z"/><circle cx="8.3" cy="10.8" r="2.4" fill="C"/><circle cx="15.7" cy="10.8" r="2.4" fill="C"/><path d="M10.5 18.5v3M13.5 18.5v3" stroke="C" stroke-width="1.3"/>',
  leaf: '<path d="M21 2.5C10.5 2.5 3.5 8 3.5 15.5c0 2 .5 3.8 1.5 5.3 1.7-2.8 4.3-5.5 8-8.3-3 3-5.2 6-6.4 9 9.4.6 14.4-6.7 14.4-19z"/>',
  wave: '<g stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M1.5 8.5c3-3 6-3 9 0s6.5 3 11-1"/><path d="M1.5 15.5c3-3 6-3 9 0s6.5 3 11-1"/></g>',
  anchor: '<g stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"><circle cx="12" cy="4.5" r="2.3"/><path d="M12 7v14.5M7 10.5h10M3.5 13c0 5 3.8 8.5 8.5 8.5s8.5-3.5 8.5-8.5"/></g>',
  gem: '<path d="M6.5 3h11L23 9 12 21.5 1 9z"/><path d="M1 9h22M9 3 7.5 9 12 21.5M15 3l1.5 6L12 21.5" stroke="C" stroke-width="1.1" fill="none"/>',
  key: '<g stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"><circle cx="7" cy="12" r="4.3"/><path d="M11.3 12H22M18.5 12v4M21.5 12v3"/></g>',
};
const ICON_COLORS = {
  shield: '#5b6e9c', bird: '#3f9bc4', star: '#e39b14', coin: '#c9971a', eye: '#8a63d2', flame: '#e0522a',
  snowflake: '#4aa3d8', bolt: '#7b5cd6', heart: '#d9434f', hourglass: '#9a6b3c', book: '#2f6fb5', crown: '#d1910f',
  skull: '#4a3f5c', leaf: '#4f9d4a', wave: '#2f7fb5', anchor: '#3f5487', gem: '#c2478f', key: '#b88a1a',
};

export function iconColor(icon) { return ICON_COLORS[icon] || '#5b6e9c'; }

/** Flat vector badge: coloured disc with a darker extrusion to the lower-left and a white glyph. */
export function emblem(icon, size = 72) {
  const col = iconColor(icon);
  const glyph = (GLYPHS[icon] || GLYPHS.star).replaceAll('"C"', `"${col}"`);
  const el = h('span', { class: 'emblem-badge', style: { width: size + 'px', height: size + 'px' }, 'aria-hidden': 'true' });
  // trusted constant markup (own glyph table + own colours only)
  el.innerHTML = `<svg viewBox="0 0 48 48" width="${size}" height="${size}"><circle cx="21.5" cy="26.5" r="19.5" fill="#000" opacity=".16"/>` +
    `<circle cx="23" cy="25" r="20" fill="${shade(col)}"/><circle cx="25" cy="23" r="20" fill="${col}"/>` +
    `<g transform="translate(13 11)" fill="#fff">${glyph}</g></svg>`;
  return el;
}

function shade(hex) {
  const v = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(c * 0.62);
  return `rgb(${f(v >> 16)},${f((v >> 8) & 255)},${f(v & 255)})`;
}

export function relicInfo(RELICS, id) {
  const r = RELICS?.[id];
  return { name: r?.name || String(id).toUpperCase(), text: r?.text || '', icon: r?.icon || 'star' };
}

/* ------------------------------------------------------------------- modal */
const KIND_NAMES = { damage: 'DAMAGE', rate: 'RATE', range: 'RANGE', hp: 'HEALTH', splash: 'SPLASH', pierce: 'PIERCE', chain: 'CHAIN', crit: 'CRIT', burn: 'BURN', slow: 'SLOW', poison: 'POISON', ink: 'INK' };

function tierName(t) { return t >= 2 ? 'GOLD' : t === 1 ? 'SILVER' : ''; }

/**
 * Builds the reward modal for state.reward. opts: { game, RELICS, onTake(i), onReroll(i), onHide() }.
 * Returns the wrapper element.
 */
export function rewardModal(reward, opts) {
  const { game, RELICS } = opts;
  const relic = reward.kind === 'relic';
  const canReroll = (i) => (Array.isArray(reward.rerolls) ? reward.rerolls[i] > 0 : reward.rerolls > 0);
  const rerolled = opts.rerolled || new Set();
  const cols = (reward.options || []).map((o, i) => {
    const take = h('button', { class: 'pill slate take', onclick: () => opts.onTake(i) }, 'TAKE');
    const reroll = canReroll(i)
      ? h('button', { class: 'pill outline reroll', onclick: () => opts.onReroll(i) }, 'REROLL')
      : h('div', { class: 'reroll-used' }, rerolled.has(i) ? 'REROLL USED' : '');
    if (relic) {
      const r = relicInfo(RELICS, o);
      return h('div', { class: 'reward-col' }, emblem(r.icon, 92),
        h('div', { class: 'reward-name', style: { color: iconColor(r.icon) } }, r.name.toUpperCase()),
        h('p', { class: 'reward-text' }, r.text), h('div', { class: 'flex' }), take, reroll);
    }
    const letter = String(o.letter || '?').toLowerCase();
    const inRack = (game.state.rack || []).filter((c) => c === letter).length;
    const tier = o.tier || 1;
    const kind = typeof o.bonus === 'string' ? o.bonus : o.bonus?.kind || '';
    return h('div', { class: 'reward-col', title: o.text || '' },
      h('div', { class: 'in-rack' }, h('b', null, String(inRack)), ' in rack'),
      h('div', { class: 'tile huge ' + (tier >= 2 ? 'silver' : ''), 'aria-label': letter.toUpperCase() },
        h('span', { class: 'l' }, letter.toUpperCase()), h('span', { class: 'n' }, String(LETTER_VALUES[letter] ?? ''))),
      h('div', { class: 'tier-label' }, tier >= 2 ? h('span', null, 'SILVER ', h('i', null, '→'), ' GOLD') : 'Make Silver'),
      h('div', { class: 'reward-name slate' }, KIND_NAMES[kind] || String(kind || 'BONUS').toUpperCase()),
      h('div', { class: 'reward-val' }, tier >= 2 ? [shortValue(kind, 1), h('i', null, ' → '), h('b', null, shortValue(kind, 2))] : shortValue(kind, 1)),
      h('div', { class: 'flex' }), take, reroll);
  });
  const modal = h('div', { class: 'modal reward', role: 'dialog', 'aria-modal': 'true', 'aria-label': relic ? 'Choose a relic' : 'Upgrade a letter' },
    h('header', { class: 'modal-bar' },
      h('div', { class: 'modal-title' }, relic ? 'Choose a Relic' : 'Upgrade a Letter'),
      h('div', { class: 'modal-sub' }, relic
        ? 'Relics last until the end of this level. Pick one.'
        : 'Letter upgrade bonuses are applied to buildings when they are created. Existing buildings will be unaffected by this upgrade.')),
    h('div', { class: 'reward-cols' }, cols));
  return h('div', { class: 'modal-wrap reward-wrap' },
    h('div', { class: 'reward-stack' }, modal,
      h('button', { class: 'pill outline hide-btn', title: 'Look at the board (Esc). Reopen from the pill or START WAVE.', onclick: opts.onHide }, 'HIDE')));
}

/* --------------------------------------------------------------- inventory */
export function renderInventory(el, relicIds, RELICS) {
  clear(el);
  if (!relicIds.length) {
    el.append(h('div', { class: 'inv-slots' }, [0, 1, 2].map(() => h('div', { class: 'inv-slot' }))),
      h('div', { class: 'inv-note' }, 'Relics you earn appear here'));
    return;
  }
  el.append(h('div', { class: 'inv-relics' }, relicIds.map((id) => {
    const r = relicInfo(RELICS, id);
    return h('div', { class: 'inv-relic', tabindex: '0', 'aria-label': `${r.name}: ${r.text}`, dataset: { tip: `${r.name.toUpperCase()} — ${r.text}` } }, emblem(r.icon, 34));
  })));
}

/* ----------------------------------------------------------- new enemy intro */
export function enemyIntro(type, onClose) {
  const name = (ENEMY_INFO[type] || type).toUpperCase();
  const note = (ENEMY_NOTES[type] || '').replace(/\.$/, '');
  return h('div', { class: 'intro-card', role: 'status' },
    h('img', { src: enemyIcon(type, 56), alt: '' }),
    h('div', { class: 'intro-text' }, h('b', null, `NEW: ${name}`), note ? ` — ${note.charAt(0).toLowerCase()}${note.slice(1)}` : ''),
    h('button', { class: 'x', title: 'Got it', 'aria-label': 'Dismiss', onclick: onClose }, '×'));
}
