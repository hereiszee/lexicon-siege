// Path geometry: cell lists → polylines through cell centres, with cumulative length so an
// entity's position is a single scalar `progress` (cells travelled from the spawn cell centre).

/** @returns {{xs:Float64Array, ys:Float64Array, cum:Float64Array, n:number, length:number}} */
export function buildPath(cells) {
  const n = cells.length;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const cum = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = cells[i][0] + 0.5;
    ys[i] = cells[i][1] + 0.5;
    if (i > 0) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  }
  return { xs, ys, cum, n, length: n > 0 ? cum[n - 1] : 0 };
}

/**
 * Set obj.x / obj.y from obj.progress on path p. Uses obj._seg as a segment hint so moving
 * objects cost O(1) per tick.
 */
export function placeOnPath(p, obj) {
  const { xs, ys, cum, n } = p;
  if (n <= 1) {
    obj.x = n ? xs[0] : 0;
    obj.y = n ? ys[0] : 0;
    return;
  }
  const prog = obj.progress;
  let s = obj._seg | 0;
  if (s > n - 2) s = n - 2;
  while (s < n - 2 && cum[s + 1] <= prog) s++;
  while (s > 0 && cum[s] > prog) s--;
  obj._seg = s;
  const segLen = cum[s + 1] - cum[s];
  let t = segLen > 0 ? (prog - cum[s]) / segLen : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  obj.x = xs[s] + (xs[s + 1] - xs[s]) * t;
  obj.y = ys[s] + (ys[s + 1] - ys[s]) * t;
}

/** Closest point on path p to (x, y) → {progress, dist}. */
export function nearestOnPath(p, x, y) {
  const { xs, ys, cum, n } = p;
  if (n === 1) return { progress: 0, dist: Math.hypot(xs[0] - x, ys[0] - y) };
  let best = Infinity;
  let bestProg = 0;
  for (let i = 0; i < n - 1; i++) {
    const ax = xs[i], ay = ys[i];
    const dx = xs[i + 1] - ax, dy = ys[i + 1] - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const px = ax + dx * t, py = ay + dy * t;
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < best - 1e-12) {
      best = d;
      bestProg = cum[i] + Math.sqrt(l2) * t;
    }
  }
  return { progress: bestProg, dist: Math.sqrt(best) };
}
