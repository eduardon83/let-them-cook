// journal.js — the Chef's Journal: seals collected, feedback history, exports (backup, CSV for
// project evaluation, word lists to share with colleagues), settings and "About & privacy".
import { $, $$, el, esc, icon, trapFocus, download, toast, sealSVG, tasteFace } from './dom.js';
import { store } from '../core/store.js';

const TABS = [['seals', 'Seals', 'seal'], ['notes', 'Feedback', 'file'], ['share', 'Share & backup', 'download'], ['about', 'About & privacy', 'heart']];

export function openJournal(app, tab = 'seals') {
  if ($('.journal')) return;
  const overlay = el(`<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="journal-title"><div class="journal">
    <button class="btn icon modal-close" data-close aria-label="Close the journal">${icon('close')}</button>
    <div class="content-head"><div class="kicker">Chef's Journal</div><h2 id="journal-title">Your trail through Saffron Valley</h2><p class="tagline">Everything here stays in this browser. Export it to keep a backup or move it to another computer.</p></div>
    <div class="tabs" role="tablist">${TABS.map(([id, label, ic]) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="false">${icon(ic)}${label}</button>`).join('')}</div>
    <div class="tab-body" role="tabpanel"></div></div></div>`);
  $('#app').append(overlay);
  const release = trapFocus(overlay);
  const body = $('.tab-body', overlay);

  function select(id) {
    $$('.tab', overlay).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    ({ seals, notes, share, about })[id]();
  }

  function seals() {
    const p = app.progress();
    body.innerHTML = `
      <div class="section"><div class="summary-big"><div><b>${p.count}</b><div class="muted">of ${p.total} missions cooked</div></div></div>
        <div class="seals">${app.lessons.map((l) => `<button class="seal-slot ${p.completed.has(l.id) ? 'done' : 'todo'}" data-open="${l.id}">${sealSVG(l, p.completed.has(l.id), 86)}<b>${esc(l.location)}</b><span class="muted">${p.completed.has(l.id) ? new Date(store.state.completed[l.id].feedback?.date || store.state.completed[l.id].date).toLocaleDateString() : l.id === p.nextId ? 'Next on the trail' : esc(l.level)}</span></button>`).join('')}</div></div>
      <div class="section card"><label class="toggle" style="border:0;padding:0"><input type="checkbox" data-free ${store.setting('freeRoam') ? 'checked' : ''}><span><b>Free roam</b><small>Wake every mission on the map (no "Later" labels). Useful if you already know the game or teach the missions out of order.</small></span></label></div>`;
  }

  function notes() {
    const done = app.lessons.filter((l) => store.isDone(l.id));
    body.innerHTML = done.length ? `
      <div class="section" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="csv">${icon('download')} Feedback as spreadsheet (CSV)</button></div>
      ${done.map((l) => { const fb = store.state.completed[l.id].feedback || {}; return `<div class="card section"><div style="display:flex;gap:12px;align-items:center">${fb.taste ? tasteFace(fb.taste, 40) : ''}<div><div class="kicker">Mission ${l.order} · ${esc(new Date(fb.date || store.state.completed[l.id].date).toLocaleDateString())}</div><h4 style="margin:2px 0">${esc(l.title)}</h4><div class="muted">Energy ${fb.engagement ?? '–'}/5 · Target language ${fb.language ?? '–'}/5${fb.present ? ` · ${fb.present} learners` : ''}</div></div></div>${fb.worked ? `<p style="margin-top:10px"><b>Worked:</b> ${esc(fb.worked)}</p>` : ''}${fb.change ? `<p><b>Next time:</b> ${esc(fb.change)}</p>` : ''}</div>`; }).join('')}`
      : `<div class="cooked-banner"><div>${icon('book')}</div><div><h3>No missions cooked yet</h3><p class="muted" style="margin:0">When you teach a mission, open it and press <b>Cooked!</b> to leave a note for future you.</p></div></div>`;
  }

  function share() {
    const n = Object.keys(store.state.translations).length;
    body.innerHTML = `
      <div class="section grid2">
        <div class="card"><h4>${icon('book')} Backup</h4><p class="muted">Download your whole journal (progress, plans, notes, words) as one file, and load it again later or on another computer.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary small" data-act="export">${icon('download')} Download backup</button><label class="btn small">${icon('upload')} Load backup<input type="file" accept="application/json,.json" data-import="journal" hidden></label></div></div>
        <div class="card"><h4>${icon('lang')} Words in your language</h4><p class="muted">${n} word${n === 1 ? '' : 's'} and phrases translated. Share them with colleagues who teach the same language.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" data-act="words" ${n ? '' : 'disabled'}>${icon('download')} Download word list</button><label class="btn small">${icon('upload')} Load a word list<input type="file" accept="application/json,.json" data-import="words" hidden></label></div></div>
      </div>
      <div class="section card"><h4>Start again</h4><p class="muted">Clear progress, plans, notes and words from this browser. Download a backup first if you want to keep them.</p><button class="btn small ghost" data-act="reset">Clear my journal</button></div>`;
  }

  function about() {
    body.innerHTML = `
      <div class="section"><h3>${icon('hat')} What is Let'em Cook!?</h3><p>A classroom role-play game for people learning a new language. The class runs a restaurant town: brigades of learners play kitchen and restaurant roles, and every word is an ingredient. This map is the teacher's side: eight missions, each a full lesson plan you can adapt, print and play.</p></div>
      <div class="section grid2">
        <div class="card"><h4>${icon('eye')} Privacy</h4><ul class="list"><li>No accounts, no tracking, no analytics, no adverts.</li><li>Your plans and notes are saved only in this browser.</li><li>Learner names are never asked for; write them on paper.</li><li>Read-aloud uses your device's own voices only.</li><li>Nothing is sent to a server. Packs are made on your computer.</li></ul></div>
        <div class="card"><h4>${icon('check')} Check before class</h4><p class="muted">The lesson content lives in one file (<code>public/content/lessons.json</code>), apart from the code. Read every word list, phrase and answer yourself against your curriculum before you use it, and ask a colleague to look too.</p></div>
      </div>
      <div class="section"><h3>${icon('heart')} Credits</h3>
        <ul class="list">
          <li><b>3D models</b>: Kenney (Fantasy Town Kit, Hexagon Kit, Food Kit) · Kay Lousberg (KayKit Restaurant Bits) · Quaternius (Ultimate Modular Men &amp; Women). All CC0, public domain.</li>
          <li><b>Fonts</b>: Fraunces (Undercase Type) and Lexend (Bonnie Shaver-Troup, Thomas Jockin), SIL Open Font License, bundled with the app.</li>
          <li><b>Built with</b> three.js (MIT), Vite (MIT) and JSZip (MIT). Terrain, water, weather, characters' outfits and all printed layouts are drawn in code.</li>
        </ul></div>
      <div class="section"><h3>${icon('calm')} Accessibility</h3><p>Keyboard: Tab through every control, arrows switch tabs, Esc closes panels, H returns home. "Calm motion" (wave icon) slows the valley and switches off UI animation; it is on automatically if your system asks for reduced motion. There is no flashing content.</p></div>`;
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) return close();
    const b = e.target.closest('button');
    if (!b) return;
    if ('close' in b.dataset) return close();
    if (b.dataset.tab) return select(b.dataset.tab);
    if (b.dataset.open) { close(); app.goToMission(b.dataset.open); }
    const act = b.dataset.act;
    if (act === 'export') download(`letemcook-journal-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON());
    if (act === 'words') download('letemcook-words.json', JSON.stringify({ app: "Let'em Cook! words", translations: store.state.translations }, null, 2));
    if (act === 'csv') download('letemcook-feedback.csv', feedbackCSV(app), 'text/csv');
    if (act === 'reset' && confirm('Clear progress, plans, notes and words from this browser?')) { store.reset(); toast('Journal cleared. The trail starts again at the market.'); select('seals'); }
  });
  overlay.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.dataset.free !== undefined) { store.setSetting('freeRoam', t.checked); return; }
    if (!t.dataset.import || !t.files?.[0]) return;
    try {
      const text = await t.files[0].text();
      if (t.dataset.import === 'journal') { store.importJSON(text); toast('Journal loaded.'); }
      else {
        const data = JSON.parse(text);
        if (!data.translations) throw new Error('Not a word list');
        store.update((s) => { Object.assign(s.translations, data.translations); });
        toast(`${Object.keys(data.translations).length} words and phrases loaded.`);
      }
      share();
    } catch (err) { toast(`That file could not be loaded: ${err.message}`); }
  });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  function close() { removeEventListener('keydown', onKey); release(); overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 300); }
  select(TABS.some(([id]) => id === tab) ? tab : 'seals');
}

function feedbackCSV(app) {
  const rows = [['mission', 'title', 'level', 'date', 'taste_1to5', 'energy_1to5', 'target_language_1to5', 'learners', 'worked', 'change']];
  for (const l of app.lessons) {
    const entry = store.state.completed[l.id];
    if (!entry) continue;
    const f = entry.feedback || {};
    rows.push([l.order, l.title, l.level, f.date || entry.date, f.taste ?? '', f.engagement ?? '', f.language ?? '', f.present ?? '', f.worked || '', f.change || '']);
  }
  return '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
