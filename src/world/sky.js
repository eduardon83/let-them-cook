// sky.js — backdrop dome, sun/moon lighting, stars, and the day/night/weather mood mix.
// The island floats in a soft painted void (no horizon line), like a tabletop diorama.
import * as THREE from 'three';
import { SHARED } from './materials.js';
import { mulberry32 } from './noise.js';

const MOODS = {
  day: { top: '#9fd0e6', horizon: '#f8e7cb', sun: '#fff0d4', sunI: 2.7, hemiSky: '#d6ecff', hemiGround: '#8a7457', hemiI: 1.15, fog: '#f1e3cb', exposure: 1.0 },
  night: { top: '#0e1838', horizon: '#2c3b6b', sun: '#aebfff', sunI: 1.0, hemiSky: '#6a7fc0', hemiGround: '#24243a', hemiI: 0.95, fog: '#26335c', exposure: 1.12 },
  storm: { top: '#7f8f9c', horizon: '#c9cdcf', sun: '#e1e6ee', sunI: 1.1, hemiSky: '#cfd8e2', hemiGround: '#6f6a62', hemiI: 1.05, fog: '#c5c9cc', exposure: 0.98 },
  stormNight: { top: '#0d1324', horizon: '#232b45', sun: '#9aa7cc', sunI: 0.55, hemiSky: '#56658c', hemiGround: '#1b1b28', hemiI: 0.8, fog: '#1d2440', exposure: 1.08 }
};

export function createSky(scene, renderer) {
  const uniforms = {
    uTop: { value: new THREE.Color(MOODS.day.top) },
    uHorizon: { value: new THREE.Color(MOODS.day.horizon) },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.75, 0.5).normalize() },
    uNight: SHARED.uNight
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform float uNight;
        varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 c = mix(uHorizon, uTop, smoothstep(0.35, 0.95, h));
          float glow = pow(max(dot(normalize(vDir), uSunDir), 0.0), 18.0);
          c += vec3(1.0, 0.86, 0.6) * glow * 0.35 * (1.0 - uNight);
          c += vec3(0.75, 0.82, 1.0) * glow * 0.18 * uNight;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`
    })
  );
  dome.name = 'sky';
  dome.renderOrder = -10;
  scene.add(dome);

  // Stars: fixed points on the upper dome, faded in at night.
  const rand = mulberry32(7);
  const starPos = [];
  for (let i = 0; i < 900; i++) {
    const u = rand() * Math.PI * 2, v = 0.12 + rand() * 0.88;
    const r = 520, y = v * r, rr = Math.sqrt(r * r - y * y);
    starPos.push(Math.cos(u) * rr, y, Math.sin(u) * rr);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#fff7e0', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const sun = new THREE.DirectionalLight(MOODS.day.sun, MOODS.day.sunI);
  sun.position.copy(uniforms.uSunDir.value).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -72; sc.right = 72; sc.top = 72; sc.bottom = -72; sc.near = 20; sc.far = 260;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06;
  scene.add(sun); scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(MOODS.day.hemiSky, MOODS.day.hemiGround, MOODS.day.hemiI);
  scene.add(hemi);
  scene.fog = new THREE.FogExp2(MOODS.day.fog, 0.0032);

  const state = { night: 0, nightTarget: 0, storm: 0 };
  const a = new THREE.Color(), b = new THREE.Color();
  function mix(key, out) {
    a.set(MOODS.day[key]).lerp(b.set(MOODS.storm[key]), state.storm);
    const n = new THREE.Color(MOODS.night[key]).lerp(new THREE.Color(MOODS.stormNight[key]), state.storm);
    return out.copy(a).lerp(n, state.night);
  }
  function mixNum(key) {
    const d = THREE.MathUtils.lerp(MOODS.day[key], MOODS.storm[key], state.storm);
    const n = THREE.MathUtils.lerp(MOODS.night[key], MOODS.stormNight[key], state.storm);
    return THREE.MathUtils.lerp(d, n, state.night);
  }

  return {
    sun, hemi, dome, stars,
    setNight(on) { state.nightTarget = on ? 1 : 0; },
    get night() { return state.nightTarget === 1; },
    /** storm: 0..1 from the weather system. Returns true while transitioning. */
    update(dt, storm) {
      const before = state.night;
      state.night += (state.nightTarget - state.night) * Math.min(1, dt * 1.6);
      if (Math.abs(state.night - state.nightTarget) < 0.002) state.night = state.nightTarget;
      state.storm = storm;
      SHARED.uNight.value = state.night;
      mix('top', uniforms.uTop.value); mix('horizon', uniforms.uHorizon.value);
      mix('sun', sun.color); sun.intensity = mixNum('sunI');
      mix('hemiSky', hemi.color); mix('hemiGround', hemi.groundColor); hemi.intensity = mixNum('hemiI');
      mix('fog', scene.fog.color);
      scene.fog.density = 0.0032 + storm * 0.004;
      renderer.toneMappingExposure = mixNum('exposure');
      starMat.opacity = state.night * (1 - storm * 0.85);
      // The moon sits opposite-ish to the sun so night shadows fall the other way.
      const dir = uniforms.uSunDir.value.set(-0.45, 0.75, 0.5).lerp(new THREE.Vector3(0.5, 0.7, -0.3), state.night).normalize();
      sun.position.copy(dir).multiplyScalar(120);
      return before !== state.night;
    }
  };
}
