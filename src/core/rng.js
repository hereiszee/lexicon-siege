// Shared deterministic randomness. Everything procedural (towers, levels, bag draws)
// must derive from these so the same word/level always produces the same result.

/** FNV-1a 32-bit hash of a string → unsigned int. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG. Returns a function () → float in [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience RNG object seeded from a number or string. */
export function makeRng(seed) {
  const next = mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
  return {
    next,
    float: (min = 0, max = 1) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)), // inclusive
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted(entries) {
      // entries: [[value, weight], ...]
      let total = 0;
      for (const [, w] of entries) total += w;
      let r = next() * total;
      for (const [v, w] of entries) {
        r -= w;
        if (r <= 0) return v;
      }
      return entries[entries.length - 1][0];
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}
