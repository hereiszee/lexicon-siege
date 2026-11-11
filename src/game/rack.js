// Letter bag + rack helpers. The bag is infinite: each draw is weighted-random.

import { LETTER_WEIGHTS, VOWELS } from '../core/constants.js';

const A = 97;

export function createBag(weights, rng) {
  const w = weights || LETTER_WEIGHTS;
  const letters = [];
  const cum = [];
  let total = 0;
  const vLetters = [];
  const vCum = [];
  let vTotal = 0;
  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(A + i);
    const wt = Math.max(0, Number(w[ch]) || 0);
    if (wt <= 0) continue;
    total += wt;
    letters.push(ch);
    cum.push(total);
    if (VOWELS.includes(ch)) {
      vTotal += wt;
      vLetters.push(ch);
      vCum.push(vTotal);
    }
  }
  if (total <= 0) return createBag(LETTER_WEIGHTS, rng);
  const pick = (ls, cs, tot) => {
    const r = rng.next() * tot;
    for (let i = 0; i < cs.length; i++) if (r < cs[i]) return ls[i];
    return ls[ls.length - 1];
  };
  return {
    draw: () => pick(letters, cum, total),
    drawVowel: () => (vTotal > 0 ? pick(vLetters, vCum, vTotal) : null),
    hasVowels: vTotal > 0,
  };
}

export const isVowel = (ch) => VOWELS.includes(ch);

/**
 * Fill rack[i] for each i in `positions` with fresh draws, then enforce the vowel minimum by
 * converting consonants (freshly drawn ones first, newest first) into vowels.
 */
export function fillRack(rack, positions, bag, minVowels) {
  for (const i of positions) rack[i] = bag.draw();
  if (!bag.hasVowels) return rack;
  const need = Math.min(minVowels, rack.length);
  let vowels = 0;
  for (const ch of rack) if (isVowel(ch)) vowels++;
  if (vowels >= need) return rack;
  const order = [];
  for (let k = positions.length - 1; k >= 0; k--) order.push(positions[k]);
  for (let i = rack.length - 1; i >= 0; i--) if (!positions.includes(i)) order.push(i);
  for (const i of order) {
    if (vowels >= need) break;
    if (!isVowel(rack[i])) {
      rack[i] = bag.drawVowel();
      vowels++;
    }
  }
  return rack;
}

/** Letters of `word` that the rack lacks (multiset), e.g. ['e','e']. Empty → spellable. */
export function missingLetters(rack, word) {
  const have = new Int16Array(26);
  for (const ch of rack) have[ch.charCodeAt(0) - A]++;
  const miss = [];
  for (let i = 0; i < word.length; i++) {
    const c = word.charCodeAt(i) - A;
    if (have[c] > 0) have[c]--;
    else miss.push(word[i]);
  }
  return miss;
}

/** Indices of rack tiles consumed to spell `word` (assumes spellable). */
export function consumedPositions(rack, word) {
  const taken = new Array(rack.length).fill(false);
  const pos = [];
  for (const ch of word) {
    for (let i = 0; i < rack.length; i++) {
      if (!taken[i] && rack[i] === ch) {
        taken[i] = true;
        pos.push(i);
        break;
      }
    }
  }
  return pos.sort((a, b) => a - b);
}
