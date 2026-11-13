// Level rules, theme bonus and letter bag. Pure functions, no dependency on the words module.

import { ELEMENTS, OPPOSITE, LETTER_WEIGHTS } from '../core/constants.js';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const COMMON_LETTERS = ['e', 'a', 'r', 's', 't', 'n', 'o', 'i', 'l'];
// Consonants that are safe to ban (never the backbone of English spelling).
const BANNABLE = ['b', 'c', 'd', 'f', 'g', 'h', 'k', 'm', 'p', 'v', 'w', 'y', 'j', 'q', 'x', 'z'];
const LATE_VOWELS = ['u', 'o', 'i']; // a and e are never banned

export const RULE_TYPES = ['minLength', 'maxLength', 'mustContain', 'banLetter', 'towerLimit', 'banElement'];

/** Which rule types are available at difficulty d (introduced gradually). */
function availableTypes(d) {
  const t = [];
  if (d > 10) t.push('minLength', 'towerLimit');
  if (d > 20) t.push('maxLength');
  if (d > 35) t.push('mustContain');
  if (d > 50) t.push('banLetter');
  if (d > 70) t.push('banElement');
  return t;
}

function ruleCountFor(rng, d) {
  if (d <= 10) return 0;
  if (d <= 30) return rng.chance(0.4) ? 1 : 0;
  if (d <= 100) return rng.chance(0.65) ? 1 : 0;
  const pTwo = Math.min(0.55, 0.15 + (d - 100) / 1500);
  const r = rng.next();
  return r < pTwo ? 2 : r < 0.85 ? 1 : 0;
}

/**
 * Generate 0–2 non-contradictory rules.
 * @param ctx { word, bonusElement, waveCount }
 */
export function generateRules(rng, d, { word, bonusElement, waveCount }) {
  const n = ruleCountFor(rng, d);
  const rules = [];
  const avail = availableTypes(d);
  const banned = new Set();
  let must = null;
  let guard = 0;
  while (rules.length < n && guard++ < 20) {
    const type = rng.pick(avail);
    if (type !== 'banLetter' && rules.some((r) => r.type === type)) continue;
    let rule = null;
    switch (type) {
      case 'minLength': {
        if (rules.some((r) => r.type === 'maxLength')) break;
        const len = d > 60 && rng.chance(0.4) ? 4 : 3;
        rule = { type, n: len, text: `Words must be at least ${len} letters long` };
        break;
      }
      case 'maxLength': {
        if (must || rules.some((r) => r.type === 'minLength')) break;
        const len = d > 200 ? rng.int(5, 7) : rng.int(6, 8);
        rule = { type, n: len, text: `Words may be at most ${len} letters long` };
        break;
      }
      case 'mustContain': {
        if (rules.some((r) => r.type === 'maxLength')) break; // short words that must hold X: too few to play
        const opts = COMMON_LETTERS.filter((l) => !banned.has(l));
        must = rng.pick(opts);
        rule = { type, letter: must, text: `Every word must contain ${must.toUpperCase()}` };
        break;
      }
      case 'banLetter': {
        if (banned.size >= 2) break;
        // vowels (never a/e, at most one) only from level 100 on
        const vowelBan = d >= 100 && rng.chance(0.15) && ![...banned].some((l) => 'aeiou'.includes(l));
        // never ban a letter of the level word, a required letter, or one already banned
        const pool = (vowelBan ? LATE_VOWELS : BANNABLE).filter((l) => l !== must && !banned.has(l) && !word.includes(l));
        if (!pool.length) break;
        const letter = rng.pick(pool);
        banned.add(letter);
        rule = { type, letter, text: `The letter ${letter.toUpperCase()} is banned` };
        break;
      }
      case 'towerLimit': {
        const lim = Math.max(8, Math.round(waveCount * 0.7) + 6);
        rule = { type, n: lim, text: `Build at most ${lim} towers` };
        break;
      }
      case 'banElement': {
        const opts = ELEMENTS.filter((e) => e !== bonusElement);
        const el = rng.pick(opts);
        rule = { type, element: el, text: `${cap(el)} words are forbidden` };
        break;
      }
    }
    if (rule) rules.push(rule);
  }
  return rules;
}

/** Bag weights: defaults, banned letters zeroed, required/level-word letters gently boosted. */
export function makeLetterWeights(word, rules) {
  const w = { ...LETTER_WEIGHTS };
  for (const l of new Set(word)) if (w[l] !== undefined) w[l] += 1;
  for (const r of rules) if (r.type === 'banLetter') w[r.letter] = 0;
  for (const r of rules) {
    if (r.type !== 'mustContain') continue;
    // required letter ≥ 15% of the bag, so a 10-tile rack misses it < 25% of the time
    const rest = Object.values(w).reduce((a, b) => a + b, 0) - w[r.letter];
    w[r.letter] = Math.max(Math.ceil(w[r.letter] * 1.5), Math.ceil((0.15 * rest) / 0.85));
  }
  return w;
}

/** Theme bonus from the level word's TowerSpec. */
export function makeBonus(spec, element, d) {
  const tags = Array.isArray(spec?.tags)
    ? [...new Set(spec.tags.filter((t) => typeof t === 'string' && t))].slice(0, 3)
    : [];
  const pct = 20 + Math.round(10 * Math.min(1, d / 500)); // 20% → 30%
  const mul = 1 + pct / 100;
  const shown = tags.filter((t) => t !== element); // avoid "Light words and light words"
  const tagText = shown.length ? ` and ${shown.join('/')} words` : '';
  return { tags, element, mul, text: `${cap(element)} words${tagText} are ${pct}% stronger` };
}

/** Enemies are attuned against the level word's element, so theme words hit them hard. */
export function enemyElementFor(wordElement) {
  return OPPOSITE[wordElement] || wordElement;
}

/**
 * Check a word against the level's rules.
 * ctx = { usedWords:Set<string>, towerCount:number, wave:number, action?:'tower'|'augment' }
 */
export function checkWordRules(word, spec, level, ctx = {}) {
  const w = String(word || '').toLowerCase();
  // word reuse is enforced by the engine before this is called
  for (const r of level?.rules || []) {
    switch (r.type) {
      case 'minLength':
        if (w.length < r.n) return { ok: false, reason: `Too short — this level needs words of ${r.n}+ letters` };
        break;
      case 'maxLength':
        if (w.length > r.n) return { ok: false, reason: `Too long — words here are capped at ${r.n} letters` };
        break;
      case 'mustContain':
        if (!w.includes(r.letter)) return { ok: false, reason: `Every word here must contain ${r.letter.toUpperCase()}` };
        break;
      case 'banLetter':
        if (w.includes(r.letter)) return { ok: false, reason: `The letter ${r.letter.toUpperCase()} is banned on this level` };
        break;
      case 'towerLimit':
        if (ctx.action !== 'augment' && (ctx.towerCount || 0) >= r.n) {
          return { ok: false, reason: `Tower limit reached (${r.n}) — augment or sell a tower instead` };
        }
        break;
      case 'banElement':
        if (spec && spec.element === r.element) return { ok: false, reason: `${cap(r.element)} words are forbidden on this level` };
        break;
    }
  }
  return { ok: true };
}

/** Damage/output multiplier for a tower spec on this level (1 if no theme match). */
export function themeBonus(spec, level) {
  const b = level?.bonus;
  if (!b || !spec) return 1;
  if (b.element && spec.element === b.element) return b.mul;
  if (Array.isArray(spec.tags) && b.tags?.length && spec.tags.some((t) => b.tags.includes(t))) return b.mul;
  return 1;
}
