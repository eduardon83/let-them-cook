// app.js — the map screen: HUD, labels over the landmarks, the mission tracker, settings,
// and the progress logic that drives the trail, beacons and flags in the valley.
import { $, $$, el, esc, icon, LOGO, toast } from './dom.js';
import { store } from '../core/store.js';
import { burstFrom, comet } from './fx.js';
import { ambience } from './audio.js';
import { openMission } from './mission.js';
import { openTutorial } from './tutorial.js';
import { openJournal } from './journal.js';

const REGION_ICONS = { valley: 'map', village: 'village', hills: 'hills', river: 'river', mountains: 'mountain' };

export function createApp({ world, content }) {
  const ui = $('#ui');
  const lessons = [...content.lessons].sort((a, b) => a.order - b.order);
  const byId = (id) => lessons.find((l) => l.id === id);
  const app = { world, content, lessons, byId };

  // ------------------------------------------------------------------ progress
  function progress() {
    const order = lessons.map((l) => l.id);
    const completed = new Set(order.filter((id) => store.isDone(id)));
    const nextId = order.find((id) => !completed.has(id)) || null;
    const idx = nextId ? order.indexOf(nextId) : order.length;
    const lastDoneId = idx > 0 ? order[idx - 1] : null;
    return { completed, nextId, lastDoneId, freeRoam: !!store.setting('freeRoam'), count: completed.size, total: order.length };
  }
  app.progress = progress;
  function applyProgress() {
    const p = progress();
    world.setProgress(p);
    renderTracker(p);
    updateLabels(p);
    $('.journal-count').textContent = p.count;
  }
  app.refresh = applyProgress;

  // ------------------------------------------------------------------ HUD
  ui.innerHTML = `
    <header class="hud-top">
      <div class="brand glass">${LOGO}<div><div class="brand-name">Let'em <em>Cook!</em></div><div class="brand-sub">Saffron Valley · Teacher toolkit</div></div></div>
      <div class="hud-actions">
        <div class="seg glass" role="group" aria-label="Time of day">
          <button type="button" data-night="false" aria-pressed="true" title="Day">${icon('sun')}<span class="lbl">Day</span></button>
          <button type="button" data-night="true" aria-pressed="false" title="Night">${icon('moon')}<span class="lbl">Night</span></button>
        </div>
        <div class="seg glass" role="group" aria-label="Weather">
          <button type="button" data-weather="auto" title="Weather changes by itself">${icon('auto')}</button>
          <button type="button" data-weather="clear" title="Clear sky">${icon('sun')}</button>
          <button type="button" data-weather="rain" title="Rain">${icon('rain')}</button>
          <button type="button" data-weather="snow" title="Snow">${icon('snow')}</button>
        </div>
        <button class="btn glass icon" data-act="sound" aria-pressed="false" title="Sound (off)">${icon('mute')}</button>
        <button class="btn glass icon" data-act="calm" aria-pressed="false" title="Calm motion">${icon('calm')}</button>
        <button class="btn glass" data-act="tutorial">${icon('help')}<span class="lbl">How it works</span></button>
        <button class="btn glass" data-act="journal">${icon('book')}<span class="lbl">Chef's Journal</span><span class="journal-count">0</span></button>
      </div>
    </header>
    <section class="hero" aria-labelledby="hero-title">
      <div class="kicker">Welcome to Saffron Valley</div>
      <h1 id="hero-title">Every word is an <span class="swash">ingredient.</span></h1>
      <p>Follow the trail from the market to the Grand Restaurant. Each stop is a mission your class can play: plan it, print it, cook it.</p>
      <nav class="regions" aria-label="Fly to an area">
        ${Object.entries(world.views).map(([k, v], i) => `<button type="button" data-view="${k}" ${i === 0 ? 'aria-current="true"' : ''}>${icon(REGION_ICONS[k] || 'map')}${esc(v.label)}</button>`).join('')}
      </nav>
    </section>
    <div class="map-tools">
      <button class="btn glass" data-act="home" title="Whole valley" aria-label="Whole valley">${icon('home')}</button>
      <button class="btn glass" data-act="zoom-in" title="Zoom in" aria-label="Zoom in">${icon('plus')}</button>
      <button class="btn glass" data-act="zoom-out" title="Zoom out" aria-label="Zoom out">${icon('minus')}</button>
    </div>
    <div class="hint">Drag to look around · Right-drag to move · Scroll to zoom · Click a building to open its mission</div>
    <div class="credit">3D models CC0 · Kenney · KayKit · Quaternius · <button type="button" data-act="credits">Credits &amp; privacy</button></div>
    <section class="tracker glass" aria-live="polite"></section>
    <div class="loc-tip glass" role="tooltip"></div>
  `;

  ui.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.view) {
      $$('.regions button', ui).forEach((x) => x.removeAttribute('aria-current'));
      b.setAttribute('aria-current', 'true');
      world.setView(b.dataset.view);
    }
    if (b.dataset.night) setNight(b.dataset.night === 'true');
    if (b.dataset.weather) setWeather(b.dataset.weather);
    const act = b.dataset.act;
    if (act === 'home') world.setView('valley');
    if (act === 'zoom-in') world.zoom(0.7);
    if (act === 'zoom-out') world.zoom(1.4);
    if (act === 'sound') setSound(!ambience.enabled);
    if (act === 'calm') setCalm(document.documentElement.dataset.calm !== 'true');
    if (act === 'tutorial') startTutorial();
    if (act === 'journal') openJournal(app);
    if (act === 'credits') openJournal(app, 'about');
  });

  function setNight(on) {
    world.setNight(on); ambience.night = on;
    document.documentElement.dataset.night = String(on);
    $$('[data-night]', ui).forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.night === 'true') === on)));
    store.setSetting('night', on);
  }
  function setWeather(mode) {
    world.setWeather(mode);
    $$('[data-weather]', ui).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.weather === mode)));
    store.setSetting('weather', mode);
  }
  function setSound(on) {
    ambience.setEnabled(on);
    const b = $('[data-act="sound"]', ui);
    b.setAttribute('aria-pressed', String(on)); b.innerHTML = icon(on ? 'sound' : 'mute'); b.title = on ? 'Sound (on)' : 'Sound (off)';
    store.setSetting('sound', on);
  }
  function setCalm(on) {
    document.documentElement.dataset.calm = String(on);
    world.setCalm(on);
    $('[data-act="calm"]', ui).setAttribute('aria-pressed', String(on));
    store.setSetting('calm', on);
  }
  app.setNight = setNight;

  // ------------------------------------------------------------------ tracker
  function renderTracker(p) {
    const lesson = p.nextId ? byId(p.nextId) : null;
    const t = $('.tracker', ui);
    t.innerHTML = `
      <div class="tracker-head">
        <div>
          <div class="kicker">${lesson ? `Next mission · ${lesson.order} of ${p.total}` : 'Every mission cooked'}</div>
          <h2>${lesson ? `${icon('hat')} ${esc(lesson.title)}` : `${icon('star')} The valley is celebrating!`}</h2>
          <div class="meta">${lesson ? `<span class="chip level">${esc(lesson.level)}</span><span class="chip">${icon('timer')} ${lesson.minutes} min</span><span class="chip saffron">${esc(lesson.location)}</span>` : '<span class="chip saffron">Replay any mission, or start a new class journal.</span>'}</div>
        </div>
        <div class="status"><i></i>${p.count} of ${p.total} cooked</div>
      </div>
      <div class="tracker-steps" role="list">
        ${lessons.map((l) => `<button type="button" role="listitem" data-open="${l.id}" class="${p.completed.has(l.id) ? 'done' : l.id === p.nextId ? 'next' : ''}" title="${l.order}. ${esc(l.title)} (${esc(l.location)})" aria-label="${l.order}. ${esc(l.title)}${p.completed.has(l.id) ? ', cooked' : ''}"></button>`).join('')}
      </div>
      <div class="tracker-actions">
        ${lesson ? `<button class="btn primary" data-open="${lesson.id}">${icon('play')}<span class="lbl">Open mission</span></button>
        <button class="btn" data-open="${lesson.id}" data-tab="plan">${icon('users')}<span class="lbl">Plan my class</span></button>
        <button class="btn" data-open="${lesson.id}" data-tab="packs">${icon('print')}<span class="lbl">Print packs</span></button>` : `<button class="btn primary" data-act-journal>${icon('book')}<span class="lbl">Open the Chef's Journal</span></button>`}
        <span class="spacer"></span>
        ${lesson ? `<button class="btn ghost small" data-fly="${lesson.id}">${icon('eye')}<span class="lbl">Show on map</span></button>` : ''}
      </div>`;
  }
  $('.tracker', ui).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.open) { burstFrom(b, 14); ambience.cue('pop'); goToMission(b.dataset.open, b.dataset.tab); }
    if (b.dataset.fly) world.focusLocation(b.dataset.fly);
    if ('actJournal' in b.dataset) openJournal(app);
  });

  // ------------------------------------------------------------------ labels
  const labelLayer = $('#labels');
  const tip = $('.loc-tip', ui);
  const labels = world.locations.items.map((item) => {
    const lesson = byId(item.id);
    const node = el(`<button type="button" class="loc-label ${item.isTutorial ? 'is-tutorial' : ''}" data-id="${item.id}">
      <span class="num">${item.isTutorial ? '★' : lesson?.order ?? ''}</span><span class="name">${esc(lesson?.location || item.name)}</span><span class="tag"></span></button>`);
    node.addEventListener('click', () => (item.isTutorial ? startTutorial() : goToMission(item.id)));
    node.addEventListener('mouseenter', () => showTip(item, node));
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('focus', () => showTip(item, node));
    node.addEventListener('blur', hideTip);
    labelLayer.append(node);
    return { item, node, lesson };
  });
  function updateLabels(p) {
    for (const l of labels) {
      const state = l.item.isTutorial ? 'is-tutorial' : p.completed.has(l.item.id) ? 'done' : l.item.id === p.nextId ? 'next' : p.freeRoam ? 'open' : 'asleep';
      l.node.classList.remove('done', 'next', 'asleep', 'open', 'is-tutorial');
      l.node.classList.add(state);
      l.node.querySelector('.tag').textContent = { 'is-tutorial': 'How to play', done: 'Cooked', next: 'Next', asleep: 'Later', open: 'Open' }[state];
      l.node.setAttribute('aria-label', `${l.lesson ? `Mission ${l.lesson.order}: ${l.lesson.title}, ${l.lesson.location}` : 'Welcome Kitchen: how to play'}. ${l.node.querySelector('.tag').textContent}.`);
    }
  }
  function showTip(item, node) {
    const lesson = byId(item.id);
    const p = progress();
    tip.innerHTML = lesson
      ? `<div class="kicker">Mission ${lesson.order} · ${esc(lesson.level)} · ${lesson.minutes} min</div><strong>${esc(lesson.title)}</strong>${esc(lesson.tagline || '')}${!p.completed.has(lesson.id) && lesson.id !== p.nextId && !p.freeRoam ? `<div class="muted" style="margin-top:6px">Best after mission ${lesson.order - 1}, but you can open it any time.</div>` : ''}`
      : `<div class="kicker">Start here</div><strong>Welcome Kitchen</strong>See the game in action and learn how missions work.`;
    tip.classList.add('show');
    tip.dataset.for = item.id;
    world.locations.setHover(item.id);
  }
  function hideTip() { tip.classList.remove('show'); delete tip.dataset.for; world.locations.setHover(null); }

  world.onFrame((camera) => {
    for (const l of labels) {
      const s = world.project(l.item.labelAnchor);
      const d = camera.position.distanceTo(l.item.labelAnchor);
      const scale = Math.max(0.9, Math.min(1.12, 135 / d));
      l.node.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      l.node.style.opacity = s.visible ? '' : '0';
      l.node.style.zIndex = String(1000 - Math.round(d));
      if (tip.dataset.for === l.item.id) tip.style.transform = `translate(${s.x}px, ${s.y + 8}px) translate(-50%, 0)`;
    }
  });

  // ------------------------------------------------------------------ navigation
  async function goToMission(id, tab) {
    const lesson = byId(id);
    if (!lesson) return;
    hideTip();
    await world.focusLocation(id, { distance: 30, seconds: 1.3 });
    openMission(app, lesson, { tab });
  }
  app.goToMission = goToMission;

  /** After "Mark as cooked": sparkles fly to the landmark, flag rises, fireworks, next beacon. */
  app.celebrate = async (id, fromElement) => {
    await world.focusLocation(id, { distance: 42, seconds: 1.2 });
    const item = world.locations.byId(id);
    const target = world.project(item.labelAnchor);
    const r = fromElement?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight - 120, width: 0, height: 0 };
    await comet(r.left + r.width / 2, r.top + r.height / 2, target.x, target.y);
    applyProgress();
    world.celebrate(id);
    ambience.cue('ding');
    const p = progress();
    toast(p.nextId ? `Mission cooked! The trail now glows to ${byId(p.nextId).location}.` : 'Every mission cooked. The whole valley is celebrating!');
    setTimeout(() => { if (p.nextId) world.focusLocation(p.nextId, { distance: 48, seconds: 2.2 }); }, 2600);
  };

  function startTutorial() {
    openTutorial(app, { onDone: () => { store.update((s) => { s.tutorialSeen = true; }); } });
  }
  app.startTutorial = startTutorial;

  // Weather/sound bridge (a few times per second is plenty for ambience).
  setInterval(() => ambience.update({ wind: 1, rain: world.weather.current === 'rain' ? 1 : 0 }), 500);
  world.weather.onChange((kind) => { $$('[data-weather]', ui).forEach((b) => b.classList.toggle('now', b.dataset.weather === kind)); });

  // ------------------------------------------------------------------ restore settings
  setNight(!!store.setting('night'));
  setWeather(store.setting('weather') || 'auto');
  setCalm(!!store.setting('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Sound needs a user gesture; the switch starts off and remembers nothing about autoplay.
  applyProgress();
  store.subscribe(() => applyProgress());

  addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select') || document.querySelector('.overlay, .tutorial, .classmode, .preview')) return;
    if (e.key === 'h' || e.key === 'Home') world.setView('valley');
    if (e.key === '+' || e.key === '=') world.zoom(0.75);
    if (e.key === '-') world.zoom(1.35);
  });

  if (!store.state.tutorialSeen) setTimeout(startTutorial, 600);
  return app;
}
