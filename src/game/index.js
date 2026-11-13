// Lexicon Siege — headless game simulation. See CONTRACT.md ("ENGINE module").
// No DOM. Collaborators (dictionary, towerFor, checkWordRules, themeBonus) are injected.

import { OPPOSITE, ENEMIES, DEFAULTS, PATH_ARCHETYPES } from '../core/constants.js';
import { makeRng, hashString } from '../core/rng.js';
import { buildPath, placeOnPath, nearestOnPath } from './paths.js';
import { composeTower, indexEffects } from './stats.js';
import { createBag, fillRack, missingLetters, consumedPositions } from './rack.js';
import { RELICS, RELIC_IDS } from './relics.js';
import { letterKinds, wordBonuses, applyLetterBonuses, bonusText } from './letters.js';

/** Fixed simulation sub-step (seconds). */
export const STEP = 1 / 60;

/** Engine tuning constants (exported for tests / UI tooltips). */
export const RULES = {
  revivePct: 0.3,          // disabled tower comes back when healed above this hp fraction
  healPulse: 0.5,          // heal towers repair in pulses of hps × healPulse
  stealthDetect: 1.5,      // stealth enemies within this many cells of any tower are revealed
  healerRadius: 1.5, healerHps: 4,
  vandalRadius: 1.5, vandalDps: 5,
  biteGrowth: 0.1,         // blocked enemy's bite DPS grows +10% (of base) per second blocked
  unitAttackInterval: 0.5, // units hit every 0.5 s for dps × 0.5
  unitBlockAhead: 0.45,    // enemy is blocked when within this many cells (along path) before a unit
  unitBlockBehind: 0.25,
  unitSpacing: 0.4,        // units of the same tower stand this far apart along the path
  retargetRadius: 2,       // projectile whose target died looks for a new one within this radius
  chainRadius: 2,          // chain jump radius
  chainDefault: { jumps: 2, falloff: 0.7 }, // chain archetype without a chain effect
  pierceRadius: 1.5,       // pierce: next enemy within this radius of the impact point
  pierceFalloff: 0.85,
  splitterChildren: 3,
  // v2
  wallBlockAhead: 0.6,     // enemy stops when within this many cells (along path) before a wall's centre
  wallBlockBehind: 0.25,
  thornInterval: 1,        // a wall's on-hit effects hit each biter once per second
  trapTrigger: 0.5, trapRadius: 0.6,
  mortarFlight: 1.2,
  bossPull: 0.25,
  pullMax: 12,              // a walker can be pulled for 12 s in total, then vortexes ignore it (no endless stalls)
  orbitLap: 1.5, orbHit: 0.35, orbCooldownSteps: 30, // 0.5 s
  slingInterval: 2, slingRange: 2.5, slingDamage: 6, slingSpeed: 6,
  stompInterval: 4, stompRadius: 1.5, stompDamage: 20,
  hitFlushSteps: 15,       // continuous tower damage (bite, vandal) is reported every 0.25 s
  rewardEvery: 3,
};

const ATTACKERS = new Set(['bolt', 'blast', 'snipe', 'rapid', 'beam', 'chain', 'aura', 'trap', 'mortar', 'vortex', 'pulse', 'orbit']);
const PROJECTILE_KINDS = new Set(['bolt', 'blast', 'rapid']);
const MAX_EVENTS = 20000;

export function elementMul(attack, defend) {
  if (!attack || !defend) return 1;
  if (OPPOSITE[attack] === defend) return 1.5;
  if (attack === defend) return 0.5;
  return 1;
}

function toSeed(x) {
  if (typeof x === 'string') return hashString(x);
  if (typeof x === 'number' && Number.isFinite(x)) return x >>> 0;
  return 0;
}

export function createGame({
  level,
  dictionary,
  towerFor,
  checkWordRules = () => ({ ok: true }),
  themeBonus = () => 1,
  seed,
  quiet = false, // extra (non-contract): true = don't record events (bot / balance runs)
} = {}) {
  if (!level) throw new Error('createGame: level required');
  const baseSeed = toSeed(seed ?? level.seed ?? level.word ?? 'lexicon');
  const rackRng = makeRng((baseSeed ^ 0x9e3779b9) >>> 0);
  const fxRng = makeRng((baseSeed + 0x632be5ab) >>> 0);
  const shuffleRng = makeRng((baseSeed ^ 0x5bd1e995) >>> 0); // cosmetic: must not advance the bag
  const rewardRng = makeRng((baseSeed ^ 0x27d4eb2f) >>> 0);  // own stream: rewards never perturb tile draws
  const kinds = letterKinds(toSeed(level.seed ?? baseSeed));

  const cols = level.cols ?? DEFAULTS.cols;
  const rows = level.rows ?? DEFAULTS.rows;
  const rackSize = level.rackSize ?? DEFAULTS.rackSize;
  const minLen = DEFAULTS.minWordLength;
  const maxLen = DEFAULTS.maxWordLength;
  const waves = level.waves || [];
  const startLives = level.lives ?? DEFAULTS.lives;

  // ---- board -----------------------------------------------------------------------------
  const CELL_FREE = 0, CELL_PATH = 1, CELL_BLOCKED = 2;
  const grid = new Uint8Array(cols * rows);
  const towerGrid = new Int32Array(cols * rows); // tower id or 0
  for (const [cx, cy] of level.blocked || []) {
    if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) grid[cy * cols + cx] = CELL_BLOCKED;
  }
  for (const p of level.paths || []) {
    for (const [cx, cy] of p) {
      if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) grid[cy * cols + cx] = CELL_PATH;
    }
  }
  const paths = (level.paths || []).map(buildPath);
  const pathEnds = new Set();
  for (const p of level.paths || []) {
    for (const c of [p[0], p[p.length - 1]]) if (c) pathEnds.add(c[1] * cols + c[0]);
  }

  // ---- state -----------------------------------------------------------------------------
  const bag = createBag(level.letterWeights, rackRng);
  const state = {
    phase: 'build',
    time: 0,
    ink: level.startInk ?? DEFAULTS.startInk,
    lives: startLives,
    waveIndex: 0,
    waveCount: waves.length,
    rack: new Array(rackSize).fill(''),
    redrawCost: DEFAULTS.redrawCost,
    freeRedraws: 0,
    usedWords: new Set(),
    towers: [],
    enemies: [],
    projectiles: [],
    units: [],
    waveTime: 0,       // seconds since current wave started
    kills: 0,
    leaked: 0,
    reward: null,      // v2 §3: pending reward offer
    relics: [],
    letterTiers: {},
  };
  fillRack(state.rack, [...state.rack.keys()], bag, DEFAULTS.minVowelsInRack);

  let nextId = 1;
  let events = [];
  let acc = 0;
  let dirty = false;       // tower set / disabled flags changed → recompute buffs & stats
  let spawners = [];       // per group spawn state for current wave
  const specCache = new Map();
  const wordsUsed = [];
  const hitScratch = [];   // reused id list for chain/pierce
  const walls = [];        // reused per step
  let stepNo = 0;
  let rewardsOffered = 0;
  // relic hooks, rebuilt whenever a relic is taken
  const R = { stats: [], dmg: [], killInk: 0, waveInkMul: 1, refund: DEFAULTS.sellRefund, waveRedraws: 0, savedHp: 0, unitHpMul: 1, briarDps: 0 };
  function rebuildRelicHooks() {
    Object.assign(R, { stats: [], dmg: [], killInk: 0, waveInkMul: 1, refund: DEFAULTS.sellRefund, waveRedraws: 0, savedHp: 0, unitHpMul: 1, briarDps: 0 });
    for (const id of state.relics) {
      const r = RELICS[id];
      if (r.stats) R.stats.push(r.stats);
      if (r.dmg) R.dmg.push(r.dmg);
      R.killInk += r.killInk || 0;
      R.waveInkMul *= r.waveInkMul || 1;
      R.refund = Math.max(R.refund, r.refund || 0);
      R.waveRedraws += r.waveRedraws || 0;
      R.savedHp += r.savedHp || 0;
      R.unitHpMul *= r.unitHpMul || 1;
      R.briarDps += r.briarDps || 0;
    }
  }
  function relicDmg(t, e) {
    let m = 1;
    for (let i = 0; i < R.dmg.length; i++) m *= R.dmg[i](t, e);
    return m;
  }

  function emit(ev) {
    if (quiet) return;
    if (events.length >= MAX_EVENTS) events.splice(0, MAX_EVENTS >> 1);
    events.push(ev);
  }

  function specOf(word) {
    let s = specCache.get(word);
    if (!s) {
      s = towerFor(word);
      specCache.set(word, s);
    }
    return s;
  }

  const over = () => state.phase === 'won' || state.phase === 'lost';
  const normalize = (w) => String(w ?? '').trim().toLowerCase();

  // ---- words -----------------------------------------------------------------------------
  function checkWord(raw) {
    const word = normalize(raw);
    const res = { ok: false, reason: undefined, spec: undefined, canTower: false, canAugment: false };
    if (over()) { res.reason = 'The game is over'; return res; }
    if (!word) { res.reason = 'Type a word'; return res; }
    if (!/^[a-z]+$/.test(word)) { res.reason = 'Letters A–Z only'; return res; }
    if (word.length < minLen) { res.reason = `Too short — words need at least ${minLen} letters`; return res; }
    if (word.length > maxLen) { res.reason = `Too long — at most ${maxLen} letters`; return res; }
    try { res.spec = specOf(word); } catch { res.spec = undefined; }
    if (!dictionary || !dictionary.has(word)) { res.reason = `“${word.toUpperCase()}” isn't in the dictionary`; return res; }
    if (state.usedWords.has(word)) { res.reason = `“${word.toUpperCase()}” was already played this level`; return res; }
    const miss = missingLetters(state.rack, word);
    if (miss.length) {
      res.reason = `Not in your rack — missing ${miss.map((c) => c.toUpperCase()).join(', ')}`;
      return res;
    }
    if (!res.spec) { res.reason = 'That word has no tower'; return res; }
    // Rules are checked per action (ctx.action) so e.g. a tower limit still allows augments.
    const ruleFail = (action) => {
      const r = checkWordRules(word, res.spec, level, {
        usedWords: state.usedWords, towerCount: state.towers.length, wave: state.waveIndex, action,
      });
      return r && r.ok === false ? r.reason || 'Breaks a level rule' : null;
    };
    const towerFail = ruleFail('tower');
    const augFail = res.spec.augment ? (towerFail ? ruleFail('augment') : null) : 'not an augment';
    if (towerFail && augFail) { res.reason = towerFail; return res; }
    res.ok = true;
    // extras (non-contract): why this word can't be used one way while the other is fine
    res.towerReason = towerFail || undefined;
    res.augmentReason = res.spec.augment ? augFail || undefined : undefined;
    res.canTower = !towerFail && state.ink >= res.spec.cost;
    res.canAugment = !!res.spec.augment && !augFail && state.ink >= (res.spec.augment.cost ?? 0);
    return res;
  }

  function consumeWord(word) {
    const pos = consumedPositions(state.rack, word);
    fillRack(state.rack, pos, bag, DEFAULTS.minVowelsInRack);
    state.usedWords.add(word);
    wordsUsed.push(word);
    emit({ type: 'rack', rack: state.rack.slice() });
  }

  function cellState(cx, cy) {
    if (!Number.isInteger(cx) || !Number.isInteger(cy) || cx < 0 || cy < 0 || cx >= cols || cy >= rows) return 'out';
    const i = cy * cols + cx;
    if (towerGrid[i]) return 'tower'; // walls/traps sit on path cells
    if (grid[i] === CELL_PATH) return 'path';
    if (grid[i] === CELL_BLOCKED) return 'blocked';
    return 'free';
  }

  /** null if (cx, cy) can take a tower of this archetype, else a friendly reason. */
  function buildReason(cx, cy, archetype) {
    const cs = cellState(cx, cy);
    if (!PATH_ARCHETYPES.includes(archetype)) return cs === 'free' ? null : BUILD_REASONS[cs];
    if (cs === 'free') return 'Walls and traps go on the path';
    if (cs !== 'path') return BUILD_REASONS[cs];
    if (pathEnds.has(cy * cols + cx)) return "Not on the path's first or last cell";
    return null;
  }

  /** archetype optional: wall/trap need a path cell, everything else a free cell. */
  function canBuild(cx, cy, archetype) {
    return !over() && buildReason(cx, cy, archetype) === null;
  }

  const BUILD_REASONS = {
    out: 'That cell is off the board',
    path: "You can't build on the path",
    blocked: 'That spot is blocked',
    tower: "There's already a tower there",
  };

  function placeTower(raw, cx, cy) {
    const word = normalize(raw);
    const c = checkWord(word);
    if (!c.ok) return { ok: false, reason: c.reason };
    if (c.towerReason) return { ok: false, reason: c.towerReason };
    const spec = c.spec;
    const why = buildReason(cx, cy, spec.archetype);
    if (why) return { ok: false, reason: why };
    if (state.ink < spec.cost) return { ok: false, reason: `Not enough ink — need ${spec.cost}, have ${Math.floor(state.ink)}` };
    state.ink -= spec.cost;
    const t = {
      id: nextId++, word, spec, archetype: spec.archetype,
      cx, cy, x: cx + 0.5, y: cy + 0.5,
      hp: 0, maxHp: 0, shield: 0, disabled: false,
      augments: [], stats: null, element: spec.element, effects: [],
      cooldown: 0, kills: 0, damageDealt: 0, targetId: null,
      spent: spec.cost, themeMul: 1,
      buffs: { damage: 1, rate: 1, range: 1 },
      fx: null, _base: null,
      healT: 0, shieldT: 0, harvestT: [], summonT: 0, unitSlots: [],
      anchor: null, beamPulse: 0, dead: false,
      // v2
      letterBonus: wordBonuses(word, kinds, state.letterTiers), // frozen at creation (§3)
      killInk: 0, bonusHp: 0, healAcc: 0,
      orbAngle: 0, orbPhase: (nextId * 2.399963) % (2 * Math.PI), orbHits: new Map(),
      spots: [], pendingHit: { bite: 0, vandal: 0 },
    };
    if (spec.archetype === 'wall') {
      (level.paths || []).forEach((p, pi) => {
        const k = p.findIndex(([x, y]) => x === cx && y === cy);
        if (k >= 0) t.spots.push({ pathIndex: pi, progress: paths[pi].cum[k] });
      });
    }
    towerGrid[cy * cols + cx] = t.id;
    state.towers.push(t);
    composeInto(t);
    t.hp = t.maxHp;
    consumeWord(word);
    refreshAll();
    if (t.fx.summon) {
      t.anchor = findAnchor(t);
      trySummon(t);
      t.summonT = t.fx.summon.interval || 5;
    }
    emit({ type: 'towerPlaced', towerId: t.id });
    return { ok: true, tower: t };
  }

  function augmentTower(raw, towerId) {
    const word = normalize(raw);
    const c = checkWord(word);
    if (!c.ok) return { ok: false, reason: c.reason };
    const spec = c.spec;
    if (!spec.augment) return { ok: false, reason: `“${word.toUpperCase()}” can't be used as an augment — only verbs and adjectives can` };
    if (c.augmentReason) return { ok: false, reason: c.augmentReason };
    const t = state.towers.find((x) => x.id === towerId);
    if (!t) return { ok: false, reason: 'No such tower' };
    if (t.augments.length >= DEFAULTS.maxAugments) return { ok: false, reason: `That tower already has ${DEFAULTS.maxAugments} augments` };
    const cost = spec.augment.cost ?? 0;
    if (state.ink < cost) return { ok: false, reason: `Not enough ink — need ${cost}, have ${Math.floor(state.ink)}` };
    state.ink -= cost;
    t.spent += cost;
    t.augments.push(spec);
    consumeWord(word);
    const hadSummon = !!(t.fx && t.fx.summon);
    composeInto(t);
    refreshAll();
    if (t.fx.summon && !hadSummon) {
      t.anchor = findAnchor(t);
      trySummon(t);
      t.summonT = t.fx.summon.interval || 5;
    }
    emit({ type: 'towerAugmented', towerId: t.id, word });
    return { ok: true, tower: t };
  }

  function sellTower(towerId) {
    const idx = state.towers.findIndex((x) => x.id === towerId);
    if (idx < 0 || over()) return { ok: false, refund: 0 };
    const t = state.towers[idx];
    const refund = Math.floor(t.spent * R.refund);
    state.ink += refund;
    state.towers.splice(idx, 1);
    t.dead = true;
    towerGrid[t.cy * cols + t.cx] = 0;
    for (const u of state.units) if (u.ownerId === t.id) u.dead = true;
    compact(state.units);
    refreshAll();
    emit({ type: 'towerSold', towerId: t.id, x: t.x, y: t.y });
    return { ok: true, refund };
  }

  function redrawRack() {
    if (over()) return { ok: false, reason: 'The game is over' };
    if (state.freeRedraws > 0) {
      state.freeRedraws--;
    } else {
      if (state.ink < state.redrawCost) return { ok: false, reason: `Not enough ink — a redraw costs ${state.redrawCost}` };
      state.ink -= state.redrawCost;
      state.redrawCost += 5;
    }
    fillRack(state.rack, [...state.rack.keys()], bag, DEFAULTS.minVowelsInRack);
    emit({ type: 'rack', rack: state.rack.slice() });
    return { ok: true };
  }

  function shuffleRack() {
    const r = state.rack;
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(shuffleRng.next() * (i + 1));
      const tmp = r[i]; r[i] = r[j]; r[j] = tmp;
    }
    emit({ type: 'rack', rack: r.slice() });
    return { ok: true };
  }

  function startWave() {
    if (state.phase !== 'build') return { ok: false, reason: state.phase === 'wave' ? 'A wave is already running' : 'The game is over' };
    if (state.waveIndex >= state.waveCount) return { ok: false, reason: 'No waves left' };
    if (state.reward) return { ok: false, reason: 'Choose your reward first' };
    state.freeRedraws += R.waveRedraws;
    const w = waves[state.waveIndex];
    spawners = (w.groups || []).map((g) => ({ g, spawned: 0 }));
    state.phase = 'wave';
    state.waveTime = 0;
    acc = 0;
    emit({ type: 'waveStart', index: state.waveIndex });
    return { ok: true };
  }

  // ---- tower composition / buffs ---------------------------------------------------------
  function composeInto(t) {
    // theme bonus is evaluated against the tower's (possibly converted) element
    let element = t.spec.element;
    for (const a of t.augments) if (a.augment && a.augment.element) element = a.augment.element;
    const themeSpec = element === t.spec.element ? t.spec : { ...t.spec, element };
    let theme = 1;
    try { theme = Number(themeBonus(themeSpec, level)) || 1; } catch { theme = 1; }
    t.themeMul = theme;
    const c = composeTower(t.spec, t.augments, theme);
    t.element = c.element;
    const extra = {};
    applyLetterBonuses(t.letterBonus, c.stats, c.effects, extra);
    t.killInk = extra.killInk || 0;
    for (const f of R.stats) f(t, c.stats, c.effects);
    c.stats.hp += t.bonusHp;
    t._base = c.stats;
    t.effects = c.effects;
    t.fx = indexEffects(c.effects);
    const oldMax = t.maxHp;
    t.maxHp = c.stats.hp;
    if (oldMax > 0 && t.maxHp !== oldMax && !t.disabled) t.hp = Math.max(1, Math.min(t.maxHp, t.hp + (t.maxHp - oldMax)));
  }

  function refreshAll() {
    dirty = false;
    const towers = state.towers;
    for (const t of towers) { t.buffs.damage = 1; t.buffs.rate = 1; t.buffs.range = 1; }
    for (const p of towers) {
      if (p.disabled || !p.fx.buffs.length) continue;
      const r2 = p._base.range * p._base.range;
      for (const b of p.fx.buffs) {
        if (!(b.stat in p.buffs)) continue;
        const mul = b.mul || 1;
        for (const t of towers) {
          if (t === p) continue;
          const dx = t.x - p.x, dy = t.y - p.y;
          if (dx * dx + dy * dy <= r2 && mul > t.buffs[b.stat]) t.buffs[b.stat] = mul;
        }
      }
    }
    for (const t of towers) {
      const b = t._base;
      t.stats = {
        damage: b.damage * t.buffs.damage,
        rate: b.rate * t.buffs.rate,
        range: b.range * t.buffs.range,
        splash: b.splash,
        projectileSpeed: b.projectileSpeed,
        hp: b.hp,
        minRange: b.minRange,
        pull: b.pull,
        orbs: b.orbs,
      };
    }
  }

  // ---- summons ---------------------------------------------------------------------------
  function findAnchor(t) {
    let best = null;
    for (let i = 0; i < paths.length; i++) {
      const n = nearestOnPath(paths[i], t.x, t.y);
      if (!best || n.dist < best.dist) best = { pathIndex: i, progress: n.progress, dist: n.dist };
    }
    return best;
  }

  function trySummon(t) {
    const s = t.fx.summon;
    if (!s || !t.anchor) return false;
    const count = Math.max(1, Math.round(s.count || 1));
    let alive = 0;
    const used = t.unitSlots;
    used.length = 0;
    for (const u of state.units) if (u.ownerId === t.id && !u.dead) { alive++; used.push(u.slot); }
    if (alive >= count) return false;
    let slot = 0;
    while (used.includes(slot)) slot++;
    const p = paths[t.anchor.pathIndex];
    const off = (slot % 2 === 0 ? 1 : -1) * Math.ceil(slot / 2) * RULES.unitSpacing;
    let prog = t.anchor.progress + off;
    prog = Math.max(Math.min(0.5, p.length), Math.min(p.length - 0.5, prog));
    const hp = Math.max(1, s.hp || 20) * R.unitHpMul;
    const u = {
      id: nextId++, x: 0, y: 0, hp, maxHp: hp, ownerId: t.id,
      pathIndex: t.anchor.pathIndex, progress: prog, _seg: 0, slot,
      dps: s.damage || 0, element: t.element, cd: 0, engaged: null, dead: false,
    };
    placeOnPath(p, u);
    state.units.push(u);
    return true;
  }

  // ---- damage ----------------------------------------------------------------------------
  function effArmor(e) {
    return e.statuses.armorBreak > 0 ? Math.max(0, e.armor - e.abAmount) : e.armor;
  }

  function damageRaw(e, amount, src) {
    if (e.dead || amount <= 0) return;
    if (src) src.damageDealt += Math.min(amount, e.hp);
    e.hp -= amount;
    if (e.hp <= 0) killEnemy(e, src);
  }

  function killEnemy(e, src) {
    if (e.dead) return;
    e.dead = true;
    e.hp = 0;
    const mul = src && src.fx && src.fx.bounty ? (src.fx.bounty.mul || 1) : 1;
    const ink = Math.round(e.bounty * mul) + R.killInk + (src && src.killInk ? src.killInk : 0);
    state.ink += ink;
    state.kills++;
    if (src) src.kills++;
    emit({ type: 'kill', x: e.x, y: e.y, enemy: e.type, enemyId: e.id, ink });
    if (e.splitter) {
      for (let k = 0; k < RULES.splitterChildren; k++) {
        spawnEnemy('swarm', e.pathIndex, e.hpMul, e.speedMul, Math.max(0, e.progress - k * 0.3));
      }
    }
  }

  /** One hit from tower t (or unit-ish source) on enemy e. Returns damage dealt. */
  function hitEnemy(t, e, base, allowCrit = true) {
    if (e.dead) return 0;
    const em = elementMul(t.element, e.element);
    let crit = false;
    let mult = 1;
    const c = t.fx && t.fx.crit;
    if (allowCrit && c && fxRng.next() < (c.chance || 0)) { crit = true; mult = c.mult || 2; }
    const dmg = Math.max(1, base * em * mult * relicDmg(t, e) - effArmor(e));
    emit({ type: 'hit', towerId: t.id, x: e.x, y: e.y, element: t.element, damage: dmg, crit });
    damageRaw(e, dmg, t);
    if (!e.dead && t.fx && t.fx.onHit) applyOnHit(t, e, em);
    return dmg;
  }

  function applyOnHit(t, e, em) {
    const fx = t.fx;
    const st = e.statuses;
    if (fx.burn) {
      const dps = (fx.burn.dps || 0) * em;
      const dur = fx.burn.duration || 0;
      if (dps * dur >= e.burnDps * st.burn) { e.burnDps = dps; st.burn = dur; e.burnSrc = t; }
    }
    if (fx.poison) {
      const dps = (fx.poison.dps || 0) * em;
      e.poisonDps = st.poison > 0 ? Math.max(e.poisonDps, dps) : dps;
      e.poisonStacks = Math.min(5, (st.poison > 0 ? e.poisonStacks : 0) + 1);
      st.poison = Math.max(st.poison, fx.poison.duration || 0);
      e.poisonSrc = t;
    }
    if (fx.slow) {
      const f = Math.max(0, Math.min(1, fx.slow.factor ?? 1));
      const dur = fx.slow.duration || 0;
      if ((1 - f) * dur >= (1 - e.slowFactor) * st.slow) { e.slowFactor = f; st.slow = dur; }
    }
    if (fx.freeze && !e.boss && fxRng.next() < (fx.freeze.chance || 0)) {
      st.freeze = Math.max(st.freeze, fx.freeze.duration || 0);
    }
    if (fx.stun && fxRng.next() < (fx.stun.chance || 0)) {
      st.stun = Math.max(st.stun, fx.stun.duration || 0);
    }
    if (fx.armorBreak) {
      const amt = fx.armorBreak.amount || 0, dur = fx.armorBreak.duration || 0;
      if (amt * dur >= e.abAmount * st.armorBreak) { e.abAmount = amt; st.armorBreak = dur; }
    }
    if (fx.knockback && !e.boss && fxRng.next() < (fx.knockback.chance ?? 1)) {
      e.progress = Math.max(0, e.progress - (fx.knockback.cells || 0));
      placeOnPath(paths[e.pathIndex], e);
    }
    if (!e.dead && fx.execute && !e.boss && e.hp / e.maxHp < (fx.execute.threshold || 0)) {
      t.damageDealt += e.hp;
      killEnemy(e, t);
    }
  }

  const targetable = (e) => !e.dead && (!e.stealth || e.revealed);

  /** "first": in range, least remaining path distance. */
  function findFirst(x, y, range, minRange = 0) {
    const r2 = range * range;
    const m2 = minRange * minRange;
    let best = null;
    let bestRem = Infinity;
    const es = state.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead || (e.stealth && !e.revealed)) continue;
      const dx = e.x - x, dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2 || d2 < m2) continue;
      const rem = paths[e.pathIndex].length - e.progress;
      if (rem < bestRem) { bestRem = rem; best = e; }
    }
    return best;
  }

  function findNearestExcluding(x, y, radius, exclude) {
    const r2 = radius * radius;
    let best = null;
    let bd = Infinity;
    const es = state.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (!targetable(e) || exclude.includes(e.id)) continue;
      const dx = e.x - x, dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d <= r2 && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function splashAt(t, x, y, radius, base, primary, allowCrit = false) {
    if (!(radius > 0)) return;
    const r2 = radius * radius;
    const es = state.enemies;
    const n = es.length; // children spawned mid-loop are not splashed
    for (let i = 0; i < n; i++) {
      const e = es[i];
      if (e === primary || e.dead) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= r2) hitEnemy(t, e, base, allowCrit);
    }
  }

  function chainFrom(t, first, base, jumps, falloff) {
    hitScratch.length = 0;
    hitScratch.push(first.id);
    let dmg = base;
    let lx = first.x, ly = first.y;
    for (let j = 0; j < jumps; j++) {
      const next = findNearestExcluding(lx, ly, RULES.chainRadius, hitScratch);
      if (!next) break;
      dmg *= falloff;
      emit({ type: 'shot', towerId: t.id, x: lx, y: ly, tx: next.x, ty: next.y, element: t.element, archetype: 'chain' });
      hitScratch.push(next.id);
      lx = next.x; ly = next.y;
      hitEnemy(t, next, dmg);
    }
  }

  function splashRadius(t) {
    return Math.max(t.stats.splash || 0, t.fx.splash ? t.fx.splash.radius || 0 : 0);
  }

  /** Full impact on primary target e at (x, y): hit + splash + chain. */
  function impact(t, e, x, y, base) {
    if (e && !e.dead) hitEnemy(t, e, base);
    splashAt(t, x, y, splashRadius(t), base, e);
    if (e && t.archetype !== 'chain' && t.fx.chain) chainFrom(t, e, base, t.fx.chain.jumps || 0, t.fx.chain.falloff ?? 0.7);
  }

  // ---- spawning --------------------------------------------------------------------------
  function spawnEnemy(type, pathIndex, hpMul = 1, speedMul = 1, progress = 0) {
    const b = ENEMIES[type] || ENEMIES.grunt;
    const pi = Math.max(0, Math.min(paths.length - 1, pathIndex | 0));
    const tr = b.traits;
    const hp = b.hp * hpMul;
    const e = {
      id: nextId++, type: ENEMIES[type] ? type : 'grunt', x: 0, y: 0, hp, maxHp: hp,
      armor: b.armor, speed: b.speed * speedMul, pathIndex: pi, progress, _seg: 0,
      element: level.element,
      statuses: { burn: 0, poison: 0, slow: 0, freeze: 0, stun: 0, armorBreak: 0 },
      revealed: !tr.includes('stealth'),
      boss: tr.includes('boss'), stealth: tr.includes('stealth'), healer: tr.includes('healer'),
      vandal: tr.includes('vandal'), splitter: tr.includes('splitter'), flyer: tr.includes('flyer'),
      bounty: b.bounty, leak: b.leak, hpMul, speedMul,
      burnDps: 0, burnSrc: null, poisonDps: 0, poisonStacks: 0, poisonSrc: null,
      slowFactor: 1, abAmount: 0, dead: false,
      // v2
      bite: b.bite || 0, slinger: tr.includes('slinger'), stomp: tr.includes('stomp'),
      blocked: false, blockedT: 0, thornT: 0, pull: 0, pullT: 0,
      slingT: RULES.slingInterval, stompT: RULES.stompInterval,
    };
    placeOnPath(paths[pi], e);
    state.enemies.push(e);
    return e;
  }

  // ---- the tick --------------------------------------------------------------------------
  function step() {
    const dt = STEP;
    stepNo++;
    state.time += dt;
    state.waveTime += dt;
    const es = state.enemies;
    const towers = state.towers;
    const units = state.units;

    // 1. spawns
    for (const s of spawners) {
      const g = s.g;
      const count = g.count ?? 1;
      while (s.spawned < count && state.waveTime + 1e-9 >= (g.delay || 0) + s.spawned * (g.interval ?? 1)) {
        spawnEnemy(g.enemy, g.path || 0, g.hpMul ?? 1, g.speedMul ?? 1, 0);
        s.spawned++;
      }
    }

    if (dirty) refreshAll();

    // 2. stealth reveal
    const sd2 = RULES.stealthDetect * RULES.stealthDetect;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (!e.stealth || e.dead) continue;
      let rev = false;
      for (let k = 0; k < towers.length && !rev; k++) {
        const t = towers[k];
        if (t.disabled) continue;
        const dx = e.x - t.x, dy = e.y - t.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= sd2) rev = true;
        else if (t.fx.reveal && d2 <= t.stats.range * t.stats.range) rev = true;
      }
      e.revealed = rev;
    }

    // 3. units: reset engagement; collect standing walls
    for (let i = 0; i < units.length; i++) units[i].engaged = null;
    walls.length = 0;
    for (let k = 0; k < towers.length; k++) if (towers[k].archetype === 'wall') walls.push(towers[k]);

    // 4. enemies: statuses, abilities, movement
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead) continue;
      const st = e.statuses;
      if (st.burn > 0) {
        const d = Math.min(dt, st.burn);
        st.burn -= dt;
        if (st.burn <= 0) st.burn = 0;
        damageRaw(e, e.burnDps * d, e.burnSrc);
        if (e.dead) continue;
      }
      if (st.poison > 0) {
        const d = Math.min(dt, st.poison);
        st.poison -= dt;
        damageRaw(e, e.poisonDps * e.poisonStacks * d, e.poisonSrc);
        if (st.poison <= 0) { st.poison = 0; e.poisonStacks = 0; }
        if (e.dead) continue;
      }
      if (st.slow > 0) { st.slow -= dt; if (st.slow <= 0) { st.slow = 0; e.slowFactor = 1; } }
      if (st.freeze > 0) { st.freeze -= dt; if (st.freeze < 0) st.freeze = 0; }
      if (st.stun > 0) { st.stun -= dt; if (st.stun < 0) st.stun = 0; }
      if (st.armorBreak > 0) { st.armorBreak -= dt; if (st.armorBreak <= 0) { st.armorBreak = 0; e.abAmount = 0; } }
      const held = st.freeze > 0 || st.stun > 0;

      if (!held && e.healer) {
        const r2 = RULES.healerRadius * RULES.healerRadius;
        for (let k = 0; k < es.length; k++) {
          const o = es[k];
          if (o === e || o.dead || o.hp >= o.maxHp) continue;
          const dx = o.x - e.x, dy = o.y - e.y;
          if (dx * dx + dy * dy <= r2) o.hp = Math.min(o.maxHp, o.hp + RULES.healerHps * dt);
        }
      }
      if (!held && e.vandal) {
        const r2 = RULES.vandalRadius * RULES.vandalRadius;
        let best = null, bd = Infinity;
        for (let k = 0; k < towers.length; k++) {
          const t = towers[k];
          if (t.disabled) continue;
          const dx = t.x - e.x, dy = t.y - e.y;
          const d = dx * dx + dy * dy;
          if (d <= r2 && d < bd) { bd = d; best = t; }
        }
        if (best) damageTower(best, RULES.vandalDps * dt, 'vandal');
      }
      if (!held && e.slinger) {
        e.slingT -= dt;
        if (e.slingT <= 0) {
          const tt = nearestTower(e.x, e.y, RULES.slingRange);
          if (tt) {
            e.slingT += RULES.slingInterval;
            state.projectiles.push({
              id: nextId++, x: e.x, y: e.y, tx: tt.x, ty: tt.y, element: e.element, kind: 'sling',
              targetTower: tt, speed: RULES.slingSpeed, damage: RULES.slingDamage * e.hpMul, dead: false,
            });
            emit({ type: 'enemyShot', x: e.x, y: e.y, tx: tt.x, ty: tt.y });
          } else e.slingT = 0;
        }
      }
      if (!held && e.stomp) {
        e.stompT -= dt;
        if (e.stompT <= 0) {
          e.stompT += RULES.stompInterval;
          emit({ type: 'stomp', x: e.x, y: e.y });
          const r2 = RULES.stompRadius * RULES.stompRadius;
          for (let k = 0; k < towers.length; k++) {
            const t = towers[k];
            const dx = t.x - e.x, dy = t.y - e.y;
            if (!t.disabled && dx * dx + dy * dy <= r2) damageTower(t, RULES.stompDamage * e.hpMul, 'stomp');
          }
        }
      }

      // blocking by summoned units or walls (same path, just ahead)
      let blocker = null, wall = null;
      if (!e.flyer) {
        for (let k = 0; k < units.length; k++) {
          const u = units[k];
          if (u.dead || u.pathIndex !== e.pathIndex) continue;
          const gap = u.progress - e.progress;
          if (gap <= RULES.unitBlockAhead && gap >= -RULES.unitBlockBehind) { blocker = u; break; }
        }
        for (let k = 0; k < walls.length && !blocker && !wall; k++) {
          const w = walls[k];
          if (w.disabled) continue;
          for (const sp of w.spots) {
            if (sp.pathIndex !== e.pathIndex) continue;
            const gap = sp.progress - e.progress;
            if (gap <= RULES.wallBlockAhead && gap >= -RULES.wallBlockBehind) { wall = w; break; }
          }
        }
      }
      e.blocked = !!(blocker || wall);
      if (e.blocked) {
        e.blockedT += dt;
        const bite = e.bite * e.hpMul * (1 + RULES.biteGrowth * e.blockedT) * dt;
        if (blocker) {
          blocker.hp -= bite;
          if (!blocker.engaged || e.progress > blocker.engaged.progress) blocker.engaged = e;
          if (blocker.hp <= 0) { blocker.hp = 0; blocker.dead = true; }
        } else {
          damageTower(wall, bite, 'bite');
          if (R.briarDps > 0) damageRaw(e, R.briarDps * dt, wall);
          if (!e.dead && wall.fx.onHit) { // thorns
            e.thornT -= dt;
            if (e.thornT <= 0) { e.thornT += RULES.thornInterval; applyOnHit(wall, e, elementMul(wall.element, e.element)); }
          }
          if (e.dead) continue;
        }
      } else {
        e.blockedT = 0;
        e.thornT = 0;
      }
      // movement: own speed (unless held/blocked) minus vortex pull from the last tick, never past spawn
      const fwd = e.blocked || held ? 0 : e.speed * (st.slow > 0 ? e.slowFactor : 1);
      if (fwd !== 0 || e.pull !== 0) {
        e.progress += (fwd - e.pull) * dt;
        if (e.pull) e.pullT += dt;
        if (e.progress < 0) e.progress = 0;
      }
      e.pull = 0;
      const p = paths[e.pathIndex];
      if (e.progress >= p.length) {
        e.dead = true;
        e.leaked = true;
        state.lives -= e.leak;
        state.leaked++;
        emit({ type: 'leak', lives: e.leak, livesLeft: Math.max(0, state.lives) });
        continue;
      }
      placeOnPath(p, e);
    }

    // 5. units attack
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (u.dead) continue;
      u.cd -= dt;
      if (u.engaged && !u.engaged.dead && u.cd <= 0) {
        u.cd = RULES.unitAttackInterval;
        const owner = towerById(u.ownerId);
        const e = u.engaged;
        const em = elementMul(u.element, e.element);
        const dmg = Math.max(1, u.dps * RULES.unitAttackInterval * em - effArmor(e));
        emit({ type: 'hit', towerId: u.ownerId, x: e.x, y: e.y, element: u.element, damage: dmg, crit: false });
        damageRaw(e, dmg, owner);
      } else if (u.cd < 0) u.cd = 0;
    }

    // 6. towers
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (t.disabled) continue;
      towerPassives(t, dt);
      if (ATTACKERS.has(t.archetype)) towerAttack(t, dt);
    }

    // 7. projectiles
    stepProjectiles(dt);
    if (stepNo % RULES.hitFlushSteps === 0) flushTowerHits();

    // 8. cleanup
    compact(es);
    compact(units);
    compact(state.projectiles);

    // 9. end conditions
    if (state.lives <= 0) {
      state.lives = 0;
      state.phase = 'lost';
      emit({ type: 'lost' });
      return;
    }
    let allSpawned = true;
    for (const s of spawners) if (s.spawned < (s.g.count ?? 1)) { allSpawned = false; break; }
    if (allSpawned && es.length === 0) endWave();
  }

  function towerById(id) {
    const ts = state.towers;
    for (let i = 0; i < ts.length; i++) if (ts[i].id === id) return ts[i];
    return null;
  }

  function nearestTower(x, y, radius) {
    let best = null, bd = radius * radius;
    for (const t of state.towers) {
      if (t.disabled) continue;
      const dx = t.x - x, dy = t.y - y;
      const d = dx * dx + dy * dy;
      if (d <= bd) { bd = d; best = t; }
    }
    return best;
  }

  function flushTowerHits() {
    for (const t of state.towers) {
      const ph = t.pendingHit;
      for (const src in ph) {
        if (ph[src] > 0) { emit({ type: 'towerHit', towerId: t.id, x: t.x, y: t.y, damage: ph[src], source: src }); ph[src] = 0; }
      }
    }
  }

  /** source: 'bite' | 'vandal' (continuous, reported every 0.25 s) | 'shot' | 'stomp'. */
  function damageTower(t, amount, source = 'vandal') {
    if (t.shield > 0) {
      const a = Math.min(t.shield, amount);
      t.shield -= a;
      amount -= a;
    }
    if (amount <= 0) return;
    const dmg = Math.min(amount, t.hp);
    if (source in t.pendingHit) t.pendingHit[source] += dmg;
    else emit({ type: 'towerHit', towerId: t.id, x: t.x, y: t.y, damage: dmg, source });
    t.hp -= amount;
    if (t.hp <= 0) {
      t.hp = 0;
      t.shield = 0;
      t.disabled = true;
      t.targetId = null;
      dirty = true;
      emit({ type: 'towerDown', towerId: t.id });
    }
  }

  function towerPassives(t, dt) {
    const fx = t.fx;
    if (fx.heal) {
      t.healT -= dt;
      if (t.healT <= 0) {
        t.healT += RULES.healPulse;
        const amt = (fx.heal.hps || 0) * RULES.healPulse;
        const r2 = t.stats.range * t.stats.range;
        for (const o of state.towers) {
          if (o.hp >= o.maxHp) continue;
          const dx = o.x - t.x, dy = o.y - t.y;
          if (dx * dx + dy * dy > r2) continue;
          const before = o.hp;
          o.hp = Math.min(o.maxHp, o.hp + amt);
          if (R.savedHp > 0) {
            o.healAcc += o.hp - before;
            while (o.healAcc >= 10) { o.healAcc -= 10; o.bonusHp += R.savedHp; o.maxHp += R.savedHp; o._base.hp += R.savedHp; o.stats.hp += R.savedHp; }
          }
          if (o.disabled && o.hp > RULES.revivePct * o.maxHp) { o.disabled = false; dirty = true; }
          emit({ type: 'heal', towerId: o.id, x: o.x, y: o.y });
        }
      }
    }
    if (fx.shield) {
      t.shieldT -= dt;
      if (t.shieldT <= 0) {
        t.shieldT += Math.max(0.1, fx.shield.interval || 5);
        const r2 = t.stats.range * t.stats.range;
        const amt = fx.shield.amount || 0;
        for (const o of state.towers) {
          if (o.disabled) continue;
          const dx = o.x - t.x, dy = o.y - t.y;
          if (dx * dx + dy * dy <= r2 && o.shield < amt) o.shield = amt;
        }
      }
    }
    for (let h = 0; h < fx.harvests.length; h++) {
      const e = fx.harvests[h];
      const interval = Math.max(0.1, e.interval || 5);
      if (t.harvestT[h] == null) t.harvestT[h] = interval;
      t.harvestT[h] -= dt;
      if (t.harvestT[h] <= 0) {
        t.harvestT[h] += interval;
        const amount = Math.max(1, Math.round(e.amount || 0));
        if (e.resource === 'tile') state.freeRedraws += amount;
        else state.ink += amount;
        emit({ type: 'harvest', towerId: t.id, x: t.x, y: t.y, resource: e.resource === 'tile' ? 'tile' : 'ink', amount });
      }
    }
    if (fx.summon) {
      t.summonT -= dt;
      if (t.summonT <= 0) {
        t.summonT = Math.max(0.5, fx.summon.interval || 5);
        trySummon(t);
      }
    }
  }

  function towerAttack(t, dt) {
    const s = t.stats;
    const arch = t.archetype;
    // cooldown only runs down while positive; firing adds 1/rate (keeps fractional carry)
    if (t.cooldown > 0 && (s.damage > 0 || arch === 'vortex')) t.cooldown -= dt;
    if (arch === 'vortex') return vortexTick(t, s, dt);
    if (!(s.damage > 0)) return;
    if (arch === 'trap') return trapTick(t, s);
    if (arch === 'pulse') return pulseTick(t, s);
    if (arch === 'orbit') return orbitTick(t, s);
    if (arch === 'mortar') return mortarTick(t, s);
    if (arch === 'beam') {
      const e = findFirst(t.x, t.y, s.range);
      t.targetId = e ? e.id : null;
      if (!e) return;
      const em = elementMul(t.element, e.element);
      const pulse = t.cooldown <= 0 && s.rate > 0;
      damageRaw(e, Math.max(1, s.damage * em * relicDmg(t, e) - effArmor(e)) * dt, t);
      if (pulse) {
        t.cooldown += 1 / s.rate;
        emit({ type: 'shot', towerId: t.id, x: t.x, y: t.y, tx: e.x, ty: e.y, element: t.element, archetype: 'beam' });
        if (!e.dead && t.fx.onHit) applyOnHit(t, e, em);
      }
      return;
    }
    if (arch === 'aura') {
      const r2 = s.range * s.range;
      const pulse = t.cooldown <= 0 && s.rate > 0;
      if (pulse) t.cooldown += 1 / s.rate;
      const es = state.enemies;
      const n = es.length;
      let any = false;
      for (let i = 0; i < n; i++) {
        const e = es[i];
        if (!targetable(e)) continue;
        const dx = e.x - t.x, dy = e.y - t.y;
        if (dx * dx + dy * dy > r2) continue;
        any = true;
        const em = elementMul(t.element, e.element);
        damageRaw(e, Math.max(1, s.damage * em * relicDmg(t, e) - effArmor(e)) * dt, t);
        if (pulse && !e.dead && t.fx.onHit) applyOnHit(t, e, em);
      }
      if (pulse && any) emit({ type: 'shot', towerId: t.id, x: t.x, y: t.y, tx: t.x, ty: t.y, element: t.element, archetype: 'aura' });
      return;
    }
    if (t.cooldown > 0) return;
    if (!(s.rate > 0)) return;
    const e = findFirst(t.x, t.y, s.range);
    if (!e) { t.targetId = null; return; }
    t.targetId = e.id;
    t.cooldown += 1 / s.rate;
    emit({ type: 'shot', towerId: t.id, x: t.x, y: t.y, tx: e.x, ty: e.y, element: t.element, archetype: arch });
    if (PROJECTILE_KINDS.has(arch)) {
      state.projectiles.push({
        id: nextId++, x: t.x, y: t.y, tx: e.x, ty: e.y, element: t.element, kind: arch,
        target: e, tower: t, towerId: t.id, speed: s.projectileSpeed || 8, damage: s.damage,
        pierce: t.fx.pierce ? Math.max(0, Math.round(t.fx.pierce.count || 0)) : 0,
        hits: [], dead: false,
      });
      return;
    }
    // instant: snipe / chain
    if (arch === 'chain') {
      hitEnemy(t, e, s.damage);
      const c = t.fx.chain || RULES.chainDefault;
      chainFrom(t, e, s.damage, c.jumps ?? RULES.chainDefault.jumps, c.falloff ?? RULES.chainDefault.falloff);
      splashAt(t, e.x, e.y, splashRadius(t), s.damage, e);
      return;
    }
    // snipe
    const ex = e.x, ey = e.y;
    impact(t, e, ex, ey, s.damage);
    if (t.fx.pierce) {
      hitScratch.length = 0;
      hitScratch.push(e.id);
      let dmg = s.damage;
      for (let k = 0; k < (t.fx.pierce.count || 0); k++) {
        const n = findNearestExcluding(ex, ey, RULES.pierceRadius, hitScratch);
        if (!n) break;
        hitScratch.push(n.id);
        dmg *= RULES.pierceFalloff;
        hitEnemy(t, n, dmg);
      }
    }
  }

  // ---- v2 archetypes ----------------------------------------------------------------------
  function vortexTick(t, s, dt) {
    const r2 = s.range * s.range;
    const rate = s.rate > 0 ? s.rate : 1; // cadence of the visual pulse + on-hit effects
    const pulse = t.cooldown <= 0;
    if (pulse) t.cooldown += 1 / rate;
    const es = state.enemies;
    const n = es.length;
    let any = false;
    for (let i = 0; i < n; i++) {
      const e = es[i];
      if (e.flyer || !targetable(e)) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy > r2) continue;
      any = true;
      const pull = e.pullT >= RULES.pullMax ? 0 : (s.pull || 0) * (e.boss ? RULES.bossPull : 1);
      if (pull > e.pull) e.pull = pull; // strongest vortex wins, no stacking
      const em = elementMul(t.element, e.element);
      if (s.damage > 0) damageRaw(e, Math.max(1, s.damage * em * relicDmg(t, e) - effArmor(e)) * dt, t);
      if (pulse && !e.dead && t.fx.onHit) applyOnHit(t, e, em);
    }
    t.targetId = null;
    if (pulse && any) emit({ type: 'shot', towerId: t.id, x: t.x, y: t.y, tx: t.x, ty: t.y, element: t.element, archetype: 'vortex' });
  }

  function trapTick(t, s) {
    if (t.cooldown > 0 || !(s.rate > 0)) return;
    const es = state.enemies;
    const n = es.length;
    const trig2 = RULES.trapTrigger * RULES.trapTrigger;
    let armed = false;
    for (let i = 0; i < n && !armed; i++) {
      const e = es[i];
      if (e.dead || e.flyer) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy <= trig2) armed = true;
    }
    if (!armed) return;
    t.cooldown += 1 / s.rate;
    emit({ type: 'shot', towerId: t.id, x: t.x, y: t.y, tx: t.x, ty: t.y, element: t.element, archetype: 'trap' });
    const r = Math.max(RULES.trapRadius, splashRadius(t));
    const r2 = r * r;
    for (let i = 0; i < n; i++) {
      const e = es[i];
      if (e.dead || e.flyer) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy <= r2) hitEnemy(t, e, s.damage);
    }
  }

  function pulseTick(t, s) {
    if (t.cooldown > 0 || !(s.rate > 0)) return;
    const r2 = s.range * s.range;
    const es = state.enemies;
    const n = es.length;
    let fired = false;
    for (let i = 0; i < n; i++) {
      const e = es[i];
      if (!targetable(e)) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy > r2) continue;
      if (!fired) {
        fired = true;
        t.cooldown += 1 / s.rate;
        emit({ type: 'shot', towerId: t.id, x: t.x, y: t.y, tx: t.x, ty: t.y, element: t.element, archetype: 'pulse' });
      }
      hitEnemy(t, e, s.damage);
    }
  }

  function orbitTick(t, s) {
    const n = Math.max(1, Math.round(s.orbs || 1));
    const R0 = s.range;
    t.orbAngle = t.orbPhase + (2 * Math.PI * state.time) / RULES.orbitLap;
    const hr = RULES.orbHit, hr2 = hr * hr;
    const outer = (R0 + hr) * (R0 + hr);
    const inner = R0 > hr ? (R0 - hr) * (R0 - hr) : -1;
    const es = state.enemies;
    const N = es.length;
    for (let i = 0; i < N; i++) {
      const e = es[i];
      if (!targetable(e)) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > outer || d2 < inner) continue;
      for (let k = 0; k < n && !e.dead; k++) {
        const a = t.orbAngle + (2 * Math.PI * k) / n;
        const ox = R0 * Math.cos(a) - dx, oy = R0 * Math.sin(a) - dy;
        if (ox * ox + oy * oy > hr2) continue;
        const key = e.id * 8 + k;
        const last = t.orbHits.get(key);
        if (last !== undefined && stepNo - last < RULES.orbCooldownSteps) continue;
        t.orbHits.set(key, stepNo);
        hitEnemy(t, e, s.damage);
      }
    }
    if (t.orbHits.size > 512) for (const [k, v] of t.orbHits) if (stepNo - v >= RULES.orbCooldownSteps) t.orbHits.delete(k);
  }

  function mortarTick(t, s) {
    if (t.cooldown > 0 || !(s.rate > 0)) return;
    const e = findFirst(t.x, t.y, s.range, s.minRange || 0);
    if (!e) { t.targetId = null; return; }
    t.targetId = e.id;
    t.cooldown += 1 / s.rate;
    // lead the target: aim where it will be when the shell lands
    const held = e.blocked || e.statuses.freeze > 0 || e.statuses.stun > 0;
    const sp = held ? 0 : e.speed * (e.statuses.slow > 0 ? e.slowFactor : 1);
    const p = paths[e.pathIndex];
    const aim = { progress: Math.min(p.length, e.progress + sp * RULES.mortarFlight), _seg: e._seg, x: 0, y: 0 };
    placeOnPath(p, aim);
    emit({ type: 'shot', towerId: t.id, x: t.x, y: t.y, tx: aim.x, ty: aim.y, element: t.element, archetype: 'mortar' });
    state.projectiles.push({
      id: nextId++, x: t.x, y: t.y, sx: t.x, sy: t.y, tx: aim.x, ty: aim.y, element: t.element, kind: 'mortar',
      age: 0, flight: RULES.mortarFlight, tower: t, towerId: t.id, damage: s.damage, dead: false,
    });
  }

  function stepProjectiles(dt) {
    const ps = state.projectiles;
    const n = ps.length;
    for (let i = 0; i < n; i++) {
      const p = ps[i];
      if (p.dead) continue;
      if (p.kind === 'mortar') {
        p.age += dt;
        const f = Math.min(1, p.age / p.flight);
        p.x = p.sx + (p.tx - p.sx) * f;
        p.y = p.sy + (p.ty - p.sy) * f;
        if (f >= 1) {
          splashAt(p.tower, p.tx, p.ty, Math.max(0.5, splashRadius(p.tower)), p.damage, null, true);
          p.dead = true;
        }
        continue;
      }
      if (p.kind === 'sling') {
        const tt = p.targetTower;
        const dx = p.tx - p.x, dy = p.ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const move = p.speed * dt;
        if (dist > move) { p.x += (dx / dist) * move; p.y += (dy / dist) * move; continue; }
        if (!tt.dead && !tt.disabled) damageTower(tt, p.damage, 'shot');
        p.dead = true;
        continue;
      }
      let tg = p.target;
      if (tg && tg.dead) {
        p.hits.push(tg.id);
        tg = findNearestExcluding(p.tx, p.ty, RULES.retargetRadius, p.hits);
        p.target = tg; // null → fly to last known point and fizzle
      }
      if (tg) { p.tx = tg.x; p.ty = tg.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = p.speed * dt;
      if (dist > move) {
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;
        continue;
      }
      p.x = p.tx; p.y = p.ty;
      const t = p.tower;
      if (!tg) {
        // fizzle; blasts still burst on the ground
        if (splashRadius(t) > 0) splashAt(t, p.x, p.y, splashRadius(t), p.damage, null);
        p.dead = true;
        continue;
      }
      impact(t, tg, p.x, p.y, p.damage);
      p.hits.push(tg.id);
      if (p.pierce > 0) {
        const next = findNearestExcluding(p.x, p.y, RULES.pierceRadius, p.hits);
        if (next) {
          p.pierce--;
          p.damage *= RULES.pierceFalloff;
          p.target = next;
          p.tx = next.x; p.ty = next.y;
          continue;
        }
      }
      p.dead = true;
    }
  }

  function endWave() {
    const index = state.waveIndex;
    const bonusInk = Math.round((10 + 2 * (index + 1)) * R.waveInkMul);
    state.ink += bonusInk;
    state.projectiles.length = 0;
    spawners = [];
    flushTowerHits();
    state.waveIndex++;
    emit({ type: 'waveEnd', index, bonusInk });
    for (const t of state.towers) { // interest on the banked ink, per tower
      const it = t.fx.interest;
      if (!it || t.disabled) continue;
      const gain = Math.min(it.cap ?? Infinity, Math.floor(state.ink * (it.pct || 0)));
      if (gain <= 0) continue;
      state.ink += gain;
      emit({ type: 'harvest', towerId: t.id, x: t.x, y: t.y, resource: 'ink', amount: gain });
    }
    if (state.waveIndex >= state.waveCount && state.lives > 0) {
      state.phase = 'won';
      emit({ type: 'won' });
    } else {
      state.phase = 'build';
      const w = index + 1;
      if (w % RULES.rewardEvery === 0 && w < state.waveCount) offerReward();
    }
  }

  // ---- rewards (v2 §3) -------------------------------------------------------------------
  function relicCandidates(exclude) {
    return RELIC_IDS.filter((id) => !state.relics.includes(id) && !exclude.includes(id));
  }
  function letterCandidates(exclude) {
    const out = [];
    for (let i = 0; i < 26; i++) {
      const l = String.fromCharCode(97 + i);
      if ((state.letterTiers[l] || 0) >= 2 || exclude.includes(l)) continue;
      let inRack = 0;
      for (const ch of state.rack) if (ch === l) inRack++;
      out.push([l, 1 + 4 * inRack]); // favour letters in the current rack
    }
    return out;
  }
  function letterOption(l) {
    const tier = (state.letterTiers[l] || 0) + 1;
    return { letter: l, bonus: kinds[l], tier, text: bonusText(l, kinds[l], tier) };
  }
  function drawOption(kind, taken) {
    if (kind === 'relic') {
      const c = relicCandidates(taken);
      return c.length ? c[Math.floor(rewardRng.next() * c.length)] : null;
    }
    const c = letterCandidates(taken);
    return c.length ? letterOption(rewardRng.weighted(c)) : null;
  }
  const optionKey = (o) => (typeof o === 'string' ? o : o.letter);
  function offerReward() {
    const first = rewardsOffered % 2 === 0 ? 'relic' : 'letter';
    rewardsOffered++;
    for (const kind of [first, first === 'relic' ? 'letter' : 'relic']) {
      const options = [];
      for (let k = 0; k < 3; k++) {
        const o = drawOption(kind, options.map(optionKey));
        if (o) options.push(o);
      }
      if (!options.length) continue;
      state.reward = { kind, options, rerolls: 1 };
      emit({ type: 'reward', kind });
      return;
    }
  }
  function chooseReward(i) {
    const r = state.reward;
    if (!r) return { ok: false, reason: 'No reward to choose' };
    const o = r.options[i];
    if (o == null) return { ok: false, reason: 'No such option' };
    state.reward = null;
    let id;
    if (r.kind === 'relic') {
      id = o;
      state.relics.push(id);
      rebuildRelicHooks();
      if (RELICS[id].take) RELICS[id].take(relicApi);
    } else {
      id = o.letter;
      state.letterTiers[o.letter] = o.tier;
    }
    for (const t of state.towers) composeInto(t);
    refreshAll();
    emit({ type: 'rewardTaken', kind: r.kind, id });
    return { ok: true };
  }
  function rerollReward(i) {
    const r = state.reward;
    if (!r) return { ok: false, reason: 'No reward to reroll' };
    if (r.rerolls <= 0) return { ok: false, reason: 'No rerolls left' };
    if (r.options[i] == null) return { ok: false, reason: 'No such option' };
    const o = drawOption(r.kind, r.options.map(optionKey));
    if (!o) return { ok: false, reason: 'Nothing else to offer' };
    r.options[i] = o;
    r.rerolls--;
    return { ok: true };
  }
  function skipReward() {
    if (!state.reward) return { ok: false, reason: 'No reward to skip' };
    state.reward = null;
    return { ok: true };
  }
  const relicApi = {
    state,
    addRackTile() {
      state.rack.push(bag.draw());
      emit({ type: 'rack', rack: state.rack.slice() });
    },
  };
  function letterBonus(letter) {
    const l = String(letter || '').toLowerCase();
    if (!kinds[l]) return null;
    const tier = state.letterTiers[l] || 0;
    return { kind: kinds[l], tier, text: bonusText(l, kinds[l], tier) };
  }

  function compact(arr) {
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const o = arr[i];
      if (!o.dead) arr[w++] = o;
    }
    arr.length = w;
  }

  // ---- public ----------------------------------------------------------------------------
  function update(dt) {
    if (!(dt > 0) || state.phase !== 'wave') return;
    acc += Math.min(dt, 30);
    while (acc >= STEP - 1e-9) {
      acc -= STEP;
      step();
      if (state.phase !== 'wave') { acc = 0; break; }
    }
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  function meets(cond) {
    if (!cond) return false;
    let ok = true;
    if (cond.livesAtLeast != null) ok = ok && state.lives >= cond.livesAtLeast;
    if (cond.maxTowers != null) ok = ok && state.towers.length <= cond.maxTowers;
    if (cond.maxWords != null) ok = ok && wordsUsed.length <= cond.maxWords;
    return ok;
  }

  function result() {
    const won = state.phase === 'won';
    if (!won && state.phase !== 'lost') return null;
    let stars = 0;
    if (won) {
      const st = level.stars || {
        two: { livesAtLeast: Math.ceil(startLives / 2) },
        three: { livesAtLeast: startLives },
      };
      stars = 1;
      if (meets(st.two)) stars = 2;
      if (stars === 2 && meets(st.three)) stars = 3;
    }
    let wordScore = 0;
    for (const w of wordsUsed) {
      const sp = specCache.get(w);
      wordScore += (sp && sp.score) || 0;
    }
    const score = Math.round(
      (won ? 1000 : 0) + state.lives * 50 + state.waveIndex * 100 + state.kills * 5 + wordScore * 10 + (won ? state.ink : 0),
    );
    return { won, stars, livesLeft: state.lives, wordsUsed: wordsUsed.slice(), score };
  }

  return {
    state,
    level,
    update,
    checkWord,
    placeTower,
    augmentTower,
    canBuild,
    sellTower,
    redrawRack,
    shuffleRack,
    startWave,
    drainEvents,
    result,
    chooseReward,
    rerollReward,
    skipReward,
    letterBonus,
    // extras (non-contract helpers)
    cellState,
    towerAt: (cx, cy) => (cellState(cx, cy) === 'tower' ? towerById(towerGrid[cy * cols + cx]) : null),
    spawnEnemy, // for tests / sandbox
    buildReason, // (cx, cy, archetype?) → null | reason
    themeFor: (spec) => { try { return Number(themeBonus(spec, level)) || 1; } catch { return 1; } },
    rules: RULES,
  };
}
