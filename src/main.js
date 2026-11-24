// main.js — boots Let'em Cook!: loads content and assets, builds the valley, mounts the UI.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/lexend';
import './styles/main.css';
import './styles/ui.css';
import { loadKits } from './core/assets.js';
import { createWorld } from './world/world.js';
import { createApp } from './ui/app.js';
import { mountFx } from './ui/fx.js';

const loaderBar = document.querySelector('#loader .loader-bar i');
const loaderText = document.querySelector('#loader .loader-text');

/** Lesson content lives in public/content/lessons.json, apart from the code (see docs/CONTENT.md). */
async function loadContent() {
  // Dev only: ?content=/path.json loads another content file (handy for testing edits).
  const override = import.meta.env.DEV ? new URLSearchParams(location.search).get('content') : null;
  const res = await fetch(override || `${import.meta.env.BASE_URL}content/lessons.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load lessons.json (${res.status})`);
  return res.json();
}

async function boot() {
  if (!document.createElement('canvas').getContext('webgl2')) {
    loaderText.textContent = 'This map needs WebGL 2. Please open it in a recent Chrome, Edge, Firefox or Safari.';
    return;
  }
  const [content] = await Promise.all([
    loadContent(),
    loadKits(undefined, (f) => { loaderBar.style.width = `${Math.round(f * 80)}%`; })
  ]);
  loaderText.textContent = 'Laying out the valley…';
  await new Promise((r) => setTimeout(r, 30));
  let app = null;
  const world = createWorld({
    canvas: document.querySelector('#world'),
    // Clicking a building in the valley opens its mission (or the tutorial at the Welcome Kitchen).
    onPick: (id) => { if (!app) return; if (id === 'gate') app.startTutorial(); else app.goToMission(id); }
  });
  loaderBar.style.width = '92%';
  loaderText.textContent = 'Calling the villagers…';
  await Promise.race([world.life.ready, new Promise((r) => setTimeout(r, 6000))]);
  mountFx(document.querySelector('#app'));
  app = createApp({ world, content });
  window.__app = app;
  window.__world = world;
  loaderBar.style.width = '100%';
  document.querySelector('#loader').classList.add('done');
  window.__sceneReady = true;
}

boot().catch((err) => {
  console.error(err);
  window.__bootError = String(err?.stack || err);
  loaderText.textContent = 'Something went wrong while loading. Please reload the page.';
});
