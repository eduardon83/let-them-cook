// classmode.js — the Kitchen Pass: a projector screen for running the mission live.
// Phase timer (a calm ring, no alarm), brigade stars for target-language use (brigades only,
// never individuals; cooperative mode adds them up to one class goal), a "Secret ingredient"
// twist draw, a visual kitchen bell and the word board.
import { $, $$, el, esc, icon, LOGO } from './dom.js';
import { store } from '../core/store.js';
import { planTeams, chooseWords, shapeSVG } from '../core/planner.js';
import { foodImage } from '../core/studio.js';
import { ambience } from './audio.js';
import { burst } from './fx.js';

export function openClassMode(app, lesson) {
  const plan = store.planFor(lesson.id);
  const { teams } = planTeams(lesson, plan);
  const words = chooseWords(lesson, plan);
  const phases = lesson.flow || [];
  const phaseName = Object.fromEntries(app.content.phases.map((p) => [p.id, p.name]));
  const twists = [...(lesson.twists || []), ...(app.content.twists || [])];
  const coop = plan.mode !== 'friendly';
  const stars = teams.map(() => 0);
  const goal = Math.max(10, teams.length * 5);
  let phase = 0, remaining = (phases[0]?.minutes || 10) * 60, running = false, timer = null, view = 'brigades';

  const root = el(`<div class="classmode" role="dialog" aria-modal="true" aria-label="Kitchen Pass for ${esc(lesson.title)}">
    <div class="cm-top">${LOGO.replace('class="brand-mark"', 'style="width:46px;height:46px"')}
      <div><div class="kicker" style="color:var(--gold)">Kitchen Pass · Mission ${lesson.order} · ${esc(lesson.location)}</div><h2>${esc(lesson.title)}</h2></div>
      <span class="spacer"></span>
      <button class="btn" data-act="bell">${icon('bell')} Kitchen bell</button>
      <button class="btn" data-act="full">${icon('projector')} Full screen</button>
      <button class="btn icon" data-act="close" aria-label="Close the Kitchen Pass">${icon('close')}</button>
    </div>
    <div class="cm-main">
      <div class="cm-panel">
        <div class="cm-phases">${phases.map((p, i) => `<button data-phase="${i}"><small>${esc(phaseName[p.phase] || p.phase)} · ${p.minutes} min</small>${esc(p.title)}</button>`).join('')}</div>
        <div class="cm-timer"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="5"/><circle class="ring" cx="50" cy="50" r="46" fill="none" stroke="#f2a33a" stroke-width="5" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="0"/></svg>
          <div style="text-align:center"><div class="t"></div><div class="p"></div></div></div>
        <div class="cm-controls">
          <button class="btn saffron" data-act="toggle">${icon('play')} Start</button>
          <button class="btn" data-act="plus">+1 min</button>
          <button class="btn" data-act="next">${icon('skip')} Next phase</button>
        </div>
        <ol class="cm-steps" style="margin:18px 0 0;line-height:1.6;font-size:17px;opacity:.9"></ol>
      </div>
      <div class="cm-panel">
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn small" data-view="brigades" aria-pressed="true">${icon('star')} Brigades</button>
          <button class="btn small" data-view="words" aria-pressed="false">${icon('utensils')} Word board</button>
        </div>
        <div data-pane="brigades">
          ${coop ? `<div style="margin-bottom:14px"><div class="kicker" style="color:var(--gold)">Class goal · cooking together</div><div style="height:16px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:8px"><i class="goal" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#f2c14e,#e4572e);transition:width .5s"></i></div><div class="goal-text" style="margin-top:6px;opacity:.8"></div></div>` : '<div class="kicker" style="color:var(--gold);margin-bottom:10px">Stars for using the target language</div>'}
          <div class="cm-brigades">${teams.map((t, i) => `<div class="cm-brigade" style="--c:${t.color}"><h5><img data-mascot="${t.mascot}" alt="" style="width:30px;height:30px;object-fit:contain">${shapeSVG(t.shape, t.color, 18)} ${esc(t.name)}</h5><div class="stars"><button data-star="${i}" data-d="-1" aria-label="Remove a star from ${esc(t.name)}">−</button><span data-count="${i}">0</span>★<button data-star="${i}" data-d="1" aria-label="Give a star to ${esc(t.name)}">+</button></div></div>`).join('')}</div>
          <div class="twist-card"><div class="twist-inner"><div class="twist-face twist-front">Secret ingredient!<br><small style="font:500 14px var(--font-ui);opacity:.85">Draw a twist</small></div><div class="twist-face twist-back"><div><b></b><span></span></div></div></div></div>
          <div class="cm-controls"><button class="btn" data-act="twist">${icon('shuffle')} Draw a secret ingredient</button></div>
        </div>
        <div data-pane="words" hidden><div class="cm-words">${words.map((w) => `<div class="cm-word" data-model="${esc(w.model || '')}"><img alt="">${esc(store.translation(`${lesson.id}:word:${w.id}`, w.en))}</div>`).join('')}</div></div>
      </div>
    </div>
    <div style="opacity:.6;font-size:13px">Stars celebrate brigades using the language, never individual learners. Space = start/pause · N = next phase · B = bell · Esc = close</div>
  </div>`);
  $('#app').append(root);
  app.world.setRunning(false);

  $$('img[data-mascot]', root).forEach(async (img) => { const url = await foodImage(img.dataset.mascot, 120); if (url) img.src = url; else img.hidden = true; });
  $$('.cm-word', root).forEach(async (n) => { const url = await foodImage(n.dataset.model, 200); const img = $('img', n); if (url) img.src = url; else img.remove(); });

  const ring = $('.ring', root);
  function render() {
    const total = (phases[phase]?.minutes || 1) * 60;
    const m = Math.floor(Math.max(0, remaining) / 60), s = Math.max(0, remaining) % 60;
    $('.t', root).textContent = remaining > 0 ? `${m}:${String(Math.floor(s)).padStart(2, '0')}` : 'Plate up!';
    $('.p', root).textContent = phases[phase] ? `${phaseName[phases[phase].phase] || ''} · ${phases[phase].title}` : '';
    ring.style.strokeDashoffset = String(289 * (1 - Math.max(0, remaining) / total));
    ring.style.stroke = remaining > 0 ? '#f2a33a' : '#7fd39a';
    $$('[data-phase]', root).forEach((b) => b.setAttribute('aria-current', String(+b.dataset.phase === phase)));
    $('.cm-steps', root).innerHTML = (phases[phase]?.steps || []).map((s) => `<li>${esc(s)}</li>`).join('');
    $('[data-act=toggle]', root).innerHTML = running ? `${icon('pause')} Pause` : `${icon('play')} ${remaining < total && remaining > 0 ? 'Resume' : 'Start'}`;
    stars.forEach((v, i) => { $(`[data-count="${i}"]`, root).textContent = v; });
    if (coop) {
      const sum = stars.reduce((a, b) => a + b, 0);
      $('.goal', root).style.width = `${Math.min(100, (sum / goal) * 100)}%`;
      $('.goal-text', root).textContent = sum >= goal ? `${sum} stars: the whole kitchen did it! Take a bow, chefs.` : `${sum} of ${goal} stars together`;
    }
  }
  function setPhase(i) { phase = Math.max(0, Math.min(phases.length - 1, i)); remaining = (phases[phase]?.minutes || 1) * 60; running = false; clearInterval(timer); render(); }
  function toggle() {
    running = !running;
    clearInterval(timer);
    if (running) timer = setInterval(() => { remaining -= 1; if (remaining <= 0) { running = false; clearInterval(timer); bell(); } render(); }, 1000);
    render();
  }
  function bell() {
    const flash = el('<div class="bell-flash"></div>');
    root.append(flash); setTimeout(() => flash.remove(), 1500);
    ambience.cue('ding');
  }
  function twist() {
    const card = $('.twist-card', root);
    card.classList.remove('flipped');
    setTimeout(() => {
      const t = twists[Math.floor(Math.random() * twists.length)];
      $('.twist-back b', root).textContent = t?.title || '';
      $('.twist-back span', root).textContent = t?.text || '';
      card.classList.add('flipped');
    }, 250);
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.phase) setPhase(+b.dataset.phase);
    if (b.dataset.star) {
      const i = +b.dataset.star; stars[i] = Math.max(0, stars[i] + +b.dataset.d);
      if (+b.dataset.d > 0) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 14); ambience.cue('pop'); }
      render();
    }
    if (b.dataset.view) {
      view = b.dataset.view;
      $$('[data-view]', root).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.view === view)));
      $$('[data-pane]', root).forEach((p) => { p.hidden = p.dataset.pane !== view; });
    }
    const act = b.dataset.act;
    if (act === 'toggle') toggle();
    if (act === 'plus') { remaining += 60; render(); }
    if (act === 'next') setPhase(phase + 1);
    if (act === 'bell') bell();
    if (act === 'twist') twist();
    if (act === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen?.(); }
    if (act === 'close') close();
  });
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key.toLowerCase() === 'n') setPhase(phase + 1);
    if (e.key.toLowerCase() === 'b') bell();
  };
  addEventListener('keydown', onKey, true);
  function close() {
    clearInterval(timer);
    removeEventListener('keydown', onKey, true);
    if (document.fullscreenElement) document.exitFullscreen();
    root.remove();
    if (!document.querySelector('.overlay')) app.world.setRunning(true);
  }
  render();
}
