// Tower cards (preview / lexicon) and the tower inspect panel.
import { h, fmt, cap } from './dom.js';
import { archetypeInfo, effectText, augmentSummary, dpsOf, isAttacker, isContinuous, RARITY_COLORS } from './describe.js';
import { elementColor, towerIcon, towerName } from './sprites.js';
import { DEFAULTS } from '../core/constants.js';

function statRows(archetype, stats, withHp = true) {
  const s = stats || {};
  const rows = [];
  if (isAttacker(archetype)) {
    rows.push([isContinuous(archetype) ? 'DPS' : 'Damage', fmt(s.damage)]);
    if (archetype === 'orbit') rows.push(['Orbs', fmt(s.orbs || 1)]);
    else if (!isContinuous(archetype)) rows.push([archetype === 'trap' ? 'Re-arm' : 'Rate', `${fmt(s.rate)}/s`], ['DPS', fmt(dpsOf(archetype, s))]);
  }
  if (s.range || (archetype !== 'wall' && archetype !== 'trap')) rows.push(['Range', fmt(s.range)]);
  if (s.minRange) rows.push(['Min range', fmt(s.minRange)]);
  if (s.pull) rows.push(['Pull', `${fmt(s.pull)}/s`]);
  if (s.splash) rows.push(['Splash', fmt(s.splash)]);
  if (withHp) rows.push(['Health', fmt(s.hp)]);
  return h('div', { class: 'stats' }, rows.map(([k, v]) => h('div', { class: 'stat' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v))));
}

function chip(text, color) {
  const el = h('span', { class: 'chip' }, text);
  if (color) el.style.setProperty('--chip', color);
  return el;
}

/**
 * Card for a TowerSpec. opts: { ink, themeMul, compact, count, footer, letterBonuses:[{letter,tier,count,text}] }
 */
export function towerCard(spec, opts = {}) {
  const info = archetypeInfo(spec.archetype);
  const col = spec.color || elementColor(spec.element);
  const icon = towerIcon(spec, 56);
  const effects = (spec.effects || []).map(effectText).filter(Boolean);
  const afford = opts.ink == null ? null : opts.ink >= spec.cost;
  return h('article', { class: 'card' + (opts.compact ? ' compact' : '') },
    h('header', { class: 'card-bar' },
      icon ? h('img', { class: 'card-icon', src: icon, alt: '' }) : null,
      h('div', { class: 'card-title' },
        h('div', { class: 'card-word' }, spec.word.toUpperCase()),
        h('div', { class: 'card-tags' },
          chip(info.name),
          chip(cap(spec.element), col),
          chip(cap(spec.rarity || 'common'), RARITY_COLORS[spec.rarity]),
          opts.count ? h('span', { class: 'count' }, `×${opts.count}`) : null),
      ),
      h('div', { class: 'card-cost' + (afford === false ? ' short' : '') },
        h('span', { class: 'n' }, String(spec.cost)), h('span', { class: 'u' }, 'ink')),
    ),
    h('div', { class: 'card-body' },
      h('p', { class: 'desc' }, info.desc),
      statRows(spec.archetype, spec.stats),
      effects.length ? h('ul', { class: 'effects' }, effects.map((e) => h('li', null, e))) : null,
      opts.letterBonuses?.length ? h('ul', { class: 'letter-bonuses' }, opts.letterBonuses.map((b) => h('li', null,
        h('span', { class: 'mini-tile ' + (b.tier >= 2 ? 'gold' : 'silver') }, b.letter.toUpperCase()),
        ` ${b.text}${b.count > 1 ? ` ×${b.count}` : ''}`))) : null,
      opts.themeMul > 1 ? h('p', { class: 'theme' }, `Theme bonus on this level: +${Math.round((opts.themeMul - 1) * 100)}% output`) : null,
      spec.augment ? h('p', { class: 'aug' },
        h('b', null, `Can also augment`), ` (${spec.augment.kind}, ${spec.augment.cost} ink): `, augmentSummary(spec.augment)) : null,
      opts.ink != null ? h('p', { class: 'afford' + (afford ? '' : ' short') },
        afford ? `Costs ${spec.cost} ink · you have ${Math.floor(opts.ink)}` : `Needs ${spec.cost} ink · you have ${Math.floor(opts.ink)}`) : null,
      spec.flavor ? h('p', { class: 'flavor' }, spec.flavor) : null,
      opts.footer || null,
    ),
  );
}

/** Inspect panel for a placed tower. opts: { onSell, onClose } */
export function towerInspect(t, opts = {}) {
  const spec = t.spec || {};
  const arch = spec.archetype;
  const info = archetypeInfo(arch);
  const col = elementColor(t.element);
  const icon = towerIcon({ ...spec, word: t.word, element: t.element, color: col }, 56);
  const effects = (t.effects || []).map(effectText).filter(Boolean);
  const refund = Math.floor((t.spent || 0) * DEFAULTS.sellRefund);
  const hpTxt = `${Math.ceil(t.hp)} / ${Math.ceil(t.maxHp)}`;
  return h('article', { class: 'card inspect' },
    h('header', { class: 'card-bar' },
      icon ? h('img', { class: 'card-icon', src: icon, alt: '' }) : null,
      h('div', { class: 'card-title' },
        h('div', { class: 'card-word' }, towerName(t)),
        h('div', { class: 'card-tags' }, chip(info.name), chip(cap(t.element), col), t.disabled ? chip('Disabled', '#d0402b') : null),
      ),
      h('button', { class: 'x', title: 'Close (Esc)', onclick: opts.onClose }, '×'),
    ),
    h('div', { class: 'card-body' },
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('span', { class: 'k' }, 'Health'), h('span', { class: 'v' }, hpTxt)),
        h('div', { class: 'stat' }, h('span', { class: 'k' }, 'Kills'), h('span', { class: 'v' }, String(t.kills || 0))),
        h('div', { class: 'stat' }, h('span', { class: 'k' }, 'Damage'), h('span', { class: 'v' }, Math.round(t.damageDealt || 0).toLocaleString('en-US'))),
      ),
      statRows(arch, t.stats, false),
      effects.length ? h('ul', { class: 'effects' }, effects.map((e) => h('li', null, e))) : null,
      (t.augments || []).length
        ? h('div', { class: 'augs' }, h('div', { class: 'label' }, `Augments ${t.augments.length}/${DEFAULTS.maxAugments}`),
          t.augments.map((a) => h('div', { class: 'augrow' }, h('b', null, a.word.toUpperCase()), ' ', augmentSummary(a.augment))))
        : h('p', { class: 'hint' }, `No augments yet. Spell a verb or adjective, then click this tower (up to ${DEFAULTS.maxAugments}).`),
      h('div', { class: 'row-end' },
        h('button', { class: 'pill outline', onclick: opts.onSell }, `Sell +${refund} ink`)),
    ),
  );
}
