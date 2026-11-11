// First-run coach marks: small white cards with a grey title bar and an arrow to their anchor.
import { h } from './dom.js';

/**
 * steps: [{ id, title, text, anchor: () => Element, place: 'top'|'bottom'|'left'|'center', until?: signal, button?: label }]
 */
export function createCoach(root, steps, { onDone } = {}) {
  let i = 0;
  let el = null;
  let alive = true;

  function finish() {
    if (!alive) return;
    alive = false;
    el?.remove();
    window.removeEventListener('resize', position);
    onDone?.();
  }

  function show() {
    el?.remove();
    if (i >= steps.length) { finish(); return; }
    const s = steps[i];
    el = h('div', { class: 'coach', role: 'dialog', 'aria-live': 'polite' },
      h('div', { class: 'coach-bar' },
        h('span', { class: 'coach-step' }, `TIP ${i + 1} OF ${steps.length}`),
        h('button', { class: 'coach-skip', onclick: finish }, 'Skip tips')),
      h('div', { class: 'coach-body' },
        h('div', { class: 'coach-title' }, s.title),
        h('p', null, s.text),
        s.button ? h('button', { class: 'pill primary small', onclick: next }, s.button) : null),
      h('div', { class: 'coach-arrow' }));
    root.appendChild(el);
    position();
  }

  function position() {
    if (!el || !alive) return;
    const s = steps[i];
    const a = s.anchor?.();
    const r = a ? a.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0, right: innerWidth / 2, bottom: innerHeight / 2 };
    const w = el.offsetWidth, hh = el.offsetHeight;
    let x, y, place = s.place || 'top';
    if (place === 'center') { x = r.left + r.width / 2 - w / 2; y = r.top + r.height * 0.32 - hh / 2; }
    else if (place === 'bottom') { x = r.left + r.width / 2 - w / 2; y = r.bottom + 14; }
    else if (place === 'left') { x = r.left - w - 14; y = r.top + r.height / 2 - hh / 2; }
    else { x = r.left + r.width / 2 - w / 2; y = r.top - hh - 14; }
    x = Math.max(10, Math.min(innerWidth - w - 10, x));
    y = Math.max(10, Math.min(innerHeight - hh - 10, y));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.dataset.place = place;
    const arrow = el.querySelector('.coach-arrow');
    if (place === 'top' || place === 'bottom') arrow.style.left = Math.max(14, Math.min(w - 14, r.left + r.width / 2 - x)) + 'px';
  }

  function next() { i++; show(); }

  window.addEventListener('resize', position);
  show();

  return {
    signal(name) {
      if (!alive) return;
      // the player may do things out of order (e.g. start the wave while tip 3 is up):
      // skip ahead past the step that this action completes
      for (let j = i; j < steps.length; j++) {
        if (steps[j].until === name) { i = j; next(); return; }
      }
    },
    reposition: position,
    destroy() { alive = false; el?.remove(); window.removeEventListener('resize', position); },
    get active() { return alive; },
  };
}
