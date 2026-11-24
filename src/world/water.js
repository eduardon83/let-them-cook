// water.js — river, lake, outflow and waterfalls as stylised, unlit shader surfaces.
// Flow is read along the ribbon's u coordinate, so the water visibly travels downhill
// into the lake and off the island edge. Rain adds ripple rings; night dims and cools it.
import * as THREE from 'three';
import { SHARED } from './materials.js';
import { LAKE, RIVER, OUTFLOW, WATERFALL, riverCurve, outflowCurve } from './layout.js';
import { boundaryRadius } from './terrain.js';

const NOISE = `
  vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    float a=hash2(i).x, b=hash2(i+vec2(1,0)).x, c=hash2(i+vec2(0,1)).x, d=hash2(i+vec2(1,1)).x;
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y); }
`;

const WATER_VERTEX = `
  attribute float aDepth;
  varying vec2 vUv; varying float vDepth; varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main(){
    vUv = uv; vDepth = aDepth;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const WATER_FRAGMENT = `
  uniform float uTime; uniform float uSpeed; uniform float uNight; uniform float uRain; uniform float uSnow;
  uniform vec3 uDeep; uniform vec3 uShallow;
  varying vec2 vUv; varying float vDepth; varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${NOISE}
  float ripple(vec2 p, float t){
    vec2 cell = floor(p); vec2 f = fract(p) - 0.5;
    vec2 r = hash2(cell);
    float phase = fract(t * 0.9 + r.x);
    float d = length(f - (r - 0.5) * 0.5);
    return smoothstep(0.04, 0.0, abs(d - phase * 0.45)) * (1.0 - phase);
  }
  void main(){
    vec2 flow = vec2(vUv.x - uTime * uSpeed, vUv.y);
    float n = vnoise(flow * vec2(0.9, 3.2));
    float n2 = vnoise(flow * vec2(2.3, 7.0) + 17.0);
    float still = vnoise(vWorld.xz * 0.35 + vec2(uTime * 0.12, -uTime * 0.09));
    float depth = smoothstep(0.05, 0.95, vDepth);
    vec3 col = mix(uShallow, uDeep, depth);
    float streak = smoothstep(0.62, 0.8, mix(n, still, step(uSpeed, 0.0001))) * 0.32;
    col += streak;
    float foam = smoothstep(0.2, 0.0, vDepth) * (0.55 + 0.45 * n2);
    col = mix(col, vec3(0.96, 0.99, 1.0), foam);
    float sparkle = step(0.93, vnoise(vWorld.xz * 2.4 + uTime * 0.6)) * (1.0 - uNight * 0.6);
    col += sparkle * 0.5;
    float rings = ripple(vWorld.xz * 1.1, uTime) + ripple(vWorld.xz * 1.1 + 7.3, uTime * 1.13 + 0.5);
    col += rings * uRain * 0.45;
    col = mix(col, col * vec3(0.32, 0.42, 0.7), uNight);
    col = mix(col, vec3(0.86, 0.92, 0.98), uSnow * 0.18);
    gl_FragColor = vec4(col, 0.8 + foam * 0.2);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function waterMaterial({ speed, deep = '#2f86b8', shallow = '#63c6d9' }) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uSpeed: { value: speed }, uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) },
      uRain: { value: 0 }, uTime: { value: 0 }, uNight: { value: 0 }, uSnow: { value: 0 }
    }]),
    vertexShader: WATER_VERTEX, fragmentShader: WATER_FRAGMENT,
    transparent: true, depthWrite: false, fog: true
  });
}

function ribbonGeometry(curve, count, halfWidth, levelAt, uScale = 0.18) {
  const pos = [], uv = [], depth = [], index = [];
  let along = 0; let prev = null;
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    if (prev) along += p.distanceTo(prev);
    prev = p;
    const y = levelAt(u);
    const steps = 6;
    for (let s = 0; s <= steps; s++) {
      const k = s / steps;
      const off = (k * 2 - 1) * halfWidth;
      pos.push(p.x + n.x * off, y, p.z + n.z * off);
      uv.push(along * uScale, k);
      depth.push(1 - Math.abs(k * 2 - 1));
    }
    if (i < count) {
      const a = i * (steps + 1);
      for (let s = 0; s < steps; s++) {
        const b = a + s, c = b + steps + 1;
        index.push(b, c, b + 1, b + 1, c, c + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1));
  g.setIndex(index);
  return g;
}

function lakeGeometry() {
  const segments = 64, rings = 8;
  const pos = [], uv = [], depth = [], index = [];
  pos.push(LAKE.x, LAKE.level, LAKE.z); uv.push(0, 0.5); depth.push(1);
  for (let r = 1; r <= rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const wobble = 1 + Math.sin(a * 3 + 1.2) * 0.04 + Math.sin(a * 7) * 0.02;
      const rr = (r / rings) * (LAKE.r + 0.9) * wobble;
      pos.push(LAKE.x + Math.cos(a) * rr, LAKE.level, LAKE.z + Math.sin(a) * rr);
      uv.push(0, 0.5);
      depth.push(Math.max(0, 1 - (r / rings) ** 1.4));
    }
  }
  for (let s = 0; s < segments; s++) index.push(0, 1 + ((s + 1) % segments), 1 + s);
  for (let r = 1; r < rings; r++) {
    const a0 = 1 + (r - 1) * segments, b0 = 1 + r * segments;
    for (let s = 0; s < segments; s++) {
      const s2 = (s + 1) % segments;
      index.push(a0 + s, a0 + s2, b0 + s, a0 + s2, b0 + s2, b0 + s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1));
  g.setIndex(index);
  return g;
}

const FALL_FRAGMENT = `
  uniform float uTime; uniform float uNight; uniform float uFade;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  ${NOISE}
  void main(){
    float n = vnoise(vec2(vUv.x * 9.0, vUv.y * 2.2 + uTime * 2.6));
    float n2 = vnoise(vec2(vUv.x * 21.0 + 3.0, vUv.y * 4.0 + uTime * 3.4));
    vec3 col = mix(vec3(0.42, 0.78, 0.9), vec3(0.95, 0.99, 1.0), smoothstep(0.45, 0.85, n * 0.6 + n2 * 0.5));
    float lip = smoothstep(0.92, 1.0, vUv.y);
    col = mix(col, vec3(1.0), lip * 0.6);
    col = mix(col, col * vec3(0.35, 0.45, 0.72), uNight);
    float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float alpha = (0.72 + 0.25 * n2) * edge * mix(1.0, smoothstep(0.0, 0.6, vUv.y), uFade);
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function fallMaterial(fade) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uFade: { value: fade }, uTime: { value: 0 }, uNight: { value: 0 } }]),
    vertexShader: `varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: FALL_FRAGMENT, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true
  });
}

/** A curtain from `top` to `bottom` (Vector3s), width w, bowed outward by `bulge`. */
function fallGeometry(top, bottom, width, outward, bulge = 1.2) {
  const pos = [], uv = [], index = [];
  const side = new THREE.Vector3(-outward.z, 0, outward.x).normalize();
  const rows = 14;
  for (let r = 0; r <= rows; r++) {
    const k = r / rows;
    const p = new THREE.Vector3().lerpVectors(top, bottom, k);
    p.addScaledVector(outward, Math.sin(k * Math.PI * 0.85) * bulge);
    const w = width * (1 + k * 0.25);
    for (let c = 0; c <= 1; c++) {
      const q = p.clone().addScaledVector(side, (c - 0.5) * w);
      pos.push(q.x, q.y, q.z); uv.push(c, 1 - k);
    }
    if (r < rows) { const a = r * 2; index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

export function createWater(scene, terrain) {
  const group = new THREE.Group(); group.name = 'water';
  const { riverLevel, outflowLevel } = terrain.features;

  const riverMat = waterMaterial({ speed: 0.55 });
  const river = new THREE.Mesh(ribbonGeometry(riverCurve, 160, RIVER.halfWidth + 0.7, (u) => riverLevel(u) - 0.05), riverMat);
  const outflowMat = waterMaterial({ speed: 0.75 });
  const outflow = new THREE.Mesh(ribbonGeometry(outflowCurve, 50, OUTFLOW.halfWidth + 0.6, (u) => outflowLevel(u) - 0.05), outflowMat);
  const lakeMat = waterMaterial({ speed: 0, deep: '#2a78b0', shallow: '#5cc0d6' });
  const lake = new THREE.Mesh(lakeGeometry(), lakeMat);
  group.add(river, outflow, lake);

  // Mountain waterfall into the river source.
  const src = riverCurve.getPointAt(0);
  const dir = riverCurve.getTangentAt(0);
  const topPoint = new THREE.Vector3(WATERFALL.x - dir.x * 3.2, WATERFALL.top, WATERFALL.z - dir.z * 3.2);
  const bottomPoint = new THREE.Vector3(src.x, RIVER.topLevel - 0.2, src.z);
  const fallMat = fallMaterial(0);
  const fall = new THREE.Mesh(fallGeometry(topPoint, bottomPoint, 2.8, dir.clone().setY(0).normalize(), 0.9), fallMat);
  group.add(fall);

  // Edge waterfall: the outflow tips off the island into the void.
  const end = outflowCurve.getPointAt(1);
  const outward = new THREE.Vector3(end.x, 0, end.z).normalize();
  const edgeR = boundaryRadius(Math.atan2(end.z, end.x));
  const lip = new THREE.Vector3(outward.x * (edgeR - 0.6), OUTFLOW.bottomLevel - 0.05, outward.z * (edgeR - 0.6));
  const drop = lip.clone().addScaledVector(outward, 3.5).setY(-22);
  const edgeMat = fallMaterial(1);
  const edgeFall = new THREE.Mesh(fallGeometry(lip, drop, 3.2, outward, 2.4), edgeMat);
  group.add(edgeFall);

  const surfaces = [riverMat, outflowMat, lakeMat];
  const falls = [fallMat, edgeMat];
  scene.add(group);

  return {
    group,
    mistPoints: [bottomPoint.clone(), lip.clone().addScaledVector(outward, 1.2).setY(-4)],
    update(t, rain, snow, night) {
      for (const m of surfaces) {
        m.uniforms.uTime.value = t; m.uniforms.uRain.value = rain;
        m.uniforms.uNight.value = night; m.uniforms.uSnow.value = snow;
      }
      for (const m of falls) { m.uniforms.uTime.value = t; m.uniforms.uNight.value = night; }
    }
  };
}
