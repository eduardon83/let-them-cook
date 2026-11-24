// world.js — builds Saffron Valley and runs it.
// Owns the renderer, scene, camera rig and the frame loop; every subsystem exposes
// update(dt, t) and the world calls them in order. UI talks to the world only through
// the returned API (fly to a location, toggle night/weather, project labels, snapshots).
import * as THREE from 'three';
import { createSky } from './sky.js';
import { createTerrain } from './terrain.js';
import { createWater } from './water.js';
import { createCameraRig } from './camera.js';
import { createTrail } from './trail.js';
import { createVegetation } from './vegetation.js';
import { createLocations } from './locations.js';
import { createLife } from './life.js';
import { createWeather } from './weather.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SHARED } from './materials.js';
import { LOCATIONS, VIEWS } from './layout.js';

export function createWorld({ canvas, onPick = () => {}, onHover = () => {}, quality = 'high' }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.75 : 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 1400);
  const rig = createCameraRig(camera, canvas);
  rig.jumpTo('valley');

  const sky = createSky(scene, renderer);
  const terrain = createTerrain();
  scene.add(terrain.mesh);
  const water = createWater(scene, terrain);
  const trail = createTrail(scene, terrain);
  const locations = createLocations(scene, terrain, trail);
  const vegetation = createVegetation(scene, terrain, locations);
  const weather = createWeather(scene, camera, rig.controls);
  locations.flowerSpots = vegetation.flowerSpots;
  const life = createLife(scene, terrain, trail, locations, water, weather);

  // ------------------------------------------------------------ picking
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null, downAt = null;
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(locations.hitboxes, false)[0];
    return hit ? hit.object.userData.locationId : null;
  }
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const id = pickAt(e.clientX, e.clientY);
    if (id !== hovered) { hovered = id; locations.setHover(id); onHover(id); canvas.style.cursor = id ? 'pointer' : ''; invalidate(); }
  });
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const id = pickAt(e.clientX, e.clientY);
    if (id) onPick(id);
  });

  // ------------------------------------------------------------ loop
  let running = true, paused = false, frameId = null, last = performance.now(), t = 0;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let calm = reduceMotion.matches;
  const listeners = new Set();

  function frame(now) {
    frameId = null;
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const motion = paused ? 0 : (calm ? dt * 0.35 : dt);
    t += motion;
    SHARED.uTime.value = t;
    const w = weather.update(motion, t, calm);
    sky.update(dt, w.storm);
    water.update(t, w.rain, w.snowCover, SHARED.uNight.value);
    trail.update(motion, t);
    locations.update(motion, t, camera);
    vegetation.update(motion, t);
    life.update(motion, t, camera, calm);
    rig.update(dt);
    renderer.render(scene, camera);
    for (const fn of listeners) fn(camera);
    frameId = requestAnimationFrame(frame);
  }
  function invalidate() { if (running && frameId === null) { last = performance.now(); frameId = requestAnimationFrame(frame); } }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Narrow screens see the whole island by widening the lens instead of cropping it.
    camera.fov = w / h < 1 ? 46 : 32;
    camera.updateProjectionMatrix();
    invalidate();
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  // `wanted` is what the app asked for (a panel may have paused the valley); visibility only gates it.
  let wanted = true;
  document.addEventListener('visibilitychange', () => { running = wanted && !document.hidden; if (running) invalidate(); });
  invalidate();

  // ------------------------------------------------------------ API
  const tmp = new THREE.Vector3();
  const outputPass = new OutputPass();
  return {
    renderer, scene, camera, rig, terrain, locations, weather, sky, life,
    /** Calls fn(camera) after every rendered frame (labels follow the world). */
    onFrame(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Screen position of a world point: {x, y, visible}. */
    project(point) {
      tmp.copy(point).project(camera);
      const rect = canvas.getBoundingClientRect();
      return { x: (tmp.x * 0.5 + 0.5) * rect.width, y: (-tmp.y * 0.5 + 0.5) * rect.height, visible: tmp.z < 1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15 };
    },
    focusLocation(id, opts = {}) {
      const loc = locations.byId(id);
      if (!loc) return Promise.resolve();
      return rig.focusOn(loc.focusPoint, { distance: opts.distance ?? 34, elevation: 0.58, seconds: opts.seconds ?? 1.6 });
    },
    setView(name) { return rig.setView(name); },
    views: VIEWS,
    zoom(factor) { return rig.zoomBy(factor); },
    setNight(on) { sky.setNight(on); locations.setNight(on); life.setNight(on); },
    setWeather(mode) { weather.setMode(mode); },
    setCalm(on) { calm = on; },
    setPaused(on) { paused = on; if (!on) invalidate(); },
    /** Stops drawing entirely (e.g. while a full-screen stage is open). */
    setRunning(on) { wanted = on; running = on && !document.hidden; if (running) invalidate(); else if (frameId !== null) { cancelAnimationFrame(frameId); frameId = null; } },
    setProgress(progress) { trail.setProgress(progress); locations.setProgress(progress); life.setProgress(progress); },
    celebrate(id) { locations.celebrate(id); life.fireworks(locations.byId(id)?.focusPoint); },
    /** Renders the world from a camera pose into a PNG data URL (for printable packs). */
    snapshot({ position, target, width = 1200, height = 800, fov = 30 }) {
      const cam = new THREE.PerspectiveCamera(fov, width / height, 0.5, 1400);
      cam.position.set(...position); cam.lookAt(new THREE.Vector3(...target));
      // Scene → HDR target, then OutputPass applies the same tone mapping + sRGB as the screen.
      const hdr = new THREE.WebGLRenderTarget(width, height, { samples: 4, type: THREE.HalfFloatType });
      const ldr = new THREE.WebGLRenderTarget(width, height);
      const prevTarget = renderer.getRenderTarget();
      // Print wants crisp colour: thin the haze for the snapshot only.
      const fogDensity = scene.fog.density;
      scene.fog.density = fogDensity * 0.25;
      renderer.setRenderTarget(hdr);
      renderer.render(scene, cam);
      scene.fog.density = fogDensity;
      outputPass.render(renderer, ldr, hdr);
      const pixels = new Uint8Array(width * height * 4);
      renderer.readRenderTargetPixels(ldr, 0, 0, width, height, pixels);
      renderer.setRenderTarget(prevTarget);
      hdr.dispose(); ldr.dispose();
      const c = document.createElement('canvas'); c.width = width; c.height = height;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) img.data.set(pixels.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
      ctx.putImageData(img, 0, 0);
      return c.toDataURL('image/jpeg', 0.9);
    },
    locationsList: LOCATIONS
  };
}
