// cooked.js — "Cooked!": mark a mission as taught and leave feedback (kept in this browser;
// exportable from the Chef's Journal). Completing it stamps the seal, raises the flag on the
// landmark and lights the trail to the next mission.
import { $, $$, esc, icon, tasteFace, sealSVG } from './dom.js';
import { store } from '../core/store.js';
import { burstFrom } from './fx.js';

const TASTE = ['Not yet', 'Needs salt', 'Tasty', 'Very tasty', 'Delicious!'];

export function renderCooked(body, app, lesson, { close }) {
  const entry = store.state.completed[lesson.id];
  if (entry && !body.dataset.editing) return renderDone(body, app, lesson, entry, { close });
  delete body.dataset.editing;
  const fb = entry?.feedback || {};
  const today = new Date().toISOString().slice(0, 10);
  body.innerHTML = `
    <div class="cooked-banner"><div class="seal">${sealSVG(lesson, false, 110)}</div><div><h3>Did you cook it?</h3><p class="muted" style="margin:0">Tell the valley how it went. Your notes stay in this browser and help you (and your colleagues, if you share them) cook it even better next time.</p></div></div>
    <form class="section" novalidate>
      <div class="field"><div class="label">How did the lesson taste?</div>
        <div class="taste" role="radiogroup" aria-label="Overall rating">${TASTE.map((t, i) => `<label><input type="radio" name="taste" value="${i + 1}" ${fb.taste === i + 1 ? 'checked' : ''}>${tasteFace(i + 1)}<span>${t}</span></label>`).join('')}</div></div>
      <div class="grid2">
        <div class="field"><label for="ck-eng">Learners' energy <span class="value" data-o="eng">${fb.engagement || 3}</span></label><input id="ck-eng" type="range" min="1" max="5" value="${fb.engagement || 3}" name="engagement"><div class="hint2">1 quiet · 5 buzzing</div></div>
        <div class="field"><label for="ck-lang">Target language used <span class="value" data-o="lang">${fb.language || 3}</span></label><input id="ck-lang" type="range" min="1" max="5" value="${fb.language || 3}" name="language"><div class="hint2">1 rarely · 5 almost always</div></div>
      </div>
      <div class="field"><label for="ck-worked">What worked well?</label><textarea id="ck-worked" name="worked" placeholder="e.g. The vendors loved the price list; shy learners joined as sous-chefs.">${esc(fb.worked || '')}</textarea></div>
      <div class="field"><label for="ck-change">What would you change next time?</label><textarea id="ck-change" name="change" placeholder="e.g. Fewer words for my A1 group; more time for Service.">${esc(fb.change || '')}</textarea></div>
      <div class="grid2">
        <div class="field"><label for="ck-date">Date taught</label><input id="ck-date" class="text-input" type="date" name="date" value="${fb.date || today}"></div>
        <div class="field"><label for="ck-n">Learners present</label><input id="ck-n" class="text-input" type="number" min="1" max="60" name="present" value="${fb.present || store.planFor(lesson.id).students}"></div>
      </div>
      <p class="hint2">Please don't write learners' names here. Describe what happened, not who did it.</p>
      <div style="display:flex;gap:10px;margin-top:10px"><button class="btn primary" type="submit">${icon('check')} Mark as cooked</button>${entry ? '<button class="btn" type="button" data-cancel>Cancel</button>' : ''}</div>
    </form>`;
  const form = $('form', body);
  form.addEventListener('input', (e) => {
    if (e.target.name === 'engagement') $('[data-o=eng]', body).textContent = e.target.value;
    if (e.target.name === 'language') $('[data-o=lang]', body).textContent = e.target.value;
  });
  $('[data-cancel]', body)?.addEventListener('click', () => renderCooked(body, app, lesson, { close }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const feedback = {
      taste: +data.get('taste') || null, engagement: +data.get('engagement'), language: +data.get('language'),
      worked: String(data.get('worked') || '').trim(), change: String(data.get('change') || '').trim(),
      date: data.get('date') || today, present: +data.get('present') || null
    };
    const button = $('button[type=submit]', form);
    const rect = button.getBoundingClientRect();
    burstFrom(button, 30);
    store.complete(lesson.id, feedback);
    close();
    app.celebrate(lesson.id, { getBoundingClientRect: () => rect });
  });
}

function renderDone(body, app, lesson, entry, { close }) {
  const fb = entry.feedback || {};
  const next = app.lessons.find((l) => !store.isDone(l.id));
  body.innerHTML = `
    <div class="cooked-banner"><div class="seal">${sealSVG(lesson, true, 120)}</div><div><div class="kicker">Cooked on ${esc(new Date(fb.date || entry.date).toLocaleDateString())}</div><h3>${esc(lesson.seal?.name || 'Mission cooked!')}</h3><p class="muted" style="margin:0">“${esc(lesson.seal?.motto || '')}”</p></div></div>
    <div class="section grid2">
      <div class="card"><h4>How it tasted</h4><div style="display:flex;align-items:center;gap:10px">${fb.taste ? tasteFace(fb.taste, 44) : ''}<div><b>${fb.taste ? TASTE[fb.taste - 1] : 'No rating'}</b><div class="muted">Energy ${fb.engagement ?? '–'}/5 · Target language ${fb.language ?? '–'}/5${fb.present ? ` · ${fb.present} learners` : ''}</div></div></div></div>
      <div class="card"><h4>Next on the trail</h4><p class="muted" style="margin:0 0 10px">${next ? `${esc(next.title)} at ${esc(next.location)} (${esc(next.level)})` : 'Every mission is cooked. Time for a Grand Service rerun?'}</p>${next ? `<button class="btn small primary" data-next="${next.id}">${icon('right')} Go to mission ${next.order}</button>` : ''}</div>
    </div>
    ${fb.worked ? `<div class="section"><h3>${icon('heart')} What worked</h3><p>${esc(fb.worked)}</p></div>` : ''}
    ${fb.change ? `<div class="section"><h3>${icon('idea')} Next time</h3><p>${esc(fb.change)}</p></div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-edit>${icon('file')} Edit feedback</button><button class="btn ghost" data-undo>Mark as not cooked</button></div>`;
  body.addEventListener('click', function handler(e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.next) { body.removeEventListener('click', handler); close(); app.goToMission(b.dataset.next); }
    if ('edit' in b.dataset) { body.removeEventListener('click', handler); body.dataset.editing = '1'; renderCooked(body, app, lesson, { close }); }
    if ('undo' in b.dataset) { body.removeEventListener('click', handler); store.uncomplete(lesson.id); renderCooked(body, app, lesson, { close }); }
  });
}
