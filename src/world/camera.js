// camera.js — orbit camera with damping, named views, smooth fly-to and soft bounds.
// Any hand on the mouse cancels a running flight: a camera that fights the user feels broken.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VIEWS } from './layout.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createCameraRig(camera, dom) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 18;
  controls.maxDistance = 210;
  controls.minPolarAngle = THREE.MathUtils.degToRad(18);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(74);
  controls.screenSpacePanning = false;
  controls.panSpeed = 0.9;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.9;

  let flight = null;
  controls.addEventListener('start', () => { flight = null; });

  function flyTo(position, target, seconds = 1.6) {
    flight = {
      t: 0, seconds,
      fromPos: camera.position.clone(), fromTarget: controls.target.clone(),
      toPos: new THREE.Vector3(...position), toTarget: new THREE.Vector3(...target)
    };
    return new Promise((resolve) => { flight.resolve = resolve; });
  }

  /** Frames a world point from the current side, at a given distance and elevation. */
  function focusOn(point, { distance = 30, elevation = 0.62, seconds = 1.5, side = null } = {}) {
    const dir = side ? new THREE.Vector3(...side) : camera.position.clone().sub(controls.target).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    dir.setY(0).normalize();
    const pos = point.clone()
      .addScaledVector(dir, Math.cos(elevation) * distance)
      .add(new THREE.Vector3(0, Math.sin(elevation) * distance, 0));
    return flyTo(pos.toArray(), point.toArray(), seconds);
  }

  function zoomBy(factor) {
    const offset = camera.position.clone().sub(controls.target);
    const length = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
    return flyTo(controls.target.clone().add(offset.setLength(length)).toArray(), controls.target.toArray(), 0.6);
  }

  function setView(name, seconds = 1.8) {
    const view = VIEWS[name] || VIEWS.valley;
    return flyTo(view.position, view.target, seconds);
  }

  function jumpTo(name) {
    const view = VIEWS[name] || VIEWS.valley;
    camera.position.set(...view.position); controls.target.set(...view.target); controls.update();
  }

  /** Returns true while the camera moves (so the render loop keeps drawing). */
  function update(dt) {
    let moving = false;
    if (flight) {
      flight.t += dt / flight.seconds;
      const k = ease(Math.min(1, flight.t));
      camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
      // Lift the camera a little mid-flight so it arcs over the valley instead of cutting through hills.
      camera.position.y += Math.sin(k * Math.PI) * Math.min(14, flight.fromPos.distanceTo(flight.toPos) * 0.12);
      moving = true;
      if (flight.t >= 1) { const done = flight.resolve; flight = null; done?.(); }
    }
    // Soft bounds: keep the target over the island.
    const t = controls.target;
    const r = Math.hypot(t.x, t.z);
    if (r > 46) { t.x *= 46 / r; t.z *= 46 / r; }
    t.y = THREE.MathUtils.clamp(t.y, -2, 18);
    const changed = controls.update();
    return moving || changed;
  }

  return { controls, flyTo, focusOn, zoomBy, setView, jumpTo, update, get flying() { return !!flight; } };
}
