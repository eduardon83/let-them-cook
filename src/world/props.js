// props.js — small procedural props that the kits do not have: waving flags and bunting.
import * as THREE from 'three';
import { SHARED, weatherize } from './materials.js';

const poleMaterial = weatherize(new THREE.MeshStandardMaterial({ color: '#8a5a3b', roughness: 0.8, flatShading: true }));
const knobMaterial = new THREE.MeshStandardMaterial({ color: '#e7c35a', roughness: 0.4, metalness: 0.3 });
const clothGeometry = (() => {
  const g = new THREE.PlaneGeometry(1.5, 0.95, 12, 4);
  g.translate(0.75, 0, 0);
  return g;
})();

function clothMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, side: THREE.DoubleSide, flatShading: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = SHARED.uTime; shader.uniforms.uWind = SHARED.uWind;
    shader.vertexShader = 'uniform float uTime; uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float k = position.x / 1.5;
      float wave = sin(uTime * (3.0 + uWind) - position.x * 3.2 + position.y * 0.8) * 0.22 * k * (0.6 + uWind * 0.4);
      transformed.z += wave;
      transformed.y -= k * k * 0.18 * (1.4 - min(uWind, 1.4) * 0.6);`);
  };
  m.customProgramCacheKey = () => 'cloth';
  return m;
}

export function createFlag(color, { height = 3.2 } = {}) {
  const flag = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, height, 6), poleMaterial);
  pole.position.y = height / 2; pole.castShadow = true;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), knobMaterial);
  knob.position.y = height + 0.05;
  const cloth = new THREE.Mesh(clothGeometry, clothMaterial(color));
  cloth.position.set(0.05, height - 0.55, 0); cloth.castShadow = true;
  flag.add(pole, knob, cloth);
  return flag;
}

/** A string of triangular pennants between two points, sagging in the middle. */
export function createBunting(from, to, colors = ['#e4572e', '#f2a33a', '#3f8f5b', '#3b8fc4', '#d64f8b'], count = 14) {
  const group = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const k = i / 20;
    const p = new THREE.Vector3().lerpVectors(from, to, k);
    p.y -= Math.sin(k * Math.PI) * from.distanceTo(to) * 0.08;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.025, 4), poleMaterial);
  group.add(rope);
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.5, 0], 3));
  tri.computeVertexNormals();
  for (let i = 1; i < count; i++) {
    const k = i / count;
    const m = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, roughness: 0.7 }));
    m.position.copy(curve.getPointAt(k));
    const tan = curve.getTangentAt(k);
    m.rotation.y = Math.atan2(-tan.z, tan.x);
    m.userData.phase = i * 0.7;
    group.add(m);
  }
  group.userData.update = (t, wind) => {
    for (const child of group.children) if (child.userData.phase !== undefined) child.rotation.x = Math.sin(t * 3 + child.userData.phase) * 0.25 * wind;
  };
  return group;
}
