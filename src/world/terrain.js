// terrain.js — Saffron Valley's low-poly floating island.
// A polar mesh (rings stitched by angle) gives a smooth coastline and irregular facets; each
// face gets one colour from height, slope and nearby features. Heights come from layout.js:
// peaks and hills, flattened plinths and trail, carved river and lake.
import * as THREE from 'three';
import { fbm, noise2, smoothstep, lerp, mulberry32 } from './noise.js';
import {
  ISLAND_RADIUS, LOCATIONS, PEAKS, HILLS, LAKE, RIVER, OUTFLOW, TRAIL_HALF_WIDTH,
  trailCurve, riverCurve, outflowCurve
} from './layout.js';
import { weatherize } from './materials.js';

const SAMPLE_COUNT = 600;

function sampleCurve(curve, count) {
  const out = [];
  for (let i = 0; i <= count; i++) { const u = i / count; const p = curve.getPointAt(u); out.push({ u, x: p.x, z: p.z, h: 0 }); }
  return out;
}

function nearest(samples, x, z) {
  let best = Infinity, bi = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]; const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z);
    if (d < best) { best = d; bi = i; }
  }
  return { d: Math.sqrt(best), s: samples[bi], i: bi };
}

/** Island outline radius at angle theta. */
export function boundaryRadius(theta) {
  return ISLAND_RADIUS * (1 + 0.055 * noise2(Math.cos(theta) * 1.3, Math.sin(theta) * 1.3) + 0.025 * noise2(Math.cos(theta) * 4, Math.sin(theta) * 4));
}

function rawHeight(x, z) {
  let h = 2.4 + fbm(x * 0.03, z * 0.03, 4) * 1.5 + fbm(x * 0.11 + 7, z * 0.11 - 3, 2) * 0.3;
  h += smoothstep(-6, -40, z) * 3.5;
  for (const [px, pz, ph, pr] of PEAKS) {
    const d2 = ((x - px) ** 2 + (z - pz) ** 2) / (pr * pr);
    if (d2 > 6) continue;
    const ridge = 1 - Math.abs(noise2(x * 0.09 + px, z * 0.09 + pz));
    h += ph * Math.exp(-d2 * 2.1) * (0.78 + 0.4 * ridge);
  }
  for (const [px, pz, ph, pr] of HILLS) {
    const d2 = ((x - px) ** 2 + (z - pz) ** 2) / (pr * pr);
    if (d2 < 6) h += ph * Math.exp(-d2 * 1.6);
  }
  const r = Math.hypot(x, z) / boundaryRadius(Math.atan2(z, x));
  h -= smoothstep(0.86, 1.0, r) * 1.1;
  return h;
}

export function createTerrain() {
  const trail = sampleCurve(trailCurve, SAMPLE_COUNT);
  const river = sampleCurve(riverCurve, 300);
  const outflow = sampleCurve(outflowCurve, 80);

  // Plinth levels: the average raw height around each landmark.
  const plinthLevel = {};
  for (const loc of LOCATIONS) {
    let sum = 0, n = 0;
    for (let a = 0; a < 8; a++) for (const rr of [0, 2, 3.5]) {
      sum += rawHeight(loc.x + Math.cos(a) * rr, loc.z + Math.sin(a) * rr); n++;
    }
    plinthLevel[loc.id] = sum / n;
  }
  function withPlinths(x, z, h) {
    for (const loc of LOCATIONS) {
      const d = Math.hypot(x - loc.x, z - loc.z);
      const reach = loc.scale * 0.95 + 2.5;
      if (d < reach + 3.5) h = lerp(h, plinthLevel[loc.id], 1 - smoothstep(reach, reach + 3.5, d));
    }
    return h;
  }
  // Trail height profile: terrain under the curve, smoothed so the walk has no steps.
  for (const s of trail) s.h = withPlinths(s.x, s.z, rawHeight(s.x, s.z));
  for (let pass = 0; pass < 3; pass++) {
    const copy = trail.map((s) => s.h);
    for (let i = 0; i < trail.length; i++) {
      let sum = 0, n = 0;
      for (let k = -10; k <= 10; k++) { const j = Math.min(trail.length - 1, Math.max(0, i + k)); sum += copy[j]; n++; }
      trail[i].h = sum / n;
    }
  }
  const riverLevel = (u) => lerp(RIVER.topLevel, RIVER.bottomLevel, 1 - (1 - u) ** 1.6);
  const outflowLevel = (u) => lerp(OUTFLOW.topLevel, OUTFLOW.bottomLevel, u);

  function carve(h, x, z, samples, halfW, depth, levelAt) {
    const n = nearest(samples, x, z);
    const reach = halfW + 4.5;
    if (n.d > reach) return h;
    const level = levelAt(n.s.u);
    const target = n.d < halfW
      ? level - 0.2 - depth * (1 - (n.d / halfW) ** 2)
      : level + 0.15 + (n.d - halfW) * 0.55;
    if (target >= h) return h;
    return lerp(h, target, 1 - smoothstep(halfW + 0.6, reach, n.d));
  }

  function heightAt(x, z) {
    let h = withPlinths(x, z, rawHeight(x, z));
    const t = nearest(trail, x, z);
    const tw = TRAIL_HALF_WIDTH;
    if (t.d < tw + 3.2) h = lerp(h, t.s.h - 0.04, 1 - smoothstep(tw + 0.4, tw + 3.2, t.d));
    // Lake basin.
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
    if (dl < LAKE.r + 5) {
      const target = dl < LAKE.r ? LAKE.level - 0.35 - 1.3 * (1 - (dl / LAKE.r) ** 2) : LAKE.level + 0.2 + (dl - LAKE.r) * 0.4;
      if (target < h) h = lerp(h, target, 1 - smoothstep(LAKE.r + 0.5, LAKE.r + 5, dl));
    }
    h = carve(h, x, z, river, RIVER.halfWidth, RIVER.depth, riverLevel);
    h = carve(h, x, z, outflow, OUTFLOW.halfWidth, OUTFLOW.depth, outflowLevel);
    return h;
  }

  /** Distance helpers reused by scatterers (trees, flowers) and the colour pass. */
  const features = {
    trailDistance: (x, z) => nearest(trail, x, z).d,
    trailNearest: (x, z) => nearest(trail, x, z),
    waterDistance(x, z) {
      return Math.min(
        nearest(river, x, z).d - RIVER.halfWidth,
        nearest(outflow, x, z).d - OUTFLOW.halfWidth,
        Math.hypot(x - LAKE.x, z - LAKE.z) - LAKE.r
      );
    },
    plinthDistance(x, z) {
      let best = Infinity;
      for (const loc of LOCATIONS) best = Math.min(best, Math.hypot(x - loc.x, z - loc.z) - loc.scale * 0.95);
      return best;
    },
    riverLevel, outflowLevel, plinthLevel, trailSamples: trail, riverSamples: river, outflowSamples: outflow
  };

  const mesh = buildMesh(heightAt, features);
  return { mesh, heightAt, features, plinthLevel };
}

// ---------------------------------------------------------------- mesh
const C = (hex) => new THREE.Color(hex);
const PALETTE = {
  grass: [C('#78c47d'), C('#6dbb76'), C('#83cc83'), C('#71bf7a')],
  meadow: C('#a2d47e'), forest: C('#57a46a'), dirt: C('#d9a96f'), sand: C('#eed7a1'),
  bank: C('#b99a72'), bed: C('#5e8f8c'), rock: C('#a8a5c0'), rockDark: C('#8f8aa9'),
  snow: C('#f4f6fc'), lip: C('#6cb575'), earth: C('#cd7d52'), earth2: C('#ab6444'),
  cliff: C('#8c7290'), under: C('#625775')
};

function buildMesh(heightAt, f) {
  const SPACING = 1.25;
  const K = Math.ceil(ISLAND_RADIUS / SPACING);
  const rand = mulberry32(42);
  const rings = [];
  for (let k = 0; k <= K; k++) {
    const n = k === 0 ? 1 : Math.max(6, Math.round((2 * Math.PI * k * SPACING) / SPACING));
    const ring = [];
    for (let i = 0; i < n; i++) {
      let theta = (i / n) * Math.PI * 2;
      let frac = k / K;
      if (k > 0 && k < K) { theta += (rand() - 0.5) * 0.7 * (Math.PI * 2 / n); frac += (rand() - 0.5) * 0.45 / K; }
      const r = frac * boundaryRadius(theta);
      const x = Math.cos(theta) * r, z = Math.sin(theta) * r;
      ring.push(new THREE.Vector3(x, heightAt(x, z), z));
    }
    rings.push(ring);
  }

  const pos = [], col = [];
  const tmp = new THREE.Color();
  const pushTri = (a, b, c, color) => {
    // Faces point up: flip when the winding came out clockwise from above.
    const cross = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    const [p, q, r] = cross > 0 ? [a, c, b] : [a, b, c];
    pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
    for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b);
  };
  const faceColor = (a, b, c) => {
    const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3, cy = (a.y + b.y + c.y) / 3;
    const e1 = new THREE.Vector3().subVectors(b, a), e2 = new THREE.Vector3().subVectors(c, a);
    const ny = Math.abs(e1.cross(e2).normalize().y);
    const jitter = noise2(cx * 0.9, cz * 0.9) * 0.5 + 0.5;
    const water = f.waterDistance(cx, cz);
    const trailD = f.trailDistance(cx, cz);
    const snowLine = 16.5 + noise2(cx * 0.12, cz * 0.12) * 2.2;
    if (water < -0.2) tmp.copy(PALETTE.bed);
    else if (water < 0.9) tmp.copy(PALETTE.sand).lerp(PALETTE.bank, smoothstep(0.9, -0.2, water) * 0.6);
    else if (cy > snowLine && ny > 0.55) tmp.copy(PALETTE.snow);
    else if (ny < 0.72 || cy > 11.5) tmp.copy(jitter > 0.5 ? PALETTE.rock : PALETTE.rockDark);
    else if (trailD < 1.55) tmp.copy(PALETTE.dirt);
    else {
      tmp.copy(PALETTE.grass[Math.floor(jitter * 3.99)]);
      const meadow = smoothstep(0.25, 0.7, noise2(cx * 0.05 + 11, cz * 0.05 - 4));
      tmp.lerp(PALETTE.meadow, meadow * 0.45);
      const forest = smoothstep(0.2, 0.6, noise2(cx * 0.045 - 9, cz * 0.045 + 13));
      tmp.lerp(PALETTE.forest, forest * 0.55);
      if (cy > 8) tmp.lerp(PALETTE.rock, smoothstep(8, 11.5, cy) * 0.6);
    }
    const shade = 0.96 + jitter * 0.08;
    return tmp.clone().multiplyScalar(shade);
  };

  // Centre fan and ring stitching.
  for (let k = 1; k <= K; k++) {
    const a = rings[k - 1], b = rings[k];
    if (k === 1) {
      for (let i = 0; i < b.length; i++) { const p = a[0], q = b[i], r = b[(i + 1) % b.length]; pushTri(p, q, r, faceColor(p, q, r)); }
      continue;
    }
    let i = 0, j = 0;
    while (i < a.length || j < b.length) {
      const nextA = (i + 1) / a.length, nextB = (j + 1) / b.length;
      if ((nextA <= nextB && i < a.length) || j >= b.length) {
        const p = a[i % a.length], q = b[j % b.length], r = a[(i + 1) % a.length];
        pushTri(p, q, r, faceColor(p, q, r)); i++;
      } else {
        const p = a[i % a.length], q = b[j % b.length], r = b[(j + 1) % b.length];
        pushTri(p, q, r, faceColor(p, q, r)); j++;
      }
    }
  }

  // Cliff skirt in strata, then the rocky underside of the floating island.
  const edge = rings[K];
  const bands = [
    { dy: -0.7, inset: 0.15, color: PALETTE.lip },
    { y: -2.6, inset: 0.7, color: PALETTE.earth },
    { y: -5.6, inset: 1.5, color: PALETTE.earth2 },
    { y: -9.5, inset: 3.0, color: PALETTE.cliff },
    { y: -16, inset: 12, color: PALETTE.under },
    { y: -27, inset: 34, color: PALETTE.under }
  ];
  let upper = edge;
  for (const band of bands) {
    const lower = upper.map((p, i) => {
      const theta = Math.atan2(edge[i].z, edge[i].x);
      const rr = Math.hypot(edge[i].x, edge[i].z) - band.inset - noise2(theta * 6, band.inset) * 0.6;
      const y = band.dy !== undefined ? edge[i].y + band.dy : band.y + noise2(theta * 5, band.y) * 1.2;
      return new THREE.Vector3(Math.cos(theta) * rr, y, Math.sin(theta) * rr);
    });
    for (let i = 0; i < upper.length; i++) {
      const i2 = (i + 1) % upper.length;
      const c = band.color.clone().multiplyScalar(0.92 + 0.12 * (noise2(i * 0.7, band.inset) * 0.5 + 0.5));
      pushWall(pos, col, upper[i], upper[i2], lower[i2], lower[i], c);
    }
    upper = lower;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.computeVertexNormals();
  const material = weatherize(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.93, metalness: 0 }));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true; mesh.castShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

function pushWall(pos, col, a, b, c, d, color) {
  // Quad a-b (top) to d-c (bottom), outward facing.
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
  for (let i = 0; i < 6; i++) col.push(color.r, color.g, color.b);
}
