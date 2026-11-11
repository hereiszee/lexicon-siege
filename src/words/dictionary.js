// Dictionary: { size, has(word), words /* sorted */, byLength(n) }

export function createDictionary(wordsArray) {
  const set = new Set();
  for (const raw of wordsArray || []) {
    const w = String(raw).trim().toLowerCase();
    if (/^[a-z]+$/.test(w)) set.add(w);
  }
  const words = [...set].sort();
  const lengthCache = new Map();
  return {
    size: words.length,
    words,
    has(word) {
      return typeof word === 'string' && set.has(word.toLowerCase());
    },
    byLength(n) {
      let arr = lengthCache.get(n);
      if (!arr) {
        arr = words.filter((w) => w.length === n);
        lengthCache.set(n, arr);
      }
      return arr;
    },
  };
}

export async function loadDictionary(url = 'data/words.txt') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load dictionary from ${url}: ${res.status}`);
  const text = await res.text();
  return createDictionary(text.split('\n'));
}
