// Compact helper for declaring curated concepts.
//
// C(id, archetype, element, fx, tags, glyph, phrase, words, opt)
//   fx      — space-separated effect template: "burn slow:0.8 buff.rate harvest.tile:1.2"
//             (type[.sub][:intensity]; intensity 1 = baseline for the word's power)
//   tags    — space-separated lowercase tags
//   phrase  — short verb phrase saying what the tower does ("Mends nearby towers")
//   words   — space-separated word list
//   opt     — { pos:'noun verb', kind:'verb'|'adjective', mods:{damage,rate,range,hp},
//               conv:true (augment converts element), stat:{damage,rate,range,hp} tower multipliers,
//               mass:true (uncountable: no plural inflection added by the build script) }

export function C(id, arch, elem, fx, tags, glyph, phrase, words, opt = {}) {
  return {
    id,
    arch,
    elem,
    fx: parseFx(fx),
    tags: tags ? tags.split(/\s+/).filter(Boolean) : [],
    glyph,
    phrase,
    words: words.trim().split(/\s+/).filter(Boolean),
    pos: (opt.pos || (opt.kind === 'verb' ? 'verb' : opt.kind === 'adjective' ? 'adjective' : 'noun')).split(/\s+/),
    kind: opt.kind || null,
    mods: opt.mods || null,
    conv: !!opt.conv,
    stat: opt.stat || null,
    mass: !!opt.mass,
  };
}

/** Verb concept (augment kind 'verb'). */
export function V(id, arch, elem, fx, tags, glyph, phrase, words, opt = {}) {
  return C('v-' + id, arch, elem, fx, tags, glyph, phrase, words, { pos: 'verb', ...opt, kind: 'verb' });
}

/** Adjective concept (augment kind 'adjective'). */
export function A(id, arch, elem, fx, tags, glyph, phrase, words, opt = {}) {
  return C('a-' + id, arch, elem, fx, tags, glyph, phrase, words, { pos: 'adjective', ...opt, kind: 'adjective' });
}

export function parseFx(str) {
  if (!str) return [];
  return str.split(/\s+/).filter(Boolean).map((tok) => {
    const [head, m] = tok.split(':');
    const [type, sub] = head.split('.');
    return { type, sub: sub || null, mult: m ? Number(m) : 1 };
  });
}
