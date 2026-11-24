// characters.js — the cast of Let'em Cook! built from the Quaternius modular characters.
// Outfits are recoloured per instance (material name → colour), skin tones are varied on
// purpose (the people in this valley come from everywhere), and simple modelled hats are
// attached to the Head bone so they follow every animation.
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { loadCharacter } from './assets.js';

export const SKIN = ['#f3cfb0', '#e3b48e', '#c99467', '#a36d45', '#7a4b2c', '#55331f'];
const WHITE = '#f6f3ea', CHARCOAL = '#2d2f36';

/** Cast ids are referenced by lessons.json (host.cast, role.cast). */
export const CAST = {
  olivia: { name: 'Chef Olívia', file: 'w-casual', skin: SKIN[1], hat: 'toque', scarf: '#e4572e',
    colors: { White: WHITE, Grey: CHARCOAL, Orange: '#3b2f2a', Hair_Blond: '#3a2418', Hair_Brown: '#2a1b12' } },
  luka: { name: 'Luka', file: 'm-casual', skin: SKIN[0], hat: 'toque', scarf: '#3b8fc4',
    colors: { LightBrown: WHITE, Red_Dark: '#3a3a40', White: '#f2efe6', LightBlue: CHARCOAL, Hair: '#b8864d' } },
  yusuf: { name: 'Chef Yusuf', file: 'm-suit', skin: SKIN[4], hat: 'tall-toque', scarf: '#e0b13a',
    colors: { Suit: WHITE, Tie: '#e0b13a', White: '#efe9dc', Black: CHARCOAL, Grey: '#3a3a40', DarkBrown: '#2a2420', Hair: '#1b1410' } },
  tomas: { name: 'Tomás', file: 'm-farmer', skin: SKIN[2], hat: null,
    colors: { LightBlue: '#3f6d8f', Beige: '#e7d3a8', Red: '#c0392b' } },
  lena: { name: 'Lena', file: 'w-worker', skin: SKIN[0], hat: 'cap', capColor: '#3f8f5b',
    colors: { Worker_Yellow: '#3f8f5b', Worker_Vest: '#7aa95c', White: '#f2efe6', Black: '#3b3a37', DarkBrown: '#8a5a32' } },
  noor: { name: 'Noor', file: 'w-suit', skin: SKIN[3], hat: null, scarf: '#d64f8b',
    colors: { Black: '#22262e', White: WHITE, Hair_Blond: '#1d1410', Hair_Brown: '#1d1410' } },
  amara: { name: 'Amara', file: 'w-adventurer', skin: SKIN[5], hat: 'wrap', capColor: '#f2a33a',
    colors: { LightGreen: '#e4572e', Green: '#b33e23', Gold: '#f2c14e', White: WHITE, Brown_02: '#5a3d2b', Hair_Brown: '#1a120d' } },
  petra: { name: 'Petra', file: 'w-formal', skin: SKIN[1], hat: 'beret', capColor: '#6b4fa0',
    colors: { LimeGreen: '#6b4fa0', Red: '#3b2a4a', Gold: '#e0b13a', Brown: '#4a2e1f' } },
  guest: { name: 'Guest', file: 'm-hoodie', skin: SKIN[3], hat: null,
    colors: { Purple: '#3b8fc4', White: '#f2efe6', Hair: '#1d1410' } }
};

/** Villager looks for the valley (outfit swaps on the same base files). */
export const VILLAGERS = [
  { file: 'w-casual', skin: SKIN[4], colors: { White: '#f2a33a', Grey: '#3d4a6b', Hair_Blond: '#1c120c', Hair_Brown: '#1c120c' } },
  { file: 'm-hoodie', skin: SKIN[1], colors: { Purple: '#3f8f5b' } },
  { file: 'm-beach', skin: SKIN[2], colors: {} },
  { file: 'w-medieval', skin: SKIN[0], colors: {} },
  { file: 'm-worker', skin: SKIN[5], colors: {} },
  { file: 'w-formal', skin: SKIN[3], colors: { LimeGreen: '#3b8fc4' } },
  { file: 'm-casual', skin: SKIN[0], colors: { Red_Dark: '#6b4fa0' } },
  { file: 'w-adventurer', skin: SKIN[2], colors: {} },
  { file: 'm-farmer', skin: SKIN[4], colors: { LightBlue: '#7a3b2e' } },
  { file: 'w-worker', skin: SKIN[1], colors: {} },
  { file: 'm-suit', skin: SKIN[2], colors: { Suit: '#4a5a7a' } },
  { file: 'w-suit', skin: SKIN[5], colors: { Black: '#7a2e3b', Hair_Blond: '#1d1410', Hair_Brown: '#1d1410' } }
];

const hatMaterials = new Map();
function hatMaterial(color) {
  if (!hatMaterials.has(color)) hatMaterials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true }));
  return hatMaterials.get(color);
}

function buildHat(kind, color) {
  const g = new THREE.Group();
  if (kind === 'toque' || kind === 'tall-toque') {
    const tall = kind === 'tall-toque' ? 1.45 : 1;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.13 * tall, 12), hatMaterial(WHITE));
    band.position.y = 0.065 * tall;
    g.add(band);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), hatMaterial(WHITE));
      puff.position.set(Math.cos(a) * 0.08, 0.15 * tall + 0.04, Math.sin(a) * 0.08);
      g.add(puff);
    }
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), hatMaterial(WHITE));
    top.position.y = 0.2 * tall + 0.05; g.add(top);
  } else if (kind === 'beret') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hatMaterial(color));
    b.scale.set(1, 0.42, 1); b.rotation.z = 0.25; b.position.y = 0.0;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 4), hatMaterial(color));
    stalk.position.y = 0.08; g.add(b, stalk);
  } else if (kind === 'cap') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hatMaterial(color));
    dome.scale.set(1, 0.6, 1);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 12, 1, false, -Math.PI / 2, Math.PI), hatMaterial(color));
    brim.position.set(0, 0.0, 0.12); brim.scale.set(1, 1, 0.9);
    g.add(dome, brim);
  } else if (kind === 'wrap') {
    const wrap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), hatMaterial(color));
    wrap.scale.set(1.05, 0.75, 1.1); wrap.position.y = 0.04;
    const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), hatMaterial('#e4572e'));
    knot.position.set(0.05, 0.13, 0.1); g.add(wrap, knot);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

/**
 * Creates an animated character instance.
 * @param {string|object} spec cast id or a look {file, skin, colors, hat, scarf, capColor}
 * @param {{height?: number}} options final standing height in world units
 */
export async function createCharacter(spec, { height = 1.8 } = {}) {
  const look = typeof spec === 'string' ? CAST[spec] : spec;
  const gltf = await loadCharacter(look.file);
  const body = cloneSkinned(gltf.scene);
  body.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const m = o.material.clone();
    if (m.name === 'Skin' || m.name === 'Skin_Darker') m.color.set(look.skin).multiplyScalar(m.name === 'Skin_Darker' ? 0.9 : 1);
    else if (look.colors?.[m.name]) m.color.set(look.colors[m.name]);
    m.roughness = 0.75; m.metalness = 0;
    o.material = m;
  });

  const root = new THREE.Group();
  root.add(body);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body);
  const rawHeight = box.max.y - box.min.y;

  const head = body.getObjectByName('Head');
  if (head && (look.hat || look.scarf)) {
    const headPos = new THREE.Vector3(); head.getWorldPosition(headPos);
    if (look.hat) {
      const hat = buildHat(look.hat, look.capColor || WHITE);
      const s = rawHeight / 1.84;
      hat.scale.setScalar(s);
      hat.position.set(headPos.x, box.max.y - 0.1 * s, headPos.z + 0.01 * s);
      root.add(hat); root.updateMatrixWorld(true);
      head.attach(hat);
    }
    if (look.scarf) {
      const neck = body.getObjectByName('Neck') || head;
      const neckPos = new THREE.Vector3(); neck.getWorldPosition(neckPos);
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.04, 6, 12), hatMaterial(look.scarf));
      const s = rawHeight / 1.84;
      scarf.scale.set(s, s, s * 0.8); scarf.rotation.x = Math.PI / 2;
      scarf.position.set(neckPos.x, neckPos.y - 0.02 * s, neckPos.z + 0.015 * s);
      root.add(scarf); root.updateMatrixWorld(true);
      neck.attach(scarf);
    }
  }
  root.scale.setScalar(height / rawHeight);

  const mixer = new THREE.AnimationMixer(body);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  let current = null;

  const api = {
    root, body, mixer, actions, look, name: look.name,
    /** Cross-fades to an animation; loops unless once=true (then returns to `then`). */
    play(name, { fade = 0.35, once = false, then = 'Idle', timeScale = 1 } = {}) {
      const next = actions[name] || actions.Idle;
      if (!next) return;
      if (current === next && !once) { next.timeScale = timeScale; return; }
      next.reset();
      next.timeScale = timeScale;
      next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      if (current) next.crossFadeFrom(current, fade, false);
      next.play();
      current = next;
      if (once) {
        const onDone = (e) => {
          if (e.action !== next) return;
          mixer.removeEventListener('finished', onDone);
          if (current === next) api.play(then, { fade: 0.4 });
        };
        mixer.addEventListener('finished', onDone);
      }
    },
    get current() { return current?.getClip().name; },
    update(dt) { mixer.update(dt); },
    /** Freezes a pose at a fraction of an animation (for printed portraits). */
    pose(name, fraction = 0.5) {
      const action = actions[name] || actions.Idle;
      mixer.stopAllAction();
      action.reset().play();
      mixer.setTime(action.getClip().duration * fraction);
      current = action;
    }
  };
  api.play('Idle', { fade: 0 });
  return api;
}
