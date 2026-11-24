// sprites.js — tiny canvas textures generated at runtime (no image files to ship).
import * as THREE from 'three';

const cache = new Map();
function canvasTexture(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Warm radial glow for lanterns, beacons, fireflies. */
export function glowTexture() {
  return canvasTexture('glow', 64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  });
}

/** Soft puff for smoke, mist and snow. */
export function puffTexture() {
  return canvasTexture('puff', 64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  });
}

/** Four-point sparkle for magic bursts. */
export function sparkleTexture() {
  return canvasTexture('sparkle', 64, (g, s) => {
    const c = s / 2;
    const grd = g.createRadialGradient(c, c, 0, c, c, c);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.2, 'rgba(255,255,255,0.4)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.moveTo(c, 2); g.quadraticCurveTo(c, c, s - 2, c); g.quadraticCurveTo(c, c, c, s - 2); g.quadraticCurveTo(c, c, 2, c); g.quadraticCurveTo(c, c, c, 2); g.fill();
  });
}
