// sets.js — the scenes shown on the character stage.
// buildMissionSet(lesson): the host in a small themed diorama for that mission.
// buildKitchenSet(): the welcome tutorial restaurant, with a brigade at work.
import * as THREE from 'three';
import { model } from '../core/assets.js';
import { createCharacter } from '../core/characters.js';
import { createFlag } from '../world/props.js';
import { sparkleTexture } from '../world/sprites.js';

export const THEMES = {
  market: ['#fde7c4', '#f4b56a'], pantry: ['#f6ecc8', '#cfb46a'], school: ['#e3f1e2', '#7fbf8e'],
  bakery: ['#fde5d8', '#e9a07c'], cafe: ['#dcecf7', '#78acd6'], festival: ['#fbe0ec', '#d779a6'],
  tower: ['#e9e2f7', '#9a82cf'], grand: ['#fbf0d0', '#e0b13a'], kitchen: ['#fbf1de', '#e7c08a']
};

function gradientBackground([top, bottom]) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top); grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lights(group, { warm = '#fff1dc', key = 2.4 } = {}) {
  const hemi = new THREE.HemisphereLight('#fff8ee', '#b9a283', 1.2);
  const sun = new THREE.DirectionalLight(warm, key);
  sun.position.set(-4, 9, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  const rim = new THREE.DirectionalLight('#cfe2ff', 0.9);
  rim.position.set(6, 5, -6);
  group.add(hemi, sun, rim);
}

function place(group, kit, key, x, z, { y = 0, rot = 0, scale = 1 } = {}) {
  const m = model(kit, key);
  m.position.set(x, y, z); m.rotation.y = rot; m.scale.setScalar(scale);
  m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(m);
  return m;
}

/** Floating sparkles/steam motes for a little magic around the host. */
function motes(group, color = '#ffd27a', count = 40, radius = 3.2) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seeds = [];
  for (let i = 0; i < count; i++) seeds.push({ a: Math.random() * 6.28, r: 1 + Math.random() * radius, y: Math.random() * 3, s: 0.2 + Math.random() * 0.4 });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: sparkleTexture(), color, size: 0.14, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  group.add(points);
  return (t) => {
    seeds.forEach((s, i) => {
      const y = (s.y + t * s.s) % 3.4;
      pos.set([Math.cos(s.a + t * 0.2) * s.r, 0.3 + y, Math.sin(s.a + t * 0.2) * s.r], i * 3);
    });
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.6 + Math.sin(t * 2) * 0.2;
  };
}

/** Procedural head bob while the host is speaking (on top of the current animation). */
function talker(character) {
  const head = character.body.getObjectByName('Head');
  const neck = character.body.getObjectByName('Neck');
  return (t, level) => {
    if (!head || level < 0.01) return;
    head.rotation.x += Math.sin(t * 9.5) * 0.06 * level + Math.sin(t * 3.1) * 0.03 * level;
    if (neck) neck.rotation.y += Math.sin(t * 1.7) * 0.08 * level;
  };
}

const MISSION_PROPS = {
  market(g) {
    place(g, 'hex', 'grass', 0, 0, { y: -1.75, scale: 9 });
    place(g, 'town', 'stall-red', -0.2, -2.2, { scale: 2.1 });
    place(g, 'kitchen', 'crate_tomatoes', -2.0, 0.6, { scale: 0.62, rot: 0.3 });
    place(g, 'kitchen', 'crate_carrots', -2.4, -0.8, { scale: 0.62, rot: -0.2 });
    place(g, 'kitchen', 'crate_lettuce', 2.1, 0.5, { scale: 0.62, rot: -0.4 });
    place(g, 'kitchen', 'crate_onions', 2.4, -0.9, { scale: 0.62, rot: 0.2 });
    place(g, 'food', 'apple', -0.6, -1.4, { y: 0.95, scale: 1.6 }); place(g, 'food', 'pear', 0.2, -1.5, { y: 0.95, scale: 1.6 });
    place(g, 'food', 'banana', 0.9, -1.4, { y: 0.95, scale: 1.6, rot: 0.5 });
    place(g, 'town', 'cart', 3.2, -3.4, { scale: 1.6, rot: -0.6 });
    place(g, 'town', 'tree-high-round', -3.4, -3.8, { scale: 1.4 });
  },
  pantry(g) {
    place(g, 'hex', 'grass', 0, 0, { y: -1.75, scale: 9 });
    place(g, 'food', 'barrel', -2.4, -1.4, { scale: 3.2 }); place(g, 'food', 'barrel', -3.0, 0.0, { scale: 3.0, rot: 1 });
    place(g, 'food', 'bag', 2.4, -0.6, { scale: 3.4 }); place(g, 'food', 'bag-flat', 2.9, 0.6, { scale: 3.4, rot: 0.6 });
    place(g, 'kitchen', 'kitchencabinet', 0, -2.6, { scale: 1 });
    place(g, 'kitchen', 'jar_A_large', -0.5, -2.4, { y: 1.0, scale: 0.9 }); place(g, 'kitchen', 'jar_B_medium', 0.4, -2.4, { y: 1.0, scale: 0.9 });
    place(g, 'town', 'windmill', 3.5, -3.5, { y: 3.2, scale: 1.2, rot: -0.4 });
    place(g, 'town', 'fence', 3.2, 2.2, { scale: 1.8, rot: 1.2 });
  },
  school(g) {
    place(g, 'kitchen', 'floor_kitchen', -2, -2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, -2, { y: -0.5 });
    place(g, 'kitchen', 'floor_kitchen', -2, 2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, 2, { y: -0.5 });
    place(g, 'kitchen', 'wall_decorated', 0, -4, {}); place(g, 'kitchen', 'stove_multi_decorated', 0, -3, {});
    place(g, 'kitchen', 'extractorhood', 0, -3, { y: 2.2 });
    place(g, 'kitchen', 'kitchencounter_straight_A_decorated', -2, -3, {}); place(g, 'kitchen', 'kitchencounter_sink_backsplash', 2, -3, {});
    place(g, 'kitchen', 'kitchentable_A', 2.6, 0.4, { rot: Math.PI / 2 });
    place(g, 'kitchen', 'cuttingboard', 2.6, 0.4, { y: 1.0 }); place(g, 'food', 'carrot', 2.4, 0.2, { y: 1.05, scale: 1.4, rot: 1.2 });
    place(g, 'food', 'onion', 2.9, 0.7, { y: 1.05, scale: 1.4 });
  },
  bakery(g) {
    place(g, 'kitchen', 'floor_kitchen', -2, -2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, -2, { y: -0.5 });
    place(g, 'kitchen', 'floor_kitchen', -2, 2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, 2, { y: -0.5 });
    place(g, 'kitchen', 'wall', 0, -4, {}); place(g, 'kitchen', 'oven', -2, -3, {});
    place(g, 'kitchen', 'kitchentable_A_large', 2.2, -0.2, {});
    place(g, 'food', 'bread', 1.6, -0.3, { y: 1.0, scale: 1.6 }); place(g, 'food', 'croissant', 2.5, 0.3, { y: 1.0, scale: 1.6 });
    place(g, 'food', 'cake', 2.8, -0.7, { y: 1.0, scale: 1.5 }); place(g, 'food', 'loaf-baguette', 1.9, 0.5, { y: 1.0, scale: 1.4, rot: 0.6 });
    place(g, 'kitchen', 'crate_buns', -2.8, 0.4, { scale: 0.7 });
  },
  cafe(g) {
    place(g, 'kitchen', 'floor_kitchen', -2, -2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, -2, { y: -0.5 });
    place(g, 'kitchen', 'floor_kitchen', -2, 2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, 2, { y: -0.5 });
    place(g, 'kitchen', 'wall_orderwindow_decorated', 0, -4, {});
    place(g, 'kitchen', 'table_round_A_decorated', 2.6, -0.4, { scale: 0.9 });
    place(g, 'kitchen', 'chair_A', 3.6, 0.6, { rot: -2.3 }); place(g, 'kitchen', 'chair_A', 1.5, -1.4, { rot: 0.8 });
    place(g, 'kitchen', 'table_round_A_small_decorated', -2.7, -1.0, { scale: 0.9 });
    place(g, 'kitchen', 'chair_A', -3.6, 0.0, { rot: 2.3 });
  },
  festival(g) {
    place(g, 'hex', 'grass', 0, 0, { y: -1.75, scale: 9 });
    place(g, 'town', 'stall-green', -2.4, -2.4, { scale: 2.0, rot: 0.3 });
    place(g, 'town', 'stall-red', 2.4, -2.4, { scale: 2.0, rot: -0.3 });
    place(g, 'food', 'taco', -2.6, -1.6, { y: 1.05, scale: 1.4 }); place(g, 'food', 'dim-sum', 2.2, -1.7, { y: 1.05, scale: 1.4 });
    place(g, 'town', 'lantern', -3.6, 0.8, { scale: 1.3 }); place(g, 'town', 'lantern', 3.6, 0.8, { scale: 1.3 });
    const f1 = createFlag('#d64f8b', { height: 3.6 }); f1.position.set(-4.2, 0, -3.2); g.add(f1);
    const f2 = createFlag('#3b8fc4', { height: 3.6 }); f2.position.set(4.0, 0, -3.2); g.add(f2);
  },
  tower(g) {
    place(g, 'kitchen', 'floor_kitchen', -2, -2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, -2, { y: -0.5 });
    place(g, 'kitchen', 'floor_kitchen', -2, 2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, 2, { y: -0.5 });
    place(g, 'kitchen', 'table_round_A', 2.4, -0.4, { scale: 0.9 });
    place(g, 'kitchen', 'food_dinner', 2.3, -0.4, { y: 0.92, scale: 0.9 });
    place(g, 'kitchen', 'menu', 2.9, 0.0, { y: 0.92, scale: 0.9, rot: -0.4 });
    place(g, 'kitchen', 'chair_B', 2.4, 1.0, { rot: Math.PI });
    place(g, 'town', 'lantern', -3.2, -2.6, { scale: 1.4 });
    place(g, 'hex', 'building-wizard-tower', -2.6, -4.6, { scale: 3.2, y: -0.4 });
  },
  grand(g) {
    place(g, 'kitchen', 'floor_kitchen', -2, -2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, -2, { y: -0.5 });
    place(g, 'kitchen', 'floor_kitchen', -2, 2, { y: -0.5 }); place(g, 'kitchen', 'floor_kitchen', 2, 2, { y: -0.5 });
    place(g, 'kitchen', 'kitchentable_A_large_decorated', 0, -2.6, {});
    place(g, 'kitchen', 'food_dinner', -0.6, -2.6, { y: 1.0 }); place(g, 'kitchen', 'stew_pot', 0.7, -2.6, { y: 1.0 });
    place(g, 'food', 'cake-birthday', 2.8, -0.8, { scale: 1.8 });
    for (const [x, c] of [[-3.6, '#e4572e'], [-1.8, '#f2a33a'], [1.8, '#3f8f5b'], [3.6, '#6b4fa0']]) { const f = createFlag(c, { height: 3.8 }); f.position.set(x, 0, -3.8); g.add(f); }
  }
};

export async function buildMissionSet(lesson) {
  const group = new THREE.Group();
  lights(group);
  const build = MISSION_PROPS[lesson.id] || MISSION_PROPS.school;
  build(group);
  const host = await createCharacter(lesson.host?.cast || 'olivia', { height: 2.2 });
  host.root.position.set(0, 0, 0.4);
  group.add(host.root);
  host.play('Wave', { once: true, then: 'Idle' });
  const bob = talker(host);
  const moteFx = motes(group, lesson.id === 'tower' ? '#c8b8ff' : '#ffd27a');
  return {
    group, host,
    background: gradientBackground(THEMES[lesson.id] || THEMES.kitchen),
    views: { main: { position: [1.3, 2.7, 8.6], target: [0.35, 1.45, 0] }, close: { position: [0.6, 2.3, 4.8], target: [0.2, 1.75, 0] } },
    headPoint: () => { const p = new THREE.Vector3(); host.body.getObjectByName('Head')?.getWorldPosition(p); return p; },
    update(dt, t, talk) { host.update(dt); bob(t, talk); moteFx(t); },
    gesture() { host.play(Math.random() < 0.5 ? 'Interact' : 'Wave', { once: true, then: 'Idle' }); }
  };
}

/** The welcome tutorial restaurant: kitchen on the left, the pass, dining room on the right. */
export async function buildKitchenSet() {
  const group = new THREE.Group();
  lights(group, { key: 2.2 });
  for (let x = -8; x < 10; x += 4) for (let z = -6; z < 6; z += 4) place(group, 'kitchen', 'floor_kitchen', x + 2, z + 2, { y: -0.5 });
  // Back wall with counters, stove and hood; left wall with fridge and shelves.
  place(group, 'kitchen', 'wall_window_open', -6, -6, {}); place(group, 'kitchen', 'wall_decorated', -2, -6, {});
  place(group, 'kitchen', 'wall', 2, -6, {}); place(group, 'kitchen', 'wall_window_closed', 6, -6, {});
  place(group, 'kitchen', 'wall', -8, -4, { rot: Math.PI / 2 }); place(group, 'kitchen', 'wall_half', -8, 0, { rot: Math.PI / 2 });
  place(group, 'kitchen', 'kitchencounter_straight_A_decorated', -6, -5, {});
  place(group, 'kitchen', 'stove_multi_decorated', -4, -5, {}); place(group, 'kitchen', 'extractorhood', -4, -5, { y: 2.2 });
  place(group, 'kitchen', 'kitchencounter_sink_backsplash', -2, -5, {});
  place(group, 'kitchen', 'fridge_A_decorated', -7, -2, { rot: Math.PI / 2 });
  place(group, 'kitchen', 'shelf_papertowel_decorated', -7.6, 1.2, { rot: Math.PI / 2, y: 1.4 });
  place(group, 'kitchen', 'crate_tomatoes', -6.8, 2.6, { scale: 0.7 }); place(group, 'kitchen', 'crate_carrots', -5.4, 3.4, { scale: 0.7, rot: 0.4 });
  place(group, 'kitchen', 'kitchentable_A_large_decorated', -4, -0.6, {});
  // The pass: a half wall with an order window between kitchen and dining room.
  place(group, 'kitchen', 'wall_orderwindow_decorated', 0.2, -3.2, { rot: Math.PI / 2 });
  place(group, 'kitchen', 'wall_half', 0.2, 0.8, { rot: Math.PI / 2 });
  // Dining room.
  place(group, 'kitchen', 'table_round_A_decorated', 4.2, -2.6, {}); place(group, 'kitchen', 'chair_A', 5.6, -2.0, { rot: -2.0 }); place(group, 'kitchen', 'chair_A', 2.8, -3.4, { rot: 1.0 });
  place(group, 'kitchen', 'table_round_A_small_decorated', 6.2, 1.8, {}); place(group, 'kitchen', 'chair_B', 7.2, 2.8, { rot: -2.4 });
  place(group, 'kitchen', 'door_A', 9.6, -1.6, { rot: -Math.PI / 2 });
  place(group, 'kitchen', 'menu', 4.6, -2.3, { y: 1.0, rot: 0.3 });

  const cast = {};
  const make = async (id, x, z, rot, anim) => { const c = await createCharacter(id, { height: 2.25 }); c.root.position.set(x, 0, z); c.root.rotation.y = rot; group.add(c.root); c.play(anim); c.mixer.setTime(Math.random() * 2); cast[id] = c; return c; };
  await Promise.all([
    make('olivia', -2.0, 2.6, 0.25, 'Idle'),
    make('luka', -4.0, -3.9, Math.PI, 'Interact'),
    make('yusuf', -4.0, 0.9, Math.PI, 'Interact'),
    make('lena', -6.0, 1.6, 1.4, 'Idle_Neutral'),
    make('noor', 1.6, -1.8, 1.6, 'Walk'),
    make('guest', 4.6, -1.2, 2.6, 'Idle'),
    make('petra', 6.6, 3.2, -2.2, 'Idle_Neutral'),
    make('tomas', 8.4, -0.4, -1.6, 'Wave')
  ]);
  const olivia = cast.olivia;
  const bob = talker(olivia);
  const moteFx = motes(group, '#ffd27a', 50, 6);
  // Noor carries orders: pass → table → pass.
  const waiterPath = [new THREE.Vector3(1.4, 0, -2.4), new THREE.Vector3(3.4, 0, -1.4), new THREE.Vector3(5.2, 0, 0.6), new THREE.Vector3(3.0, 0, 1.2)];
  const waiter = { i: 0, k: 0, pause: 0 };

  // A ring that marks the area the current slide talks about.
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.75, 48), new THREE.MeshBasicMaterial({ color: '#ffcf70', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  group.add(ring);
  const ringSpots = { overview: null, pantry: [-6.2, 1.6], stove: [-4, -3.6], pass: [0.8, -2.6], dining: [4.6, -1.0], door: [8.4, -0.4], map: null };
  let ringTarget = null;

  return {
    group, host: olivia, cast,
    background: gradientBackground(THEMES.kitchen),
    sway: 0.05,
    views: {
      overview: { position: [3, 15, 21], target: [0.8, 0.4, -0.8] },
      main: { position: [3, 15, 21], target: [0.8, 0.4, -0.8] },
      pantry: { position: [-0.5, 5.4, 9.5], target: [-6, 1.2, 0.4] },
      stove: { position: [-1.6, 5.2, 6.6], target: [-4, 1.4, -3.2] },
      pass: { position: [4.4, 4.8, 5.8], target: [0.4, 1.4, -2.2] },
      dining: { position: [1.8, 5.6, 9.4], target: [5, 1.1, -0.6] },
      door: { position: [3.4, 5.2, 8.0], target: [8.2, 1.4, -0.8] },
      map: { position: [0, 22, 20], target: [0, 0, -2] }
    },
    startView: 'overview',
    headPoint: () => { const p = new THREE.Vector3(); olivia.body.getObjectByName('Head')?.getWorldPosition(p); return p; },
    highlight(name) {
      const spot = ringSpots[name];
      ringTarget = spot ? 0.75 : 0;
      if (spot) ring.position.set(spot[0], 0.03, spot[1]);
      if (name === 'door') cast.tomas.play('Wave', { once: true, then: 'Idle_Neutral' });
      if (name === 'overview') olivia.play('Wave', { once: true, then: 'Idle' });
    },
    update(dt, t, talk) {
      for (const c of Object.values(cast)) c.update(dt);
      bob(t, talk); moteFx(t);
      if (ringTarget !== null) ring.material.opacity += (ringTarget * (0.7 + 0.3 * Math.sin(t * 3)) - ring.material.opacity) * Math.min(1, dt * 4);
      // Waiter loop.
      const w = cast.noor;
      if (waiter.pause > 0) { waiter.pause -= dt; if (waiter.pause <= 0) w.play('Walk'); return; }
      const a = waiterPath[waiter.i], b = waiterPath[(waiter.i + 1) % waiterPath.length];
      waiter.k += dt * 1.1 / a.distanceTo(b);
      w.root.position.lerpVectors(a, b, Math.min(1, waiter.k));
      w.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      if (waiter.k >= 1) { waiter.k = 0; waiter.i = (waiter.i + 1) % waiterPath.length; if (waiter.i % 2 === 0) { waiter.pause = 1.8; w.play('Interact'); } }
    }
  };
}
