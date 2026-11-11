// Seeded map generation: winding orthogonal paths + scenery.
//
// Paths are grown *backwards* from the base by a bounded depth-first walk whose move
// ordering is shaped by a "style" (switchback, spiral, meander, stairs, wander). The walk
// may only touch the board edge at its final cell, which becomes the spawn. A path cell is
// never orthogonally adjacent to a non-consecutive cell of the same path (readable lanes).
// Generation never fails: bounded attempts, then a hand-made fallback serpent.

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E S W N; (d + 1) % 4 = right turn

export const PATH_STYLES = ['switchback', 'spiral', 'meander', 'stairs', 'wander'];

const STYLE = {
  switchback: { runMin: 99, runMax: 99, turn: 'uturn', connector: [2, 3] },
  spiral:     { runMin: 2, runMax: 2, turn: 'same' },
  meander:    { runMin: 3, runMax: 6, turn: 'pairs' },
  stairs:     { runMin: 2, runMax: 3, turn: 'alternate' },
  wander:     { runMin: 1, runMax: 5, turn: 'random' },
};

const MAX_NODES = 2500; // DFS expansions per attempt

const isEdge = (x, y, cols, rows) => x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
const edgeDist = (x, y, cols, rows) => Math.min(x, y, cols - 1 - x, rows - 1 - y);

/**
 * Grow one path backwards from `base` to a board edge.
 * @returns array of [x,y] from base to spawn, or null.
 */
export function growPath(rng, cols, rows, { base, minLen, maxLen, style, forbidden }) {
  const st = STYLE[style] || STYLE.wander;
  const occ = new Int16Array(cols * rows).fill(-1); // path index per cell
  const idx = (x, y) => y * cols + x;
  const path = [base];
  occ[idx(base[0], base[1])] = 0;

  // Per-depth walk state for style bookkeeping.
  const turnSign0 = rng.chance(0.5) ? 1 : -1;
  const frames = [];
  let nodes = 0;

  const okCell = (x, y, len) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
    const i = idx(x, y);
    if (occ[i] !== -1) return false;
    if (forbidden && forbidden[i]) return false;
    // edge cells only as the final (spawn) cell
    if (isEdge(x, y, cols, rows) && len + 1 < minLen) return false;
    // no orthogonal contact with non-consecutive cells of this path
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const o = occ[idx(nx, ny)];
      if (o !== -1 && o !== len - 1) return false;
    }
    return true;
  };

  // frame: { dir, run, runTarget, turns, cands:[...], ci }
  const makeFrame = (prevFrame) => {
    const len = path.length;
    const [cx, cy] = path[len - 1];
    let dir = prevFrame ? prevFrame.nextDir : rng.int(0, 3);
    let run = prevFrame ? prevFrame.nextRun : 0;
    let runTarget = prevFrame ? prevFrame.nextRunTarget : rng.int(st.runMin, st.runMax);
    const turns = prevFrame ? prevFrame.nextTurns : 0;

    // preferred turn sign for the next turn
    let pref;
    switch (st.turn) {
      case 'same': pref = turnSign0; break;
      case 'alternate': pref = turns % 2 === 0 ? turnSign0 : -turnSign0; break;
      case 'pairs':
      case 'uturn': pref = Math.floor(turns / 2) % 2 === 0 ? turnSign0 : -turnSign0; break;
      default: pref = rng.chance(0.5) ? 1 : -1;
    }
    const straight = dir;
    const turnA = (dir + 4 + pref) % 4;
    const turnB = (dir + 4 - pref) % 4;
    let order;
    if (len === 1) order = rng.shuffle([0, 1, 2, 3]);
    else if (run < runTarget) order = st.turn === 'random' && rng.chance(0.15) ? [turnA, straight, turnB] : [straight, turnA, turnB];
    else order = [turnA, straight, turnB];

    let cands = [];
    for (const d of order) {
      const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
      if (okCell(nx, ny, len)) cands.push(d);
    }
    if (len >= minLen) {
      // head for the edge once long enough
      const ed = (d) => edgeDist(cx + DIRS[d][0], cy + DIRS[d][1], cols, rows);
      cands = cands.map((d, i) => [d, i]).sort((a, b) => ed(a[0]) - ed(b[0]) || a[1] - b[1]).map((a) => a[0]);
    }
    return { dir, run, runTarget, turns, cands, ci: 0 };
  };

  frames.push(makeFrame(null));
  while (frames.length) {
    if (++nodes > MAX_NODES) return null;
    const f = frames[frames.length - 1];
    if (f.ci >= f.cands.length || path.length >= maxLen) {
      // backtrack
      frames.pop();
      if (path.length > 1) {
        const [px, py] = path.pop();
        occ[idx(px, py)] = -1;
      } else return null;
      continue;
    }
    const d = f.cands[f.ci++];
    const [cx, cy] = path[path.length - 1];
    const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
    path.push([nx, ny]);
    occ[idx(nx, ny)] = path.length - 1;
    if (isEdge(nx, ny, cols, rows)) {
      if (path.length >= minLen && path.length <= maxLen) return path;
      // edge reached too early/late: undo
      path.pop();
      occ[idx(nx, ny)] = -1;
      continue;
    }
    const turned = path.length > 2 && d !== f.dir;
    let nextRunTarget = f.runTarget;
    let nextTurns = f.turns;
    if (turned) {
      nextTurns = f.turns + 1;
      if (st.turn === 'uturn') {
        // after the first turn of a U, a short connector; after the second, a long run
        nextRunTarget = nextTurns % 2 === 1 ? rng.int(st.connector[0], st.connector[1]) : 99;
      } else if (st.turn === 'same') {
        // square spiral outward from the base with a one-cell gap: runs 2,2,4,4,6,6,…
        nextRunTarget = 2 * (Math.floor(nextTurns / 2) + 1);
      } else {
        nextRunTarget = rng.int(st.runMin, st.runMax);
      }
    }
    f.nextDir = d;
    f.nextRun = turned || path.length === 2 ? 1 : f.run + 1;
    f.nextRunTarget = nextRunTarget;
    f.nextTurns = nextTurns;
    frames.push(makeFrame(f));
  }
  return null;
}

/** Hand-made fallback serpent (34 cells), optionally mirrored. Always valid on 16×10. */
export function fallbackPath(cols, rows, flipX = false, flipY = false) {
  const p = [];
  for (let x = 0; x <= 12; x++) p.push([x, 2]);
  for (let y = 3; y <= 5; y++) p.push([12, y]);
  for (let x = 11; x >= 3; x--) p.push([x, 5]);
  for (let y = 6; y <= 7; y++) p.push([3, y]);
  for (let x = 4; x <= 10; x++) p.push([x, 7]);
  return p.map(([x, y]) => [flipX ? cols - 1 - x : x, flipY ? rows - 1 - y : y]);
}

/** Checks a path's own invariants. Returns null if fine, else a string describing the problem. */
export function pathProblem(path, cols, rows) {
  if (!Array.isArray(path) || path.length < 2) return 'too short';
  const pos = new Map();
  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i];
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= cols || y >= rows) return `out of bounds at ${i}`;
    const k = y * cols + x;
    if (pos.has(k)) return `repeat at ${i}`;
    pos.set(k, i);
    if (i > 0) {
      const [px, py] = path[i - 1];
      if (Math.abs(px - x) + Math.abs(py - y) !== 1) return `not adjacent at ${i}`;
    }
  }
  if (!isEdge(path[0][0], path[0][1], cols, rows)) return 'spawn not on edge';
  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i];
    for (const [dx, dy] of DIRS) {
      const j = pos.get((y + dy) * cols + (x + dx));
      if (x + dx < 0 || x + dx >= cols) continue;
      if (j !== undefined && Math.abs(j - i) !== 1) return `self-touch at ${i}/${j}`;
    }
  }
  return null;
}

function pickBase(rng, cols, rows, style, twoPaths) {
  if (style === 'spiral' || twoPaths) return [rng.int(5, cols - 6), rng.int(3, rows - 4)];
  return [rng.int(2, cols - 3), rng.int(2, rows - 3)];
}

/**
 * Generate the full map for a level.
 * @returns { paths, blocked, style }
 */
export function generateMap(rng, { cols, rows, difficulty, twoPaths }) {
  const N = cols * rows;
  let paths = null;
  let style = null;
  const minBase = 28 + Math.round(rng.float(0, 10) + Math.min(10, difficulty / 60));
  for (let attempt = 0; attempt < 14 && !paths; attempt++) {
    style = attempt < 10 ? rng.pick(PATH_STYLES) : 'wander';
    const wantTwo = twoPaths && attempt < 10;
    const base = pickBase(rng, cols, rows, style, wantTwo);
    const minLen = Math.max(28, minBase - attempt);
    const maxLen = Math.min(60, minLen + 18 + attempt);
    const p1 = growPath(rng, cols, rows, { base, minLen, maxLen, style, forbidden: null });
    if (!p1) continue;
    if (wantTwo) {
      const forbidden = new Uint8Array(N);
      for (let i = 1; i < p1.length; i++) {
        const [x, y] = p1[i];
        forbidden[y * cols + x] = 1;
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) forbidden[ny * cols + nx] = 1;
        }
      }
      // the second lane's first step must be a free neighbour of the base
      let p2 = null;
      for (let k = 0; k < 3 && !p2; k++) {
        p2 = growPath(rng, cols, rows, { base, minLen: 22, maxLen: 50, style: rng.pick(PATH_STYLES), forbidden });
      }
      if (!p2) continue; // retry the whole map; late attempts drop the second lane
      paths = [p1.reverse(), p2.reverse()];
    } else {
      paths = [p1.reverse()];
    }
  }
  if (!paths) {
    style = 'fallback';
    paths = [fallbackPath(cols, rows, rng.chance(0.5), rng.chance(0.5))];
  }
  const blocked = placeScenery(rng, cols, rows, paths);
  return { paths, blocked, style };
}

function placeScenery(rng, cols, rows, paths) {
  const N = cols * rows;
  const onPath = new Uint8Array(N);
  for (const p of paths) for (const [x, y] of p) onPath[y * cols + x] = 1;
  // distance-to-path (0 path, 1 adjacent, 2+ far)
  const near = new Uint8Array(N);
  let adjCount = 0;
  for (let i = 0; i < N; i++) {
    if (onPath[i]) continue;
    const x = i % cols, y = (i / cols) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && onPath[ny * cols + nx]) { near[i] = 1; break; }
    }
    if (near[i]) adjCount++;
  }
  const maxAdjBlocked = Math.floor(adjCount * 0.15);
  let adjBlocked = 0;
  const blockedSet = new Uint8Array(N);
  const blocked = [];
  const target = rng.int(8, 16);
  const tryBlock = (i) => {
    if (onPath[i] || blockedSet[i]) return false;
    if (near[i]) {
      if (adjBlocked >= maxAdjBlocked) return false;
      adjBlocked++;
    }
    blockedSet[i] = 1;
    blocked.push([i % cols, (i / cols) | 0]);
    return true;
  };
  let guard = 0;
  while (blocked.length < target && guard++ < 200) {
    const i = rng.int(0, N - 1);
    if (onPath[i] || blockedSet[i]) continue;
    if (near[i] && !rng.chance(0.2)) continue;
    if (!tryBlock(i)) continue;
    // small clumps of 1–3 cells
    const extra = rng.int(0, 2);
    let cx = i % cols, cy = (i / cols) | 0;
    for (let e = 0; e < extra && blocked.length < target; e++) {
      const [dx, dy] = rng.pick(DIRS);
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (tryBlock(ny * cols + nx)) { cx = nx; cy = ny; }
    }
  }
  return blocked;
}
