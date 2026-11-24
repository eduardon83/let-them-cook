// planner-ui.js — "Plan my class": class size, words, team type, roles the teacher plays,
// languages, specific needs, food sensitivities and the accessibility checklist. Brigades are
// recalculated live and the plan autosaves (this browser only).
import { $, $$, esc, icon } from './dom.js';
import { store } from '../core/store.js';
import { planTeams, chooseWords, shapeSVG } from '../core/planner.js';
import { hydrateImages } from './mission.js';
import { burstFrom } from './fx.js';

const AVOID = [['pork', 'Pork'], ['alcohol', 'Alcohol'], ['meat', 'All meat'], ['fish', 'Fish'], ['nuts', 'Nuts'], ['dairy', 'Dairy'], ['gluten', 'Gluten'], ['egg', 'Egg']];

export function renderPlanner(body, app, lesson, { select }) {
  const { content } = app;
  const roleById = Object.fromEntries(content.roles.map((r) => [r.id, r]));
  let plan = store.planFor(lesson.id);
  const save = () => store.savePlan(lesson.id, plan);

  const missionRoles = [...(lesson.roles?.shared || []).map((r) => ({ ...r, shared: true })), ...(lesson.roles?.perTeam || [])];
  const coverable = missionRoles.filter((r) => roleById[r.role]?.teacherCanPlay);
  const maxWords = (lesson.words || []).length || 24;

  body.innerHTML = `
    <div class="planner">
      <div class="inputs">
        <div class="field"><label for="pl-students">Learners in class <span class="value" data-out="students"></span></label>
          <div class="number-row"><input id="pl-students" type="range" min="1" max="40" step="1"><input type="number" min="1" max="60" aria-label="Number of learners"></div></div>
        <div class="field"><label for="pl-words">Target words <span class="value" data-out="words"></span></label>
          <input id="pl-words" type="range" min="6" max="${maxWords}" step="1">
          <div class="hint2">Fewer words for a first lesson; more to recycle and stretch.</div></div>
        <div class="field"><div class="label">How brigades are mixed</div>
          <div class="options">${(content.teamTypes || []).map((t) => `<label class="option">${t.recommended ? '<span class="rec">Recommended</span>' : ''}<input type="radio" name="teamType" value="${t.id}"><b>${esc(t.label)}</b><small>${esc(t.description)}</small></label>`).join('')}</div></div>
        <div class="field"><div class="label">I'll play these actors myself</div>
          <div class="toggles">${coverable.length ? coverable.map((r) => `<label class="toggle"><input type="checkbox" name="teacherRoles" value="${r.role}"><span><b>${esc(roleById[r.role].name)}</b><small>${r.shared ? 'Serve every brigade yourself' : 'Only with one brigade (small classes)'}</small></span></label>`).join('') : '<p class="muted">Every actor in this mission is played by learners.</p>'}</div></div>
        <div class="field"><label for="pl-langs">Home languages in the class <span class="value" data-out="langs"></span></label>
          <input id="pl-langs" type="range" min="1" max="6" step="1">
          <div class="hint2">Word cards get a line for each language, so learners can bridge from what they know. Names are optional.</div>
          <div class="lang-names"></div></div>
        <div class="field"><div class="label">Specific needs</div>
          <div class="toggles">${(content.needs || []).map((n) => `<label class="toggle"><input type="checkbox" name="needs" value="${n.id}"><span><b>${esc(n.label)}</b><small>${esc(n.description)}</small></span></label>`).join('')}</div></div>
        <div class="field"><div class="label">Leave these foods out of the cards</div>
          <div class="options" style="grid-template-columns:repeat(4,1fr)">${AVOID.map(([id, label]) => `<label class="option" style="text-align:center"><input type="checkbox" name="avoid" value="${id}"><b>${label}</b></label>`).join('')}</div>
          <div class="hint2">Pork and alcohol are left out by default, so every learner can handle every card.</div></div>
        <div class="field"><div class="label">Play style</div>
          <div class="options">
            <label class="option"><input type="radio" name="mode" value="cooperative"><b>Cooperative kitchen</b><small>Brigades help each other reach a class goal.</small></label>
            <label class="option"><input type="radio" name="mode" value="friendly"><b>Friendly competition</b><small>Brigades collect stars for language use. No individual ranking.</small></label>
          </div></div>
        <div class="field"><div class="label">Access &amp; safety checklist <span class="muted" data-out="checks"></span></div>
          <div class="toggles">${(content.checks || []).map((c) => `<label class="toggle"><input type="checkbox" name="checks" value="${c.id}"><span><b>${esc(c.label)}</b><small>${esc(c.detail)}</small></span></label>`).join('')}</div></div>
        <details class="field card"><summary style="cursor:pointer;font-weight:600">${icon('lang')} The words in the language you teach</summary>
          <p class="hint2">Cards show English until you type your own. Your words are saved in this browser and can be exported from the Chef's Journal to share with colleagues.</p>
          <label class="hint2" for="pl-target">Language you teach</label><input id="pl-target" class="text-input" placeholder="e.g. Slovene, Portuguese, German">
          <table class="words-table" style="margin-top:10px"><tbody>${(lesson.words || []).map((w) => `<tr data-model="${esc(w.model || '')}"><td><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></td><td>${esc(w.en)}</td><td><input data-word="${w.id}" value="${esc(store.translation(`${lesson.id}:word:${w.id}`, ''))}" placeholder="${esc(w.en)}" aria-label="${esc(w.en)} in your language"></td></tr>`).join('')}</tbody></table>
          <h4 style="margin:16px 0 6px">Key phrases</h4>
          <table class="words-table"><tbody>${(lesson.phrases || []).map((ph, i) => `<tr><td style="width:45%">${esc(ph.en)}</td><td><input data-phrase="${i}" value="${esc(store.translation(`${lesson.id}:phrase:${i}`, ''))}" placeholder="${esc(ph.en)}" aria-label="${esc(ph.en)} in your language"></td></tr>`).join('')}</tbody></table>
        </details>
      </div>
      <div class="result"><div class="card" style="background:#fffaf0">
        <div class="kicker">Your kitchen</div>
        <div class="summary-big"><div><b data-out="teams"></b><div class="muted">brigades</div></div><div><b data-out="size"></b><div class="muted">learners each</div></div><div><b data-out="wordsN"></b><div class="muted">words</div></div></div>
        <div class="brigades" data-out="brigades"></div>
        <div data-out="shared" style="margin-top:12px"></div>
        <div data-out="warnings"></div>
        <div data-out="adapt" style="margin-top:12px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
          <button class="btn primary" data-act="print">${icon('print')} Print my pack</button>
          <button class="btn" data-act="default">${icon('check')} Use for every mission</button>
        </div>
        <p class="hint2" data-out="saved" style="margin-top:8px">${icon('check')} Saved automatically for this mission.</p>
      </div></div>
    </div>`;

  // ---------------------------------------------------------------- bind inputs
  const studentsRange = $('#pl-students', body), studentsNum = $('.number-row input[type=number]', body);
  const wordsRange = $('#pl-words', body), langsRange = $('#pl-langs', body);
  studentsRange.value = Math.min(40, plan.students); studentsNum.value = plan.students;
  wordsRange.value = Math.min(maxWords, plan.words);
  langsRange.value = plan.languages.count;
  $$('input[name=teamType]', body).forEach((i) => { i.checked = i.value === plan.teamType; });
  $$('input[name=teacherRoles]', body).forEach((i) => { i.checked = plan.teacherRoles.includes(i.value); });
  $$('input[name=needs]', body).forEach((i) => { i.checked = plan.needs.includes(i.value); });
  $$('input[name=avoid]', body).forEach((i) => { i.checked = plan.avoid.includes(i.value); });
  $$('input[name=mode]', body).forEach((i) => { i.checked = i.value === plan.mode; });
  $$('input[name=checks]', body).forEach((i) => { i.checked = plan.checks.includes(i.value); });
  $('#pl-target', body).value = plan.targetLanguage === 'English' ? '' : plan.targetLanguage || '';

  function renderLangNames() {
    const box = $('.lang-names', body);
    const n = plan.languages.count;
    plan.languages.names = Array.from({ length: n }, (_, i) => plan.languages.names[i] || '');
    box.innerHTML = plan.languages.names.map((v, i) => `<input data-lang="${i}" value="${esc(v)}" placeholder="Language ${i + 1} (optional)" aria-label="Home language ${i + 1}">`).join('');
  }
  renderLangNames();

  body.addEventListener('input', (e) => {
    const t = e.target;
    if (t === studentsRange) { plan.students = +t.value; studentsNum.value = t.value; }
    else if (t === studentsNum) { plan.students = Math.max(1, Math.min(60, +t.value || 1)); studentsRange.value = Math.min(40, plan.students); }
    else if (t === wordsRange) plan.words = +t.value;
    else if (t === langsRange) { plan.languages.count = +t.value; renderLangNames(); }
    else if (t.dataset.lang !== undefined) plan.languages.names[+t.dataset.lang] = t.value;
    else if (t.id === 'pl-target') plan.targetLanguage = t.value.trim() || 'English';
    else if (t.dataset.word) { store.setTranslation(`${lesson.id}:word:${t.dataset.word}`, t.value); return; }
    else if (t.dataset.phrase) { store.setTranslation(`${lesson.id}:phrase:${t.dataset.phrase}`, t.value); return; }
    else if (t.name === 'teamType' || t.name === 'mode') plan[t.name] = t.value;
    else if (['teacherRoles', 'needs', 'avoid', 'checks'].includes(t.name)) plan[t.name] = $$(`input[name=${t.name}]:checked`, body).map((i) => i.value);
    else return;
    save(); update();
  });

  body.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'print') { burstFrom(b); select('packs'); }
    if (b.dataset.act === 'default') { store.savePlan(lesson.id, plan, { asDefault: true }); burstFrom(b); $('[data-out=saved]', body).innerHTML = `${icon('check')} Saved as your class profile: new missions start with these settings.`; }
  });

  function update() {
    const result = planTeams(lesson, plan);
    const words = chooseWords(lesson, plan);
    const out = (k) => $(`[data-out=${k}]`, body);
    out('students').textContent = plan.students;
    out('words').textContent = plan.words;
    out('langs').textContent = plan.languages.count;
    out('checks').textContent = `${plan.checks.length}/${(content.checks || []).length} done`;
    out('teams').textContent = result.teams.length;
    const sizes = [...new Set(result.teams.map((t) => t.size))].sort();
    out('size').textContent = sizes.join('–');
    out('wordsN').textContent = words.length;
    out('brigades').innerHTML = result.teams.map((t, i) => `<div class="brigade" style="--c:${t.color};animation-delay:${i * 0.04}s">
      <h5><span class="mascot" data-model="${t.mascot}"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></span>${shapeSVG(t.shape, t.color, 14)} ${esc(t.name)}</h5>
      <ul>${t.roles.map((r) => `<li>${r.teacher ? '👩‍🏫 ' : `${r.count} × `}${esc(roleById[r.role]?.name || r.role)}${r.teacher ? ' (you)' : ''}</li>`).join('')}</ul>
      <div class="seats">${'<i></i>'.repeat(t.size)}</div></div>`).join('');
    hydrateImages(out('brigades'));
    const shared = result.shared.filter((s) => s.count || s.teacher);
    out('shared').innerHTML = shared.length ? `<div class="kicker" style="margin-bottom:6px">Shared stations</div><div class="words">${shared.map((s) => `<span class="chip ${s.teacher ? 'saffron' : ''}">${s.teacher ? 'You' : s.count + ' ×'} ${esc(roleById[s.role]?.name || s.role)}</span>`).join('')}</div>` : '';
    out('warnings').innerHTML = result.warnings.map((w) => `<div class="warn">${icon('idea')}<span>${esc(w)}</span></div>`).join('');
    const adapt = (content.needs || []).filter((n) => plan.needs.includes(n.id));
    out('adapt').innerHTML = adapt.length ? `<div class="kicker" style="margin-bottom:6px">Added to your teacher guide</div><ul class="list">${adapt.flatMap((n) => n.adaptations.slice(0, 2).map((a) => `<li>${esc(a)}</li>`)).join('')}</ul>` : '';
    wordsRange.max = Math.max(6, (lesson.words || []).filter((w) => !(w.tags || []).some((t) => plan.avoid.includes(t))).length);
  }
  update();
  hydrateImages(body);
}
