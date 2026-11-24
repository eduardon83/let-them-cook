// life.js — everything that makes the valley feel inhabited.
// Chimney smoke, waterfall mist, birds, butterflies, fireflies, villagers on the trail, a boat on
// the lake, a fish that jumps now and then, sparkles over the next mission and soft fireworks
// when a mission is cooked. Butterflies shelter in bad weather; villagers hurry in the rain.
import * as THREE from 'three';
import { SHARED } from './materials.js';
import { mulberry32, noise2 } from './noise.js';
import { puffTexture, glowTexture, sparkleTexture } from './sprites.js';
import { LAKE, LOCATIONS } from './layout.js';
import { model } from '../core/assets.js';
import { createCharacter, VILLAGERS } from '../core/characters.js';

// ------------------------------------------------------------ particle system
const PARTICLE_VERTEX = `
  attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
  uniform float uScale;
  varying float vAlpha; varying vec3 vColor;
  #include <fog_pars_vertex>
  void main(){
    vAlpha = aAlpha; vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(1.0, -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const PARTICLE_FRAGMENT = `
  uniform sampler2D uMap; varying float vAlpha; varying vec3 vColor;
  #include <fog_pars_fragment>
  void main(){
    vec4 tex = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(vColor, tex.a * vAlpha);
    if (gl_FragColor.a < 0.01) discard;
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

const particleScale = { value: 600 };

/** A pool of camera-facing particles; spawn(fn) fills one slot, step(fn) updates each live one. */
function createParticles(capacity, { map = puffTexture(), additive = false, fog = true } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(capacity * 3), size = new Float32Array(capacity), alpha = new Float32Array(capacity), color = new Float32Array(capacity * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: map } }]),
    vertexShader: PARTICLE_VERTEX, fragmentShader: PARTICLE_FRAGMENT,
    transparent: true, depthWrite: false, fog, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
  });
  mat.uniforms.uScale = particleScale;
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const live = Array.from({ length: capacity }, () => ({ age: 0, life: 0, vel: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color(), size: 1, seed: Math.random() }));
  let cursor = 0;
  return {
    points,
    spawn(init) {
      const slot = live[cursor]; cursor = (cursor + 1) % capacity;
      slot.age = 0; init(slot);
    },
    step(dt, fn) {
      for (let i = 0; i < capacity; i++) {
        const s = live[i];
        if (s.age >= s.life) { alpha[i] = 0; continue; }
        s.age += dt;
        const k = s.age / s.life;
        const out = fn(s, k, dt);
        pos[i * 3] = s.p.x; pos[i * 3 + 1] = s.p.y; pos[i * 3 + 2] = s.p.z;
        size[i] = out.size; alpha[i] = out.alpha;
        color[i * 3] = s.c.r; color[i * 3 + 1] = s.c.g; color[i * 3 + 2] = s.c.b;
      }
      geo.attributes.position.needsUpdate = geo.attributes.aSize.needsUpdate = geo.attributes.aAlpha.needsUpdate = geo.attributes.aColor.needsUpdate = true;
    }
  };
}

// ------------------------------------------------------------ creatures
function birdMesh(color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
  const bird = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 4), mat);
  body.rotation.x = Math.PI / 2;
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.2, 0, 0, -0.25, 1.0, 0, -0.05], 3));
  wingGeo.computeVertexNormals();
  const left = new THREE.Mesh(wingGeo, mat), right = new THREE.Mesh(wingGeo, mat);
  right.scale.x = -1;
  bird.add(body, left, right);
  bird.userData.wings = [left, right];
  return bird;
}

function butterflyMesh(color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.15 });
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.bezierCurveTo(0.25, 0.25, 0.42, 0.12, 0.36, -0.05); shape.bezierCurveTo(0.3, -0.25, 0.1, -0.18, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 6);
  geo.rotateX(-Math.PI / 2);
  const g = new THREE.Group();
  const left = new THREE.Mesh(geo, mat), right = new THREE.Mesh(geo, mat);
  right.scale.x = -1;
  g.add(left, right);
  g.userData.wings = [left, right];
  return g;
}

export function createLife(scene, terrain, trail, locations, water, weather) {
  const group = new THREE.Group(); group.name = 'life';
  scene.add(group);
  const rand = mulberry32(5150);

  // Smoke from chimneys.
  const smoke = createParticles(locations.chimneys.length * 28);
  group.add(smoke.points);
  const smokeTimers = locations.chimneys.map(() => rand());
  // Mist at waterfalls.
  const mist = createParticles(140);
  group.add(mist.points);
  // Sparkles (beacon, celebrations) and fireworks.
  const sparkles = createParticles(260, { map: sparkleTexture(), additive: true });
  group.add(sparkles.points);
  const fireworks = createParticles(700, { map: glowTexture(), additive: true });
  group.add(fireworks.points);
  // Fireflies.
  const fireflies = createParticles(160, { map: glowTexture(), additive: true });
  group.add(fireflies.points);
  const fireflyHomes = [];
  for (let i = 0; i < 160; i++) {
    const a = rand() * Math.PI * 2, r = 8 + rand() * 40;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = terrain.heightAt(x, z);
    if (h > 10) continue;
    fireflyHomes.push(new THREE.Vector3(x, h + 0.6 + rand() * 1.4, z));
  }

  // Birds: two flocks on looping paths over the valley.
  const birds = [];
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 7; i++) {
      const bird = birdMesh(f ? '#f1eee8' : '#e4e0ec');
      bird.scale.setScalar(0.9 + rand() * 0.3);
      group.add(bird);
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      birds.push({ mesh: bird, flock: f, offset: new THREE.Vector3(side * row * 1.6, (rand() - 0.5) * 0.8, -row * 1.8), phase: rand() * 6.28, prev: new THREE.Vector3() });
    }
  }
  const flockPos = (f, t, out) => {
    const w = f ? 0.045 : 0.038;
    const R = f ? 44 : 36;
    return out.set(Math.cos(t * w + f * 2) * R, 27 + f * 6 + Math.sin(t * 0.3 + f) * 2.5, Math.sin(t * w * 2 + f) * R * 0.55 - 4);
  };

  // Butterflies around flowers and gardens.
  const butterflyColors = ['#ff9f43', '#ffd84a', '#ffffff', '#74b9ff', '#ff7eb6', '#c3a6ff'];
  const butterflies = [];
  const homes = (locations.flowerSpots || []).length ? locations.flowerSpots : LOCATIONS.map((l) => new THREE.Vector3(l.x + 4, terrain.heightAt(l.x + 4, l.z + 3), l.z + 3));
  for (let i = 0; i < 30; i++) {
    const b = butterflyMesh(butterflyColors[i % butterflyColors.length]);
    b.scale.setScalar(0.55);
    group.add(b);
    const home = homes[Math.floor(rand() * homes.length)].clone();
    butterflies.push({ mesh: b, home, seed: rand() * 100, pos: home.clone().add(new THREE.Vector3(0, 1, 0)), show: 1 });
  }

  // Boat on the lake and a fish that jumps.
  const boat = model('hex', 'unit-ship');
  boat.scale.setScalar(3.4);
  group.add(boat);
  const fish = model('food', 'fish');
  fish.scale.setScalar(2.2); fish.visible = false;
  group.add(fish);
  const fishState = { t: 0, next: 8, from: new THREE.Vector3(), to: new THREE.Vector3() };

  // Villagers walk between mission stops; some work at a stall.
  const walkers = [];
  const stopU = trail.stopU;
  const routes = [
    ['gate', 'market'], ['market', 'pantry'], ['pantry', 'school'], ['school', 'bakery'], ['bakery', 'cafe'],
    ['cafe', 'festival'], ['festival', 'tower'], ['tower', 'grand'], ['gate', 'bakery'], ['market', 'school'], ['cafe', 'tower'], ['festival', 'gate']
  ];
  const workers = [
    { at: 'market', dx: -4.3, dz: 2.6, face: 0.5 }, { at: 'market', dx: 4.1, dz: 2.6, face: -0.6 },
    { at: 'bakery', dx: 3.6, dz: 1.9, face: -1.2 }, { at: 'cafe', dx: -4.0, dz: 3.4, face: 2.5 },
    { at: 'festival', dx: -3.6, dz: -2.6, face: 0.9 }, { at: 'gate', dx: 2.6, dz: 3.6, face: 0.4 }
  ];
  const villagersReady = (async () => {
    let n = 0;
    for (const [a, b] of routes) {
      const look = VILLAGERS[n++ % VILLAGERS.length];
      const c = await createCharacter(look, { height: 1.05 });
      group.add(c.root);
      const ua = stopU[a], ub = stopU[b];
      walkers.push({ c, ua: Math.min(ua, ub), ub: Math.max(ua, ub), u: Math.min(ua, ub) + rand() * Math.abs(ub - ua), dir: rand() < 0.5 ? 1 : -1, wait: 0, side: 0.45 + rand() * 0.25 });
      c.play('Walk');
      c.mixer.setTime(rand() * 2);
    }
    for (const w of workers) {
      const look = VILLAGERS[n++ % VILLAGERS.length];
      const c = await createCharacter(look, { height: 1.05 });
      const loc = locations.byId(w.at);
      const x = loc.x + w.dx, z = loc.z + w.dz;
      c.root.position.set(x, terrain.heightAt(x, z), z);
      c.root.rotation.y = w.face;
      group.add(c.root);
      c.play(rand() < 0.6 ? 'Interact' : 'Idle_Neutral');
      c.mixer.setTime(rand() * 3);
      walkers.push({ c, worker: true });
    }
  })();

  let night = false;
  const nextBeacon = { point: null };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  return {
    ready: villagersReady,
    setNight(on) { night = on; },
    setProgress({ nextId }) { nextBeacon.point = nextId ? locations.byId(nextId)?.focusPoint : null; },
    fireworks(point) {
      if (!point) return;
      const colors = ['#ffd27a', '#ff8fab', '#8fd3ff', '#b8f28a', '#ffb36b'];
      for (let burst = 0; burst < 5; burst++) {
        const center = point.clone().add(new THREE.Vector3((Math.random() - 0.5) * 9, 6 + Math.random() * 4, (Math.random() - 0.5) * 9));
        const color = new THREE.Color(colors[burst % colors.length]);
        const delay = burst * 0.35;
        for (let i = 0; i < 90; i++) {
          fireworks.spawn((s) => {
            s.life = 2.2 + Math.random() * 0.8; s.age = -delay;
            s.p.copy(center); s.c.copy(color);
            s.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(5 + Math.random() * 3);
            s.size = 0.9;
          });
        }
      }
    },
    update(dt, t, camera, calm) {
      particleScale.value = (window.innerHeight * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const wind = SHARED.uWindDir.value, windStrength = SHARED.uWind.value;
      const storm = weather.current !== 'clear';

      // Smoke: puffs rise, swell, lean with the wind and fade.
      locations.chimneys.forEach((c, i) => {
        smokeTimers[i] -= dt;
        if (smokeTimers[i] <= 0) {
          smokeTimers[i] = 0.32 + Math.random() * 0.2;
          smoke.spawn((s) => { s.life = 5 + Math.random() * 2; s.p.copy(c); s.vel.set((Math.random() - 0.5) * 0.2, 0.9 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2); s.c.set(night ? '#8d93a8' : '#efe9e0'); });
        }
      });
      smoke.step(dt, (s, k) => {
        s.p.addScaledVector(s.vel, dt);
        s.p.x += wind.x * windStrength * 0.55 * k * dt * 2; s.p.z += wind.y * windStrength * 0.55 * k * dt * 2;
        return { size: 0.7 + k * 2.6, alpha: Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.55 * (1 - k * 0.5) };
      });

      // Mist at the bottom of each waterfall.
      if (Math.random() < dt * 22) {
        const p = water.mistPoints[Math.floor(Math.random() * water.mistPoints.length)];
        mist.spawn((s) => { s.life = 2.4; s.p.copy(p).add(tmp.set((Math.random() - 0.5) * 2.5, 0, (Math.random() - 0.5) * 2.5)); s.vel.set((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6); s.c.set('#f4fbff'); });
      }
      mist.step(dt, (s, k) => { s.p.addScaledVector(s.vel, dt); return { size: 1.2 + k * 2.2, alpha: (1 - k) * 0.45 }; });

      // Beacon sparkles rising over the next mission.
      if (nextBeacon.point && Math.random() < dt * 14) {
        const p = nextBeacon.point;
        sparkles.spawn((s) => {
          const a = Math.random() * 6.28, r = 2.5 + Math.random() * 2.2;
          s.life = 2.6; s.p.set(p.x + Math.cos(a) * r, p.y - 1 + Math.random(), p.z + Math.sin(a) * r);
          s.vel.set(0, 1.6 + Math.random(), 0); s.c.set(Math.random() < 0.7 ? '#ffd27a' : '#fff4d6'); s.seed = a;
        });
      }
      sparkles.step(dt, (s, k) => {
        s.p.addScaledVector(s.vel, dt);
        s.p.x += Math.cos(t * 2 + s.seed) * dt * 0.6; s.p.z += Math.sin(t * 2 + s.seed) * dt * 0.6;
        return { size: 0.55 * (1 - k * 0.4), alpha: Math.sin(k * Math.PI) * 0.95 };
      });
      fireworks.step(dt, (s, k) => {
        if (s.age < 0) return { size: 0, alpha: 0 };
        s.vel.multiplyScalar(1 - dt * 1.1); s.vel.y -= dt * 2.2;
        s.p.addScaledVector(s.vel, dt);
        return { size: s.size * (1 - k * 0.5), alpha: (1 - k) * (1 - k) };
      });

      // Fireflies at night: drifting, slowly pulsing (never strobing).
      if (night && Math.random() < dt * 30) {
        const home = fireflyHomes[Math.floor(Math.random() * fireflyHomes.length)];
        fireflies.spawn((s) => { s.life = 4 + Math.random() * 3; s.p.copy(home).add(tmp.set((Math.random() - 0.5) * 3, Math.random(), (Math.random() - 0.5) * 3)); s.seed = Math.random() * 6.28; s.c.set('#d8ff8a'); });
      }
      fireflies.step(dt, (s, k) => {
        s.p.x += Math.sin(t * 0.8 + s.seed) * dt * 0.4; s.p.y += Math.cos(t * 0.6 + s.seed) * dt * 0.2; s.p.z += Math.cos(t * 0.7 + s.seed * 2) * dt * 0.4;
        return { size: 0.45, alpha: Math.sin(k * Math.PI) * (0.55 + 0.45 * Math.sin(t * 1.6 + s.seed)) };
      });

      // Birds: flap, glide, bank into turns; they roost at night.
      const birdShow = night ? 0 : 1;
      for (const b of birds) {
        flockPos(b.flock, t, tmp);
        flockPos(b.flock, t + 0.1, tmp2);
        const forward = tmp2.clone().sub(tmp).normalize();
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        const target = tmp.clone().addScaledVector(right, b.offset.x).addScaledVector(forward, b.offset.z);
        target.y += b.offset.y + Math.sin(t * 1.3 + b.phase) * 0.4;
        b.mesh.position.copy(target);
        b.mesh.lookAt(target.clone().add(forward));
        const glide = noise2(t * 0.3, b.phase) > 0.3 ? 0.15 : 1;
        const flap = Math.sin(t * 11 + b.phase) * 0.75 * glide;
        b.mesh.userData.wings[0].rotation.z = flap; b.mesh.userData.wings[1].rotation.z = -flap;
        b.mesh.scale.setScalar(THREE.MathUtils.lerp(b.mesh.scale.x, birdShow ? 1 : 0.001, Math.min(1, dt)));
        b.mesh.visible = b.mesh.scale.x > 0.01;
      }

      // Butterflies: wander near their flowers; hide in rain, snow and at night.
      const butterflyShow = !night && !storm;
      for (const b of butterflies) {
        b.show += ((butterflyShow ? 1 : 0) - b.show) * Math.min(1, dt * 0.8);
        b.mesh.visible = b.show > 0.02;
        if (!b.mesh.visible) continue;
        const nx = noise2(t * 0.25, b.seed), nz = noise2(b.seed, t * 0.25), ny = noise2(t * 0.4 + b.seed, 3);
        b.pos.set(b.home.x + nx * 3.5, b.home.y + 0.7 + (ny * 0.5 + 0.5) * 1.4, b.home.z + nz * 3.5);
        const prev = b.mesh.position.clone();
        b.mesh.position.copy(b.pos);
        const dx = b.pos.x - prev.x, dz = b.pos.z - prev.z;
        if (dx * dx + dz * dz > 1e-6) b.mesh.rotation.y = Math.atan2(dx, dz);
        const flap = Math.sin(t * 16 + b.seed) * 1.1;
        b.mesh.userData.wings[0].rotation.z = flap; b.mesh.userData.wings[1].rotation.z = -flap;
        b.mesh.scale.setScalar(0.55 * b.show);
      }

      // Boat: slow loop with a gentle bob.
      const a = t * 0.05;
      boat.position.set(LAKE.x + Math.cos(a) * LAKE.r * 0.55, LAKE.level + Math.sin(t * 1.6) * 0.06 - 0.05, LAKE.z + Math.sin(a) * LAKE.r * 0.55);
      boat.rotation.y = -a + Math.PI; boat.rotation.z = Math.sin(t * 1.3) * 0.04;

      // A fish jumps every so often.
      fishState.next -= dt;
      if (fishState.next <= 0 && !fish.visible && !calm) {
        const ang = Math.random() * 6.28, r = Math.random() * LAKE.r * 0.6;
        fishState.from.set(LAKE.x + Math.cos(ang) * r, LAKE.level, LAKE.z + Math.sin(ang) * r);
        fishState.to.copy(fishState.from).add(tmp.set(Math.cos(ang + 1) * 2.2, 0, Math.sin(ang + 1) * 2.2));
        fishState.t = 0; fish.visible = true;
        for (let i = 0; i < 12; i++) mist.spawn((s) => { s.life = 0.9; s.p.copy(fishState.from); s.vel.set((Math.random() - 0.5) * 2, 1.5 + Math.random(), (Math.random() - 0.5) * 2); s.c.set('#ffffff'); });
      }
      if (fish.visible) {
        fishState.t += dt / 1.1;
        const k = fishState.t;
        fish.position.lerpVectors(fishState.from, fishState.to, k);
        fish.position.y = LAKE.level + Math.sin(k * Math.PI) * 1.6;
        fish.lookAt(fishState.to.x, fish.position.y + Math.cos(k * Math.PI) * 1.2, fishState.to.z);
        if (k >= 1) { fish.visible = false; fishState.next = 9 + Math.random() * 12; }
      }

      // Villagers.
      const hurry = weather.current === 'rain';
      for (const w of walkers) {
        w.c.update(dt);
        if (w.worker) continue;
        if (w.wait > 0) {
          w.wait -= dt;
          if (w.wait <= 0) { w.dir *= -1; w.c.play(hurry ? 'Run' : 'Walk'); }
          continue;
        }
        const speed = (hurry ? 2.3 : 1.05) / trail.length;
        w.u += w.dir * speed * dt;
        if (w.u > w.ub || w.u < w.ua) {
          w.u = THREE.MathUtils.clamp(w.u, w.ua, w.ub);
          w.wait = 2 + Math.random() * 4;
          w.c.play(Math.random() < 0.3 ? 'Wave' : 'Idle_Neutral');
          continue;
        }
        if (w.c.current !== (hurry ? 'Run' : 'Walk')) w.c.play(hurry ? 'Run' : 'Walk');
        trail.walkPoint(w.u, w.side * w.dir, w.c.root.position);
        const tan = trail.tangentAt(w.u);
        w.c.root.rotation.y = Math.atan2(tan.x * w.dir, tan.z * w.dir);
      }
    }
  };
}
