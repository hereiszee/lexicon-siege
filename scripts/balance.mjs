// Balance harness: plays levels with the auto-player, in parallel on worker_threads.
// Usage: node scripts/balance.mjs [mode] [levels] [seeds] [seedOffset] [key=value …]
//   mode    table (default) | smooth | relics | kinds
//   levels  comma list of n, a-b or a-b/step   e.g. 1-200,205-1000/5
//   key=value  overrides a waves.js TUNING knob for this run (fitting), e.g. baseLevelHp=1200
//   table:  win% / lives-left per skill (0.15, 0.5, 1), words and sim minutes at 0.5, loss waves
//   smooth: skill 0.5 (or skill=…) over every listed level: ±5-neighbour deviation, worst
//           offenders, 20-level bucket means, which third of the level losses happen in
//   relics: skill 0.5 with no relics vs each relic forced at the first offer (letters as usual),
//           then normal reward play with and without letter upgrades
//   kinds:  skill 0.5 win% with each v2 tower kind banned from the bot, and its share of towers
// e.g. node scripts/balance.mjs smooth 1-200,205-1000/5 10
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

async function worker() {
  const { TUNING } = await import('../src/levels/waves.js');
  Object.assign(TUNING, workerData.tuning);
  const { loadDictionaryNode } = await import('../src/words/node.js');
  const { towerFor } = await import('../src/words/index.js');
  const { levelFor, checkWordRules, themeBonus } = await import('../src/levels/index.js');
  const { playLevel, makeWordFinder } = await import('../src/game/bot.js');
  const dictionary = loadDictionaryNode();
  const finder = makeWordFinder(dictionary);
  const levels = new Map();
  parentPort.on('message', (job) => {
    if (!job) return process.exit(0);
    let level = levels.get(job.n);
    if (!level) { level = levelFor(job.n); levels.set(job.n, level); }
    const r = playLevel({ level, dictionary, towerFor, checkWordRules, themeBonus, seed: level.seed + job.seed * 7919, skill: job.skill, finder, forceRelic: job.relic, banArch: job.ban, skipLetters: job.noLetters });
    parentPort.postMessage({
      ...job, won: r.won, lives: r.livesLeft / level.lives, waves: level.waves.length,
      lostWave: r.won ? -1 : r.wavesCleared, time: r.timeSimulated, words: r.wordsUsed.length, archetypes: r.archetypes,
    });
  });
}

function parseLevels(s) {
  const out = [];
  for (const part of s.split(',')) {
    const m = part.match(/^(\d+)(?:-(\d+)(?:\/(\d+))?)?$/);
    if (!m) throw new Error(`bad level spec "${part}"`);
    const a = +m[1], b = m[2] ? +m[2] : a, step = m[3] ? +m[3] : 1;
    for (let n = a; n <= b; n += step) out.push(n);
  }
  return out;
}

async function runJobs(jobs, tuning) {
  const out = [];
  let next = 0;
  const n = Math.min(availableParallelism(), jobs.length);
  // longest levels first so the pool drains evenly
  jobs.sort((a, b) => b.n - a.n);
  await Promise.all(Array.from({ length: n }, () => new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { tuning } });
    const feed = () => w.postMessage(next < jobs.length ? jobs[next++] : null);
    w.on('message', (r) => { out.push(r); feed(); });
    w.on('error', reject);
    w.on('exit', resolve);
    feed();
  })));
  return out;
}

const pct = (x) => String(Math.round(x * 100)).padStart(3) + '%';
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);

// losses by level band and by which third of the level's waves they happen in
function lossTable(results) {
  const bands = [[1, 50], [51, 150], [151, 300], [301, 500], [501, 750], [751, 1000]];
  console.log('\nlosses by wave (third of the level): band | losses | early / middle / last third | median wave/waves');
  for (const [a, b] of bands) {
    const ls = results.filter((r) => !r.won && r.n >= a && r.n <= b);
    if (!ls.length) continue;
    const th = [0, 0, 0];
    const fr = ls.map((r) => (r.lostWave + 1) / r.waves).sort((x, y) => x - y);
    for (const f of fr) th[Math.min(2, Math.floor((f - 1e-9) * 3))]++;
    console.log(`${String(a).padStart(4)}–${String(b).padEnd(4)} | ${String(ls.length).padStart(5)} | ${th.map((v) => pct(v / ls.length)).join(' / ')} | ${fr[fr.length >> 1].toFixed(2)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const tuning = {};
  const pos = [];
  for (const a of args) {
    const m = a.match(/^(\w+)=(.+)$/);
    if (m) tuning[m[1]] = m[2] === 'null' ? null : Number(m[2]);
    else pos.push(a);
  }
  const mode = ['table', 'smooth', 'relics', 'kinds'].includes(pos[0]) ? pos.shift() : 'table';
  const defaults = {
    table: '1,2,3,5,8,10,15,20,30,40,50,60,75,100,150,200,300,350,400,500,650,800,900,1000',
    smooth: '1-200,205-1000/5',
    relics: '60-200/20',
    kinds: '150-700/50',
  };
  const levels = parseLevels(pos[0] || defaults[mode]);
  const seeds = Number(pos[1]) || (mode === 'table' ? 6 : 10);
  const offset = Number(pos[2]) || 0;
  const skillArg = tuning.skill; delete tuning.skill;
  const t0 = performance.now();
  const jobs = [];
  const seedList = Array.from({ length: seeds }, (_, i) => offset + i);

  if (mode === 'table') {
    const skills = [0.15, 0.5, 1.0];
    for (const n of levels) for (const skill of skills) for (const seed of seedList) jobs.push({ n, seed, skill });
    const res = await runJobs(jobs, tuning);
    console.log(`seeds ${seeds} (offset ${offset}); per skill: win% / mean lives-left fraction; words, sim minutes at skill 0.5`);
    console.log('level  waves | ' + skills.map((s) => `skill ${s}`.padEnd(13)).join(' | ') + ' | words | min@0.5');
    for (const n of levels) {
      const cols = skills.map((skill) => {
        const rs = res.filter((r) => r.n === n && r.skill === skill);
        return `${pct(mean(rs.map((r) => +r.won)))} / ${mean(rs.map((r) => r.lives)).toFixed(2)}`.padEnd(13);
      });
      const r5 = res.filter((r) => r.n === n && r.skill === 0.5);
      console.log(`${String(n).padStart(5)} ${String(r5[0].waves).padStart(6)} | ${cols.join(' | ')} | ${mean(r5.map((r) => r.words)).toFixed(1).padStart(5)} | ${(mean(r5.map((r) => r.time)) / 60).toFixed(1).padStart(5)}`);
    }
    lossTable(res.filter((r) => r.skill === 0.5));
  } else if (mode === 'smooth') {
    const skill = skillArg ?? 0.5;
    for (const n of levels) for (const seed of seedList) jobs.push({ n, seed, skill });
    const res = await runJobs(jobs, tuning);
    const win = new Map(levels.map((n) => [n, mean(res.filter((r) => r.n === n).map((r) => +r.won))]));
    // ±5 neighbours in the sampled order (every level where sampled densely, every 5th beyond)
    const dev = levels.map((n, i) => {
      const nb = [...levels.slice(Math.max(0, i - 5), i), ...levels.slice(i + 1, i + 6)].map((m) => win.get(m));
      return { n, win: win.get(n), nb: mean(nb), d: win.get(n) - mean(nb) };
    });
    const worst = dev.slice().sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const over = dev.filter((x) => Math.abs(x.d) > 0.25).length;
    console.log(`skill ${skill}, ${seeds} seeds (offset ${offset}), ${levels.length} levels`);
    console.log(`±5-neighbour deviation: max ${pct(Math.abs(worst[0].d))}, mean ${pct(mean(dev.map((x) => Math.abs(x.d))))}, levels over 25 pts: ${over}`);
    console.log('worst: ' + worst.slice(0, 12).map((x) => `L${x.n} ${pct(x.win).trim()} vs ${pct(x.nb).trim()}`).join(', '));
    const buckets = [];
    for (let a = 1; a <= 1000; a += 20) {
      const ws = levels.filter((n) => n >= a && n < a + 20).map((n) => win.get(n));
      if (ws.length) buckets.push([a, mean(ws)]);
    }
    let rises = 0;
    for (let i = 1; i < buckets.length; i++) if (buckets[i][1] > buckets[i - 1][1] + 0.05) rises++;
    console.log(`20-level bucket means (rises > 5 pts: ${rises}):`);
    for (let i = 0; i < buckets.length; i += 10) console.log('  ' + buckets.slice(i, i + 10).map(([a, m]) => `${a}:${pct(m).trim()}`).join(' '));
    const mins = [1, 10, 50, 100, 300, 1000].filter((n) => win.has(n)).map((n) => `L${n} ${(mean(res.filter((r) => r.n === n).map((r) => r.time)) / 60).toFixed(1)}`);
    console.log('mean sim minutes: ' + mins.join(', '));
    lossTable(res);
  } else if (mode === 'kinds') {
    const skill = skillArg ?? 0.5;
    const kinds = [null, 'wall', 'trap', 'mortar', 'vortex', 'pulse', 'orbit'];
    for (const ban of kinds) for (const n of levels) for (const seed of seedList) jobs.push({ n, seed, skill, ban });
    const res = await runJobs(jobs, tuning);
    const rs = (ban) => res.filter((r) => r.ban === ban);
    const base = mean(rs(null).map((r) => +r.won));
    const share = (k) => { const a = rs(null).flatMap((r) => r.archetypes); return a.filter((x) => x === k).length / a.length; };
    console.log(`skill ${skill}, levels ${levels.join(',')}, ${seeds} seeds: all kinds ${pct(base)}`);
    console.log('kind     share of towers   win% when the bot may not build it');
    for (const k of kinds.slice(1)) console.log(`${k.padEnd(8)} ${pct(share(k)).padStart(8)}          ${pct(mean(rs(k).map((r) => +r.won)))}`);
  } else {
    const { RELIC_IDS } = await import('../src/game/relics.js');
    const skill = skillArg ?? 0.5;
    const variants = [null, ...RELIC_IDS];
    for (const relic of variants) for (const n of levels) for (const seed of seedList) jobs.push({ n, seed, skill, relic });
    const res = await runJobs(jobs, tuning);
    const rate = (relic) => mean(res.filter((r) => r.relic === relic).map((r) => +r.won));
    const base = rate(null);
    console.log(`skill ${skill}, levels ${levels.join(',')}, ${seeds} seeds: no relics ${pct(base)}; swing per relic (forced at first offer):`);
    const rows = RELIC_IDS.map((id) => [id, rate(id) - base]).sort((a, b) => b[1] - a[1]);
    console.log(rows.map(([id, d]) => `${id} ${d >= 0 ? '+' : ''}${Math.round(d * 100)}`).join(', '));
    // letters: the bot's normal reward play vs the same play refusing every letter upgrade
    const lj = [];
    for (const noLetters of [false, true]) for (const n of levels) for (const seed of seedList) lj.push({ n, seed, skill, noLetters });
    const lr = await runJobs(lj, tuning);
    const lw = (v) => mean(lr.filter((r) => r.noLetters === v).map((r) => +r.won));
    console.log(`letters: with ${pct(lw(false))}, refusing them ${pct(lw(true))}`);
    jobs.push(...lj);
  }
  console.log(`# ${jobs.length} games, ${((performance.now() - t0) / 1000).toFixed(1)}s wall`);
}

if (isMainThread) await main();
else await worker();
