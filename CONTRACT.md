# Lexicon Siege — build contract

Scrabble meets tower defense. The player holds a rack of letter tiles, spells real English
words, and every word becomes a tower whose role, element, stats and powers come from the word
itself. "ax" harvests, "doctor"/"medic" heal, "cannon" blasts. Verbs and adjectives can instead
be attached to an existing tower as augments. ~200k words, 1000 levels, each level seeded by a word.

This file is the interface between four modules built in parallel. **Do not change an interface
here unilaterally** — if something is unworkable, build to the contract as closely as possible and
report the problem in your final message.

## Ground rules

- Vanilla JS ES modules, no build step, no npm dependencies, no network downloads. Runs from a
  static server (`python3 -m http.server 4173` in the project root). Node 26 for tests
  (`node --test tests/`).
- Everything outside `src/ui`, `src/main.js`, `index.html` must run in both browser and Node
  (no DOM, no `fs` — except files explicitly named `node.js` / scripts).
- Deterministic: all randomness comes from `src/core/rng.js`. Same word → same tower, always.
  Same level number → same level, always.
- Units: distance in grid cells (float), time in seconds, cell coords `(cx, cy)` ints with
  `(0,0)` top-left. World position of a cell centre is `(cx + 0.5, cy + 0.5)`.
- Shared ids and base numbers live in `src/core/constants.js` (read it). Only touch files you own.

## File ownership

| Owner | Files |
|---|---|
| conductor (read-only for workers) | `CONTRACT.md`, `package.json`, `src/core/*`, `.claude/launch.json` |
| WORDS | `scripts/build-words.mjs`, `data/words.txt`, `src/words/**`, `tests/words*.test.mjs` |
| LEVELS | `src/levels/**`, `tests/levels*.test.mjs` |
| ENGINE | `src/game/**`, `tests/game*.test.mjs` |
| UI | `index.html`, `styles.css`, `src/main.js`, `src/ui/**` |

## WORDS module — `src/words/index.js`

```js
export function createDictionary(wordsArray) // → Dictionary
export async function loadDictionary(url = 'data/words.txt') // browser fetch → Dictionary
// Dictionary: { size, has(word), words /* sorted array */, byLength(n) /* array */ }
export function towerFor(word)   // → TowerSpec. Pure, sync, deterministic. Works for ANY a–z string
                                 //   (does not consult the dictionary), never throws.
export function scoreWord(word)  // Scrabble sum
export function posOf(word)      // → subset of ['noun','verb','adjective','adverb'], never empty
```
`src/words/node.js` exports `loadDictionaryNode()` (reads `data/words.txt` via fs) for tests.

`data/words.txt`: one lowercase word per line, `^[a-z]{2,15}$`, built from `/usr/share/dict/words`
by `scripts/build-words.mjs` (~200k words).

### TowerSpec
```js
{
  word: 'doctor',
  pos: ['noun','verb'],          // all plausible parts of speech
  archetype: 'support',          // one of ARCHETYPES
  element: 'light',              // one of ELEMENTS
  rarity: 'uncommon',            // one of RARITIES — from length + letter score
  score: 9,                      // Scrabble score
  cost: 45,                      // ink to place as a tower
  stats: { damage, rate, range, splash, projectileSpeed, hp },
      // damage per hit (DPS for beam/aura; 0 for support/harvest/summon), rate = attacks/sec,
      // range in cells, splash radius in cells (0 = none), projectileSpeed cells/sec, hp = tower health
  effects: [ { type:'heal', hps: 6 } ],   // see EFFECT_TYPES in constants.js
  augment: null | {              // non-null iff the word can be attached to an existing tower
    kind: 'verb' | 'adjective',  // (words that are verbs/adjectives/adverbs; adverbs count as 'adjective')
    cost: 20,
    mods: { damage: 1.15, rate: 1, range: 1.1, hp: 1 },  // multipliers, omitted keys = 1
    effects: [ ... ],            // verbs mostly add effects; adjectives mostly add mods
    element: null | 'fire',      // if set, converts the tower's element
  },
  tags: ['medical','person'],    // semantic tags (lowercase), used for level theme bonuses
  glyph: '✚',                    // one char/emoji drawn on the tower
  color: '#d9a514',              // usually ELEMENT_COLORS[element]
  flavor: 'Mends nearby towers.',// one short generated sentence describing what it does
  source: 'lexicon' | 'derived' | 'procedural'  // how the meaning was resolved
}
```
Meaning resolution, in order: (1) curated lexicon — concepts mapping words to archetype/element/
effects/tags; (2) derived — inflections, affixes and compounds resolved to a curated root
("doctors", "woodcutter", "fiery"); (3) procedural — suffix-based POS plus a hash of the word and
its letter composition pick archetype/element/effects. In all cases a per-word hash jitters the
stats so no two words yield identical towers. Longer and rarer-lettered words are stronger and
cost more; power per ink should rise gently with length so long words are rewarded.

Baseline for balance: a common 3-letter `bolt` word ≈ damage 6, rate 1, range 2.5, hp 60, cost 30.
A 7-letter word ≈ 3–4× that DPS for ≈ 2.5× the cost. Harvest baseline: +4 ink every 5 s.

## LEVELS module — `src/levels/index.js`

```js
export const LEVEL_COUNT = 1000
export function levelFor(n)                      // n in 1..LEVEL_COUNT → LevelSpec
export function levelForWord(word, difficulty=1) // any word → LevelSpec (difficulty 1..1000 scale)
export function checkWordRules(word, spec, level, ctx) // → { ok:true } | { ok:false, reason:'…' }
        // ctx = { usedWords:Set<string>, towerCount:number, wave:number }
export function themeBonus(spec, level)          // → damage/output multiplier, 1 if no match
```
Imports `towerFor` from `../words/index.js` to theme a level from its word (element, tags).

### LevelSpec
```js
{
  id: 17, word: 'ember', seed: 123456, title: 'Ember', difficulty: 17,
  element: 'fire',                 // enemies are attuned to this element (see OPPOSITE)
  cols: 16, rows: 10,
  paths: [ [[0,4],[1,4],…] ],      // 1–2 paths; each an ordered list of orthogonally adjacent cells,
                                   // first cell on a board edge (spawn), last cell = the base
  blocked: [[3,2],…],              // non-buildable scenery cells (path cells are never buildable)
  startInk: 100, lives: 20, rackSize: 8,
  letterWeights: { …a–z },         // bag weights for this level
  waves: [ { groups: [ { enemy:'grunt', count:8, interval:0.9, delay:0, path:0, hpMul:1, speedMul:1 } ] } ],
  rules: [ { type:'mustContain', letter:'e', text:'Every word must contain E' } ],
  bonus: { tags:['fire','heat'], element:'fire', mul:1.25, text:'Fire words are 25% stronger' },
  stars: { two: { livesAtLeast: 10 }, three: { livesAtLeast: 20 } }
}
```
Rule types (all enforced through `checkWordRules`, except bag changes which are baked into
`letterWeights`): `minLength{n}`, `maxLength{n}`, `mustContain{letter}`, `banLetter{letter}`,
`towerLimit{n}`, `banElement{element}`, `onlyPos{pos}` is NOT allowed (too punishing).
Words may never be reused within a level (engine enforces; not a rule entry).
Levels 1–10 are a gentle tutorial ramp with no rules; rules appear gradually; every 10th level
is a boss level. `levelFor(n)` uses a curated ordered list of 1000 evocative level words.

## ENGINE module — `src/game/index.js`

Headless simulation; no DOM. Gets its collaborators injected so it can be tested with stubs.

```js
export function createGame({ level, dictionary, towerFor, checkWordRules, themeBonus, seed })  // → game
```
```js
game.state = {
  phase: 'build' | 'wave' | 'won' | 'lost',
  time, ink, lives, waveIndex /* 0-based, next or current */, waveCount,
  rack: ['a','x','e',…],            // length = level.rackSize
  redrawCost,
  usedWords: Set,
  towers:  [ { id, word, spec, cx, cy, x, y, hp, maxHp, shield, disabled, augments:[spec…],
               stats /* effective, after augments+buffs */, element, effects, cooldown, kills,
               damageDealt /* running total incl. DoT it applied */, targetId } ],
  enemies: [ { id, type, x, y, hp, maxHp, armor, speed, pathIndex, progress /* cells travelled */,
               element, statuses:{burn,poison,slow,freeze,stun,armorBreak}, revealed, boss } ],
  projectiles: [ { id, x, y, tx, ty, element, kind } ],
  units:   [ { id, x, y, hp, maxHp, ownerId } ],     // summoned defenders standing on the path
}
game.update(dt)                    // advance simulation; safe for dt up to 0.1 (sub-step internally)
game.checkWord(word)               // → { ok, reason?, spec?, canTower, canAugment } — validates
                                   //   dictionary membership, rack letters, reuse, level rules. No side effects.
game.placeTower(word, cx, cy)      // → { ok, reason?, tower? } — spends ink + tiles, refills rack
game.augmentTower(word, towerId)   // → { ok, reason?, tower? } — word must have spec.augment
game.canBuild(cx, cy)              // → boolean
game.sellTower(towerId)            // → { ok, refund }
game.redrawRack()                  // → { ok, reason? } costs state.redrawCost ink, then cost += 5
game.shuffleRack()                 // free, cosmetic reorder
game.startWave()                   // build → wave. Building stays allowed during waves.
game.drainEvents()                 // → array of events since last call, for visual/audio FX
game.result()                      // when won/lost → { won, stars /*1–3*/, livesLeft, wordsUsed:[…], score }
```
Events: `{type:'shot',towerId,x,y,tx,ty,element,archetype}`, `{type:'hit',towerId,x,y,element,damage,crit}`,
`{type:'kill',x,y,enemy,ink}`, `{type:'leak',lives}`, `{type:'towerPlaced',towerId}`,
`{type:'towerAugmented',towerId,word}`, `{type:'towerDown',towerId}`, `{type:'towerSold',towerId}`,
`{type:'harvest',towerId,x,y,resource,amount}`, `{type:'heal',towerId,x,y}`,
`{type:'waveStart',index}`, `{type:'waveEnd',index,bonusInk}`, `{type:'rack',rack}`,
`{type:'won'}`, `{type:'lost'}`.

Rules of play the engine implements:
- Rack: tiles drawn weighted-random from `level.letterWeights`; used tiles are replaced immediately;
  every refill guarantees ≥ `DEFAULTS.minVowelsInRack` vowels in the rack. A word must be spellable
  from the rack (multiset). `harvest` with `resource:'tile'` grants ink-free rack
  redraw charges (`state.freeRedraws`, consumed by `redrawRack()` before ink).
- Damage per hit = max(1, damage × elementMul × themeBonus − armor); DoT ignores armor.
  elementMul: ×1.5 if `OPPOSITE[towerElement] === enemy.element`, ×0.5 if equal, else 1.
- Towers have hp; `vandal` enemies damage them; at 0 hp a tower is `disabled` (does nothing)
  until healed above 30% by a `heal` support tower. Disabled towers can be sold.
- Augments: up to `DEFAULTS.maxAugments` per tower; mods multiply, effects append (same-type
  effects merge by taking the stronger value), `element` converts.
- Wave end grants bonus ink `10 + 2×waveNumber`; after the last wave with lives > 0 → `won`.
- Targeting: "first" (furthest along path) in range.

## UI module — `index.html`, `src/main.js`, `src/ui/**`

Wires the three modules together (`createGame({ level: levelFor(n), dictionary, towerFor,
checkWordRules, themeBonus })`) and renders with Canvas 2D + DOM HUD.

Look (REVISED — follows the user's own mockups, which override the earlier letterpress brief):
**flat graph-paper diorama seen from above.**
- Board: flat pastel ground whose colour is the level's biome (cream paper, sage green, lavender,
  white), covered by a fine dotted graph-paper grid (≈4 minor lines per logical cell, slightly
  warped/hand-drawn in places). Scenery is flat vector shapes with a long, hard, diagonal drop
  shadow falling to the lower-left: grey hatched slabs/buildings, faceted grey rocks with concentric
  lighter facets, blue water blobs with concentric depth bands, dark-green tree discs with
  concentric rings, small clusters of green dots (bushes), small dark cobble squares. `blocked`
  cells become this scenery (merge adjacent blocked cells into one slab/blob); extra purely
  decorative scenery may be generated from `level.seed` off the path. Biome derives from
  `level.element`.
- Towers: ONE big chunky 3D extruded capital letter — the word's first letter — in the element
  colour (flat face, darker extruded side to the lower-left, subtle brick/tile texture, long
  diagonal shadow), a small black asterisk at its top-right, and the full word in small bold
  black caps (DIN-like sans) across its lower part. Augment words stack as tiny grey caps lines directly ABOVE the black base word
  (e.g. "VOTE / TIE / VOX"). Towers may sit in adjacent cells, so letters overlap into a cluster.
- Range/aura: a soft tinted disc in the element colour with a halftone-dot dissolving edge.
- Enemies: solid black chess-piece silhouettes swarming in loose crowds — pawn = grunt/swarm
  (small), knight = runner, rook = tank/armored, bishop = healer/stealth, queen = vandal/
  splitter, king = boss (large). Engine positions are on the path centreline; the UI adds a stable
  per-enemy lateral offset (from enemy id) so they read as a crowd, not a queue. Status tints
  the piece (frozen/slowed = blue, burning = orange flecks, poisoned = green). Deaths leave a
  soft grey smoke puff. The path itself is understated (slightly lighter/worn ground), not a road.
- Combat FX: small red/orange damage numbers in bold condensed caps, orange dart projectiles
  with a faint trail, smoke smudges on impact.
- Word entry: cream Scrabble tiles (bold black sans letter, tiny value bottom-right, soft
  shadow). Bottom tray on light grey: a 10-slot rack (used slots show as empty grey squares),
  pill-outline buttons REROLL, SHUFFLE, ALPHABETIZE, hint "Press enter to make word". The word
  being composed appears as large tiles floating over the lower-middle of the board with a
  SUBMIT WORD pill under it. Enter/Submit validates and "arms" the word; then click the board
  to place it (the tiles fly to the cell and become the letter tower) or click a tower to augment.
- Bottom tray layout (full width, light grey, thin dividers), left → right: **resources** panel
  (ink shown as a labelled green bar "Ink: 66", lives, wave; room for more resources later);
  **Inventory** panel (empty placeholder for relics in v1, titled "Inventory"); **rack** (centre,
  widest: button row REROLL (cost) · SHUFFLE · ALPHABETIZE · EMPTY (clears the composed word),
  DICTIONARY pill at the right opening the Lexicon, then the tiles); **Damage** leaderboard (right:
  towers sorted by `tower.damageDealt`, "2,241 AWFUL HEAL WAVE").
- Tower display name = augment words then the base word, upper-case ("AWFUL HEAL WAVE",
  "NOT BONG"). Modals (result, later relic choice) are white cards with a grey title bar,
  a flat emblem, a coloured caps heading and a pill button, as in the relic mockup.
- Type: a DIN-like condensed sans stack for everything (e.g. "DIN Alternate", "DIN Condensed",
  "Avenir Next Condensed", "Helvetica Neue", Arial, sans-serif). Minimal chrome, lots of air.

Screens: title → level select (1000 levels, paged, stars, locked/unlocked) → game → result.
Also a **Lexicon** screen: every word the player has ever played, with its tower card.

Game screen:
- Board canvas; rack of tiles at the bottom; word-entry: type letters on the keyboard (or click
  tiles) to compose, Backspace to remove, Esc to clear. Live validity + a tower card preview
  (word, archetype, element, rarity, stats, effects in plain language, cost, "can augment" hint).
- With a valid word composed: click an empty buildable cell → place as tower; click an existing
  tower → attach as augment (if `canAugment`). Hover shows range ring. Invalid → shake + reason.
- Click a tower with no word composed → inspect panel (stats, augments, kills, sell).
- HUD: ink, lives, wave n/m, Start Wave (Space), speed 1×/2×/3×, pause, shuffle, redraw (cost),
  level rules + theme bonus shown clearly.
- FX from `drainEvents()`: projectiles, hit sparks, floating +ink, screen shake on leak.
- Persist to localStorage (try/catch): unlocked level, stars per level, lexicon of played words.
- Must work at 1280×800 and degrade sanely down to ~900px wide. Mobile/touch is out of scope for v1.

## Addendum — engine behaviour as built (binding)

- `update()` only advances during `phase === 'wave'`; `state.time` and all timers freeze in build.
- `checkWord` returns `spec` even for invalid words (2–15 letters a–z) so the UI can preview.
  `canTower` / `canAugment` include affordability; `towerReason` / `augmentReason` say why one
  use is blocked when the word itself is ok.
- `checkWordRules` ctx = `{ usedWords, towerCount, wave /*0-based*/, action: 'tower'|'augment' }`.
- Theme bonus is already folded into `tower.stats`; exposed as `tower.themeMul`.
- `enemy.statuses.*` are numbers: seconds remaining, 0 = inactive. Details on the enemy:
  `burnDps`, `poisonDps`, `poisonStacks`, `slowFactor`, `abAmount`.
- Events: `leak.lives` = lives LOST (use `leak.livesLeft` for the remaining total);
  `kill.enemy` = enemy type string, `kill.enemyId` = id; aura emits one `shot` per pulse with
  `tx,ty` = tower position; each chain jump is its own `shot`.
- `result()` is `null` until won/lost; a loss has `stars: 0`.
- Rack slots refill immediately; "empty grey slots" in the UI are the tiles currently lifted
  into the composed word.
- Extras: tower `archetype, spent, themeMul, buffs`; state `waveTime, kills, leaked,
  freeRedraws`; `game.level`, `game.towerAt(cx,cy)`; `startWave()` → `{ok, reason}`.
- Bot: `playLevel({level, dictionary, towerFor, checkWordRules, themeBonus, seed, skill, finder})`
  from `src/game/bot.js`; build `finder` once with `makeWordFinder(dictionary)`.
- `LevelSpec.element` is the ENEMY attunement (the opposite of the level word's element, so
  on-theme towers hit hard). `LevelSpec.wordElement` is the level word's own element; the UI
  picks the board biome from `wordElement`.
- The `towerSold` event carries `x, y` (the tower is already removed from state when it fires).
