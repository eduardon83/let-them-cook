// stage.js — a small second renderer for character scenes (mission hosts, tutorial kitchen).
// The valley stops drawing while a stage is open, so only one scene costs GPU time.
import * as THREE from 'three';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const lookAt = new THREE.Vector3();
  let set = null, frame = null, last = 0, t = 0, active = false, flight = null, sway = 0.08;
  let talking = false, talkLevel = 0;
  const pointer = new THREE.Vector2();
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const basePos = new THREE.Vector3(), baseTarget = new THREE.Vector3();
  function applyCamera() {
    // A slow breathing orbit plus a little parallax from the pointer keeps the scene alive.
    const a = Math.sin(t * 0.18) * sway + pointer.x * 0.05;
    const offset = basePos.clone().sub(baseTarget);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    camera.position.copy(baseTarget).add(offset);
    camera.position.y += Math.sin(t * 0.23) * 0.06 - pointer.y * 0.08;
    lookAt.copy(baseTarget);
    camera.lookAt(lookAt);
  }

  function loop(now) {
    frame = null;
    if (!active) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    t += dt;
    if (flight) {
      flight.k = Math.min(1, flight.k + dt / flight.seconds);
      const e = ease(flight.k);
      basePos.lerpVectors(flight.fromPos, flight.toPos, e);
      baseTarget.lerpVectors(flight.fromTarget, flight.toTarget, e);
      if (flight.k >= 1) { const done = flight.resolve; flight = null; done?.(); }
    }
    talkLevel += ((talking ? 1 : 0) - talkLevel) * Math.min(1, dt * 8);
    set?.update?.(dt, t, talkLevel);
    applyCamera();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  }

  function clear() {
    if (!set) return;
    scene.remove(set.group);
    set.dispose?.();
    set = null;
  }

  return {
    renderer, scene, camera, canvas,
    get set() { return set; },
    /** Mounts a set built by a builder: async () => { group, update, views, host, background } */
    async mount(builder) {
      clear();
      const next = await builder();
      set = next;
      scene.add(next.group);
      scene.background = next.background || null;
      const view = next.views?.[next.startView || 'main'];
      if (view) { basePos.set(...view.position); baseTarget.set(...view.target); }
      sway = next.sway ?? 0.08;
      resize();
      return next;
    },
    /** Flies the camera to one of the set's named views. */
    focus(name, seconds = 1.4) {
      const view = set?.views?.[name];
      if (!view) return Promise.resolve();
      return new Promise((resolve) => {
        flight = { k: 0, seconds, fromPos: basePos.clone(), fromTarget: baseTarget.clone(), toPos: new THREE.Vector3(...view.position), toTarget: new THREE.Vector3(...view.target), resolve };
      });
    },
    setTalking(on) { talking = on; },
    start() { if (active) return; active = true; last = performance.now(); resize(); frame = requestAnimationFrame(loop); },
    stop() { active = false; if (frame) cancelAnimationFrame(frame); frame = null; },
    /** Projects a world point to canvas pixels (for speech bubbles). */
    project(v) {
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * canvas.clientWidth, y: (-p.y * 0.5 + 0.5) * canvas.clientHeight };
    },
    dispose() { this.stop(); clear(); ro.disconnect(); renderer.dispose(); }
  };
}
