// trail.js — the mission trail: a dirt path on the terrain, a glowing "magic trail" that shows
// progress (gold up to the next mission, faint beyond), wooden bridges where the path crosses
// water, and lanterns that light up at night. Also answers "where is the walkable path at u?"
import * as THREE from 'three';
import { TRAIL_HALF_WIDTH, trailCurve, TRAIL_STOPS, LOCATIONS, trailUAt, trailStop } from './layout.js';
import { SHARED, weatherize } from './materials.js';
import { model } from '../core/assets.js';
import { glowTexture } from './sprites.js';

const N = 700;

export function createTrail(scene, terrain) {
  const group = new THREE.Group(); group.name = 'trail';
  const { heightAt, features } = terrain;
  const length = trailCurve.getLength();

  // Sample the curve once: centre, side normal, and whether the path is over water.
  const samples = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = trailCurve.getPointAt(u);
    const tan = trailCurve.getTangentAt(u);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    samples.push({ u, p, tan, side, wet: features.waterDistance(p.x, p.z) < 0.9 });
  }
  // Bridges: contiguous wet runs, padded so the deck lands on dry banks.
  const bridges = [];
  for (let i = 0; i <= N; i++) {
    if (!samples[i].wet) continue;
    let j = i; while (j < N && samples[j + 1].wet) j++;
    const a = Math.max(0, i - 9), b = Math.min(N, j + 9);
    const ha = heightAt(samples[a].p.x, samples[a].p.z), hb = heightAt(samples[b].p.x, samples[b].p.z);
    bridges.push({ a, b, base: Math.max(ha, hb) + 0.12 });
    i = j;
  }
  const bridgeAt = (i) => bridges.find((br) => i >= br.a && i <= br.b);
  function deckHeight(i) {
    const br = bridgeAt(i);
    if (!br) return null;
    const k = (i - br.a) / (br.b - br.a);
    return br.base + Math.sin(k * Math.PI) * 0.75;
  }
  /** Ground height for walkers at curve parameter u. */
  function walkHeight(u) {
    const i = Math.round(u * N);
    const deck = deckHeight(i);
    if (deck !== null) return deck + 0.08;
    const p = samples[i].p;
    return heightAt(p.x, p.z) + 0.06;
  }

  // ---------------------------------------------------------- dirt ribbon
  const pos = [], col = [], idx = [];
  const dirt = new THREE.Color('#dcae74'), edge = new THREE.Color('#c39261');
  let vi = 0;
  for (let i = 0; i <= N; i++) {
    const s = samples[i];
    const across = [-1, -0.55, 0, 0.55, 1];
    for (const k of across) {
      const x = s.p.x + s.side.x * k * TRAIL_HALF_WIDTH, z = s.p.z + s.side.z * k * TRAIL_HALF_WIDTH;
      pos.push(x, heightAt(x, z) + 0.07, z);
      const c = Math.abs(k) > 0.9 ? edge : dirt;
      const jitter = 0.95 + Math.random() * 0.08;
      col.push(c.r * jitter, c.g * jitter, c.b * jitter);
    }
    if (i < N && !bridgeAt(i) && !bridgeAt(i + 1)) {
      for (let k = 0; k < 4; k++) { const a = vi + k, b = a + 5; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    vi += 5;
  }
  const pathGeo = new THREE.BufferGeometry();
  pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  pathGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  pathGeo.setIndex(idx);
  pathGeo.computeVertexNormals();
  const path = new THREE.Mesh(pathGeo, weatherize(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  path.receiveShadow = true;
  group.add(path);

  // ---------------------------------------------------------- bridges
  const wood = weatherize(new THREE.MeshStandardMaterial({ color: '#a8734a', roughness: 0.85, flatShading: true }));
  const woodDark = weatherize(new THREE.MeshStandardMaterial({ color: '#7d5233', roughness: 0.9, flatShading: true }));
  for (const br of bridges) {
    const plankCount = Math.ceil((br.b - br.a) * (length / N) / 0.42);
    const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(TRAIL_HALF_WIDTH * 2.3, 0.14, 0.36), wood, plankCount);
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), woodDark, Math.ceil(plankCount / 3) * 2 + 2);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let postIndex = 0;
    const railPoints = [[], []];
    for (let k = 0; k < plankCount; k++) {
      const i = Math.round(br.a + (k / (plankCount - 1)) * (br.b - br.a));
      const s = samples[i];
      const y = deckHeight(i);
      e.set(0, Math.atan2(s.tan.x, s.tan.z), (Math.random() - 0.5) * 0.04);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(s.p.x, y, s.p.z), q, new THREE.Vector3(1, 1, 1));
      planks.setMatrixAt(k, m);
      if (k % 3 === 0 || k === plankCount - 1) {
        for (const sideSign of [-1, 1]) {
          const px = s.p.x + s.side.x * sideSign * TRAIL_HALF_WIDTH * 1.1, pz = s.p.z + s.side.z * sideSign * TRAIL_HALF_WIDTH * 1.1;
          m.compose(new THREE.Vector3(px, y + 0.4, pz), q, new THREE.Vector3(1, 1, 1));
          posts.setMatrixAt(postIndex++, m);
          railPoints[sideSign < 0 ? 0 : 1].push(new THREE.Vector3(px, y + 0.78, pz));
        }
      }
    }
    posts.count = postIndex;
    planks.castShadow = planks.receiveShadow = posts.castShadow = true;
    group.add(planks, posts);
    for (const pts of railPoints) {
      const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, 0.06, 5), woodDark);
      rail.castShadow = true; group.add(rail);
    }
  }

  // ---------------------------------------------------------- magic trail
  const mpos = [], mu = [], muv = [], midx = [];
  const W = 0.34;
  for (let i = 0; i <= N; i++) {
    const s = samples[i];
    const deck = deckHeight(i);
    for (const k of [-1, 1]) {
      const x = s.p.x + s.side.x * k * W, z = s.p.z + s.side.z * k * W;
      const y = (deck !== null ? deck + 0.1 : heightAt(x, z) + 0.14);
      mpos.push(x, y, z); mu.push(s.u); muv.push(s.u * length, (k + 1) / 2);
    }
    if (i < N) { const a = i * 2; midx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const magicGeo = new THREE.BufferGeometry();
  magicGeo.setAttribute('position', new THREE.Float32BufferAttribute(mpos, 3));
  magicGeo.setAttribute('aU', new THREE.Float32BufferAttribute(mu, 1));
  magicGeo.setAttribute('uv', new THREE.Float32BufferAttribute(muv, 2));
  magicGeo.setIndex(midx);
  const magicUniforms = { uTime: SHARED.uTime, uNight: SHARED.uNight, uDone: { value: 0 }, uNext: { value: 0.1 }, uReveal: { value: 0 } };
  const magic = new THREE.Mesh(magicGeo, new THREE.ShaderMaterial({
    uniforms: magicUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aU; varying float vU; varying vec2 vUv;
      void main(){ vU = aU; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uNight; uniform float uDone; uniform float uNext; uniform float uReveal;
      varying float vU; varying vec2 vUv;
      void main(){
        float onRoute = step(vU, uNext);
        float speed = mix(0.25, 0.9, onRoute * step(uDone, vU));
        float d = fract(vUv.x / 1.5 - uTime * speed);
        float dotShape = 1.0 - length(vec2((d - 0.5) * 2.4, (vUv.y - 0.5) * 2.0));
        float a = smoothstep(0.0, 0.35, dotShape);
        vec3 done = vec3(1.0, 0.78, 0.36);
        vec3 ahead = vec3(1.0, 0.62, 0.3);
        vec3 later = vec3(0.72, 0.66, 1.0);
        vec3 col = vU <= uDone ? done : (onRoute > 0.5 ? ahead : later);
        float strength = vU <= uDone ? 0.55 : (onRoute > 0.5 ? 0.85 + 0.25 * sin(uTime * 4.0 - vU * 60.0) : 0.16);
        float reveal = smoothstep(uReveal - 0.02, uReveal, vU);
        strength *= mix(0.75, 1.5, uNight) * (1.0 - reveal * 0.0);
        gl_FragColor = vec4(col * a * strength, 1.0);
      }`
  }));
  magic.renderOrder = 2;
  group.add(magic);

  // ---------------------------------------------------------- lanterns
  const lanternGlows = [];
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffc46b', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const spacing = 13;
  const count = Math.floor(length / spacing);
  for (let k = 1; k < count; k++) {
    const u = k / count;
    const i = Math.round(u * N);
    if (bridgeAt(i) || bridgeAt(i + 6) || bridgeAt(i - 6)) continue;
    const s = samples[i];
    const sideSign = k % 2 ? 1 : -1;
    const x = s.p.x + s.side.x * sideSign * (TRAIL_HALF_WIDTH + 0.65), z = s.p.z + s.side.z * sideSign * (TRAIL_HALF_WIDTH + 0.65);
    if (features.plinthDistance(x, z) < 1.2) continue;
    const lantern = model('town', 'lantern');
    lantern.scale.setScalar(0.85);
    lantern.position.set(x, heightAt(x, z) - 0.02, z);
    group.add(lantern);
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(2.2);
    glow.position.set(x, heightAt(x, z) + 1.12, z);
    group.add(glow);
    lanternGlows.push(glow);
  }

  scene.add(group);

  const stopU = Object.fromEntries(LOCATIONS.map((l) => [l.id, trailUAt(trailStop(l.id).x, trailStop(l.id).z)]));
  const target = { done: 0, next: stopU.market };

  return {
    group, samples, bridges, stopU, length, walkHeight,
    /** Position on the walkable trail at u, with a sideways offset (for passing villagers). */
    walkPoint(u, offset = 0, out = new THREE.Vector3()) {
      const i = Math.min(N, Math.max(0, Math.round(u * N)));
      const s = samples[i];
      out.set(s.p.x + s.side.x * offset, 0, s.p.z + s.side.z * offset);
      out.y = walkHeight(u);
      return out;
    },
    tangentAt(u) { return samples[Math.min(N, Math.max(0, Math.round(u * N)))].tan; },
    /** progress: { lastDoneId, nextId } */
    setProgress({ lastDoneId, nextId }) {
      target.done = lastDoneId ? stopU[lastDoneId] : stopU.gate;
      target.next = nextId ? stopU[nextId] : 1;
    },
    update(dt) {
      const k = Math.min(1, dt * 1.5);
      magicUniforms.uDone.value += (target.done - magicUniforms.uDone.value) * k;
      magicUniforms.uNext.value += (target.next - magicUniforms.uNext.value) * k;
      glowMat.opacity = SHARED.uNight.value * 0.9;
    }
  };
}
