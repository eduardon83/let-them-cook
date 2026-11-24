// tutorial.js — the welcome tutorial: Chef Olívia shows the game happening inside a working
// restaurant kitchen (brigade at the stove, waiter at the pass, guests at tables, the vendor at
// the door). Each slide moves the camera to the part of the kitchen it talks about.
import { $, $$, el, esc, icon, trapFocus, LOGO } from './dom.js';
import { createStage } from '../stage/stage.js';
import { buildKitchenSet } from '../stage/sets.js';
import { store } from '../core/store.js';
import { speak, stopSpeaking, canSpeak } from './audio.js';
import { burstFrom } from './fx.js';
import { downloadStarterPack } from '../docs/starter.js';

export function openTutorial(app, { onDone } = {}) {
  if ($('.tutorial')) return;
  const slides = app.content.tutorial?.slides || [];
  const root = el(`<div class="tutorial" role="dialog" aria-modal="true" aria-labelledby="tut-title">
    <canvas aria-hidden="true"></canvas>
    <div class="tut-top">
      <div class="brand glass">${LOGO}<div><div class="brand-name">Let'em <em>Cook!</em></div><div class="brand-sub">Welcome Kitchen · How it works</div></div></div>
      <div style="display:flex;gap:8px">
        ${canSpeak() ? `<button class="btn glass icon" data-act="read" aria-pressed="${!!store.setting('readAloud')}" title="Read aloud">${icon('sound')}</button>` : ''}
        <button class="btn glass" data-act="skip">Skip to the valley ${icon('right')}</button>
      </div>
    </div>
    <div class="tut-chef" aria-live="polite"><span class="who">Chef Olívia</span><span class="say"></span></div>
    <div class="tut-card glass">
      <div class="kicker"></div><h2 id="tut-title"></h2><div class="tut-body"></div>
      <div class="tut-nav"><div class="dots">${slides.map(() => '<i></i>').join('')}</div><span class="spacer"></span>
        <button class="btn ghost" data-act="back">${icon('left')} Back</button><button class="btn primary" data-act="next">Next ${icon('right')}</button></div>
    </div>
  </div>`);
  $('#app').append(root);
  const release = trapFocus(root);
  app.world.setRunning(false);
  const stage = createStage($('canvas', root));
  let index = 0, set = null, typing = null, closed = false;

  stage.mount(buildKitchenSet).then((s) => { set = s; stage.start(); show(0); });

  function show(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    const s = slides[index];
    if (!s) return;
    $('.kicker', root).textContent = `Step ${index + 1} of ${slides.length}`;
    $('#tut-title', root).textContent = s.title;
    $('.tut-body', root).innerHTML = `<p>${esc(s.text)}</p>${s.bullets?.length ? `<ul class="list">${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      ${index === slides.length - 1 ? `<button class="btn small" data-act="starter" style="margin-top:4px">${icon('download')} Download the starter pack</button>` : ''}`;
    $$('.dots i', root).forEach((d, k) => d.classList.toggle('on', k === index));
    $('[data-act=back]', root).disabled = index === 0;
    $('[data-act=next]', root).innerHTML = index === slides.length - 1 ? `Start the adventure ${icon('right')}` : `Next ${icon('right')}`;
    const card = $('.tut-card', root); card.style.animation = 'none'; void card.offsetWidth; card.style.animation = 'rise .5s both';
    stage.focus(s.focus === 'map' ? 'map' : s.focus || 'overview', 1.6);
    set?.highlight?.(s.focus);
    // Chef speech bubble.
    const bubble = $('.tut-chef', root); bubble.style.animation = 'none'; void bubble.offsetWidth; bubble.style.animation = '';
    const say = $('.say', root);
    clearInterval(typing);
    let n = 0;
    stage.setTalking(true);
    typing = setInterval(() => { n += 2; say.textContent = s.chef.slice(0, n); if (n >= s.chef.length) { clearInterval(typing); if (!store.setting('readAloud')) stage.setTalking(false); } }, 26);
    if (store.setting('readAloud')) speak(s.chef, { onend: () => stage.setTalking(false) });
  }

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'next') { burstFrom(b, 12); if (index < slides.length - 1) show(index + 1); else finish(); }
    if (act === 'back') show(index - 1);
    if (act === 'skip') finish();
    if (act === 'read') { const on = !store.setting('readAloud'); store.setSetting('readAloud', on); b.setAttribute('aria-pressed', String(on)); if (on) speak(slides[index].chef, { onend: () => stage.setTalking(false) }); else stopSpeaking(); }
    if (act === 'starter') { b.disabled = true; b.innerHTML = `${icon('download')} Cooking…`; try { await downloadStarterPack(app); } finally { b.disabled = false; b.innerHTML = `${icon('download')} Download the starter pack`; } }
  });
  const onKey = (e) => {
    if (e.key === 'Escape') finish();
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  };
  addEventListener('keydown', onKey);

  async function finish() {
    if (closed) return;
    closed = true;
    clearInterval(typing); stopSpeaking();
    removeEventListener('keydown', onKey);
    release();
    onDone?.();
    // Fly out of the Welcome Kitchen and over the valley.
    const gate = app.world.locations.byId('gate');
    app.world.rig.jumpTo('valley');
    app.world.rig.focusOn(gate.focusPoint, { distance: 16, elevation: 0.4, seconds: 0.01 });
    app.world.setRunning(true);
    root.style.transition = 'opacity .9s ease'; root.style.opacity = '0';
    setTimeout(() => { stage.dispose(); root.remove(); app.world.setView('valley'); }, 900);
    setTimeout(() => $('.tracker [data-open]')?.focus(), 2600);
  }
}
