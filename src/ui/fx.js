// fx.js — the UI's own magic: sparkle bursts on important clicks, and a comet of sparkles that
// flies from a UI element to a point on the map (e.g. a completed mission), linking the
// interface to the valley. Disabled in calm mode.
const canvas = document.createElement('canvas');
canvas.id = 'fx';
const ctx = canvas.getContext('2d');
const parts = [];
let running = false;
const COLORS = ['#ffd27a', '#ffb347', '#fff1c9', '#ff8fab', '#c8b8ff'];

function resize() { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resize);

export function mountFx(root) { root.append(canvas); resize(); }
const calm = () => document.documentElement.dataset.calm === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;

function star(x, y, r, color, alpha) {
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
}

function tick() {
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.age += 1 / 60;
    if (p.age >= p.life) { parts.splice(i, 1); continue; }
    const k = p.age / p.life;
    if (p.path) {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const [x0, y0, cx, cy, x1, y1] = p.path;
      p.x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x1 + Math.sin(k * 20 + p.seed) * 6 * (1 - k);
      p.y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y1 + Math.cos(k * 20 + p.seed) * 6 * (1 - k);
    } else {
      p.vy += 0.12; p.vx *= 0.97; p.vy *= 0.97;
      p.x += p.vx; p.y += p.vy;
    }
    star(p.x, p.y, p.r * (1 - k * 0.6), p.color, Math.sin(Math.min(1, k * 3) * Math.PI / 2) * (1 - k));
  }
  ctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(tick); else running = false;
}
function start() { if (!running) { running = true; requestAnimationFrame(tick); } }

export function burst(x, y, count = 22) {
  if (calm()) return;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5, r: 3 + Math.random() * 5, life: 0.7 + Math.random() * 0.6, age: 0, color: COLORS[i % COLORS.length], seed: Math.random() * 6 });
  }
  start();
}

export function burstFrom(element, count) {
  const r = element.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count);
}

/** Sparkles fly along an arc from (x0,y0) to (x1,y1). Resolves when they land. */
export function comet(x0, y0, x1, y1, count = 26) {
  if (calm()) return Promise.resolve();
  const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 160;
  for (let i = 0; i < count; i++) {
    parts.push({ path: [x0, y0, cx + (Math.random() - 0.5) * 120, cy, x1, y1], x: x0, y: y0, r: 3 + Math.random() * 5, life: 1.1 + i * 0.025, age: 0, color: COLORS[i % COLORS.length], seed: Math.random() * 6 });
  }
  start();
  return new Promise((r) => setTimeout(r, 1150));
}
