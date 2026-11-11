// localStorage persistence. Every access is wrapped: private windows / blocked storage
// simply fall back to in-memory progress for the session.

const KEY = 'lexicon-siege.v1';

function blank() {
  return { unlocked: 1, stars: {}, lexicon: {}, onboarded: false, speed: 1 };
}

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return blank();
    const data = JSON.parse(raw);
    const stars = {};
    if (data.stars && typeof data.stars === 'object') {
      for (const [k, v] of Object.entries(data.stars)) if (Number.isInteger(v) && v >= 1 && v <= 3) stars[k] = v;
    }
    const lexicon = {};
    if (data.lexicon && typeof data.lexicon === 'object') {
      for (const [w, e] of Object.entries(data.lexicon)) {
        if (/^[a-z]{2,15}$/.test(w) && e && typeof e === 'object' && !Array.isArray(e)) {
          lexicon[w] = { count: Math.max(1, Math.floor(Number(e.count)) || 1), first: e.first, at: Number(e.at) || 0, last: Number(e.last) || 0 };
        }
      }
    }
    return {
      unlocked: Math.max(1, Math.floor(Number(data.unlocked)) || 1),
      stars,
      lexicon,
      onboarded: !!data.onboarded,
      speed: [1, 2, 3].includes(data.speed) ? data.speed : 1,
    };
  } catch {
    return blank();
  }
}

export function createSave(levelCount) {
  const data = load();
  let unlockAll = false;

  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }

  return {
    get data() { return data; },
    unlockAll() { unlockAll = true; },
    highestUnlocked() { return unlockAll ? levelCount : Math.min(levelCount, data.unlocked); },
    isUnlocked(n) { return unlockAll || n <= data.unlocked; },
    starsFor(n) { return data.stars[n] || 0; },
    totalStars() { return Object.values(data.stars).reduce((a, b) => a + (b || 0), 0); },
    /** Record a finished level. Returns { newBest, unlockedNext }. */
    recordResult(n, won, stars) {
      let newBest = false, unlockedNext = false;
      if (won) {
        if ((data.stars[n] || 0) < stars) { data.stars[n] = stars; newBest = true; }
        if (n + 1 <= levelCount && data.unlocked < n + 1) { data.unlocked = n + 1; unlockedNext = true; }
      }
      persist();
      return { newBest, unlockedNext };
    },
    recordWord(word, levelId) {
      const e = data.lexicon[word];
      if (e) { e.count += 1; e.last = Date.now(); }
      else data.lexicon[word] = { count: 1, first: levelId, at: Date.now(), last: Date.now() };
      persist();
    },
    setOnboarded() { data.onboarded = true; persist(); },
    setSpeed(s) { data.speed = s; persist(); },
  };
}
