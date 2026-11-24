// weather.js — clouds, rain and snow, switching at random in "auto" mode.
// Rain wets surfaces and ripples the lake; snow slowly settles on roofs, trees and ground and
// melts after it stops. No lightning: flashing content is avoided on purpose (accessibility).
import * as THREE from 'three';
import { SHARED } from './materials.js';
import { mulberry32, noise2 } from './noise.js';
import { puffTexture } from './sprites.js';

const BOX = { w: 80, h: 48 };

export function createWeather(scene, camera, controls) {
  const rand = mulberry32(99);
  const anchor = new THREE.Vector3();

  // ------------------------------------------------------------ clouds
  const clouds = new THREE.Group(); clouds.name = 'clouds';
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, transparent: true, opacity: 0.9 });
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const cloudList = [];
  // Clouds orbit the island's rim (never parked between the camera and the valley);
  // the storm-only ones drift inward when it rains or snows.
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Group();
    const n = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(puff, cloudMat);
      const sc = 1.3 + rand() * 1.5;
      m.scale.set(sc * 1.3, sc * 0.75, sc);
      m.position.set((k - n / 2) * 1.7 + rand() * 0.6, rand() * 0.8, (rand() - 0.5) * 2);
      m.castShadow = true;
      cloud.add(m);
    }
    cloud.userData.angle = (i / 12) * Math.PI * 2 + rand() * 0.4;
    cloud.userData.radius = 50 + rand() * 22;
    cloud.userData.height = 20 + rand() * 9;
    cloud.userData.speed = 0.012 + rand() * 0.01;
    cloud.userData.stormOnly = i % 3 === 2;
    clouds.add(cloud); cloudList.push(cloud);
  }
  scene.add(clouds);

  // ------------------------------------------------------------ rain
  const RAIN = 2600;
  const rainPos = new Float32Array(RAIN * 6);
  const rainSeed = new Float32Array(RAIN * 3);
  for (let i = 0; i < RAIN; i++) {
    rainSeed[i * 3] = (rand() - 0.5) * BOX.w; rainSeed[i * 3 + 1] = rand() * BOX.h; rainSeed[i * 3 + 2] = (rand() - 0.5) * BOX.w;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: '#cfe3f5', transparent: true, opacity: 0, depthWrite: false });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  scene.add(rain);

  // ------------------------------------------------------------ snow
  const SNOW = 3200;
  const snowPos = new Float32Array(SNOW * 3);
  const snowPhase = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    snowPos[i * 3] = (rand() - 0.5) * BOX.w; snowPos[i * 3 + 1] = rand() * BOX.h; snowPos[i * 3 + 2] = (rand() - 0.5) * BOX.w;
    snowPhase[i] = rand() * 6.28;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({ map: puffTexture(), color: '#ffffff', size: 0.55, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  // ------------------------------------------------------------ state
  const state = { mode: 'auto', current: 'clear', rain: 0, snow: 0, cover: 0, wet: 0, timer: 32, listeners: new Set() };
  function setCurrent(kind) {
    if (state.current === kind) return;
    state.current = kind;
    for (const fn of state.listeners) fn(kind);
  }
  function scheduleNext() {
    if (state.current === 'clear') {
      const r = rand();
      setCurrent(r < 0.6 ? 'rain' : 'snow');
      state.timer = 26 + rand() * 22;
    } else {
      setCurrent('clear');
      state.timer = 50 + rand() * 45;
    }
  }

  return {
    get current() { return state.current; },
    get mode() { return state.mode; },
    onChange(fn) { state.listeners.add(fn); return () => state.listeners.delete(fn); },
    setMode(mode) {
      state.mode = mode;
      if (mode === 'auto') { state.timer = 20; } else setCurrent(mode);
    },
    update(dt, t, calm) {
      if (state.mode === 'auto' && !calm) { state.timer -= dt; if (state.timer <= 0) scheduleNext(); }
      if (state.mode === 'auto' && calm && state.current !== 'clear') setCurrent('clear');
      const rainTarget = state.current === 'rain' ? 1 : 0;
      const snowTarget = state.current === 'snow' ? 1 : 0;
      const fade = Math.min(1, dt * 0.25);
      state.rain += (rainTarget - state.rain) * fade;
      state.snow += (snowTarget - state.snow) * fade;
      state.cover = THREE.MathUtils.clamp(state.cover + (state.snow > 0.5 ? dt / 38 : -dt / 30), 0, 0.85);
      state.wet = THREE.MathUtils.clamp(state.wet + (state.rain > 0.4 ? dt / 6 : -dt / 40), 0, 1);
      SHARED.uSnow.value = state.cover;
      SHARED.uWet.value = state.wet;

      const gust = 0.5 + 0.5 * noise2(t * 0.07, 3.1);
      SHARED.uWind.value = 0.55 + gust * 0.7 + state.rain * 0.9 + state.snow * 0.3;
      const windAngle = 0.4 + noise2(t * 0.02, 9) * 0.6;
      SHARED.uWindDir.value.set(Math.cos(windAngle), Math.sin(windAngle));

      // Particles live in a box between the target and the camera, so they read up close.
      anchor.lerpVectors(controls.target, camera.position, 0.38);
      const wind = SHARED.uWindDir.value, windStrength = SHARED.uWind.value;

      rain.visible = state.rain > 0.02;
      rainMat.opacity = state.rain * 0.4;
      if (rain.visible) {
        rain.position.copy(anchor).y -= BOX.h * 0.35;
        for (let i = 0; i < RAIN; i++) {
          let y = rainSeed[i * 3 + 1] - dt * 34;
          if (y < 0) y += BOX.h;
          rainSeed[i * 3 + 1] = y;
          const x = rainSeed[i * 3], z = rainSeed[i * 3 + 2];
          const sx = wind.x * windStrength * 0.35, sz = wind.y * windStrength * 0.35;
          rainPos.set([x, y, z, x + sx, y + 1.5, z + sz], i * 6);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      snow.visible = state.snow > 0.02;
      snowMat.opacity = state.snow * 0.95;
      if (snow.visible) {
        snow.position.copy(anchor).y -= BOX.h * 0.35;
        for (let i = 0; i < SNOW; i++) {
          const k = i * 3;
          snowPos[k + 1] -= dt * (2.2 + (i % 5) * 0.25);
          snowPos[k] += (Math.sin(t * 0.9 + snowPhase[i]) * 0.6 + wind.x * windStrength * 0.8) * dt;
          snowPos[k + 2] += (Math.cos(t * 0.7 + snowPhase[i]) * 0.6 + wind.y * windStrength * 0.8) * dt;
          if (snowPos[k + 1] < 0) snowPos[k + 1] += BOX.h;
          if (snowPos[k] > BOX.w / 2) snowPos[k] -= BOX.w; else if (snowPos[k] < -BOX.w / 2) snowPos[k] += BOX.w;
          if (snowPos[k + 2] > BOX.w / 2) snowPos[k + 2] -= BOX.w; else if (snowPos[k + 2] < -BOX.w / 2) snowPos[k + 2] += BOX.w;
        }
        snowGeo.attributes.position.needsUpdate = true;
      }

      const storm = Math.max(state.rain * 0.9, state.snow * 0.55);
      cloudMat.color.setRGB(1, 1, 1).lerp(new THREE.Color('#8e98a6'), state.rain * 0.8).lerp(new THREE.Color('#d9dee6'), state.snow * 0.5);
      cloudMat.color.lerp(new THREE.Color('#3a4566'), SHARED.uNight.value * 0.75);
      for (const cloud of cloudList) {
        const u = cloud.userData;
        u.angle += dt * u.speed * (0.6 + windStrength * 0.5);
        // Clouds swing wide on the camera side so they never sit in front of the valley.
        const r = u.radius - (u.stormOnly ? storm * 22 : storm * 8) + Math.max(0, Math.sin(u.angle)) * 34;
        cloud.position.set(Math.cos(u.angle) * r, u.height + (u.stormOnly ? 4 : 0), Math.sin(u.angle) * r * 0.85);
        const show = u.stormOnly ? storm : 1;
        cloud.scale.setScalar(THREE.MathUtils.lerp(cloud.scale.x, Math.max(0.001, show * (1 + storm * 0.3)), Math.min(1, dt)));
      }
      return { storm, rain: state.rain, snowCover: state.cover };
    }
  };
}
