// assets.js — loads the kit bundles and characters built by scripts/prepare-assets.mjs.
// A bundle's top-level nodes are named after the source model, so `model('town', 'tree')`
// returns a clone that shares geometry and materials with every other tree.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { weatherize } from '../world/materials.js';

const BASE = import.meta.env.BASE_URL + 'assets/';
const loader = new GLTFLoader();
const bundles = new Map();
const pending = new Map();

export const KITS = ['town', 'hex', 'kitchen', 'food'];

function loadGLTF(url, onProgress) {
  return new Promise((resolve, reject) => loader.load(url, resolve, onProgress, reject));
}

/** Loads the given kits; resolves when all are ready. onProgress(fraction 0..1). */
export async function loadKits(names = KITS, onProgress = () => {}) {
  const progress = new Map(names.map((n) => [n, 0]));
  const report = () => onProgress([...progress.values()].reduce((a, b) => a + b, 0) / names.length);
  await Promise.all(names.map(async (name) => {
    if (bundles.has(name)) { progress.set(name, 1); report(); return; }
    if (!pending.has(name)) {
      pending.set(name, loadGLTF(BASE + name + '.glb', (e) => { if (e.total) { progress.set(name, e.loaded / e.total); report(); } })
        .then((gltf) => { prepareBundle(name, gltf); bundles.set(name, gltf); return gltf; }));
    }
    await pending.get(name);
    progress.set(name, 1); report();
  }));
}

function prepareBundle(name, gltf) {
  const weathered = new Map();
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    // Outdoor kits get snow on roofs and a wet sheen in the rain; indoor/food kits stay clean.
    if (name === 'town' || name === 'hex') {
      if (!weathered.has(o.material)) {
        const m = o.material.clone();
        m.roughness = 0.85; m.metalness = 0;
        weathered.set(o.material, weatherize(m));
      }
      o.material = weathered.get(o.material);
    }
  });
  const index = new Map();
  for (const child of gltf.scene.children) index.set(child.name.startsWith('M__') ? child.name.slice(3) : child.name, child);
  gltf.userData.index = index;
}

export function has(kit, key) { return !!bundles.get(kit)?.userData.index.get(key); }

/** A positioned clone of a kit model (shares geometry/material). */
export function model(kit, key) {
  const source = bundles.get(kit)?.userData.index.get(key);
  if (!source) { console.warn(`Missing model ${kit}/${key}`); return new THREE.Group(); }
  const clone = source.clone(true);
  clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0); clone.scale.set(1, 1, 1);
  return clone;
}

/** Geometry + material + local matrix for each mesh in a model, for InstancedMesh use. */
export function meshParts(kit, key) {
  const source = bundles.get(kit)?.userData.index.get(key);
  if (!source) return [];
  const parts = [];
  source.updateMatrixWorld(true);
  const inverseRoot = new THREE.Matrix4().copy(source.matrixWorld).invert();
  source.traverse((o) => {
    if (!o.isMesh) return;
    parts.push({ geometry: o.geometry, material: o.material, matrix: new THREE.Matrix4().multiplyMatrices(inverseRoot, o.matrixWorld) });
  });
  return parts;
}

/** Parses a model id like "food/tomato" or "kitchen/crate_buns". */
export function modelFromId(id) {
  if (!id) return null;
  const [kit, key] = id.split('/');
  return has(kit, key) ? model(kit, key) : null;
}

const characterCache = new Map();
/** Loads a character GLB once; returns the gltf (use SkeletonUtils.clone for instances). */
export function loadCharacter(file) {
  if (!characterCache.has(file)) characterCache.set(file, loadGLTF(BASE + 'characters/' + file + '.glb'));
  return characterCache.get(file);
}
