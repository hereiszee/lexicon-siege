// Meaning resolution: (1) curated lexicon, (2) derived — inflections, affixes, compounds resolved to
// curated roots, (3) null → caller falls back to procedural.

import { LEXICON } from './lexicon/index.js';
import { IRREGULAR_REVERSE } from './morph.js';

/**
 * Twist multipliers applied on top of the root concept.
 * power/cost/rate/range/hp multiply; invert flips element to its opposite.
 */
export const TWISTS = {
  plural: { power: 0.97, rate: 1.12, note: 'many' },
  past: { hp: 1.06, note: 'done' },
  participle: { hp: 1.06 },
  progressive: { rate: 1.1, power: 0.97 },
  comparative: { power: 1.1, cost: 1.04 },
  superlative: { power: 1.2, cost: 1.08 },
  agent: { hp: 1.1, power: 1.03 },
  quality: { range: 1.1 },
  abstract: { range: 1.08, power: 0.97 },
  less: { invert: true, power: 0.85, cost: 0.9 },
  full: { power: 1.08 },
  adverb: { rate: 1.05 },
  mild: { power: 0.93, cost: 0.9 },
  adj: { range: 1.03 },
  verbal: { rate: 1.05 },
  small: { power: 0.82, cost: 0.8, rate: 1.2 },
  big: { power: 1.25, cost: 1.15, range: 1.05 },
  again: { rate: 1.15, power: 0.95 },
  invert: { invert: true, power: 0.95 },
  mis: { power: 0.9, rate: 1.05 },
  fore: { range: 1.15 },
  out: { power: 1.05, range: 1.05 },
  many: { rate: 1.1, power: 0.95 },
  compound: { power: 1.05 },
};

const P_NOUN = ['noun'], P_VERB = ['verb'], P_ADJ = ['adjective'], P_ADV = ['adverb'];
const has = (pos, p) => pos.has ? pos.has(p) : pos.includes(p);

function plainPos(rootPos) {
  return [...rootPos];
}
function pluralPos(rootPos) {
  const out = [];
  if (has(rootPos, 'noun')) out.push('noun');
  if (has(rootPos, 'verb')) out.push('verb');
  return out.length ? out : ['noun'];
}
function pastPos(rootPos) {
  return has(rootPos, 'verb') ? ['verb', 'adjective'] : ['adjective'];
}
function ingPos(rootPos) {
  return has(rootPos, 'verb') ? ['noun', 'verb', 'adjective'] : ['noun', 'adjective'];
}

const dedouble = (s) => (s.length >= 3 && s[s.length - 1] === s[s.length - 2] && !'aeiou'.includes(s[s.length - 1]) ? s.slice(0, -1) : null);

// [suffix, stem builders, twist, posFn, minRootLen, requireRootPos?]
const STEM = {
  plain: (s) => [s],
  plainE: (s) => [s, s + 'e'],
  plainED: (s) => [s, s + 'e', dedouble(s)],
  y: (s) => [s + 'y'],
  fe: (s) => [s + 'f', s + 'fe'],
  ie: (s) => [s + 'ie'],
  c: (s) => [s + 'c'],
  le: (s) => [s + 'le'],
  ate: (s) => [s, s + 'e', s + 'ate'],
};

const INFLECT = [
  ['ies', STEM.y, 'plural', pluralPos, 2],
  ['ves', STEM.fe, 'plural', pluralPos, 2],
  ['es', STEM.plain, 'plural', pluralPos, 2, null, /(s|x|z|ch|sh|o)$/],
  ['s', STEM.plain, 'plural', pluralPos, 2, null, /[^su]$/],
  ['ied', STEM.y, 'past', pastPos, 2],
  ['ed', STEM.plainED, 'past', pastPos, 4],
  ['ying', STEM.ie, 'progressive', ingPos, 1],
  ['cking', STEM.c, 'progressive', ingPos, 3, 'verb'],
  ['ing', STEM.plainED, 'progressive', ingPos, 3, 'verb'],
  ['iest', STEM.y, 'superlative', () => P_ADJ, 2, 'adjective'],
  ['ier', STEM.y, 'comparative', () => P_ADJ, 2, 'adjective'],
  ['est', STEM.plainED, 'superlative', () => P_ADJ, 3, 'adjective'],
  ['er', STEM.plainED, 'comparative', () => P_ADJ, 3, 'adjective'],
];

const DERIVE = [
  ['iness', STEM.y, 'quality', () => P_NOUN, 2],
  ['ness', STEM.plain, 'quality', () => P_NOUN, 3],
  ['lessly', STEM.plain, 'less', () => P_ADV, 3],
  ['lessness', STEM.plain, 'less', () => P_NOUN, 3],
  ['less', STEM.plain, 'less', () => P_ADJ, 3],
  ['fully', STEM.plain, 'full', () => P_ADV, 3],
  ['iful', STEM.y, 'full', () => P_ADJ, 2],
  ['ful', STEM.plain, 'full', () => P_ADJ, 3],
  ['ically', STEM.c, 'adverb', () => P_ADV, 3],
  ['ically', STEM.plain, 'adverb', () => P_ADV, 3],
  ['ily', STEM.y, 'adverb', () => P_ADV, 2],
  ['ly', STEM.le, 'adverb', () => P_ADV, 2],
  ['ly', STEM.plain, 'adverb', () => P_ADV, 3],
  ['ishly', STEM.plainED, 'adverb', () => P_ADV, 3],
  ['ish', STEM.plainED, 'mild', () => P_ADJ, 3],
  ['like', STEM.plain, 'adj', () => P_ADJ, 3],
  ['er', STEM.plainED, 'agent', () => P_NOUN, 3],
  ['or', STEM.plainE, 'agent', () => P_NOUN, 3],
  ['ist', STEM.plainE, 'agent', () => P_NOUN, 3],
  ['ian', STEM.plainE, 'agent', () => P_NOUN, 3],
  ['eer', STEM.plain, 'agent', () => P_NOUN, 3],
  ['ess', STEM.plain, 'agent', () => P_NOUN, 3],
  ['ism', STEM.plainE, 'abstract', () => P_NOUN, 3],
  ['dom', STEM.plain, 'abstract', () => P_NOUN, 3],
  ['hood', STEM.plain, 'abstract', () => P_NOUN, 3],
  ['ship', STEM.plain, 'abstract', () => P_NOUN, 3],
  ['ment', STEM.plain, 'abstract', () => P_NOUN, 3],
  ['ance', STEM.plainE, 'abstract', () => P_NOUN, 3],
  ['ence', STEM.plainE, 'abstract', () => P_NOUN, 3],
  ['age', STEM.plainE, 'abstract', () => P_NOUN, 3],
  ['ery', STEM.plainED, 'abstract', () => P_NOUN, 3],
  ['ry', STEM.plain, 'abstract', () => P_NOUN, 4],
  ['ation', STEM.ate, 'abstract', () => P_NOUN, 3],
  ['ition', STEM.plainE, 'abstract', () => P_NOUN, 3],
  ['ion', STEM.plainE, 'abstract', () => P_NOUN, 3],
  ['ability', STEM.plainE, 'quality', () => P_NOUN, 3],
  ['ity', STEM.plainE, 'quality', () => P_NOUN, 3],
  ['able', STEM.plainED, 'adj', () => P_ADJ, 3],
  ['ible', STEM.plainE, 'adj', () => P_ADJ, 3],
  ['ive', STEM.plainE, 'adj', () => P_ADJ, 3],
  ['ical', STEM.plainE, 'adj', () => P_ADJ, 3],
  ['ial', STEM.plainE, 'adj', () => P_ADJ, 3],
  ['al', STEM.plainE, 'adj', () => P_ADJ, 3],
  ['ic', STEM.plainE, 'adj', () => P_ADJ, 3],
  ['ious', STEM.y, 'adj', () => P_ADJ, 2],
  ['ous', STEM.plainE, 'adj', () => P_ADJ, 3],
  ['en', STEM.plainED, 'adj', () => ['verb', 'adjective'], 3],
  ['y', STEM.plainED, 'adj', () => P_ADJ, 3],
  ['ize', STEM.plainE, 'verbal', () => P_VERB, 3],
  ['ise', STEM.plainE, 'verbal', () => P_VERB, 3],
  ['ify', STEM.plainE, 'verbal', () => P_VERB, 3],
  ['ling', STEM.plain, 'small', () => P_NOUN, 3],
  ['let', STEM.plain, 'small', () => P_NOUN, 3],
  ['ette', STEM.plain, 'small', () => P_NOUN, 3],
  ['kin', STEM.plain, 'small', () => P_NOUN, 3],
  ['ward', STEM.plain, 'adj', () => ['adjective', 'adverb'], 3],
  ['wards', STEM.plain, 'adverb', () => P_ADV, 3],
  ['some', STEM.plain, 'adj', () => P_ADJ, 3],
];

const PREFIXES = [
  ['un', 'invert'], ['non', 'invert'], ['dis', 'invert'], ['anti', 'invert'], ['counter', 'invert'],
  ['re', 'again'], ['over', 'big'], ['super', 'big'], ['hyper', 'big'], ['ultra', 'big'], ['mega', 'big'],
  ['arch', 'big'], ['grand', 'big'], ['great', 'big'], ['giga', 'big'], ['under', 'small'], ['sub', 'small'],
  ['mini', 'small'], ['micro', 'small'], ['semi', 'small'], ['half', 'small'], ['demi', 'small'], ['nano', 'small'],
  ['pre', 'fore'], ['fore', 'fore'], ['out', 'out'], ['mis', 'mis'], ['mal', 'mis'], ['multi', 'many'],
  ['poly', 'many'], ['tri', 'many'], ['twin', 'many'], ['double', 'many'],
];

// heads where the modifier carries the meaning ("snowman" → snow)
const WEAK_HEADS = new Set(['man', 'men', 'woman', 'women', 'person', 'people', 'folk', 'folks', 'kind', 'like',
  'land', 'lands', 'stuff', 'thing', 'things', 'work', 'works', 'craft', 'ward', 'wards', 'ness', 'ish', 'ling', 'some']);

const MAX_DEPTH = 3;
const memo = new Map();

/**
 * @returns null | { source:'lexicon'|'derived', entry, root, twists:string[], pos:string[],
 *                   mod?: entry (compound modifier) }
 */
export function resolve(w) {
  return resolveAt(w, MAX_DEPTH);
}

function direct(w) {
  const e = LEXICON.get(w);
  return e ? { source: 'lexicon', entry: e, root: w, twists: [], pos: [...e.pos] } : null;
}

function resolveAt(w, depth) {
  const key = depth === MAX_DEPTH ? w : w + '#' + depth;
  if (memo.has(key)) return memo.get(key);
  if (memo.size > 200000) memo.clear();
  const r = direct(w) || (depth > 0 ? derive(w, depth) : null);
  memo.set(key, r);
  return r;
}

function withTwist(base, twist, posFn, root) {
  return {
    source: 'derived',
    entry: base.entry,
    mod: base.mod,
    root: base.root || root,
    twists: [...base.twists, twist],
    pos: posFn ? posFn(base.pos) : base.pos,
  };
}

function tryRules(w, rules, look) {
  for (const [suf, stems, twist, posFn, minRoot, needPos, guard] of rules) {
    if (w.length <= suf.length || !w.endsWith(suf)) continue;
    const s = w.slice(0, -suf.length);
    for (const cand of stems(s)) {
      if (!cand || cand.length < minRoot || cand.length < 2 || cand === w) continue;
      if (guard && !guard.test(cand)) continue;
      const base = look(cand);
      if (!base) continue;
      if (needPos && !base.pos.includes(needPos)) continue;
      return withTwist(base, twist, posFn, cand);
    }
  }
  return null;
}

const IRR_KIND = { past: ['past', pastPos], participle: ['participle', pastPos], plural: ['plural', pluralPos],
  comparative: ['comparative', () => P_ADJ], superlative: ['superlative', () => P_ADJ],
  adj: ['adj', () => P_ADJ], abstract: ['abstract', () => P_NOUN] };

// Two passes: first only accept analyses whose root is directly curated (so "unfrozen" = un+frozen,
// not un+froze+en), then allow recursive analyses.
function derive(w, depth) {
  return attempt(w, direct, true) || attempt(w, (c) => resolveAt(c, depth - 1), false);
}

function attempt(w, look, withCompound) {
  const irr = IRREGULAR_REVERSE.get(w);
  if (irr) {
    const base = look(irr.root);
    if (base) {
      const [t, pf] = IRR_KIND[irr.kind] || ['adj', plainPos];
      return withTwist(base, t, pf, irr.root);
    }
  }
  if (w.length < 4) return null;
  const r = tryRules(w, INFLECT, look) || tryRules(w, DERIVE, look);
  if (r) return r;
  for (const [pre, twist] of PREFIXES) {
    if (w.length - pre.length < 3 || !w.startsWith(pre)) continue;
    const base = look(w.slice(pre.length));
    if (base) return withTwist(base, twist, null, w.slice(pre.length));
  }
  return withCompound ? compound(w) : null;
}

function compound(w) {
  if (w.length < 6) return null;
  let best = null, bestScore = -1;
  for (let i = 3; i <= w.length - 3; i++) {
    const left = w.slice(0, i), right = w.slice(i);
    const head = LEXICON.has(right) ? direct(right)
      : WEAK_HEADS.has(right) ? { source: 'derived', entry: null, root: right, twists: [], pos: ['noun'] }
      : (right.length >= 4 ? shallow(right) : null);
    if (!head) continue;
    let mod = direct(left);
    if (!mod && left.length > 3 && left.endsWith('s')) mod = direct(left.slice(0, -1));
    if (!mod && left.length > 3) mod = shallow(left);
    if (!mod) continue;
    if (right.length === 3 && !WEAK_HEADS.has(right) && left.length < 4) continue;
    const score = (head.source === 'lexicon' ? 4 : 0) + (mod.source === 'lexicon' ? 3 : 0) + right.length * 0.5 + Math.min(left.length, right.length) * 0.3;
    if (score > bestScore) { bestScore = score; best = { head, mod, right, left }; }
  }
  if (!best) return null;
  const { head, mod, right, left } = best;
  if (WEAK_HEADS.has(right) || WEAK_HEADS.has(head.root)) {
    return { source: 'derived', entry: mod.entry, root: mod.root || left, twists: [...mod.twists, 'compound'], pos: ['noun'], tagPerson: /m[ae]n$|person|people|folk/.test(right) };
  }
  return { source: 'derived', entry: head.entry, mod: mod.entry, root: head.root || right, modRoot: mod.root || left, twists: [...head.twists, 'compound'], pos: head.pos };
}

// one level of inflection only (used for compound parts)
function shallow(w) {
  const r = memo.get(w + '#s');
  if (r !== undefined) return r;
  let out = null;
  const irr = IRREGULAR_REVERSE.get(w);
  if (irr && LEXICON.has(irr.root)) out = withTwist(direct(irr.root), 'plural', null, irr.root);
  else {
    for (const [suf, stems, twist, posFn, minRoot, needPos, guard] of INFLECT.concat(DERIVE.filter((d) => d[2] === 'agent'))) {
      if (w.length <= suf.length || !w.endsWith(suf)) continue;
      const s = w.slice(0, -suf.length);
      for (const cand of stems(s)) {
        if (!cand || cand.length < Math.max(3, minRoot) || (guard && !guard.test(cand))) continue;
        const d = direct(cand);
        if (!d || (needPos && !d.pos.includes(needPos))) continue;
        out = withTwist(d, twist, posFn, cand);
        break;
      }
      if (out) break;
    }
  }
  memo.set(w + '#s', out);
  return out;
}
