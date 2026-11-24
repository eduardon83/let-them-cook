// layout.js — the single source of truth for where things are in Saffron Valley.
// World units ≈ metres at diorama scale. +x is right, +z is towards the default camera.
// Terrain, trail, water, landmarks, labels and villagers all read from here, so moving a
// location means editing one line.
import * as THREE from 'three';

export const ISLAND_RADIUS = 58;

/** Mission locations, in trail order. `plinth` is the hex-kit model used as the landmark. */
export const LOCATIONS = [
  { id: 'gate', name: 'Welcome Kitchen', x: 2, z: 43, plinth: 'building-cabin', scale: 6.2, rot: 0.3, region: 'village', isTutorial: true },
  { id: 'market', name: 'Market Square', x: -17, z: 31, plinth: 'building-market', scale: 6.8, rot: 0.5, region: 'village' },
  { id: 'pantry', name: 'The Pantry Mill', x: -38, z: 12, plinth: 'building-mill', scale: 6.8, rot: 1.1, region: 'hills' },
  { id: 'school', name: 'Cooking School', x: -22, z: -6, plinth: 'building-village', scale: 6.8, rot: 0.2, region: 'hills' },
  { id: 'bakery', name: 'The Bakery', x: -3, z: 9, plinth: 'building-house', scale: 6.6, rot: -0.3, region: 'village' },
  { id: 'cafe', name: 'Riverside Café', x: 13, z: -3, plinth: 'building-watermill', scale: 6.6, rot: 0.9, region: 'river' },
  { id: 'festival', name: 'Harbour Festival', x: 19, z: 33, plinth: 'building-port', scale: 6.6, rot: -0.7, region: 'river' },
  { id: 'tower', name: "The Critic's Tower", x: 42, z: 6, plinth: 'building-wizard-tower', scale: 7.2, rot: -0.4, region: 'river' },
  { id: 'grand', name: 'The Grand Restaurant', x: 4, z: -27, plinth: 'building-castle', scale: 8.4, rot: 0, region: 'mountains' }
];

/** Trail waypoints. Each location has a stop beside its plinth (stopOf), never under it. */
const TRAIL_POINTS = [
  [6, 52], [3, 47.5], [-4, 40], [-12, 35.5], [-20, 26.5], [-30, 22], [-36, 18.5], [-36.5, 5],
  [-31, -2], [-23, 0.5], [-14, 4], [-6, 5.5], [1, 4.5], [8, 2], [13, 3.5], [14, 12],
  [14, 22], [17, 27.5], [23, 28.5], [28, 21], [31, 15], [37, 11], [41, 0.5], [38, -9],
  [30, -15], [20, -16.5], [12, -19], [6, -21.5]
];
export const TRAIL_STOPS = { gate: 1, market: 4, pantry: 7, school: 9, bakery: 11, cafe: 14, festival: 18, tower: 22, grand: 27 };

export const trailCurve = new THREE.CatmullRomCurve3(
  TRAIL_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal', 0.5
);
export const TRAIL_HALF_WIDTH = 1.25;

/** River from the mountain waterfall down to the lake, and the outflow to the island edge. */
const RIVER_POINTS = [[22, -34], [21, -27], [20, -19], [22, -10], [23.5, -1], [25, 8], [28, 16], [32, 23], [36, 28]];
export const riverCurve = new THREE.CatmullRomCurve3(RIVER_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal', 0.5);
export const RIVER = { halfWidth: 1.9, topLevel: 6.2, bottomLevel: 0.75, depth: 1.1 };

export const LAKE = { x: 38, z: 31, r: 8.5, level: 0.7 };
const OUTFLOW_POINTS = [[44, 34], [49, 37], [54, 40], [57.5, 42.5]];
export const outflowCurve = new THREE.CatmullRomCurve3(OUTFLOW_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal', 0.5);
export const OUTFLOW = { halfWidth: 1.5, topLevel: 0.7, bottomLevel: 0.35, depth: 0.8 };

/** Mountain peaks: [x, z, height, radius]. The waterfall leaves the first ridge. */
export const PEAKS = [
  [6, -46, 30, 18], [-18, -42, 24, 17], [26, -44, 26, 15], [-38, -30, 17, 14],
  [42, -30, 18, 13], [-4, -36, 14, 12], [33, -22, 11, 10]
];
/** Gentle hills: [x, z, height, radius]. */
export const HILLS = [
  [-38, 12, 3.2, 11], [4, -27, 8.5, 13], [42, 6, 2.5, 9], [-24, -10, 2.2, 10], [-46, -8, 4, 10]
];

/** Where the mountain waterfall drops into the river. */
export const WATERFALL = { x: 22, z: -34, top: 13.5, bottom: RIVER.topLevel };

/** Named camera views: position and target. The first one is home. */
export const VIEWS = {
  valley: { position: [-6, 104, 138], target: [-9, 0, 5], label: 'Whole valley' },
  village: { position: [-30, 34, 76], target: [-12, 2, 26], label: 'Village & market' },
  hills: { position: [-70, 40, 34], target: [-26, 3, 4], label: 'Mill hills' },
  river: { position: [62, 36, 66], target: [26, 2, 16], label: 'River & harbour' },
  mountains: { position: [10, 46, 22], target: [6, 10, -28], label: 'Summit' }
};

export function locationById(id) { return LOCATIONS.find((l) => l.id === id); }

/** Point on the trail at the stop of a location (where villagers turn, where the beacon sits). */
export function trailStop(id) {
  const index = TRAIL_STOPS[id];
  return new THREE.Vector3(TRAIL_POINTS[index][0], 0, TRAIL_POINTS[index][1]);
}

/** Curve parameter u (0..1) closest to a world position on the trail. */
export function trailUAt(x, z, samples = trailSamples()) {
  let best = Infinity, bestU = 0;
  for (const s of samples) { const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < best) { best = d; bestU = s.u; } }
  return bestU;
}

let cachedSamples = null;
export function trailSamples(count = 600) {
  if (cachedSamples && cachedSamples.length === count + 1) return cachedSamples;
  cachedSamples = [];
  for (let i = 0; i <= count; i++) { const u = i / count; const p = trailCurve.getPointAt(u); cachedSamples.push({ u, x: p.x, z: p.z }); }
  return cachedSamples;
}
