#!/usr/bin/env node
// Builds data/words.txt from /usr/share/dict/words:
//   - keep lines matching ^[a-z]{2,15}$ (drops proper nouns, hyphenated, too long/short)
//   - add every curated lexicon word (hand-picked everyday words the system list may lack: laptop, email…)
//   - add safe inflections of curated words: plural for countable nouns, -s/-ed/-ing (irregulars
//     respected) for verbs
//   - dedupe + sort
// Usage: node scripts/build-words.mjs [sourcePath]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONCEPTS, LEXICON } from '../src/words/lexicon/index.js';
import { pluralize, verbForms, IRREGULAR_REVERSE } from '../src/words/morph.js';

// Common uncountable nouns that get no added plural.
const MASS = new Set(`music wheat lux valor valour heat ether gold silver iron steel ice snow rain fog mist dew smoke soot ash
  sand dust mud soil clay dirt grit gravel water milk tea coffee juice honey sugar salt flour bread butter cheese rice corn
  meat beef pork bacon ham oil gas fuel tar wool silk cotton linen leather fur glass wood timber lumber hay straw grass
  moss ivy foliage poison venom acid lye bile blood flesh marrow plasma fire flame lava magma brimstone sulfur sulphur
  thunder lightning electricity wind air weather courage bravery honor honour pride glory joy love hate fear rage wrath
  anger fury peace calm patience wisdom knowledge lore magic magick sorcery witchcraft alchemy luck wealth money cash
  treasure loot booty plunder information news advice homework furniture luggage equipment garbage trash rubbish waste
  sewage slime grime filth muck mold mould rust decay rot ammo ammunition gunpowder dynamite napalm shrapnel artillery
  cavalry infantry livestock cattle poultry police chess golf tennis soccer rugby hockey flak ordnance gossamer
  grease slush suction`.split(/\s+/));

const SRC = process.argv[2] || '/usr/share/dict/words';
const OUT = fileURLToPath(new URL('../data/words.txt', import.meta.url));
const OK = /^[a-z]{2,15}$/;

const base = new Set();
for (const line of readFileSync(SRC, 'utf8').split('\n')) {
  const w = line.trim();
  if (OK.test(w)) base.add(w);
}
const fromDict = base.size;

const added = { curated: 0, plural: 0, verb: 0 };
const add = (w, kind) => {
  if (OK.test(w) && !base.has(w)) {
    base.add(w);
    added[kind]++;
  }
};

// Words that are themselves inflected forms of curated words (men, mice, doctors, burning…) are
// never inflected again.
for (const c of CONCEPTS) {
  for (const w of c.words) {
    add(w, 'curated');
    const e = LEXICON.get(w);
    if (!e) continue; // inflected sibling form (doctors): don't inflect further
    const pos = e.pos;
    const isForm = /(ing|ed)$/.test(w) || /men$/.test(w) || IRREGULAR_REVERSE.has(w);
    const uncountable = MASS.has(w) || /(ness|ism|ics|hood)$/.test(w);
    if (uncountable) {
      if (pos.has('verb') && !isForm) for (const f of verbForms(w)) add(f, 'verb');
      continue;
    }
    // plurals only for countable nouns; skip words that already look plural or are mass nouns
    if (pos.has('noun') && !c.mass && !e.mass && !isForm && !/(ss|us|is)$/.test(w) && !(w.endsWith('s') && w.length > 3)) {
      add(pluralize(w), 'plural');
    }
    if (pos.has('verb') && !isForm) for (const f of verbForms(w)) add(f, 'verb');
  }
}

const words = [...base].sort();
mkdirSync(fileURLToPath(new URL('../data/', import.meta.url)), { recursive: true });
writeFileSync(OUT, words.join('\n') + '\n');
console.log(`dictionary: ${fromDict} from ${SRC}; +${added.curated} curated, +${added.plural} plurals, +${added.verb} verb forms → ${words.length} words → ${OUT}`);
