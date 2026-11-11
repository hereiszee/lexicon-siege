// Game screen: board canvas, word entry, HUD, tray, loop.
import { DEFAULTS, LETTER_VALUES } from '../core/constants.js';
import { h, clear, setText } from './dom.js';
import { createRenderer, biomeFor } from './renderer.js';
import { createFx } from './fx.js';
import { towerCard, towerInspect } from './card.js';
import { ruleText, ENEMY_INFO, ENEMY_NOTES, waveCounts } from './describe.js';
import { enemyIcon, towerName, elementColor } from './sprites.js';
import { createCoach } from './onboarding.js';
import { resultModal } from './screens.js';

/**
 * opts: { mods: { createGame, levelFor, towerFor, checkWordRules, themeBonus, LEVEL_COUNT },
 *         dictionary, levelNo, save, nav: { levels(), level(n), dictionary(onClose) } }
 */
export function createGameScreen(root, opts) {
  const { mods, dictionary, levelNo, save, nav } = opts;
  const level = mods.levelFor(levelNo);
  const game = mods.createGame({
    level, dictionary, towerFor: mods.towerFor, checkWordRules: mods.checkWordRules, themeBonus: mods.themeBonus,
  });
  const state = game.state;
  const rackSize = level.rackSize || state.rack.length || DEFAULTS.rackSize;

  /* ------------------------------------------------------------------ DOM */
  const canvas = h('canvas', { class: 'board', 'aria-label': 'Game board' });
  const lvlBlock = h('div', { class: 'hud-tl' });
  const btnLevels = h('button', { class: 'pill ghost small', title: 'Back to level select' }, '‹ LEVELS');
  const btnPause = h('button', { class: 'pill outline small', title: 'Pause (Shift+P)' }, 'PAUSE');
  const speedBtns = [1, 2, 3].map((s) => h('button', { class: 'seg', dataset: { s: String(s) }, title: `Speed ${s}× (${s})` }, `${s}×`));
  const btnWave = h('button', { class: 'pill primary small wave-btn', title: 'Start the next wave (Space)' }, 'START WAVE');
  const hudTR = h('div', { class: 'hud-tr' }, btnLevels, btnPause, h('div', { class: 'segs' }, speedBtns), btnWave);
  const sideCard = h('div', { class: 'side-card', hidden: true });
  const composeTiles = h('div', { class: 'compose-tiles' });
  const composeStatus = h('div', { class: 'compose-status' });
  const btnSubmit = h('button', { class: 'pill primary submit' }, 'SUBMIT WORD');
  const compose = h('div', { class: 'compose', hidden: true }, composeTiles, composeStatus, btnSubmit);
  const toast = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  const veil = h('div', { class: 'veil', hidden: true }, h('div', { class: 'veil-card' }, h('div', { class: 'veil-title' }, 'PAUSED'),
    h('button', { class: 'pill primary', onclick: () => setPaused(false) }, 'RESUME')));
  const boardArea = h('div', { class: 'board-area' }, canvas, lvlBlock, hudTR, sideCard, compose, toast, veil);

  // tray
  const inkVal = h('span', { class: 'v' });
  const inkFill = h('div', { class: 'bar-fill' });
  const livesVal = h('span', { class: 'v' });
  const waveVal = h('span', { class: 'v' });
  const tRes = h('section', { class: 't-res' },
    h('div', { class: 'res-ink' }, h('div', { class: 'bar' }, inkFill, h('div', { class: 'bar-label' }, 'Ink: ', inkVal))),
    h('div', { class: 'res-row' }, h('span', { class: 'k' }, 'Lives'), livesVal),
    h('div', { class: 'res-row' }, h('span', { class: 'k' }, 'Wave'), waveVal));
  const tInv = h('section', { class: 't-inv' }, h('h4', null, 'Inventory'),
    h('div', { class: 'inv-slots' }, [0, 1, 2].map(() => h('div', { class: 'inv-slot' }))),
    h('div', { class: 'inv-note' }, 'Relics will live here'));
  const btnReroll = h('button', { class: 'pill outline small', title: 'Replace every tile in your rack' }, 'REROLL');
  const btnShuffle = h('button', { class: 'pill outline small' }, 'SHUFFLE');
  const btnAlpha = h('button', { class: 'pill outline small' }, 'ALPHABETIZE');
  const btnEmpty = h('button', { class: 'pill outline small', title: 'Clear the word (Esc)' }, 'EMPTY');
  const btnDict = h('button', { class: 'pill slate small', title: 'Every word you have played' }, 'DICTIONARY');
  const rackEl = h('div', { class: 'rack', role: 'group', 'aria-label': 'Your letter tiles' });
  const rackHint = h('div', { class: 'rack-hint' }, 'Type a word from your tiles · Press enter to make word');
  const tRack = h('section', { class: 't-rack' },
    h('div', { class: 'rack-btns' }, btnReroll, btnShuffle, btnAlpha, btnEmpty, h('span', { class: 'flex' }), btnDict),
    rackEl, rackHint);
  const dmgList = h('ol', { class: 'dmg-list' });
  const tDmg = h('section', { class: 't-dmg' }, h('h4', null, 'Damage'), dmgList);
  const tray = h('footer', { class: 'tray' }, tRes, tInv, tRack, tDmg);
  const flyLayer = h('div', { class: 'fly-layer' });
  const screen = h('div', { class: 'screen game biome-' + biomeFor(level.wordElement ?? level.element) }, boardArea, tray, flyLayer);
  root.appendChild(screen);

  /* ---------------------------------------------------------------- model */
  const renderer = createRenderer(canvas);
  renderer.setLevel(level);
  const fx = createFx();
  let order = [...Array(state.rack.length).keys()]; // display order over state.rack indices
  let composed = [];        // rack indices, in word order
  let armed = false;
  let check = null;         // last game.checkWord()
  let spec = null;          // spec for the composed word (preview)
  let selectedId = null;
  let hover = null;
  let paused = false;
  let speed = save.data.speed || 1;
  let rackSnap = state.rack.join('');
  let resultShown = false, endAt = 0;
  let raf = 0, last = 0, t = 0;
  let checkTimer = 0, sideTimer = 0, dmgTimer = 0, buildTimer = 0;
  let sideKey = '';
  let buildable = null;
  let peakInk = Math.max(150, state.ink);
  let destroyed = false;
  let overlayOpen = false;
  let toastTimer = 0;

  const towerById = (id) => state.towers.find((x) => x.id === id);
  const towerAtCell = (cx, cy) => state.towers.find((x) => x.cx === cx && x.cy === cy);
  const word = () => composed.map((i) => state.rack[i]).join('');

  /* --------------------------------------------------------------- level block */
  function buildLevelBlock() {
    clear(lvlBlock);
    lvlBlock.append(
      h('div', { class: 'lvl-title' }, h('span', { class: 'lvl-n' }, String(level.id || levelNo)), h('span', { class: 'lvl-w' }, (level.title || level.word || '').toUpperCase()),
        level.boss || (levelNo % 10 === 0) ? h('span', { class: 'tag boss' }, 'BOSS') : null),
      h('div', { class: 'lvl-meta' }, h('span', { class: 'dot', style: { background: elementColor(level.element) } }), `Enemies are ${level.element}`),
      (level.rules || []).length
        ? h('ul', { class: 'rules' }, level.rules.map((r) => h('li', null, ruleText(r))))
        : h('div', { class: 'rules none' }, 'No special rules'),
      level.bonus?.text ? h('div', { class: 'bonus' }, h('b', null, 'Bonus '), level.bonus.text) : null,
      h('div', { class: 'next-wave' }));
  }
  buildLevelBlock();
  let waveKey = '';
  function updateWavePreview() {
    const el = lvlBlock.querySelector('.next-wave');
    const running = state.phase === 'wave';
    const idx = state.waveIndex;
    const key = `${idx}|${running}|${state.phase}`;
    if (key === waveKey) return;
    waveKey = key;
    clear(el);
    const w = (level.waves || [])[idx];
    if (!w || state.phase === 'won' || state.phase === 'lost') return;
    const counts = waveCounts(w);
    el.append(h('span', { class: 'nw-label' }, running ? `WAVE ${idx + 1}` : `NEXT · WAVE ${idx + 1}`),
      ...[...counts].map(([type, n]) => h('span', { class: 'nw-item', title: `${ENEMY_INFO[type] || type}: ${ENEMY_NOTES[type] || ''}` },
        h('img', { src: enemyIcon(type), alt: ENEMY_INFO[type] || type }), `×${n}`)));
  }
  function waveSub(index) {
    const w = (level.waves || [])[index];
    if (!w) return '';
    return [...waveCounts(w)].map(([k, n]) => `${n} ${ENEMY_INFO[k] || k}`).join(' · ');
  }

  /* ---------------------------------------------------------------- rack */
  function renderRack(flipFrom = null) {
    clear(rackEl);
    const used = new Set(composed);
    for (let p = 0; p < order.length; p++) {
      const idx = order[p];
      const ch = state.rack[idx] || '';
      if (used.has(idx) || !ch) {
        rackEl.appendChild(h('div', { class: 'tile slot', 'aria-hidden': 'true' }));
      } else {
        rackEl.appendChild(tileEl(ch, 'tile', () => addIndex(idx), { idx }));
      }
    }
    clear(composeTiles);
    compose.hidden = composed.length === 0; // must be visible before measuring for the FLIP below
    // shrink the big tiles so long words stay on one row (7px gap between tiles)
    const n = composed.length, avail = Math.min(boardArea.clientWidth - 40, 660);
    const size = Math.max(30, Math.min(58, Math.floor((avail - (n - 1) * 7) / Math.max(1, n))));
    composed.forEach((idx, k) => {
      const el = tileEl(state.rack[idx], 'tile big', () => removeAt(k));
      el.style.setProperty('--tile-size', size + 'px');
      el.title = 'Click to put back';
      composeTiles.appendChild(el);
      if (flipFrom && k === composed.length - 1) {
        const to = el.getBoundingClientRect();
        if (!to.width) return;
        el.animate([
          { transform: `translate(${flipFrom.left - to.left}px, ${flipFrom.top - to.top}px) scale(${flipFrom.width / to.width})` },
          { transform: 'none' },
        ], { duration: 170, easing: 'cubic-bezier(.2,.8,.3,1.2)' });
      }
    });
    compose.hidden = composed.length === 0;
    screen.classList.toggle('composing', composed.length > 0);
    compose.classList.toggle('armed', armed);
  }

  function tileEl(ch, cls, onclick, data) {
    const val = LETTER_VALUES[ch] ?? '';
    return h('button', { class: cls, onclick, dataset: data ? { idx: String(data.idx) } : null, 'aria-label': ch.toUpperCase() },
      h('span', { class: 'l' }, ch.toUpperCase()), h('span', { class: 'n' }, String(val)));
  }

  function addIndex(idx) {
    if (composed.includes(idx) || composed.length >= DEFAULTS.maxWordLength) return;
    const src = rackEl.querySelector(`[data-idx="${idx}"]`)?.getBoundingClientRect() || null;
    composed.push(idx);
    armed = false;
    selectedId = null;
    renderRack(src);
    onWordChanged();
  }

  function addLetter(ch) {
    for (const idx of order) {
      if (state.rack[idx] === ch && !composed.includes(idx)) { addIndex(idx); return; }
    }
    shake(rackEl);
    if (composed.length) shake(composeTiles);
    showToast(`No ${ch.toUpperCase()} in your rack`, 'warn', 900);
  }

  function removeAt(k) {
    composed.splice(k, 1);
    armed = false;
    renderRack();
    onWordChanged();
  }

  function clearWord() {
    if (!composed.length) return;
    composed = [];
    armed = false;
    renderRack();
    onWordChanged();
  }

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  /** Called when state.rack changed under us (placement, reroll, shuffle, harvest). */
  function onRackChanged() {
    const oldRack = rackSnap;
    rackSnap = state.rack.join('');
    if (order.length !== state.rack.length) order = [...Array(state.rack.length).keys()];
    if (composed.length) {
      // keep the composed letters (read from the rack as it was) if they are still present
      const want = composed.map((i) => oldRack[i]);
      const taken = new Set();
      const next = [];
      for (const ch of want) {
        const i = order.find((j) => state.rack[j] === ch && !taken.has(j));
        if (i == null) break;
        taken.add(i); next.push(i);
      }
      composed = next;
    }
    renderRack();
    onWordChanged();
  }

  /* ------------------------------------------------------------ validation */
  function runCheck() {
    const w = word();
    if (!w) { check = null; spec = null; return; }
    try { check = game.checkWord(w); } catch (err) { check = { ok: false, reason: String(err?.message || err) }; }
    spec = check?.spec || null;
  }

  function onWordChanged() {
    runCheck();
    updateStatus();
    sideKey = '';
    updateSide(true);
    buildable = null; buildTimer = 0;
    if (check?.ok) coach?.signal('validWord');
  }

  function updateStatus() {
    const w = word();
    let txt = '', cls = '';
    if (!w) { txt = ''; }
    else if (w.length < 2) { txt = 'Keep going…'; }
    else if (!check?.ok) { txt = check?.reason || 'Not a word'; cls = 'bad'; }
    else {
      const s = check.spec;
      const tw = !!check.canTower, aug = !!check.canAugment;
      if (!tw && !aug) { txt = check.towerReason || check.augmentReason || "Can't be used right now"; cls = 'warn'; }
      else if (!armed) { txt = tw && aug ? 'Press Enter, then click a spot to build or a tower to power up' : tw ? 'Press Enter, then click a spot beside the path' : 'Press Enter, then click a tower to power it up'; cls = 'ok'; }
      else if (tw && aug) { txt = `Click a spot to build (${s.cost} ink) or a tower to augment (${s.augment.cost} ink)`; cls = 'ok'; }
      else if (tw) { txt = `Click a free spot to build · ${s.cost} ink`; cls = 'ok'; }
      else { txt = `Click a tower to augment · ${s.augment.cost} ink`; cls = 'ok'; }
    }
    setText(composeStatus, txt);
    composeStatus.className = 'compose-status ' + cls;
    btnSubmit.disabled = !(check?.ok);
    setText(btnSubmit, armed ? 'READY — CLICK THE MAP' : 'SUBMIT WORD');
    rackHint.hidden = composed.length > 0;
  }

  function submit() {
    if (!composed.length) return;
    runCheck();
    if (!check?.ok) {
      shake(composeTiles);
      showToast(check?.reason || 'Not a word', 'bad');
      updateStatus();
      return;
    }
    armed = true;
    compose.classList.add('armed');
    updateStatus();
    coach?.signal('validWord');
  }

  /* --------------------------------------------------------------- side card */
  function updateSide(force = false) {
    const w = word();
    let key, build;
    // No preview for non-words: the engine returns a spec for any letters, which reads as "this would work".
    if (w.length >= 2 && spec && dictionary.has(w)) {
      const afford = spec.cost <= state.ink;
      key = `w|${w}|${check?.ok}|${afford}|${Math.floor(state.ink / 5)}`;
      build = () => towerCard(spec, { ink: state.ink, themeMul: safeTheme(spec) });
    } else if (selectedId != null && towerById(selectedId)) {
      const tw = towerById(selectedId);
      key = `t|${tw.id}|${Math.ceil(tw.hp)}|${tw.kills}|${Math.round((tw.damageDealt || 0) / 25)}|${tw.augments.length}|${tw.disabled}`;
      build = () => towerInspect(tw, { onSell: () => sell(tw.id), onClose: () => { selectedId = null; updateSide(true); } });
    } else {
      key = 'none';
      build = null;
    }
    if (!force && key === sideKey) return;
    // don't swap buttons out from under the pointer (a SELL click would be lost mid-wave)
    if (!force && sideCard.matches(':hover')) return;
    sideKey = key;
    clear(sideCard);
    if (build) { sideCard.appendChild(build()); sideCard.hidden = false; }
    else sideCard.hidden = true;
  }

  function safeTheme(s) {
    try { return mods.themeBonus(s, level) || 1; } catch { return 1; }
  }

  /* ---------------------------------------------------------------- actions */
  function showToast(msg, kind = '', ms = 1800) {
    toast.textContent = msg;
    toast.className = 'toast show ' + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, ms);
  }

  function flyTilesTo(cx, cy) {
    const tiles = [...composeTiles.children];
    const cr = canvas.getBoundingClientRect();
    const p = renderer.toScreen(cx + 0.5, cy + 0.5);
    const tx = cr.left + p.x, ty = cr.top + p.y;
    tiles.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const ghost = el.cloneNode(true);
      Object.assign(ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0 });
      flyLayer.appendChild(ghost);
      const dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2);
      const anim = ghost.animate([
        { transform: 'none', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(0.75)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0 },
      ], { duration: 360 + i * 30, easing: 'cubic-bezier(.4,0,.6,1)' });
      anim.onfinish = () => ghost.remove();
    });
  }

  function commitAt(cell) {
    const w = word();
    runCheck();
    if (!check?.ok) {
      shake(composeTiles);
      showToast(check?.reason || 'Not a word', 'bad');
      return;
    }
    const tw = towerAtCell(cell.cx, cell.cy);
    let res;
    if (tw) {
      if (!check.spec.augment) {
        shake(composeTiles);
        showToast(`${w.toUpperCase()} can't power up a tower — only verbs and adjectives can`, 'bad', 2600);
        return;
      }
      res = game.augmentTower(w, tw.id);
    } else {
      res = game.placeTower(w, cell.cx, cell.cy);
    }
    if (!res?.ok) {
      shake(composeTiles);
      showToast(res?.reason || 'That did not work', 'bad', 2400);
      return;
    }
    flyTilesTo(cell.cx, cell.cy);
    save.recordWord(w, levelNo);
    showToast(tw ? `${towerName(res.tower || tw)}` : `${w.toUpperCase()} built`, 'good', 1400);
    composed = [];
    armed = false;
    selectedId = null;
    onRackChanged();
    coach?.signal(tw ? 'augmented' : 'placed');
  }

  function sell(id) {
    const r = game.sellTower(id);
    if (r?.ok) { showToast(`Sold for ${r.refund} ink`, 'good'); selectedId = null; updateSide(true); updateDamage(); }
    else showToast(r?.reason || "Can't sell right now", 'bad');
  }

  function startWave() {
    if (state.phase !== 'build') return;
    const r = game.startWave();
    if (r && r.ok === false) { showToast(r.reason || "Can't start", 'bad'); return; }
    coach?.signal('waveStarted');
  }

  function setPaused(p) {
    paused = p;
    veil.hidden = !p;
    setText(btnPause, p ? 'RESUME' : 'PAUSE');
    btnPause.classList.toggle('on', p);
  }

  function setSpeed(s) {
    speed = s;
    save.setSpeed(s);
    for (const b of speedBtns) b.classList.toggle('on', +b.dataset.s === s);
  }
  setSpeed(speed);

  btnLevels.onclick = () => nav.levels();
  btnPause.onclick = () => setPaused(!paused);
  speedBtns.forEach((b) => (b.onclick = () => setSpeed(+b.dataset.s)));
  btnWave.onclick = startWave;
  btnSubmit.onclick = submit;
  btnReroll.onclick = () => {
    const r = game.redrawRack();
    if (!r?.ok) { showToast(r?.reason || "Can't reroll", 'bad'); shake(btnReroll); }
    else { composed = []; armed = false; order = [...Array(state.rack.length).keys()]; onRackChanged(); }
  };
  btnShuffle.onclick = () => { game.shuffleRack(); order = [...Array(state.rack.length).keys()]; onRackChanged(); };
  btnAlpha.onclick = () => { order = [...Array(state.rack.length).keys()].sort((a, b) => (state.rack[a] || '~').localeCompare(state.rack[b] || '~') || a - b); renderRack(); };
  btnEmpty.onclick = clearWord;
  btnDict.onclick = () => {
    const wasPaused = paused;
    setPaused(true);
    overlayOpen = true;
    nav.dictionary(() => { overlayOpen = false; if (!wasPaused) setPaused(false); });
  };

  /* ---------------------------------------------------------------- input */
  function onKey(e) {
    if (destroyed || overlayOpen || resultShown) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (e.repeat && k !== 'Backspace') return;
    if (k === 'P' && e.shiftKey) { e.preventDefault(); setPaused(!paused); return; }
    if (paused) { if (k === 'Escape' || k === ' ') { e.preventDefault(); setPaused(false); } return; }
    if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); addLetter(k.toLowerCase()); return; }
    if (k === 'Backspace') { e.preventDefault(); if (composed.length) removeAt(composed.length - 1); return; }
    if (k === 'Escape') {
      e.preventDefault();
      if (armed) { armed = false; renderRack(); updateStatus(); }
      else if (composed.length) clearWord();
      else if (selectedId != null) { selectedId = null; updateSide(true); }
      return;
    }
    if (k === 'Enter') { e.preventDefault(); submit(); return; }
    if (k === ' ' || k === 'Spacebar') { e.preventDefault(); startWave(); return; }
    if (k === '1' || k === '2' || k === '3') { setSpeed(+k); return; }
  }

  function onMove(e) {
    hover = renderer.cellAt(e.clientX, e.clientY);
    canvas.style.cursor = hover && (towerAtCell(hover.cx, hover.cy) || (check?.ok && game.canBuild(hover.cx, hover.cy))) ? 'pointer' : 'default';
  }
  function onLeave() { hover = null; }
  function onClick(e) {
    if (paused || resultShown) return;
    const cell = renderer.cellAt(e.clientX, e.clientY);
    if (!cell) return;
    if (composed.length >= 2 && check?.ok && armed) { commitAt(cell); return; }
    if (composed.length >= 2 && check?.ok) {
      shake(btnSubmit);
      showToast('Press Enter (or Submit word) first, then click the map', 'warn', 2200);
      return;
    }
    if (composed.length) {
      shake(composeTiles);
      showToast(composed.length < 2 ? 'Spell a word first' : (check?.reason || 'Not a word'), 'bad');
      return;
    }
    const tw = towerAtCell(cell.cx, cell.cy);
    selectedId = tw ? tw.id : null;
    updateSide(true);
  }
  // Only a running wave needs pausing when the tab is hidden; the build phase is already frozen.
  function onVis() { if (document.hidden && !paused && !resultShown && state.phase === 'wave') setPaused(true); }

  window.addEventListener('keydown', onKey);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('click', onClick);
  document.addEventListener('visibilitychange', onVis);

  const ro = new ResizeObserver(() => resize());
  ro.observe(boardArea);
  // re-render crisp when the window moves to a screen with a different pixel ratio
  let dprQuery = null;
  function watchDpr() {
    dprQuery?.removeEventListener('change', onDpr);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprQuery.addEventListener('change', onDpr);
  }
  function onDpr() { renderer.resize(); watchDpr(); }
  watchDpr();
  function resize() {
    const r = boardArea.getBoundingClientRect();
    renderer.resize(Math.max(100, r.width), Math.max(80, r.height));
    coach?.reposition();
  }

  /* --------------------------------------------------------------- HUD */
  function updateHud() {
    setText(inkVal, Math.floor(state.ink));
    peakInk = Math.max(peakInk, state.ink);
    inkFill.style.width = `${Math.min(100, (state.ink / peakInk) * 100)}%`;
    setText(livesVal, `${Math.max(0, Math.ceil(state.lives))}`);
    livesVal.classList.toggle('low', state.lives <= (level.lives || 20) * 0.3);
    const wn = Math.min(state.waveCount, state.waveIndex + 1);
    setText(waveVal, `${wn} / ${state.waveCount}`);
    const building = state.phase === 'build';
    btnWave.disabled = !building;
    setText(btnWave, building ? (state.waveIndex === 0 ? 'START WAVE' : `START WAVE ${state.waveIndex + 1}`) : state.phase === 'wave' ? `WAVE ${state.waveIndex + 1} IN PROGRESS` : 'DONE');
    setText(btnReroll, state.freeRedraws > 0 ? `REROLL (FREE ×${state.freeRedraws})` : `REROLL (${state.redrawCost})`);
    btnReroll.classList.toggle('short', !(state.freeRedraws > 0) && state.ink < state.redrawCost);
    updateWavePreview();
  }

  function updateDamage() {
    if (dmgList.matches(':hover')) return;
    const rows = state.towers.slice().sort((a, b) => (b.damageDealt ?? b.kills ?? 0) - (a.damageDealt ?? a.kills ?? 0)).slice(0, 6);
    clear(dmgList);
    if (!rows.length) { dmgList.appendChild(h('li', { class: 'empty' }, 'Build towers to see who does the work.')); return; }
    for (const tw of rows) {
      const n = tw.damageDealt != null ? Math.round(tw.damageDealt) : (tw.kills || 0);
      dmgList.appendChild(h('li', { class: tw.id === selectedId ? 'sel' : '', onclick: () => { selectedId = tw.id; updateSide(true); } },
        h('span', { class: 'n' }, n.toLocaleString('en-US')), ' ', h('span', { class: 'w', style: { color: elementColor(tw.element) } }, towerName(tw))));
    }
  }

  /* ---------------------------------------------------------------- loop */
  const look = {
    tower: (id) => towerById(id),
    enemyPos: (id) => renderer.enemyPos(id),
    waveSub,
  };

  function frame(ts) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
    last = ts;
    if (!paused && !overlayOpen) {
      t += dt;
      // engine is safe for dt ≤ 0.1, so step speed× in chunks
      try {
        for (let i = 0; i < speed; i++) game.update(dt);
      } catch (err) {
        console.error(err);
        destroyed = true;
        cancelAnimationFrame(raf);
        nav.crash?.(err);
        return;
      }
      fx.update(dt * (speed > 1 ? 1.4 : 1));
    }
    const events = game.drainEvents();
    for (const ev of events) {
      try { fx.handle(ev, look); } catch (err) { console.warn('fx', err); }
      if (ev.type === 'towerSold' && ev.towerId === selectedId) selectedId = null;
    }
    if (state.rack.join('') !== rackSnap) onRackChanged();

    checkTimer += dt; sideTimer += dt; dmgTimer += dt; buildTimer -= dt;
    if (checkTimer > 0.3) { checkTimer = 0; if (composed.length) { runCheck(); updateStatus(); } }
    if (sideTimer > 0.25) { sideTimer = 0; updateSide(); }
    if (dmgTimer > 0.5) { dmgTimer = 0; updateDamage(); }

    // ghost / targets
    let ghost = null, augmentable = null, rangeTower = null;
    const ready = composed.length >= 2 && check?.ok;
    if (ready) {
      const s = check.spec;
      if (s.augment) {
        augmentable = new Set(state.towers.filter((x) => (x.augments?.length || 0) < DEFAULTS.maxAugments).map((x) => x.id));
      }
      if (hover) {
        const tw = towerAtCell(hover.cx, hover.cy);
        if (tw) {
          if (s.augment) {
            const full = (tw.augments?.length || 0) >= DEFAULTS.maxAugments;
            const poor = !check.canAugment;
            ghost = { mode: 'augment', targetId: tw.id, spec: s, ok: !full && !poor, reason: full ? 'Tower is full' : poor ? (check.augmentReason || `Need ${s.augment.cost} ink`) : '' };
          } else rangeTower = tw;
        } else {
          ghost = { mode: 'tower', cx: hover.cx, cy: hover.cy, spec: s, ok: game.canBuild(hover.cx, hover.cy) && !!check.canTower, reason: check.towerReason };
        }
      }
      if (buildTimer <= 0) {
        buildTimer = 0.5;
        buildable = [];
        for (let y = 0; y < (level.rows || 10); y++) for (let x = 0; x < (level.cols || 16); x++) if (game.canBuild(x, y)) buildable.push([x, y]);
      }
    } else {
      buildable = null;
      if (selectedId != null) rangeTower = towerById(selectedId) || null;
      if (!rangeTower && hover) rangeTower = towerAtCell(hover.cx, hover.cy) || null;
    }

    renderer.draw({ state, t, fx, hoverCell: hover, ghost, augmentable, rangeTower, buildable: ready && check.canTower ? buildable : null });
    updateHud();

    if ((state.phase === 'won' || state.phase === 'lost') && !resultShown) {
      if (!endAt) endAt = ts;
      if (ts - endAt > 1200) showResult();
    }
  }

  function showResult() {
    resultShown = true;
    let res = null;
    try { res = game.result(); } catch { /* ignore */ }
    res = res || { won: state.phase === 'won', stars: state.phase === 'won' ? 1 : 0, livesLeft: state.lives, wordsUsed: [], score: 0 };
    const rec = save.recordResult(levelNo, res.won, res.stars || 0);
    const modal = resultModal({
      level, levelNo, res, rec, levelCount: mods.LEVEL_COUNT,
      onNext: () => nav.level(levelNo + 1),
      onRetry: () => nav.level(levelNo),
      onLevels: () => nav.levels(),
    });
    screen.appendChild(modal);
    modal.querySelector('button')?.focus();
  }

  /* --------------------------------------------------------------- onboarding */
  let coach = null;
  if (levelNo === 1 && !save.data.onboarded) {
    coach = createCoach(screen, [
      { title: 'Spell a word', text: 'Type a word using the tiles in your rack — or click the tiles. Then press Enter.', anchor: () => canvas, place: 'center', until: 'validWord' },
      { title: 'Build it', text: 'Click an empty spot beside the path. Your word becomes a tower.', anchor: () => canvas, place: 'center', until: 'placed' },
      { title: 'Power it up', text: 'Verbs and adjectives can also be clicked onto a tower you already built to make it stronger.', anchor: () => canvas, place: 'center', button: 'GOT IT' },
      { title: 'Start the wave', text: 'When you are ready, press Space or the button. Stop the pieces before they reach the base.', anchor: () => btnWave, place: 'bottom', until: 'waveStarted' },
    ], { onDone: () => save.setOnboarded() });
  }

  /* --------------------------------------------------------------- go */
  renderRack();
  updateStatus();
  updateDamage();
  resize();
  raf = requestAnimationFrame(frame);

  return {
    game,
    level,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      dprQuery?.removeEventListener('change', onDpr);
      coach?.destroy();
      clearTimeout(toastTimer);
      screen.remove();
    },
  };
}

