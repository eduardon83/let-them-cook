// studio.js — renders print illustrations from the same 3D models the website uses.
// Food/kitchen items, character portraits and mission scenes become transparent PNG data URLs
// (cached), so every printed card matches the valley the teacher explored.
import * as THREE from 'three';
import { modelFromId } from './assets.js';
import { createCharacter } from './characters.js';
import { buildMissionSet } from '../stage/sets.js';

let renderer = null;
const cache = new Map();

function getRenderer() {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(1);
  return renderer;
}

function studioLights(scene) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9b79a', 1.5));
  const key = new THREE.DirectionalLight('#fff3e2', 2.6); key.position.set(-3, 6, 5);
  const fill = new THREE.DirectionalLight('#dfe9ff', 0.8); fill.position.set(5, 2, 3);
  const rim = new THREE.DirectionalLight('#ffffff', 1.4); rim.position.set(2, 4, -6);
  scene.add(key, fill, rim);
}

/** Frames an object so its bounding sphere fills `fill` of the image. */
function frame(camera, object, { elevation = 0.5, azimuth = -0.6, fill = 0.82 } = {}) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / fill;
  const dir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
  camera.position.copy(sphere.center).addScaledVector(dir, dist);
  camera.near = dist / 20; camera.far = dist * 4; camera.updateProjectionMatrix();
  camera.lookAt(sphere.center);
}

function shoot(scene, camera, w, h, type = 'image/png') {
  const r = getRenderer();
  r.setSize(w, h, false);
  r.setClearColor(0x000000, 0);
  r.render(scene, camera);
  return r.domElement.toDataURL(type, 0.92);
}

/** A food or kitchen model ("food/tomato") as a transparent PNG; null if no model. */
export async function foodImage(id, size = 420) {
  if (!id) return null;
  const key = `food:${id}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const object = modelFromId(id);
  if (!object) return null;
  const scene = new THREE.Scene(); studioLights(scene);
  scene.add(object);
  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 100);
  frame(camera, object, { elevation: 0.55, azimuth: -0.65, fill: 0.86 });
  const url = shoot(scene, camera, size, size);
  cache.set(key, url);
  return url;
}

/** A cast member (or villager look) in a pose: crop "bust" or "full". */
export async function portrait(castId, { pose = 'Wave', at = 0.35, crop = 'bust', size = 520 } = {}) {
  const key = `portrait:${castId}:${pose}:${at}:${crop}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const c = await createCharacter(castId, { height: 1.8 });
  c.pose(pose, at);
  c.root.updateMatrixWorld(true);
  const scene = new THREE.Scene(); studioLights(scene);
  scene.add(c.root);
  const camera = new THREE.PerspectiveCamera(22, crop === 'full' ? 0.62 : 0.85, 0.05, 50);
  if (crop === 'full') { camera.position.set(-0.95, 1.15, 5.2); camera.lookAt(0, 0.93, 0); }
  else { camera.position.set(-0.55, 1.62, 3.0); camera.lookAt(0, 1.38, 0); }
  const url = shoot(scene, camera, crop === 'full' ? Math.round(size * 0.62) : Math.round(size * 0.85), size);
  cache.set(key, url);
  return url;
}

/** The mission host in their set (for document covers). */
export async function missionScene(lesson, { width = 1200, height = 760 } = {}) {
  const key = `scene:${lesson.id}:${width}`;
  if (cache.has(key)) return cache.get(key);
  const set = await buildMissionSet(lesson);
  set.host.pose('Wave', 0.3);
  const scene = new THREE.Scene();
  scene.background = set.background;
  scene.add(set.group);
  set.group.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
  // Host sits in the right half so a title card can overlap the left.
  camera.position.set(-1.0, 2.9, 9.4); camera.lookAt(-1.7, 1.35, 0);
  const url = shoot(scene, camera, width, height, 'image/jpeg');
  cache.set(key, url);
  return url;
}

export function cached(key) { return cache.get(key); }
