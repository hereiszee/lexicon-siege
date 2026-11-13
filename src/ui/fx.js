// Visual effects driven by game.drainEvents(). Positions are world cells; drawing receives
// X(x)/Y(y) mappers to canvas CSS px and the cell size S.
import { elementColor, drawPiece, ENEMY_LOOK, COND, SANS } from './sprites.js';
import { rgba } from './dom.js';

const TAU = Math.PI * 2;
const MAX_PARTICLES = 400;
const MAX_TEXTS = 70;
const MAX_SMOKE = 120;

export function createFx() {
  const particles = [];  // sparks {x,y,vx,vy,life,max,r,color}
  const smoke = [];      // {x,y,r0,r1,life,max,a,dx,dy}
  const ghosts = [];     // dying pieces {x,y,piece,h,life,max,dir}
  const booms = [];      // explosions {x,y,r,life,max,discs:[{dx,dy,r}],rays:[a]}
  const bulgeList = [];  // {x,y,r,life,max}
  const texts = [];      // {x,y,text,life,max,color,size,vx}
  const rings = [];      // {x,y,r0,r1,life,max,color,width}
  const streaks = [];    // {x,y,tx,ty,life,max,color,width,kind}
  const banners = [];    // {text,sub,life,max}
  const stamps = new Map();
  const lastBoom = new Map();
  const hits = new Map();   // tower id → time last damaged
  const snaps = new Map();  // trap tower id → time last fired
  const lastPulse = new Map();
  let shake = 0, flash = 0, now = 0;

  function spark(x, y, color, n = 5, speed = 2.2, life = 0.3, r = 0.03) {
    for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * TAU, s = speed * (0.4 + Math.random() * 0.8);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, r: r * (0.6 + Math.random() * 0.8), color });
    }
  }
  function puff(x, y, r = 0.25, life = 1.1, a = 0.35, n = 1) {
    for (let i = 0; i < n && smoke.length < MAX_SMOKE; i++) {
      smoke.push({
        x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, r0: r * 0.5, r1: r * (1.4 + Math.random() * 0.6),
        life, max: life, a, dx: (Math.random() - 0.5) * 0.15, dy: -0.12 - Math.random() * 0.1,
      });
    }
  }
  function text(x, y, str, color, size = 0.24, life = 0.85) {
    if (texts.length >= MAX_TEXTS) texts.shift();
    texts.push({ x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.1, text: str, color, size, life, max: life, vx: (Math.random() - 0.5) * 0.12 });
  }
  function ring(x, y, r0, r1, color, life = 0.6, width = 0.04) {
    rings.push({ x, y, r0, r1, color, life, max: life, width });
  }
  function banner(t, sub = '', life = 1.8) {
    banners.length = 0;
    banners.push({ text: t, sub, life, max: life });
  }
  function boom(x, y, radius, big = false) {
    const r = Math.max(0.45, Math.min(big ? 2.2 : 1.6, radius || 0.8));
    const discs = [];
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) discs.push({ dx: (Math.random() - 0.5) * r * 0.7, dy: (Math.random() - 0.5) * r * 0.7, r: r * (0.35 + Math.random() * 0.4) });
    const rays = [];
    for (let i = 0; i < 9; i++) rays.push(Math.random() * TAU);
    booms.push({ x, y, r, life: 0.45, max: 0.45, discs, rays });
    if (bulgeList.length < 6) bulgeList.push({ x, y, r: r * 1.6, life: 0.35, max: 0.35 });
    puff(x, y, r * 0.5, 1.2, 0.3, 3);
  }

  /**
   * Handle one engine event. `look` = { tower(id), enemyPos(id), waveSub(i) }.
   */
  function handle(ev, look) {
    switch (ev.type) {
      case 'shot': {
        const col = elementColor(ev.element);
        const a = ev.archetype;
        if (a === 'snipe' || a === 'chain') {
          streaks.push({ x: ev.x, y: ev.y, tx: ev.tx, ty: ev.ty, color: a === 'snipe' ? '#ef5a1c' : col, life: 0.2, max: 0.2, width: a === 'snipe' ? 0.035 : 0.03, kind: a });
        } else if (a === 'aura') {
          ring(ev.x, ev.y, 0.3, 1.0, col, 0.5, 0.025);
        } else if (a === 'pulse') {
          // one shockwave per pulse even if the engine reports one shot per enemy
          if (now - (lastPulse.get(ev.towerId) ?? -1) > 0.15) {
            lastPulse.set(ev.towerId, now);
            const r = look.tower(ev.towerId)?.stats?.range || 1.5;
            ring(ev.x, ev.y, 0.2, r, col, 0.55, 0.07);
            ring(ev.x, ev.y, 0.1, r * 0.7, '#ffffff', 0.4, 0.03);
          }
        } else if (a === 'trap') {
          snaps.set(ev.towerId, now);
        }
        break;
      }
      case 'hit': {
        const tw = ev.towerId != null ? look.tower(ev.towerId) : null;
        const arch = tw?.spec?.archetype;
        const splash = tw?.stats?.splash || (tw?.effects || []).find((e) => e.type === 'splash')?.radius || 0;
        if (arch === 'trap' && now - (snaps.get(ev.towerId) ?? -1) > 0.3) snaps.set(ev.towerId, now);
        if (arch === 'mortar') {
          const last = lastBoom.get(ev.towerId) ?? -1;
          if (now - last > 0.2) { lastBoom.set(ev.towerId, now); boom(ev.x, ev.y, (splash || 1.2) * 1.2, true); shake = Math.max(shake, 0.12); }
        } else if (arch === 'blast' || splash > 0) {
          const last = lastBoom.get(ev.towerId) ?? -1;
          if (now - last > 0.12) { lastBoom.set(ev.towerId, now); boom(ev.x, ev.y, splash || 0.8); }
        } else {
          spark(ev.x, ev.y, '#ffb347', ev.crit ? 8 : 3, ev.crit ? 2.6 : 1.8, 0.25);
          if (Math.random() < 0.35) puff(ev.x, ev.y, 0.12, 0.7, 0.22);
        }
        if (ev.damage != null && ev.damage > 0) {
          const dmg = Math.round(ev.damage);
          const big = ev.crit || dmg >= 25;
          text(ev.x, ev.y - 0.3, ev.crit ? `${dmg}!` : String(dmg), big ? '#f5a316' : '#d8352a', big ? 0.3 : 0.2, big ? 1.0 : 0.75);
        }
        break;
      }
      case 'kill': {
        const p = (ev.enemyId != null && look.enemyPos(ev.enemyId)) || { x: ev.x, y: ev.y };
        const lk = ENEMY_LOOK[ev.enemy] || ENEMY_LOOK.grunt;
        ghosts.push({ x: p.x, y: p.y, piece: lk.piece, h: lk.h, life: 0.6, max: 0.6, dir: Math.random() < 0.5 ? -1 : 1 });
        if (ev.ink) text(p.x, p.y - 0.45, `+${Math.round(ev.ink)}`, '#3f9b45', 0.2, 0.9);
        if (ev.enemy === 'boss') { shake = Math.max(shake, 0.6); boom(p.x, p.y, 1.4); banner('Boss defeated'); }
        break;
      }
      case 'leak':
        shake = Math.max(shake, 0.35 + Math.min(0.5, (ev.lives || 1) * 0.05));
        flash = 1;
        break;
      case 'towerPlaced': {
        stamps.set(ev.towerId, now);
        const t = look.tower(ev.towerId);
        if (t) { puff(t.x, t.y + 0.2, 0.3, 0.8, 0.25, 4); ring(t.x, t.y, 0.3, 0.85, '#111111', 0.45, 0.025); }
        break;
      }
      case 'towerAugmented': {
        stamps.set(ev.towerId, now);
        const t = look.tower(ev.towerId);
        if (t) { spark(t.x, t.y, '#f59a1b', 14, 2.4, 0.5); ring(t.x, t.y, 0.2, 1.0, '#f59a1b', 0.6, 0.04); }
        break;
      }
      case 'towerDown': {
        const t = look.tower(ev.towerId);
        if (t) { puff(t.x, t.y, 0.4, 1.4, 0.4, 5); text(t.x, t.y - 0.7, 'DISABLED', '#6b6b6b', 0.17, 1.4); }
        break;
      }
      case 'towerSold': {
        const x = ev.x ?? look.tower(ev.towerId)?.x, y = ev.y ?? look.tower(ev.towerId)?.y;
        if (x != null) puff(x, y, 0.35, 0.9, 0.3, 4);
        break;
      }
      case 'harvest': {
        const x = ev.x ?? look.tower(ev.towerId)?.x, y = ev.y ?? look.tower(ev.towerId)?.y;
        if (x == null) break;
        ring(x, y, 0.2, 0.9, '#4f9d4a', 0.7, 0.035);
        text(x, y - 0.6, ev.resource === 'tile' ? '+REROLL' : `+${Math.round(ev.amount || 0)} INK`, ev.resource === 'tile' ? '#2f6fb5' : '#3f9b45', 0.2, 1.3);
        break;
      }
      case 'towerHit': {
        // bite/vandal arrive every 0.25 s while it lasts: flash at most once a second, not a strobe
        const steady = ev.source === 'bite' || ev.source === 'vandal';
        if (!steady || now - (hits.get(ev.towerId) ?? -9) > 1) hits.set(ev.towerId, now);
        const t = look.tower(ev.towerId);
        const x = ev.x ?? t?.x, y = ev.y ?? t?.y;
        if (x == null) break;
        spark(x, y - 0.2, '#6b6e75', 3, 1.6, 0.25, 0.035);
        if (ev.damage >= 1) text(x + 0.25, y - 0.55, `−${Math.round(ev.damage)}`, '#7a1f12', 0.17, 0.7);
        break;
      }
      case 'enemyShot': // the stone itself is a projectile (kind 'sling'); just a flick of dust at the thrower
        puff(ev.x, ev.y - 0.3, 0.1, 0.4, 0.25);
        break;
      case 'stomp':
        ring(ev.x, ev.y, 0.3, 1.5, '#2b2b30', 0.6, 0.09);
        ring(ev.x, ev.y, 0.2, 1.1, '#8a7a5a', 0.5, 0.05);
        puff(ev.x, ev.y + 0.2, 0.5, 1.0, 0.3, 5);
        shake = Math.max(shake, 0.25);
        break;
      case 'heal': {
        const x = ev.x ?? look.tower(ev.towerId)?.x, y = ev.y ?? look.tower(ev.towerId)?.y;
        if (x == null) break;
        ring(x, y, 0.25, 0.65, '#5cc15a', 0.5, 0.03);
        break;
      }
      case 'waveStart':
        banner(`WAVE ${ev.index + 1}`, look.waveSub ? look.waveSub(ev.index) : '');
        break;
      case 'waveEnd':
        banner('WAVE CLEARED', ev.bonusInk ? `+${ev.bonusInk} ink` : '', 1.5);
        break;
      default: break;
    }
  }

  function update(dt) {
    now += dt;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx -= p.vx * 4 * dt; p.vy -= p.vy * 4 * dt;
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i]; s.life -= dt; s.x += s.dx * dt; s.y += s.dy * dt;
      if (s.life <= 0) smoke.splice(i, 1);
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i]; g.life -= dt;
      if (g.life <= 0) { puff(g.x, g.y - g.h * 0.2, Math.max(0.15, g.h * 0.6), 1.3, 0.35, 2); ghosts.splice(i, 1); }
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]; t.life -= dt; t.y -= dt * 0.55; t.x += t.vx * dt;
      if (t.life <= 0) texts.splice(i, 1);
    }
    for (const arr of [rings, streaks, banners, booms, bulgeList]) {
      for (let i = arr.length - 1; i >= 0; i--) { arr[i].life -= dt; if (arr[i].life <= 0) arr.splice(i, 1); }
    }
    shake = Math.max(0, shake - dt * 1.4);
    flash = Math.max(0, flash - dt * 2.2);
  }

  function drawWorld(ctx, X, Y, S) {
    ctx.save();
    // smoke smudges
    for (const s of smoke) {
      const k = 1 - s.life / s.max;
      const r = (s.r0 + (s.r1 - s.r0) * k) * S;
      const a = s.a * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      const g = ctx.createRadialGradient(X(s.x), Y(s.y), 0, X(s.x), Y(s.y), r);
      g.addColorStop(0, `rgba(60,60,64,${a})`);
      g.addColorStop(1, 'rgba(60,60,64,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(X(s.x), Y(s.y), r, 0, TAU); ctx.fill();
    }
    // dying pieces tip over as pale ghosts
    for (const gh of ghosts) {
      const k = 1 - gh.life / gh.max;
      drawPiece(ctx, gh.piece, X(gh.x), Y(gh.y) + gh.h * S * 0.42, gh.h * S, {
        color: 'rgba(235,235,240,1)', alpha: 0.75 * (1 - k * 0.7), rot: gh.dir * k * k * 1.4, haloColor: 'rgba(80,80,90,0.35)',
      });
    }
    for (const r of rings) {
      const k = 1 - r.life / r.max;
      ctx.strokeStyle = rgba(r.color, (1 - k) * 0.6);
      ctx.lineWidth = r.width * S;
      ctx.beginPath(); ctx.arc(X(r.x), Y(r.y), (r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k))) * S, 0, TAU); ctx.stroke();
    }
    ctx.lineCap = 'round';
    for (const s of streaks) {
      const k = s.life / s.max;
      ctx.strokeStyle = rgba(s.color, 0.85 * k);
      ctx.lineWidth = s.width * S;
      ctx.beginPath();
      if (s.kind === 'chain') {
        const n = 5, dx = (s.tx - s.x) / n, dy = (s.ty - s.y) / n;
        ctx.moveTo(X(s.x), Y(s.y));
        for (let i = 1; i < n; i++) { const j = (Math.random() - 0.5) * 0.25; ctx.lineTo(X(s.x + dx * i - dy * j), Y(s.y + dy * i + dx * j)); }
        ctx.lineTo(X(s.tx), Y(s.ty));
      } else { ctx.moveTo(X(s.x), Y(s.y)); ctx.lineTo(X(s.tx), Y(s.ty)); }
      ctx.stroke();
    }
    // explosions: overlapping translucent orange discs, white-hot core, dashed radial streaks
    for (const b of booms) {
      const k = 1 - b.life / b.max;
      const cx = X(b.x), cy = Y(b.y);
      const grow = 0.6 + 0.4 * Math.min(1, k * 3);
      const a = 1 - k;
      for (const d of b.discs) {
        ctx.fillStyle = `rgba(245,140,40,${0.32 * a})`;
        ctx.beginPath(); ctx.arc(cx + d.dx * S, cy + d.dy * S, d.r * S * grow, 0, TAU); ctx.fill();
      }
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r * S * 0.45 * grow);
      core.addColorStop(0, `rgba(255,255,245,${0.95 * a})`);
      core.addColorStop(0.45, `rgba(255,214,120,${0.75 * a})`);
      core.addColorStop(1, 'rgba(245,140,40,0)');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(cx, cy, b.r * S * 0.45 * grow, 0, TAU); ctx.fill();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = `rgba(245,150,60,${0.45 * a})`;
      ctx.lineWidth = 1.2;
      for (const ang of b.rays) {
        const r0 = b.r * S * (0.3 + k * 0.5), r1 = b.r * S * (0.8 + k * 0.7);
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(0.8, p.r * S), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawTexts(ctx, X, Y, S) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of texts) {
      const k = t.life / t.max;
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.font = `700 ${Math.max(10, t.size * S)}px ${COND}`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, X(t.x), Y(t.y));
    }
    ctx.restore();
  }

  function drawOverlay(ctx, w, h) {
    if (flash > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(214,60,40,0)');
      g.addColorStop(1, `rgba(214,60,40,${0.3 * flash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    for (const b of banners) {
      const k = 1 - b.life / b.max;
      const a = k < 0.12 ? k / 0.12 : b.life < 0.4 ? b.life / 0.4 : 1;
      const fs = Math.max(26, Math.min(56, w * 0.045));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${fs}px ${COND}`;
      const y = h * 0.3 + (1 - Math.min(1, k / 0.12)) * 10;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(b.text, w / 2 + 1, y + 2);
      ctx.fillStyle = '#1b1b1d';
      ctx.fillText(b.text, w / 2, y);
      const tw = ctx.measureText(b.text).width;
      ctx.fillStyle = '#f59a1b';
      ctx.fillRect(w / 2 - tw / 2, y + fs * 0.42, tw, 3);
      if (b.sub) {
        ctx.font = `600 ${fs * 0.36}px ${SANS}`;
        ctx.fillStyle = '#55575d';
        ctx.fillText(b.sub.toUpperCase(), w / 2, y + fs * 0.85);
      }
      ctx.restore();
    }
  }

  return {
    handle, update, drawWorld, drawTexts, drawOverlay, banner, text, puff, ring,
    get shake() { return shake; },
    bulges() { return bulgeList.map((b) => ({ x: b.x, y: b.y, r: b.r, k: Math.sin((1 - b.life / b.max) * Math.PI) })); },
    stampAge(id) { const t0 = stamps.get(id); return t0 == null ? Infinity : now - t0; },
    hitAge(id) { const t0 = hits.get(id); return t0 == null ? Infinity : now - t0; },
    snapAge(id) { const t0 = snaps.get(id); return t0 == null ? Infinity : now - t0; },
  };
}
