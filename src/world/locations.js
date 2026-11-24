// locations.js — the mission landmarks along the trail.
// Each location is a hex-kit building on its own raised hex plinth, dressed with props.
// States: asleep (missions further down the trail: desaturated, cool), next (beacon ring and
// light column), done (warm gold ring, raised flag). Mill sails and water wheels turn.
import * as THREE from 'three';
import { LOCATIONS } from './layout.js';
import { model } from '../core/assets.js';
import { SHARED } from './materials.js';
import { glowTexture } from './sprites.js';
import { createFlag } from './props.js';

/** World-space dressing around each location: [kit, model, dx, dz, rotY, scale]. */
const DECOR = {
  gate: [['town', 'lantern', -3.6, 2.6, 0, 0.85], ['town', 'lantern', 3.8, 2.0, 0, 0.85], ['town', 'cart', -4.4, -1.2, 0.8, 1.1],
    ['kitchen', 'crate_tomatoes', 4.2, -1.4, 0.3, 0.42], ['kitchen', 'crate_carrots', 4.6, -0.2, -0.2, 0.42]],
  market: [['town', 'stall-red', -4.9, 1.2, 0.5, 1.25], ['town', 'stall-green', 4.8, 1.4, -0.6, 1.25], ['town', 'cart-high', 3.8, -3.8, 2.1, 1.1],
    ['kitchen', 'crate_tomatoes', -5.6, 3.3, 0.2, 0.42], ['kitchen', 'crate_lettuce', -4.0, 3.9, -0.3, 0.42],
    ['kitchen', 'crate_onions', 5.8, 3.2, 0.4, 0.42], ['kitchen', 'crate_potatoes', 6.4, 1.8, 0.1, 0.42], ['town', 'stall', -0.8, -4.6, 3.2, 1.2]],
  pantry: [['food', 'barrel', 4.2, 2.0, 0, 2.2], ['food', 'barrel', 4.9, 0.9, 0.7, 2.2], ['food', 'bag', 3.6, 3.1, 0.3, 2.4],
    ['food', 'bag-flat', -4.3, 1.8, 0.8, 2.4], ['town', 'cart', -4.0, -2.4, -0.9, 1.1], ['town', 'fence', 1.0, 4.4, 0, 1.4], ['town', 'fence', -0.5, 4.4, 0, 1.4]],
  school: [['kitchen', 'table_round_A_decorated', 4.6, 2.0, 0, 0.55], ['kitchen', 'chair_A', 5.8, 2.4, -1.6, 0.55], ['kitchen', 'chair_A', 3.5, 1.5, 1.6, 0.55],
    ['town', 'lantern', -4.0, 2.6, 0, 0.85], ['kitchen', 'crate_cheese', -4.5, -1.0, 0.4, 0.42]],
  bakery: [['town', 'stall', 4.4, 0.8, -1.2, 1.25], ['kitchen', 'crate_buns', -4.2, 2.2, 0.3, 0.42], ['kitchen', 'crate_buns', -4.9, 1.0, -0.4, 0.42],
    ['town', 'lantern', 3.2, 3.6, 0, 0.85]],
  cafe: [['kitchen', 'table_round_A_small_decorated', -4.6, 2.0, 0, 0.6], ['kitchen', 'chair_A', -5.6, 2.6, -2.2, 0.55], ['kitchen', 'chair_A', -3.6, 1.4, 0.9, 0.55],
    ['kitchen', 'table_round_A_small_decorated', -2.6, 4.6, 0.4, 0.6], ['kitchen', 'chair_A', -2.0, 5.6, 3.6, 0.55], ['kitchen', 'chair_A', -3.4, 3.8, 0.2, 0.55],
    ['town', 'lantern', -6.0, -0.4, 0, 0.85]],
  festival: [['town', 'stall-red', -4.8, -1.8, 0.9, 1.25], ['town', 'stall-green', -2.4, -4.6, 0.2, 1.25], ['town', 'stall', -5.6, 1.6, 1.6, 1.2],
    ['town', 'lantern', -1.0, -5.8, 0, 0.85], ['town', 'lantern', -6.4, -0.1, 0, 0.85], ['kitchen', 'crate_steak', -6.0, -3.6, 0.4, 0.42]],
  tower: [['kitchen', 'table_round_A_decorated', -4.6, 2.2, 0, 0.55], ['kitchen', 'chair_A', -5.8, 2.6, -1.6, 0.55], ['kitchen', 'chair_A', -3.4, 1.8, 1.6, 0.55],
    ['town', 'lantern', -3.6, -3.0, 0, 0.85], ['town', 'rock-large', 4.6, -2.0, 0.5, 1.2]],
  grand: [['town', 'fountain-round', 0.2, 6.6, 0, 1.5], ['town', 'lantern', -4.6, 5.0, 0, 0.95], ['town', 'lantern', 4.8, 5.0, 0, 0.95],
    ['kitchen', 'table_round_A_decorated', -6.2, 2.2, 0, 0.6], ['kitchen', 'table_round_A_decorated', 6.4, 2.4, 0.4, 0.6]]
};

/** Non-mission village buildings: [model, x, z, rotY, scale, chimneyHeight]. */
const VILLAGE = [
  ['building-house', -31, 37, 0.4, 4.3, 2.9], ['building-house', -8, 23, -0.5, 4.0, 2.7], ['building-cabin', 12, 41, 0.9, 4.2, 3.1],
  ['building-farm', -45, 27, 0.2, 4.6, 0], ['building-sheep', -48, 0, 0.6, 4.6, 0], ['building-house', 29, -5, 1.2, 3.9, 2.6],
  ['building-cabin', -14, -18, -0.3, 4.2, 3.1], ['building-farm', -26, 14, 0.1, 4.2, 0]
];

const FLAG_COLORS = { gate: '#e4572e', market: '#f2a33a', pantry: '#c9a227', school: '#3f8f5b', bakery: '#e88c6a', cafe: '#3b8fc4', festival: '#d64f8b', tower: '#6b4fa0', grand: '#e0b13a' };

function sleepify(material, uSleep) {
  const m = material.clone();
  const previous = material.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    previous?.call(m, shader, r);
    shader.uniforms.uSleep = uSleep;
    shader.fragmentShader = 'uniform float uSleep;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float grey = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(grey) * vec3(0.82, 0.86, 1.0), uSleep * 0.78);`);
  };
  const key = material.customProgramCacheKey?.() ?? '';
  m.customProgramCacheKey = () => key + '|sleep';
  return m;
}

export function createLocations(scene, terrain, trail) {
  const group = new THREE.Group(); group.name = 'locations';
  const items = [];
  const hitboxes = [];
  const spinners = [];
  const chimneys = [];
  const obstacles = [];
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const glowMap = glowTexture();

  for (const loc of LOCATIONS) {
    const y = terrain.plinthLevel[loc.id];
    const root = new THREE.Group();
    root.position.set(loc.x, y - 0.05, loc.z);
    const building = model('hex', loc.plinth);
    building.scale.setScalar(loc.scale);
    building.rotation.y = loc.rot;
    const uSleep = { value: 0 };
    building.traverse((o) => {
      if (o.isMesh) o.material = sleepify(o.material, uSleep);
      if (/^rotate-/.test(o.name)) spinners.push({ node: o, axis: o.name.endsWith('x') ? 'x' : 'z', speed: o.name.endsWith('x') ? 0.9 : -1.4 });
    });
    root.add(building);
    const box = new THREE.Box3().setFromObject(building);
    const height = box.max.y - box.min.y;

    // Beacon: a ring on the plinth and a soft light column, shown on the next mission.
    const ring = new THREE.Mesh(new THREE.RingGeometry(loc.scale * 0.66, loc.scale * 0.76, 48),
      new THREE.MeshBasicMaterial({ color: '#ffcf70', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = loc.scale * 0.205;
    root.add(ring);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(loc.scale * 0.55, loc.scale * 0.7, 26, 32, 1, true),
      new THREE.ShaderMaterial({
        uniforms: { uTime: SHARED.uTime, uAlpha: { value: 0 }, uColor: { value: new THREE.Color('#ffd27a') } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform float uTime; uniform float uAlpha; uniform vec3 uColor; varying vec2 vUv;
          void main(){ float fade = pow(1.0 - vUv.y, 2.2); float bands = 0.75 + 0.25 * sin(vUv.y * 30.0 - uTime * 3.0);
            gl_FragColor = vec4(uColor * fade * bands * uAlpha, 1.0); }`
      }));
    column.position.y = 13 + loc.scale * 0.2;
    root.add(column);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(loc.scale * 2.4); halo.position.y = height * 0.55;
    root.add(halo);

    // Flag raised when the mission is cooked.
    const flag = createFlag(FLAG_COLORS[loc.id] || '#f2a33a', { height: 3.4 });
    flag.position.set(loc.scale * 0.42, loc.scale * 0.2, loc.scale * 0.32);
    flag.userData.raise = 0; flag.userData.target = 0;
    flag.scale.setScalar(0.001);
    root.add(flag);

    const hit = new THREE.Mesh(new THREE.CylinderGeometry(loc.scale * 0.62, loc.scale * 0.62, height + 1.2, 12), hitMaterial);
    hit.position.y = height / 2; hit.userData.locationId = loc.id;
    root.add(hit); hitboxes.push(hit);

    group.add(root);
    const focusPoint = new THREE.Vector3(loc.x, y + height * 0.35, loc.z);
    items.push({
      ...loc, root, building, uSleep, ring, column, halo, flag, height, focusPoint, baseY: root.position.y,
      labelAnchor: new THREE.Vector3(loc.x, y + height + 1.4, loc.z),
      state: 'asleep', hover: 0, celebrate: 0
    });

    const spread = loc.scale / 5.5;
    for (const [kit, key, dx, dz, rot, scale] of DECOR[loc.id] || []) {
      const px = loc.x + dx * spread, pz = loc.z + dz * spread;
      // Never drop a prop on the trail or into the water.
      if (terrain.features.trailDistance(px, pz) < 2.3 || terrain.features.waterDistance(px, pz) < 0.8) continue;
      const prop = model(kit, key);
      prop.scale.setScalar(scale); prop.rotation.y = rot;
      prop.position.set(px, terrain.heightAt(px, pz) - 0.03, pz);
      group.add(prop);
      obstacles.push({ x: px, z: pz, r: 1.6 * Math.max(1, scale) });
    }
    if (['gate', 'school', 'bakery', 'grand'].includes(loc.id)) {
      chimneys.push(new THREE.Vector3(loc.x + Math.cos(loc.rot) * loc.scale * 0.12, y + height * 0.95, loc.z - Math.sin(loc.rot) * loc.scale * 0.12));
    }
  }

  // Festival bunting and grand-restaurant flags.
  const grand = items.find((i) => i.id === 'grand');
  for (const [dx, dz, color] of [[-5.4, -3.6, '#e4572e'], [5.6, -3.4, '#3f8f5b'], [-4.2, 4.2, '#f2a33a'], [4.4, 4.0, '#6b4fa0']]) {
    const f = createFlag(color, { height: 4.2 });
    const px = grand.x + dx * 1.35, pz = grand.z + dz * 1.35;
    f.position.set(px, terrain.heightAt(px, pz), pz);
    group.add(f);
    obstacles.push({ x: px, z: pz, r: 1.2 });
  }

  for (const [key, x, z, rot, scale, chimney] of VILLAGE) {
    const house = model('hex', key);
    house.scale.setScalar(scale); house.rotation.y = rot;
    const hy = terrain.heightAt(x, z);
    house.position.set(x, hy - 0.4, z);
    house.traverse((o) => { if (/^rotate-/.test(o.name)) spinners.push({ node: o, axis: o.name.endsWith('x') ? 'x' : 'z', speed: 0.8 }); });
    group.add(house);
    obstacles.push({ x, z, r: scale * 0.62 + 1.2 });
    if (chimney) chimneys.push(new THREE.Vector3(x, hy + chimney, z));
  }

  scene.add(group);

  let hoverId = null;
  const byId = (id) => items.find((i) => i.id === id);

  return {
    group, items, hitboxes, chimneys, obstacles, byId,
    setHover(id) { hoverId = id; },
    setNight() {},
    /** progress: { completed: Set<id>, nextId } */
    setProgress({ completed, nextId, freeRoam = false }) {
      for (const item of items) {
        item.state = completed.has(item.id) ? 'done' : item.id === nextId ? 'next' : item.isTutorial ? 'done' : freeRoam ? 'open' : 'asleep';
        item.flag.userData.target = completed.has(item.id) ? 1 : 0;
      }
    },
    celebrate(id) { const item = byId(id); if (item) item.celebrate = 1; },
    update(dt, t) {
      for (const s of spinners) s.node.rotation[s.axis] += dt * s.speed;
      const k = Math.min(1, dt * 3);
      for (const item of items) {
        const sleepTarget = item.state === 'asleep' ? 1 : 0;
        item.uSleep.value += (sleepTarget - item.uSleep.value) * Math.min(1, dt * 1.2);
        const isNext = item.state === 'next';
        const hoverTarget = hoverId === item.id ? 1 : 0;
        item.hover += (hoverTarget - item.hover) * k;
        item.root.position.y = item.baseY + item.hover * 0.35 + Math.sin(t * 2 + item.x) * 0.0;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
        const ringBase = isNext ? 0.55 + pulse * 0.35 : item.state === 'done' && !item.isTutorial ? 0.22 : 0;
        const ringTarget = ringBase + item.hover * 0.5 + item.celebrate;
        const columnTarget = (isNext ? 0.42 : 0) + item.celebrate * 0.8;
        const haloTarget = (isNext ? 0.25 + pulse * 0.12 : 0) + item.hover * 0.25 + SHARED.uNight.value * (item.state === 'done' ? 0.2 : 0);
        const ease = (value, target) => {
          const next = value + (target - value) * k;
          return target < 0.001 && next < 0.03 ? 0 : next; // fade all the way out, never linger
        };
        item.ring.material.opacity = ease(item.ring.material.opacity, ringTarget);
        item.ring.material.color.set(isNext ? '#ffcf70' : '#ffe2a0');
        item.ring.scale.setScalar(1 + (isNext ? pulse * 0.06 : 0) + item.celebrate * 0.4);
        item.column.material.uniforms.uAlpha.value = ease(item.column.material.uniforms.uAlpha.value, columnTarget);
        item.halo.material.opacity = ease(item.halo.material.opacity, haloTarget);
        item.celebrate = Math.max(0, item.celebrate - dt * 0.35);
        // Fully faded beacon parts are not drawn at all (cheaper, and no edge artefacts in snapshots).
        item.ring.visible = item.ring.material.opacity > 0;
        item.column.visible = item.column.material.uniforms.uAlpha.value > 0;
        item.halo.visible = item.halo.material.opacity > 0;
        const f = item.flag;
        f.userData.raise += (f.userData.target - f.userData.raise) * Math.min(1, dt * 1.4);
        f.scale.setScalar(Math.max(0.001, f.userData.raise));
        f.visible = f.userData.raise > 0.01;
      }
    }
  };
}
