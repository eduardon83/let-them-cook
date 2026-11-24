// mission.js — the mission panel: the host chef speaks the idea in their own 3D set, and the
// right-hand side holds everything a teacher needs: the idea, the lesson plan, the class
// planner, the printable packs and the "Cooked!" feedback.
import { $, $$, el, esc, icon, trapFocus, STEAM, sealSVG } from './dom.js';
import { createStage } from '../stage/stage.js';
import { buildMissionSet } from '../stage/sets.js';
import { store } from '../core/store.js';
import { chooseWords } from '../core/planner.js';
import { foodImage, portrait } from '../core/studio.js';
import { speak, stopSpeaking, canSpeak } from './audio.js';
import { renderPlanner } from './planner-ui.js';
import { renderPacks } from './packs-ui.js';
import { renderCooked } from './cooked.js';
import { burstFrom } from './fx.js';

const TABS = [
  ['idea', 'The idea', 'idea'], ['lesson', 'Lesson plan', 'list'], ['plan', 'Plan my class', 'users'],
  ['packs', 'Print & play', 'print'], ['done', 'Cooked!', 'seal']
];

let current = null;

export function openMission(app, lesson, { tab = 'idea' } = {}) {
  current?.close(true);
  const { world, content } = app;
  const roleById = Object.fromEntries(content.roles.map((r) => [r.id, r]));
  const phaseById = Object.fromEntries(content.phases.map((p) => [p.id, p]));
  const p = app.progress();
  const index = app.lessons.findIndex((l) => l.id === lesson.id);
  const prev = app.lessons[index - 1], next = app.lessons[index + 1];

  const overlay = el(`<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="mission-title">
    <div class="modal">
      <button class="btn icon modal-close" data-close aria-label="Close and return to the map">${icon('close')}</button>
      <div class="stage-pane">
        <canvas aria-hidden="true"></canvas>
        <div class="stage-top">
          <div class="host-card glass"><span class="avatar"></span><div><b>${esc(lesson.host?.name)}</b><small>${esc(lesson.host?.title)} · ${esc(lesson.location)}</small></div></div>
          <div style="display:flex;gap:6px">
            ${canSpeak() ? `<button class="btn glass icon" data-read aria-pressed="${!!store.setting('readAloud')}" title="Read aloud (uses this device's own voice)">${icon('sound')}</button>` : ''}
          </div>
        </div>
        <div class="bubble" aria-live="polite">
          <span class="who">${esc(lesson.host?.name)} says</span>
          <div class="line"></div>
          <div class="bubble-controls">
            <div class="dots">${(lesson.pitch || []).map(() => '<i></i>').join('')}</div>
            <div style="display:flex;gap:6px">
              <button class="btn small ghost" data-replay>${icon('replay')} Replay</button>
              <button class="btn small primary" data-next>Next ${icon('right')}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="content-pane">
        <div class="content-head">
          <div class="kicker">Mission ${lesson.order} · ${esc(lesson.location)}</div>
          <h2 id="mission-title">${esc(lesson.title)}</h2>
          <p class="tagline">${esc(lesson.tagline || '')}</p>
          <div class="meta">
            <span class="chip level">${esc(lesson.level)}</span>
            <span class="chip">${icon('timer')} ${lesson.minutes} min</span>
            ${store.isDone(lesson.id) ? `<span class="chip saffron">${icon('star')} Cooked</span>` : lesson.id === p.nextId ? `<span class="chip basil">${icon('flag')} Next on the trail</span>` : ''}
            ${(lesson.focus?.functions || []).slice(0, 2).map((f) => `<span class="chip">${esc(f)}</span>`).join('')}
          </div>
        </div>
        <div class="tabs" role="tablist">${TABS.map(([id, label, ic]) => `<button class="tab" role="tab" id="tab-${id}" aria-controls="tabpanel" aria-selected="false" data-tab="${id}">${icon(ic)}${label}</button>`).join('')}</div>
        <div class="tab-body" id="tabpanel" role="tabpanel" tabindex="0"></div>
        <div class="content-foot">
          ${prev ? `<button class="btn small ghost" data-go="${prev.id}">${icon('left')} ${esc(prev.location)}</button>` : ''}
          <span class="spacer"></span>
          ${next ? `<button class="btn small ghost" data-go="${next.id}">${esc(next.location)} ${icon('right')}</button>` : ''}
        </div>
      </div>
    </div>
  </div>`);
  $('#app').append(overlay);
  const release = trapFocus(overlay);
  world.setRunning(false);

  // ---------------------------------------------------------------- stage
  const stage = createStage($('canvas', overlay));
  const bubble = $('.bubble', overlay);
  const lineEl = $('.line', bubble);
  let lineIndex = 0, typing = null, mounted = null, closed = false;
  stage.mount(() => buildMissionSet(lesson)).then((set) => {
    if (closed) return;
    mounted = set;
    stage.start();
    say(0);
    portrait(lesson.host?.cast || 'olivia', { pose: 'Idle', at: 0.2, size: 160 }).then((url) => { $('.avatar', overlay).style.backgroundImage = `url(${url})`; });
  });

  function say(i) {
    const lines = lesson.pitch || [];
    if (!lines.length) return;
    lineIndex = Math.max(0, Math.min(lines.length - 1, i));
    $$('.dots i', bubble).forEach((d, k) => d.classList.toggle('on', k === lineIndex));
    $('[data-next]', bubble).innerHTML = lineIndex < lines.length - 1 ? `Next ${icon('right')}` : `Let's plan ${icon('right')}`;
    const text = lines[lineIndex];
    clearInterval(typing);
    let n = 0;
    stage.setTalking(true);
    if (lineIndex > 0 && Math.random() < 0.6) mounted?.gesture?.();
    typing = setInterval(() => {
      n += 2;
      lineEl.innerHTML = `${esc(text.slice(0, n))}<span class="caret"></span>`;
      if (n >= text.length) { clearInterval(typing); typing = null; lineEl.textContent = text; if (!store.setting('readAloud')) stage.setTalking(false); }
    }, 28);
    if (store.setting('readAloud')) {
      speak(text, { onend: () => { stage.setTalking(false); if (!closed && store.setting('readAloud') && lineIndex < lines.length - 1) setTimeout(() => say(lineIndex + 1), 500); } });
    }
  }
  const tailTimer = setInterval(() => {
    if (!mounted?.headPoint) return;
    const s = stage.project(mounted.headPoint());
    bubble.style.setProperty('--tail', `${Math.max(30, Math.min(bubble.clientWidth - 40, s.x - 22))}px`);
  }, 120);

  bubble.addEventListener('click', (e) => {
    if (e.target.closest('[data-replay]')) return say(0);
    if (e.target.closest('[data-next]')) {
      if (typing) { clearInterval(typing); typing = null; lineEl.textContent = lesson.pitch[lineIndex]; stage.setTalking(false); return; }
      if (lineIndex < (lesson.pitch || []).length - 1) say(lineIndex + 1);
      else { stopSpeaking(); stage.setTalking(false); select('plan'); }
    }
  });
  $('[data-read]', overlay)?.addEventListener('click', (e) => {
    const on = !store.setting('readAloud');
    store.setSetting('readAloud', on);
    e.currentTarget.setAttribute('aria-pressed', String(on));
    if (on) say(lineIndex); else { stopSpeaking(); stage.setTalking(false); }
  });

  // ---------------------------------------------------------------- tabs
  const body = $('.tab-body', overlay);
  function select(id) {
    $$('.tab', overlay).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    body.scrollTop = 0;
    body.setAttribute('aria-labelledby', `tab-${id}`);
    if (id === 'idea') renderIdea();
    if (id === 'lesson') renderLesson();
    if (id === 'plan') renderPlanner(body, app, lesson, { select });
    if (id === 'packs') renderPacks(body, app, lesson, { select });
    if (id === 'done') renderCooked(body, app, lesson, { close: () => close(), select });
  }
  $('.tabs', overlay).addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) select(t.dataset.tab); });
  $('.tabs', overlay).addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const tabs = $$('.tab', overlay); const i = tabs.indexOf(document.activeElement);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); select(n.dataset.tab);
  });

  function rolesInMission() {
    const ids = [...new Set([...(lesson.roles?.perTeam || []), ...(lesson.roles?.shared || [])].map((r) => r.role))];
    return ids.map((id) => roleById[id]).filter(Boolean);
  }

  function renderIdea() {
    const ahead = !store.isDone(lesson.id) && lesson.id !== p.nextId && !p.freeRoam && index > 0 && !store.isDone(prev.id);
    const roles = rolesInMission();
    body.innerHTML = `
      ${ahead ? `<div class="warn">${icon('idea')}<div><b>Chef's tip:</b> this mission builds on <b>${esc(prev.title)}</b> (${esc(prev.location)}). You can open and use it now; your class may need a quick warm-up first.</div></div><br>` : ''}
      <div class="section"><div class="pitch">${(lesson.pitch || []).map((l) => `<p>${esc(l)}</p>`).join('')}<div class="sig">— ${esc(lesson.host?.name)}, ${esc(lesson.host?.title)}</div></div></div>
      <div class="section"><h3>${icon('idea')} The idea in one minute</h3><p>${esc(lesson.summary)}</p></div>
      <div class="section grid2">
        <div class="card"><h4>Learners will say…</h4><ul class="list can">${(lesson.objectives || []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>
        <div class="card"><h4>Language on the menu</h4>
          <p class="muted" style="margin:0 0 6px">${esc(lesson.focus?.vocabulary || '')}</p>
          <div class="words" style="gap:6px">${[...(lesson.focus?.functions || []), ...(lesson.focus?.grammar || [])].map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="section"><h3>${icon('users')} Who's in the kitchen</h3><div class="roles">${roles.map((r) => `<div class="role" data-cast="${r.cast}"><span class="pic"></span><div><b>${esc(r.name)}</b><small>${esc(r.mission)}</small></div></div>`).join('')}</div></div>
      <div class="section"><h3>${icon('utensils')} Word ingredients</h3><div class="words" data-words>${chooseWords(lesson, store.planFor(lesson.id)).map((w) => `<span class="word" data-model="${esc(w.model || '')}"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">${esc(store.translation(`${lesson.id}:word:${w.id}`, w.en))}</span>`).join('')}</div></div>
      <div class="cta-band"><span class="steam" style="color:#fff8ec">${STEAM}</span><div><h4>${esc(lesson.cta || "Let'em cook!")}</h4><p>Tell us about your class, then print a pack made for it.</p></div><span class="spacer"></span>
        <button class="btn saffron" data-goto="plan">${icon('users')} Plan my class</button><button class="btn" style="--bg:transparent;--fg:#fff8ec;border-color:rgba(255,255,255,.3)" data-goto="packs">${icon('print')} Packs</button></div>
      <div class="section" style="display:flex;gap:16px;align-items:center"><div class="seal">${sealSVG(lesson, store.isDone(lesson.id), 120)}</div><div><h3 style="margin-bottom:4px">${esc(lesson.seal?.name || '')}</h3><p class="muted" style="margin:0">“${esc(lesson.seal?.motto || '')}” — stamped in your Chef's Journal when you mark this mission as cooked.</p></div></div>`;
    hydrateImages(body);
  }

  function renderLesson() {
    const flow = lesson.flow || [];
    body.innerHTML = `
      <div class="section"><h3>${icon('timer')} Lesson flow · ${lesson.minutes} minutes</h3>
        <div class="timeline">${flow.map((f) => `<div class="phase"><div class="clock">${f.minutes}<small>min</small></div><div class="body"><span class="pname">${esc(phaseById[f.phase]?.name || f.phase)}</span><h4>${esc(f.title)}</h4><ol>${(f.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>${f.tip ? `<div class="tip">💡 ${esc(f.tip)}</div>` : ''}</div></div>`).join('')}</div>
      </div>
      <div class="section grid2">
        <div class="card"><h4>Materials</h4><ul class="list">${(lesson.materials || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
        <div class="card"><h4>Before class</h4><ul class="list">${(lesson.preparation || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
      </div>
      <div class="section grid2">
        <div class="card"><h4>More support</h4><ul class="list">${(lesson.differentiation?.support || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
        <div class="card"><h4>More challenge</h4><ul class="list">${(lesson.differentiation?.stretch || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
      </div>
      <div class="section"><h3>${icon('heart')} Inclusion &amp; access</h3><ul class="list">${(lesson.inclusion || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
      <div class="section"><h3>${icon('lang')} Home languages as a bridge</h3><p>${esc(lesson.homeLanguage || '')}</p></div>
      <div class="section grid2">
        <div class="card"><h4>What to look for</h4><ul class="list">${(lesson.assessment?.observe || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul><p class="muted" style="margin-top:8px">${esc(lesson.assessment?.evidence || '')}</p></div>
        <div class="card"><h4>Taste &amp; Tell prompts</h4><ul class="list">${(lesson.reflection || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
      </div>
      <div class="section"><h3>${icon('spark')} Secret ingredients (twist cards)</h3><div class="grid2">${(lesson.twists || []).map((t) => `<div class="card"><h4>${esc(t.title)}</h4><p class="muted" style="margin:0">${esc(t.text)}</p></div>`).join('')}</div></div>
      <div class="section"><h3>${icon('right')} Keep cooking</h3><p>${esc(lesson.extension || '')}</p></div>
      <div class="section"><h3>${icon('utensils')} Useful phrases</h3><div class="grid2">${(lesson.phrases || []).map((ph, i) => `<div class="card" style="padding:10px 14px"><small class="muted">${esc(roleById[ph.role]?.name || '')}</small><div>${esc(store.translation(`${lesson.id}:phrase:${i}`, ph.en))}</div></div>`).join('')}</div></div>`;
  }

  overlay.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (e.target === overlay || b?.dataset.close !== undefined && b) return close();
    if (b?.dataset.goto) { burstFrom(b, 12); select(b.dataset.goto); }
    if (b?.dataset.go) { close(true); app.goToMission(b.dataset.go); }
  });
  const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.preview, .classmode')) close(); };
  addEventListener('keydown', onKey);

  function close(immediate = false) {
    if (closed) return;
    closed = true;
    clearInterval(typing); clearInterval(tailTimer);
    stopSpeaking();
    removeEventListener('keydown', onKey);
    release();
    world.setRunning(true);
    const finish = () => { stage.dispose(); overlay.remove(); if (current?.overlay === overlay) current = null; };
    if (immediate) finish(); else { overlay.classList.add('closing'); setTimeout(finish, 320); }
  }

  current = { overlay, close };
  select(TABS.some(([id]) => id === tab) ? tab : 'idea');
  setTimeout(() => $('.tab[aria-selected="true"]', overlay)?.focus({ preventScroll: true }), 50);
  return current;
}

/** Fills in pictures for elements carrying data-model / data-cast. */
export function hydrateImages(root) {
  $$('[data-model]', root).forEach(async (n) => {
    const img = n.querySelector('img');
    if (!img || !n.dataset.model) return;
    const url = await foodImage(n.dataset.model, 160);
    if (url) img.src = url; else img.remove();
  });
  $$('[data-cast]', root).forEach(async (n) => {
    const pic = n.querySelector('.pic');
    if (!pic) return;
    const url = await portrait(n.dataset.cast, { pose: 'Idle', at: 0.2, size: 200 });
    pic.style.backgroundImage = `url(${url}), linear-gradient(160deg, #fde7c4, #f4c37b)`;
  });
}
