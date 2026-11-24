// vegetation.js — forests, grass tufts, wildflowers and rocks.
// Trees and plants are InstancedMeshes; one shared wind uniform bends them all, and the
// weather patch lays snow on their tops. Placement avoids the trail, water, plinths and props.
import * as THREE from 'three';
import { meshParts, model } from '../core/assets.js';
import { windify, weatherize } from './materials.js';
import { mulberry32, noise2, smoothstep } from './noise.js';

const TREE_TYPES = ['tree', 'tree-high', 'tree-high-round', 'tree-crooked', 'tree-high-crooked'];

function placeable(terrain, obstacles, x, z, { trail = 2.8, water = 1.6, plinth = 3.5, maxH = 13, maxSlope = 2.4 } = {}) {
  const r = Math.hypot(x, z);
  if (r > 53) return null;
  const h = terrain.heightAt(x, z);
  if (h > maxH || h < 0.9) return null;
  const slope = Math.abs(terrain.heightAt(x + 0.8, z) - terrain.heightAt(x - 0.8, z)) + Math.abs(terrain.heightAt(x, z + 0.8) - terrain.heightAt(x, z - 0.8));
  if (slope > maxSlope) return null;
  const f = terrain.features;
  if (f.trailDistance(x, z) < trail) return null;
  if (f.waterDistance(x, z) < water) return null;
  if (f.plinthDistance(x, z) < plinth) return null;
  for (const o of obstacles) if ((o.x - x) ** 2 + (o.z - z) ** 2 < o.r * o.r) return null;
  return h;
}

function instanced(parts, material, count) {
  return parts.map((part) => {
    const mesh = new THREE.InstancedMesh(part.geometry, material, count);
    mesh.userData.partMatrix = part.matrix;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.count = 0;
    return mesh;
  });
}

export function createVegetation(scene, terrain, locations) {
  const group = new THREE.Group(); group.name = 'vegetation';
  const rand = mulberry32(2024);
  const obstacles = locations.obstacles || [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();

  // ------------------------------------------------------------ trees
  const MAX_TREES = 470;
  const treeMeshes = {};
  for (const type of TREE_TYPES) {
    const parts = meshParts('town', type);
    if (!parts.length) continue;
    const material = weatherize(windify(parts[0].material.clone(), { swayHeight: 2.6, amount: 0.11 }));
    treeMeshes[type] = instanced(parts, material, MAX_TREES);
    treeMeshes[type].forEach((mesh) => group.add(mesh));
  }
  let placed = 0;
  for (let attempt = 0; attempt < 14000 && placed < MAX_TREES; attempt++) {
    const x = (rand() * 2 - 1) * 54, z = (rand() * 2 - 1) * 54;
    const forest = noise2(x * 0.045 - 9, z * 0.045 + 13);
    const backWoods = smoothstep(-8, -30, z) * 0.35;
    const central = Math.hypot(x + 2, z - 12) < 26 ? 0.45 : 1;
    const chance = (forest > 0.12 ? 0.85 : forest + backWoods > 0.05 ? 0.25 : 0.035) * central;
    if (rand() > chance) continue;
    const h = placeable(terrain, obstacles, x, z);
    if (h === null) continue;
    const nearWater = terrain.features.waterDistance(x, z) < 5;
    let type;
    if (h > 8.5) type = rand() < 0.75 ? 'tree-high' : 'tree';
    else if (nearWater) type = rand() < 0.5 ? 'tree-crooked' : 'tree-high-crooked';
    else { const r = rand(); type = r < 0.38 ? 'tree' : r < 0.62 ? 'tree-high' : r < 0.85 ? 'tree-high-round' : 'tree-crooked'; }
    const meshes = treeMeshes[type];
    if (!meshes) continue;
    const scale = 1.1 + rand() * 0.65;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
    s.set(scale, scale * (0.9 + rand() * 0.25), scale);
    p.set(x, h - 0.12, z);
    m.compose(p, q, s);
    for (const mesh of meshes) {
      const local = new THREE.Matrix4().multiplyMatrices(m, mesh.userData.partMatrix);
      mesh.setMatrixAt(mesh.count++, local);
    }
    placed++;
  }
  for (const meshes of Object.values(treeMeshes)) for (const mesh of meshes) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }

  // ------------------------------------------------------------ grass tufts
  const tuft = (() => {
    const pos = [], col = [];
    const base = new THREE.Color('#3f8d50'), tip = new THREE.Color('#b4e08a');
    for (let b = 0; b < 3; b++) {
      const a = (b / 3) * Math.PI + 0.3;
      const cx = Math.cos(a) * 0.09, cz = Math.sin(a) * 0.09;
      const lean = 0.08 * (b - 1);
      pos.push(-cx, 0, -cz, cx, 0, cz, lean, 0.5 + b * 0.06, lean * 0.5);
      col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  })();
  const grassMat = weatherize(windify(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), { swayHeight: 0.5, amount: 0.28 }));
  const GRASS = 3200;
  const grass = new THREE.InstancedMesh(tuft, grassMat, GRASS);
  grass.receiveShadow = true;
  const tint = new THREE.Color();
  let g = 0;
  for (let attempt = 0; attempt < 16000 && g < GRASS; attempt++) {
    const x = (rand() * 2 - 1) * 54, z = (rand() * 2 - 1) * 54;
    const h = placeable(terrain, [], x, z, { trail: 1.6, water: 0.9, plinth: 3.2, maxH: 9, maxSlope: 1.6 });
    if (h === null) continue;
    const sc = 0.7 + rand() * 0.8;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
    m.compose(p.set(x, h - 0.03, z), q, s.set(sc, sc * (0.8 + rand() * 0.6), sc));
    grass.setMatrixAt(g, m);
    grass.setColorAt(g, tint.setHSL(0.27 + rand() * 0.06, 0.45, 0.62 + rand() * 0.14));
    g++;
  }
  grass.count = g;
  grass.instanceMatrix.needsUpdate = true;
  grass.computeBoundingSphere();
  group.add(grass);

  // ------------------------------------------------------------ wildflowers
  const head = new THREE.IcosahedronGeometry(0.11, 0);
  head.scale(1, 0.55, 1); head.translate(0, 0.32, 0);
  const stem = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 3); stem.translate(0, 0.16, 0);
  const flowerMat = windify(new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), { swayHeight: 0.35, amount: 0.3 });
  const stemMat = windify(new THREE.MeshStandardMaterial({ color: '#4c9a52', roughness: 0.9 }), { swayHeight: 0.35, amount: 0.3 });
  const FLOWERS = 900;
  const heads = new THREE.InstancedMesh(head, flowerMat, FLOWERS);
  const stems = new THREE.InstancedMesh(stem, stemMat, FLOWERS);
  const palette = ['#ffffff', '#ffd84a', '#ff8fab', '#c3a6ff', '#ff6b5b', '#ffb347', '#fff1a8'].map((c) => new THREE.Color(c));
  let fl = 0;
  const flowerSpots = [];
  for (let attempt = 0; attempt < 12000 && fl < FLOWERS; attempt++) {
    const x = (rand() * 2 - 1) * 52, z = (rand() * 2 - 1) * 52;
    const meadow = noise2(x * 0.05 + 11, z * 0.05 - 4);
    if (meadow < 0.15 && rand() > 0.12) continue;
    const h = placeable(terrain, [], x, z, { trail: 1.7, water: 1.2, plinth: 3.4, maxH: 8, maxSlope: 1.5 });
    if (h === null) continue;
    const sc = 0.8 + rand() * 0.7;
    m.compose(p.set(x, h - 0.02, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28), s.set(sc, sc, sc));
    heads.setMatrixAt(fl, m); stems.setMatrixAt(fl, m);
    const pick = Math.floor(Math.abs(meadow) * 13 + rand() * 2.5) % palette.length;
    heads.setColorAt(fl, palette[pick]);
    if (fl % 18 === 0) flowerSpots.push(new THREE.Vector3(x, h, z));
    fl++;
  }
  heads.count = stems.count = fl;
  heads.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = true;
  heads.computeBoundingSphere(); stems.computeBoundingSphere();
  group.add(heads, stems);

  // ------------------------------------------------------------ rocks
  for (let i = 0; i < 70; i++) {
    const x = (rand() * 2 - 1) * 54, z = (rand() * 2 - 1) * 54;
    const h = placeable(terrain, obstacles, x, z, { trail: 2.5, water: 0.4, plinth: 3.5, maxH: 22, maxSlope: 6 });
    if (h === null) continue;
    const onMountain = h > 7;
    if (!onMountain && rand() > 0.35) continue;
    const rock = model('town', ['rock-large', 'rock-small', 'rock-wide'][Math.floor(rand() * 3)]);
    rock.scale.setScalar(0.8 + rand() * (onMountain ? 1.6 : 0.8));
    rock.rotation.y = rand() * 6.28;
    rock.position.set(x, h - 0.15, z);
    group.add(rock);
  }

  scene.add(group);
  return { group, flowerSpots, update() {} };
}
