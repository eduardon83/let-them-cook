// packs-ui.js — "Print & play": preview, print and download the mission's documents.
// Documents are generated in the browser from the saved class plan; "Download everything"
// bundles them as one ZIP of self-contained HTML files that print from any browser.
import JSZip from 'jszip';
import { $, $$, el, esc, icon, download, toast, STEAM } from './dom.js';
import { store } from '../core/store.js';
import { planTeams } from '../core/planner.js';
import { DOCS, prepareContext, buildDoc } from '../docs/pack.js';
import { foodImage, portrait } from '../core/studio.js';
import { openClassMode } from './classmode.js';
import { burstFrom } from './fx.js';

const THUMB_COLORS = { guide: ['#fde7c4', '#f4b56a'], roles: ['#fbe0ec', '#e88cb4'], words: ['#e3f1e2', '#8fcf9f'], mission: ['#dcecf7', '#86b9e0'], passport: ['#fbf0d0', '#e7c35a'], twists: ['#fde5d8', '#ef9a7a'], poster: ['#e9e2f7', '#ad97dc'], tents: ['#e8f4f2', '#7cc7bd'], certificates: ['#fff2cc', '#f2c14e'] };

const cache = new Map(); // key → { ctx, docs: Map }
function keyFor(lesson) {
  return `${lesson.id}|${JSON.stringify(store.planFor(lesson.id))}|${JSON.stringify(store.state.translations)}`;
}

async function getContext(app, lesson, onProgress) {
  const key = keyFor(lesson);
  if (!cache.has(key)) cache.set(key, { ctx: prepareContext(app, lesson, onProgress), docs: new Map() });
  const entry = cache.get(key);
  entry.ctx = await entry.ctx;
  return entry;
}
async function getDoc(app, lesson, id, onProgress) {
  const entry = await getContext(app, lesson, onProgress);
  if (!entry.docs.has(id)) entry.docs.set(id, buildDoc(entry.ctx, id));
  return entry.docs.get(id);
}

export function renderPacks(body, app, lesson, { select }) {
  const plan = store.planFor(lesson.id);
  const result = planTeams(lesson, plan);
  const roleById = Object.fromEntries(app.content.roles.map((r) => [r.id, r]));
  body.innerHTML = `
    <div class="cta-band"><span class="steam" style="color:#fff8ec">${STEAM}</span>
      <div><h4>Your pack is ready to cook</h4><p>Made for ${plan.students} learners in ${result.teams.length} brigade${result.teams.length > 1 ? 's' : ''}, ${Math.min(plan.words, lesson.words?.length || 24)} words, ${plan.languages.count} home language${plan.languages.count > 1 ? 's' : ''}${plan.needs.length ? `, ${plan.needs.length} adaptation${plan.needs.length > 1 ? 's' : ''}` : ''}.</p></div>
      <span class="spacer"></span>
      <button class="btn saffron" data-act="zip">${icon('download')} Download everything</button>
    </div>
    <div class="section" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <button class="btn" data-act="plan">${icon('users')} Change my class plan</button>
      <button class="btn primary" data-act="class">${icon('projector')} Run it in class (Kitchen Pass)</button>
      <span class="busy" hidden></span>
    </div>
    <div class="packs">${DOCS.map((d) => `<article class="pack" data-doc="${d.id}" style="--a:${THUMB_COLORS[d.id][0]};--b:${THUMB_COLORS[d.id][1]}">
      <div class="thumb"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span class="pages" hidden></span></div>
      <div class="info"><h4>${esc(d.title)}</h4><p>${esc(d.desc)}</p>
        <div class="row"><button class="btn small primary" data-act="preview">${icon('eye')} Preview &amp; print</button><button class="btn small icon" data-act="download" title="Download ${esc(d.title)}" aria-label="Download ${esc(d.title)}">${icon('download')}</button></div></div></article>`).join('')}</div>
    <p class="hint2" style="margin-top:14px">Tip: print at 100% scale on A4. Each file opens in any browser and can be saved as PDF. Pictures come from the 3D valley, and the art is CC0 (free to print and share).</p>`;

  // Thumbnails from the same art.
  const host = lesson.host?.cast || 'olivia';
  const firstWord = (lesson.words || []).find((w) => w.model);
  const roleCast = roleById[(lesson.roles?.perTeam || [])[0]?.role]?.cast || 'olivia';
  const thumbs = { guide: () => portrait(host, { pose: 'Wave', at: 0.35, crop: 'full', size: 300 }), roles: () => portrait(roleCast, { pose: 'Idle', crop: 'full', size: 300 }), words: () => foodImage(firstWord?.model, 240), mission: () => foodImage('kitchen/menu', 240), passport: () => foodImage('food/cookie', 240), twists: () => foodImage('food/cupcake', 240), poster: () => portrait('petra', { pose: 'Wave', at: 0.3, crop: 'full', size: 300 }), tents: () => foodImage('kitchen/table_round_A_decorated', 240), certificates: () => foodImage('food/cake-birthday', 240) };
  $$('.pack', body).forEach(async (card) => {
    const url = await thumbs[card.dataset.doc]?.().catch(() => null);
    if (url) $('img', card).src = url;
  });

  const busy = $('.busy', body);
  const setBusy = (text) => { busy.hidden = !text; busy.textContent = text || ''; };

  body.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'plan') return select('plan');
    if (act === 'class') return openClassMode(app, lesson);
    const docId = b.closest('[data-doc]')?.dataset.doc;
    try {
      if (act === 'preview') { burstFrom(b, 10); await openPreview(app, lesson, docId); }
      if (act === 'download') {
        setBusy('Cooking the document…');
        const doc = await getDoc(app, lesson, docId, setBusy);
        download(`letemcook-m${lesson.order}-${doc.filename}`, doc.html, 'text/html');
        markPages(body, doc);
      }
      if (act === 'zip') {
        burstFrom(b, 24);
        setBusy('Preparing pictures…');
        const zip = new JSZip();
        const folder = zip.folder(`letemcook-mission-${lesson.order}-${lesson.id}`);
        for (const d of DOCS) { setBusy(`Writing ${d.title.toLowerCase()}…`); const doc = await getDoc(app, lesson, d.id, setBusy); folder.file(doc.filename, doc.html); markPages(body, doc); }
        folder.file('README.txt', readme(lesson, plan, result));
        setBusy('Packing the box…');
        const blob = await zip.generateAsync({ type: 'blob' });
        download(`letemcook-mission-${lesson.order}-${lesson.id}.zip`, blob);
        toast('Pack downloaded. Open any file and press Print.');
      }
    } catch (err) {
      console.error(err);
      toast('Something burned while cooking the pack. Please try again.');
    } finally { setBusy(''); }
  });
}

function markPages(body, doc) {
  const p = $(`.pack[data-doc="${doc.id}"] .pages`, body);
  if (p) { p.hidden = false; p.textContent = `${doc.pages} page${doc.pages > 1 ? 's' : ''}`; }
}

function readme(lesson, plan, result) {
  return [
    `Let'em Cook! · Mission ${lesson.order}: ${lesson.title} (${lesson.location})`,
    `Level ${lesson.level} · ${lesson.minutes} minutes · ${plan.students} learners · ${result.teams.length} brigades`,
    '',
    'How to print',
    '1. Open a file in any web browser (double-click it).',
    '2. Press "Print / Save as PDF" at the top, or Ctrl+P (Cmd+P on a Mac).',
    '3. Paper: A4, scale 100%, margins: none, background graphics: on.',
    '',
    'Start with 01-guide.html: it lists how many copies of each file to print.',
    '',
    'Art: Kenney, KayKit (Kay Lousberg) and Quaternius, all CC0. Free to print and share.',
    "Made with Let'em Cook! Nothing about your class leaves your computer."
  ].join('\r\n');
}

export async function openPreview(app, lesson, firstDoc = 'guide') {
  const overlay = el(`<div class="preview" role="dialog" aria-modal="true" aria-label="Print preview">
    <div class="preview-bar"><h3>${esc(lesson.title)}</h3>
      <div class="preview-docs">${DOCS.map((d) => `<button class="btn small" data-doc="${d.id}" aria-pressed="false">${esc(d.title)}</button>`).join('')}</div>
      <span class="spacer"></span><span class="busy" hidden></span>
      <button class="btn small primary" data-act="print">${icon('print')} Print</button>
      <button class="btn small" data-act="download">${icon('download')} Download</button>
      <button class="btn small icon" data-act="close" aria-label="Close preview">${icon('close')}</button></div>
    <iframe title="Document preview"></iframe></div>`);
  $('#app').append(overlay);
  const frame = $('iframe', overlay);
  const busy = $('.busy', overlay);
  let doc = null;
  async function show(id) {
    $$('[data-doc]', overlay).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.doc === id)));
    busy.hidden = false; busy.textContent = 'Cooking…';
    doc = await getDoc(app, lesson, id, (t) => { busy.textContent = t; });
    frame.srcdoc = doc.html;
    busy.hidden = true;
  }
  overlay.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.doc) show(b.dataset.doc);
    if (b.dataset.act === 'print') frame.contentWindow?.print();
    if (b.dataset.act === 'download' && doc) download(`letemcook-m${lesson.order}-${doc.filename}`, doc.html, 'text/html');
    if (b.dataset.act === 'close') close();
  });
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', onKey, true);
  function close() { removeEventListener('keydown', onKey, true); overlay.remove(); }
  await show(firstDoc);
}
