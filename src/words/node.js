// Node-only helper (uses fs). Not for the browser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDictionary } from './dictionary.js';

export const WORDS_PATH = fileURLToPath(new URL('../../data/words.txt', import.meta.url));

export function loadDictionaryNode(path = WORDS_PATH) {
  return createDictionary(readFileSync(path, 'utf8').split('\n'));
}
