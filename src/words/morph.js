// English inflection helpers: forward (used by scripts/build-words.mjs to add safe inflections of
// curated words) and reverse (used by derive.js to map inflected forms back to roots).

export const IRREGULAR_PLURALS = {
  man: 'men', woman: 'women', child: 'children', foot: 'feet', tooth: 'teeth', goose: 'geese',
  mouse: 'mice', louse: 'lice', ox: 'oxen', wolf: 'wolves', knife: 'knives', leaf: 'leaves',
  life: 'lives', wife: 'wives', half: 'halves', calf: 'calves', elf: 'elves', self: 'selves',
  shelf: 'shelves', thief: 'thieves', loaf: 'loaves', sheaf: 'sheaves', scarf: 'scarves',
  hoof: 'hooves', dwarf: 'dwarves', fungus: 'fungi', cactus: 'cacti', die: 'dice', person: 'people',
  cherub: 'cherubim', seraph: 'seraphim', larva: 'larvae', nucleus: 'nuclei', radius: 'radii',
  magus: 'magi', wharf: 'wharves', staff: 'staves', wolfhound: 'wolfhounds', werewolf: 'werewolves',
  bookshelf: 'bookshelves', housewife: 'housewives', jackknife: 'jackknives', penknife: 'penknives',
  swordfish: 'swordfish', alumnus: 'alumni', stimulus: 'stimuli', crisis: 'crises', oasis: 'oases',
  axis: 'axes', thesis: 'theses', phenomenon: 'phenomena', criterion: 'criteria', medium: 'media',
  bacterium: 'bacteria', datum: 'data', genie: 'genies', vortex: 'vortices', matrix: 'matrices',
};

export const INVARIANT_PLURALS = new Set((
  'sheep deer fish moose swine bison salmon trout cod aircraft spacecraft series species offspring ' +
  'cattle livestock poultry squid shrimp elk reindeer caribou antelope bass pike carp tuna halibut ' +
  'mackerel herring sardine anchovy haddock plankton krill grouse quail hovercraft ammo'
).split(' '));

const O_ES = new Set('hero potato tomato echo torpedo volcano mosquito veto tornado buffalo domino mango cargo embargo grotto tuxedo'.split(' '));
const CH_K = new Set('monarch stomach epoch loch patriarch matriarch oligarch tetrarch eunuch tech mach conch triptych'.split(' '));
const MAN_EXCEPT =new Set('human shaman talisman caiman german ottoman dolman doberman'.split(' '));

// base → [past, pastParticiple, alsoRegular]
export const IRREGULAR_VERBS = {
  arise: ['arose', 'arisen'], awake: ['awoke', 'awoken'], bear: ['bore', 'borne'], beat: ['beat', 'beaten'],
  become: ['became', 'become'], begin: ['began', 'begun'], bend: ['bent', 'bent'], bet: ['bet', 'bet'],
  bind: ['bound', 'bound'], bite: ['bit', 'bitten'], bleed: ['bled', 'bled'], blow: ['blew', 'blown'],
  break: ['broke', 'broken'], breed: ['bred', 'bred'], bring: ['brought', 'brought'], build: ['built', 'built'],
  burn: ['burnt', 'burnt', true], burst: ['burst', 'burst'], buy: ['bought', 'bought'], cast: ['cast', 'cast'],
  catch: ['caught', 'caught'], choose: ['chose', 'chosen'], cling: ['clung', 'clung'], come: ['came', 'come'],
  cost: ['cost', 'cost'], creep: ['crept', 'crept'], cut: ['cut', 'cut'], deal: ['dealt', 'dealt'],
  dig: ['dug', 'dug'], dive: ['dove', 'dived', true], do: ['did', 'done'], draw: ['drew', 'drawn'],
  dream: ['dreamt', 'dreamt', true], drink: ['drank', 'drunk'], drive: ['drove', 'driven'],
  dwell: ['dwelt', 'dwelt', true], eat: ['ate', 'eaten'], fall: ['fell', 'fallen'], feed: ['fed', 'fed'],
  feel: ['felt', 'felt'], fight: ['fought', 'fought'], find: ['found', 'found'], flee: ['fled', 'fled'],
  fling: ['flung', 'flung'], fly: ['flew', 'flown'], forbid: ['forbade', 'forbidden'],
  forget: ['forgot', 'forgotten'], forgive: ['forgave', 'forgiven'], freeze: ['froze', 'frozen'],
  get: ['got', 'gotten'], give: ['gave', 'given'], go: ['went', 'gone'], grind: ['ground', 'ground'],
  grow: ['grew', 'grown'], hang: ['hung', 'hung', true], have: ['had', 'had'], hear: ['heard', 'heard'],
  hew: ['hewed', 'hewn'], hide: ['hid', 'hidden'], hit: ['hit', 'hit'], hold: ['held', 'held'],
  hurt: ['hurt', 'hurt'], keep: ['kept', 'kept'], kneel: ['knelt', 'knelt', true], know: ['knew', 'known'],
  lay: ['laid', 'laid'], lead: ['led', 'led'], leap: ['leapt', 'leapt', true], learn: ['learnt', 'learnt', true],
  leave: ['left', 'left'], lend: ['lent', 'lent'], let: ['let', 'let'], lie: ['lay', 'lain'],
  light: ['lit', 'lit', true], lose: ['lost', 'lost'], make: ['made', 'made'], mean: ['meant', 'meant'],
  meet: ['met', 'met'], mow: ['mowed', 'mown', true], pay: ['paid', 'paid'], put: ['put', 'put'],
  quit: ['quit', 'quit'], read: ['read', 'read'], rend: ['rent', 'rent'], rid: ['rid', 'rid'],
  ride: ['rode', 'ridden'], ring: ['rang', 'rung'], rise: ['rose', 'risen'], run: ['ran', 'run'],
  saw: ['sawed', 'sawn', true], say: ['said', 'said'], see: ['saw', 'seen'], seek: ['sought', 'sought'],
  sell: ['sold', 'sold'], send: ['sent', 'sent'], set: ['set', 'set'], sew: ['sewed', 'sewn', true],
  shake: ['shook', 'shaken'], shear: ['sheared', 'shorn', true], shed: ['shed', 'shed'],
  shine: ['shone', 'shone'], shoot: ['shot', 'shot'], show: ['showed', 'shown', true],
  shrink: ['shrank', 'shrunk'], shut: ['shut', 'shut'], sing: ['sang', 'sung'], sink: ['sank', 'sunk'],
  sit: ['sat', 'sat'], slay: ['slew', 'slain'], sleep: ['slept', 'slept'], slide: ['slid', 'slid'],
  sling: ['slung', 'slung'], slink: ['slunk', 'slunk'], slit: ['slit', 'slit'], smite: ['smote', 'smitten'],
  sow: ['sowed', 'sown', true], speak: ['spoke', 'spoken'], speed: ['sped', 'sped', true],
  spend: ['spent', 'spent'], spill: ['spilt', 'spilt', true], spin: ['spun', 'spun'], spit: ['spat', 'spat'],
  split: ['split', 'split'], spread: ['spread', 'spread'], spring: ['sprang', 'sprung'],
  stand: ['stood', 'stood'], steal: ['stole', 'stolen'], stick: ['stuck', 'stuck'], sting: ['stung', 'stung'],
  stink: ['stank', 'stunk'], strike: ['struck', 'stricken'], string: ['strung', 'strung'],
  strive: ['strove', 'striven'], swear: ['swore', 'sworn'], sweep: ['swept', 'swept'],
  swell: ['swelled', 'swollen', true], swim: ['swam', 'swum'], swing: ['swung', 'swung'],
  take: ['took', 'taken'], teach: ['taught', 'taught'], tear: ['tore', 'torn'], tell: ['told', 'told'],
  think: ['thought', 'thought'], throw: ['threw', 'thrown'], thrust: ['thrust', 'thrust'],
  tread: ['trod', 'trodden'], wake: ['woke', 'woken'], wear: ['wore', 'worn'], weave: ['wove', 'woven'],
  weep: ['wept', 'wept'], win: ['won', 'won'], wind: ['wound', 'wound'], wring: ['wrung', 'wrung'],
  write: ['wrote', 'written'], smell: ['smelt', 'smelt', true], spell: ['spelt', 'spelt', true],
  forsake: ['forsook', 'forsaken'], undo: ['undid', 'undone'], overcome: ['overcame', 'overcome'],
  withdraw: ['withdrew', 'withdrawn'], uphold: ['upheld', 'upheld'], foresee: ['foresaw', 'foreseen'],
  frostbite: ['frostbit', 'frostbitten'], stride: ['strode', 'stridden'], unwind: ['unwound', 'unwound'], outshine: ['outshone', 'outshone'], outrun: ['outran', 'outrun'], overrun: ['overran', 'overrun'],
};

const DOUBLE_MULTI = new Set((
  'begin forget occur refer admit commit control patrol compel expel propel rebel regret submit ' +
  'transmit permit equip acquit abhor deter prefer confer excel repel upset outwit unzip befit ' +
  'embed enrol extol incur recur remit omit dispel'
).split(' '));

const VOW = 'aeiou';
const isV = (c) => VOW.includes(c);

function vowelGroups(w) {
  let n = 0, prev = false;
  for (let i = 0; i < w.length; i++) {
    let c = w[i];
    let v = isV(c) || (c === 'y' && i > 0 && !isV(w[i - 1]));
    if (c === 'u' && i > 0 && w[i - 1] === 'q') v = false;
    if (v && !prev) n++;
    prev = v;
  }
  return n;
}

/** Should the final consonant double before -ed/-ing/-er? */
export function doublesFinal(w) {
  if (DOUBLE_MULTI.has(w)) return true;
  const n = w.length;
  if (n < 3) return false;
  const a = w[n - 3], b = w[n - 2], c = w[n - 1];
  if ('wxy'.includes(c) || isV(c) || !isV(b)) return false;
  if (isV(a) && !(a === 'u' && w[n - 4] === 'q')) return false;
  return vowelGroups(w) === 1;
}

export function pluralize(w) {
  if (IRREGULAR_PLURALS[w]) return IRREGULAR_PLURALS[w];
  if (INVARIANT_PLURALS.has(w)) return w;
  if (w.endsWith('man') && !MAN_EXCEPT.has(w) && w.length > 4) return w.slice(0, -3) + 'men';
  if (CH_K.has(w)) return w + 's';
  if (/(s|x|z|ch|sh)$/.test(w)) return w.endsWith('z') && !w.endsWith('zz') && doublesFinal(w) ? w + 'zes' : w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  if (/[^aeiou]o$/.test(w) && O_ES.has(w)) return w + 'es';
  return w + 's';
}

export function thirdPerson(w) {
  if (w === 'be') return 'is';
  if (w === 'have') return 'has';
  if (O_ES.has(w)) return w + 'es';
  if (/(s|x|z|ch|sh)$/.test(w) || w === 'go' || w === 'do' || w.endsWith('do') && w.length <= 4) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  return w + 's';
}

export function presentParticiple(w) {
  if (w.endsWith('ie')) return w.slice(0, -2) + 'ying';
  if (/(ee|oe|ye)$/.test(w)) return w + 'ing';
  if (/c$/.test(w) && /(panic|mimic|picnic|frolic|traffic|politic)$/.test(w)) return w + 'king';
  if (/[^aeiou]e$/.test(w) || /[aeiou]{2}e$/.test(w) || w.endsWith('ue')) return w.slice(0, -1) + 'ing';
  if (doublesFinal(w)) return w + w[w.length - 1] + 'ing';
  return w + 'ing';
}

export function regularPast(w) {
  if (w.endsWith('e')) return w + 'd';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ied';
  if (/(panic|mimic|picnic|frolic|traffic)$/.test(w)) return w + 'ked';
  if (doublesFinal(w)) return w + w[w.length - 1] + 'ed';
  return w + 'ed';
}

/** All verb forms (excluding the base). */
export function verbForms(w) {
  const out = new Set([thirdPerson(w), presentParticiple(w)]);
  const irr = IRREGULAR_VERBS[w];
  if (irr) {
    out.add(irr[0]);
    out.add(irr[1]);
    if (irr[2]) out.add(regularPast(w));
  } else {
    out.add(regularPast(w));
  }
  out.delete(w);
  return [...out];
}

/** Reverse map of irregular forms → { root, kind } */
export const IRREGULAR_REVERSE = (() => {
  const m = new Map();
  for (const [base, [past, pp]] of Object.entries(IRREGULAR_VERBS)) {
    if (past !== base && !m.has(past)) m.set(past, { root: base, kind: 'past' });
    if (pp !== base && !m.has(pp)) m.set(pp, { root: base, kind: 'participle' });
  }
  for (const [s, p] of Object.entries(IRREGULAR_PLURALS)) if (p !== s) m.set(p, { root: s, kind: 'plural' });
  // a few adjective/noun irregulars
  const extra = {
    fiery: ['fire', 'adj'], icy: ['ice', 'adj'], better: ['good', 'comparative'], best: ['good', 'superlative'],
    worse: ['bad', 'comparative'], worst: ['bad', 'superlative'], wooden: ['wood', 'adj'], golden: ['gold', 'adj'],
    woolen: ['wool', 'adj'], woollen: ['wool', 'adj'], molten: ['melt', 'participle'], sodden: ['soak', 'participle'],
    wizardry: ['wizard', 'abstract'], heroic: ['hero', 'adj'], venomous: ['venom', 'adj'], deadly: ['dead', 'adj'],
    stony: ['stone', 'adj'], bony: ['bone', 'adj'], scaly: ['scale', 'adj'], hasty: ['haste', 'adj'],
    spicy: ['spice', 'adj'], smoky: ['smoke', 'adj'], noisy: ['noise', 'adj'], slimy: ['slime', 'adj'],
    poisonous: ['poison', 'adj'], monstrous: ['monster', 'adj'], wondrous: ['wonder', 'adj'],
    thunderous: ['thunder', 'adj'], disastrous: ['disaster', 'adj'], magical: ['magic', 'adj'],
    angelic: ['angel', 'adj'], demonic: ['demon', 'adj'], volcanic: ['volcano', 'adj'], solar: ['sun', 'adj'],
    lunar: ['moon', 'adj'], stellar: ['star', 'adj'], aquatic: ['water', 'adj'], arboreal: ['tree', 'adj'],
    feline: ['cat', 'adj'], canine: ['dog', 'adj'], equine: ['horse', 'adj'], lupine: ['wolf', 'adj'],
    ursine: ['bear', 'adj'], serpentine: ['serpent', 'adj'], royal: ['king', 'adj'], regal: ['king', 'adj'],
    martial: ['war', 'adj'], naval: ['ship', 'adj'], medical: ['medicine', 'adj'], surgical: ['surgeon', 'adj'],
    thermal: ['heat', 'adj'], frigid: ['cold', 'adj'], dental: ['tooth', 'adj'], cardiac: ['heart', 'adj'],
    ocular: ['eye', 'adj'], manual: ['hand', 'adj'], pedal: ['foot', 'adj'], oral: ['mouth', 'adj'],
    floral: ['flower', 'adj'], verbal: ['word', 'adj'], urban: ['city', 'adj'], rural: ['farm', 'adj'],
    nocturnal: ['night', 'adj'], diurnal: ['day', 'adj'], vernal: ['spring', 'adj'], hibernal: ['winter', 'adj'],
    brethren: ['brother', 'plural'], kine: ['cow', 'plural'], dice: ['die', 'plural'],
  };
  for (const [w, [root, kind]] of Object.entries(extra)) m.set(w, { root, kind });
  return m;
})();
