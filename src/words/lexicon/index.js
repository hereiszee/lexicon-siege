// Aggregates every curated concept into LEXICON: word → { tpl, aug, pos:Set }.
//   tpl — concept that defines the word as a tower (first concept listing it, nouns before verbs/adjectives)
//   aug — first verb/adjective concept listing it (defines it as an augment), or null
//   pos — union of parts of speech from all concepts + POS_EXTRA

import defenses from './defenses.js';
import tools from './tools.js';
import weapons from './weapons.js';
import medicine from './medicine.js';
import elements from './elements.js';
import nature from './nature.js';
import animals from './animals.js';
import materials from './materials.js';
import magic from './magic.js';
import people from './people.js';
import body from './body.js';
import feelings from './feelings.js';
import food from './food.js';
import places from './places.js';
import things from './things.js';
import verbs from './verbs.js';
import adjectives from './adjectives.js';
import { POS_EXTRA } from './pos-extra.js';
import { SAYS } from './says.js';
import { pluralize, verbForms } from '../morph.js';

export const NOUN_CONCEPTS = [
  ...defenses, ...tools, ...weapons, ...medicine, ...elements, ...nature, ...animals, ...materials, ...magic,
  ...people, ...body, ...feelings, ...food, ...places, ...things,
];
export const VERB_CONCEPTS = verbs;
export const ADJ_CONCEPTS = adjectives;
export const CONCEPTS = [...NOUN_CONCEPTS, ...VERB_CONCEPTS, ...ADJ_CONCEPTS];

export const LEXICON = new Map();
/** Every word listed anywhere in the curated lexicon (including inflected forms resolved by derivation). */
export const CURATED_WORDS = new Set();

for (const c of CONCEPTS) {
  // Inflected forms of a sibling word (doctors ← doctor) are left to derivation so they get
  // source:'derived' and the plural/verb-form twist.
  const own = new Set(c.words);
  const inflected = new Set();
  for (const b of c.words) {
    const forms = [pluralize(b), ...(c.kind === 'verb' || c.pos.includes('verb') ? verbForms(b) : [])];
    for (const f of forms) if (f !== b && own.has(f)) inflected.add(f);
  }
  for (const w of c.words) {
    CURATED_WORDS.add(w);
    if (inflected.has(w)) continue;
    let e = LEXICON.get(w);
    if (!e) {
      e = { tpl: c, aug: null, pos: new Set(), mass: c.mass, say: c.kind ? null : SAYS[w] || null };
      LEXICON.set(w, e);
    }
    for (const p of c.pos) e.pos.add(p);
    if (c.kind === 'adjective' && /(ing|ed)$/.test(w) && w.length > 4) e.pos.add('verb');
    if (c.kind && !e.aug) e.aug = c;
  }
}
for (const [p, list] of Object.entries(POS_EXTRA)) {
  for (const w of list) {
    const e = LEXICON.get(w);
    if (e) e.pos.add(p);
  }
}
