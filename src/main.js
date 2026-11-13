// Lexicon Siege — boot, routing and wiring of the words / levels / game modules.
import { createSave } from './ui/storage.js';
import { titleScreen, levelSelectScreen, lexiconScreen, errorScreen, loadingVeil } from './ui/screens.js';
import { createGameScreen } from './ui/gameScreen.js';

const root = document.getElementById('app');
const params = new URLSearchParams(location.search);

const app = {
  mods: null,
  save: null,
  dictionary: null,
  dictPromise: null,
  screen: null,      // current screen controller { destroy }
  overlay: null,     // dictionary overlay during a game
  current: null,     // game screen controller while playing
  hint: null,        // { finder, suggestWords } once the word finder is built
};

/** Keep ?level=N in the address bar in sync with the screen (other params kept). */
function syncUrl(level) {
  try {
    const q = new URLSearchParams(location.search);
    if (level) q.set('level', String(level)); else q.delete('level');
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
  } catch { /* ignore */ }
}

/** Build the hint finder once (~50 ms), off the boot path. */
function buildHinter(sync = false) {
  if (app.hint || !app.dictionary || !app.mods?.bot?.suggestWords || !app.mods.bot.makeWordFinder) return app.hint;
  const make = () => {
    if (app.hint) return;
    try { app.hint = { finder: app.mods.bot.makeWordFinder(app.dictionary), suggestWords: app.mods.bot.suggestWords }; }
    catch (err) { console.warn('hint finder', err); }
  };
  if (sync) make();
  else (window.requestIdleCallback || ((f) => setTimeout(f, 400)))(make);
  return app.hint;
}

function show(ctrl) {
  root.querySelector('.boot')?.remove();
  app.overlay?.destroy(); app.overlay = null;
  app.screen?.destroy();
  app.screen = ctrl;
  app.current = ctrl && ctrl.game ? ctrl : null;
}

async function loadModules() {
  const specs = [
    ['words', './words/index.js'],
    ['levels', './levels/index.js'],
    ['game', './game/index.js'],
  ];
  const results = await Promise.allSettled(specs.map(([, p]) => import(p)));
  const failed = [];
  const out = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out[specs[i][0]] = r.value;
    else failed.push(`${specs[i][1].replace('./', 'src/')}: ${r.reason?.message || r.reason}`);
  });
  const need = [
    ['words', 'loadDictionary'], ['words', 'towerFor'],
    ['levels', 'levelFor'], ['levels', 'LEVEL_COUNT'], ['levels', 'checkWordRules'], ['levels', 'themeBonus'],
    ['game', 'createGame'],
  ];
  for (const [m, name] of need) if (out[m] && out[m][name] == null) failed.push(`${m} module does not export “${name}”`);
  if (failed.length) throw Object.assign(new Error('module load failed'), { lines: failed });
  return {
    loadDictionary: out.words.loadDictionary,
    towerFor: out.words.towerFor,
    levelFor: out.levels.levelFor,
    LEVEL_COUNT: out.levels.LEVEL_COUNT,
    checkWordRules: out.levels.checkWordRules,
    themeBonus: out.levels.themeBonus,
    chapterOf: out.levels.chapterOf || null, // optional extra
    createGame: out.game.createGame,
    RELICS: null,
    bot: null,
  };
}

/** v2 extras; the game runs without them. */
async function loadOptional(mods) {
  const [relics, bot] = await Promise.allSettled([import('./game/relics.js'), import('./game/bot.js')]);
  if (relics.status === 'fulfilled') mods.RELICS = relics.value.RELICS || null;
  if (bot.status === 'fulfilled') mods.bot = bot.value;
}

function fail(title, lines, hint) {
  show(null);
  root.replaceChildren();
  app.screen = errorScreen(root, { title, lines, hint });
}

/* ------------------------------------------------------------------ routes */
function goTitle() {
  syncUrl(null);
  const hi = app.save ? app.save.highestUnlocked() : 1;
  const ctrl = titleScreen(root, {
    continueLevel: hi,
    onPlay: () => goLevel(app.save.highestUnlocked()),
    onLevels: () => goLevels(),
    onDictionary: () => goLexicon(),
    status: app.dictionary ? `${app.dictionary.size.toLocaleString('en-US')} words ready` : 'Loading dictionary…',
  });
  show(ctrl);
  if (!app.dictionary && app.dictPromise) {
    app.dictPromise.then((d) => { if (app.screen === ctrl && d) ctrl.setStatus(`${d.size.toLocaleString('en-US')} words ready`); }).catch(() => {});
  }
}

function goLevels(focus) {
  syncUrl(null);
  show(levelSelectScreen(root, {
    levelFor: app.mods.levelFor, LEVEL_COUNT: app.mods.LEVEL_COUNT, chapterOf: app.mods.chapterOf, save: app.save,
    initialLevel: focus,
    onPick: (n) => goLevel(n),
    onBack: () => goTitle(),
    onDictionary: () => goLexicon(() => goLevels(focus)),
  }));
}

function goLexicon(back = goTitle) {
  show(lexiconScreen(root, { towerFor: app.mods.towerFor, save: app.save, onBack: () => back() }));
}

async function goLevel(n) {
  const N = Math.max(1, Math.min(app.mods.LEVEL_COUNT, Math.floor(Number(n)) || 1));
  if (!app.dictionary) {
    const veil = loadingVeil(root, 'Loading the dictionary…');
    try { await app.dictPromise; } catch { /* handled below */ }
    veil.destroy();
    if (!app.dictionary) return;
  }
  let ctrl;
  try {
    show(null);
    ctrl = createGameScreen(root, {
      mods: app.mods, dictionary: app.dictionary, levelNo: N, save: app.save,
      hinter: () => buildHinter(true),
      nav: {
        levels: () => goLevels(N),
        level: (m) => goLevel(m),
        crash: (err) => fail(`Level ${N} stopped`, [String(err?.message || err)], 'The simulation hit an error. Reload to try again; details are in the browser console.'),
        dictionary: (onClose) => {
          app.overlay = lexiconScreen(root, {
            towerFor: app.mods.towerFor, save: app.save, overlay: true,
            onBack: () => { app.overlay?.destroy(); app.overlay = null; onClose(); },
          });
        },
      },
    });
  } catch (err) {
    console.error(err);
    fail(`Level ${N} could not start`, [String(err?.stack || err?.message || err).split('\n').slice(0, 4).join(' ')], 'This is probably a bug in the level generator or engine.');
    return;
  }
  app.screen = ctrl;
  app.current = ctrl;
  syncUrl(N);
}

/* ---------------------------------------------------------------- boot */
async function boot() {
  try {
    app.mods = await loadModules();
  } catch (err) {
    console.error(err);
    fail('A game module failed to load', err.lines || [String(err?.message || err)],
      location.protocol === 'file:' ? 'Open the game through a web server: run “python3 -m http.server 4173” in the project folder and visit http://localhost:4173.' : 'Check the browser console for details.');
    return;
  }
  await loadOptional(app.mods);
  app.save = createSave(app.mods.LEVEL_COUNT);
  if (params.get('unlock') === '1') app.save.unlockAll();

  app.dictPromise = app.mods.loadDictionary().then((d) => { app.dictionary = d; buildHinter(); return d; }).catch((err) => {
    console.error(err);
    fail('The dictionary did not load', [String(err?.message || err)], 'The game needs data/words.txt (about 2 MB). Check that it exists and that you are using a web server.');
    throw err;
  });

  const lv = params.get('level');
  if (lv) await goLevel(lv);
  else goTitle();
}

window.__lexicon = {
  get game() { return app.current?.game || null; },
  get state() { return app.current?.game?.state || null; },
  get level() { return app.current?.level || null; },
  get save() { return app.save; },
  goto(n) { return goLevel(n); },
  title: () => goTitle(),
  levels: () => goLevels(),
};

boot();
