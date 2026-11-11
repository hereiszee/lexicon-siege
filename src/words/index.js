// WORDS module public API (see CONTRACT.md).

import { hashString } from '../core/rng.js';
import { resolve } from './derive.js';
import { proceduralTemplate, heuristicPos } from './procedural.js';
import { buildSpec, scoreWord as score } from './build.js';

export { createDictionary, loadDictionary } from './dictionary.js';

const ORDER = ['noun', 'verb', 'adjective', 'adverb'];
const CACHE_MAX = 20000;
const cache = new Map();

function normalize(word) {
  const w = String(word == null ? '' : word).toLowerCase().replace(/[^a-z]/g, '');
  return w || 'a';
}

function meaningFor(w) {
  const r = resolve(w);
  if (r) {
    const e = r.entry;
    let pos = ORDER.filter((p) => r.pos.includes(p));
    if (!pos.length) pos = ['noun'];
    return {
      source: r.source,
      tpl: e.tpl,
      augTpl: e.aug || null,
      modTpl: r.mod ? r.mod.tpl : null,
      twists: r.twists,
      pos,
      tagPerson: !!r.tagPerson,
      root: r.root,
    };
  }
  const pos = heuristicPos(w);
  return { source: 'procedural', tpl: proceduralTemplate(w, pos, hashString(w)), augTpl: null, modTpl: null, twists: [], pos };
}

function clone(s) {
  return {
    ...s,
    pos: s.pos.slice(),
    stats: { ...s.stats },
    effects: s.effects.map((e) => ({ ...e })),
    augment: s.augment && { ...s.augment, mods: { ...s.augment.mods }, effects: s.augment.effects.map((e) => ({ ...e })) },
    tags: s.tags.slice(),
  };
}

function specFor(w) {
  let s = cache.get(w);
  if (!s) {
    s = buildSpec(w, meaningFor(w));
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(w, s);
  }
  return s;
}

/** Word → TowerSpec. Pure, deterministic, never throws for a–z input. Returns a fresh copy. */
export function towerFor(word) {
  const w = normalize(word);
  try {
    return clone(specFor(w));
  } catch (err) {
    // last-resort safety net: procedural meaning never depends on the lexicon
    const pos = heuristicPos(w);
    return buildSpec(w, { source: 'procedural', tpl: proceduralTemplate(w, pos, hashString(w)), twists: [], pos });
  }
}

export function scoreWord(word) {
  return score(word);
}

/** Plausible parts of speech; never empty. */
export function posOf(word) {
  return specFor(normalize(word)).pos.slice();
}

/** Debug helper: how a word's meaning was resolved. */
export function explain(word) {
  const w = normalize(word);
  const r = resolve(w);
  return r ? { source: r.source, concept: r.entry.tpl.id, root: r.root, twists: r.twists, modConcept: r.mod ? r.mod.tpl.id : null }
    : { source: 'procedural' };
}
