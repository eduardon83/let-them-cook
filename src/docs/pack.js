// pack.js — builds the printable documents for a mission from lessons.json + the class plan.
// Every document is a self-contained A4 HTML file (fonts and pictures embedded) that prints
// cleanly from any browser ("Save as PDF" works too). Pictures are rendered from the same 3D
// models as the valley, so the class sees the characters and food the teacher chose.
import { store } from '../core/store.js';
import { planTeams, chooseWords, shapeSVG } from '../core/planner.js';
import { foodImage, portrait, missionScene } from '../core/studio.js';
import { embeddedFonts, PRINT_CSS } from './print-style.js';
import { esc, sealSVG, tasteFace, LOGO } from '../ui/dom.js';

export const DOCS = [
  { id: 'guide', title: 'Teacher mission guide', desc: 'Your plan, brigades, timings, steps and checklists.', icon: 'host' },
  { id: 'roles', title: 'Role cards', desc: 'One set per brigade, with the brigade shape, mission and phrases.', icon: 'role' },
  { id: 'words', title: 'Word ingredient cards', desc: 'Picture cards with lines for every home language.', icon: 'food' },
  { id: 'mission', title: 'Mission materials', desc: 'The playable cards: lists, recipes, menus, forms.', icon: 'card' },
  { id: 'passport', title: 'Kitchen Passport', desc: 'A self-check page for each learner, ready for your stamp.', icon: 'seal' },
  { id: 'twists', title: 'Secret ingredient cards', desc: 'Surprise twists to draw when the kitchen gets busy.', icon: 'twist' },
  { id: 'poster', title: 'Classroom poster', desc: 'Key phrases and words to put on the wall.', icon: 'poster' },
  { id: 'tents', title: 'Brigade table signs', desc: 'Fold-in-half table signs with shapes and roles.', icon: 'tent' },
  { id: 'certificates', title: 'Brigade certificates', desc: 'Celebrate every brigade at the end of the mission.', icon: 'cert' }
];

const PHASE_COLORS = ['#3f8f5b', '#3b8fc4', '#e4572e', '#6b4fa0', '#d9821a'];
const ROLE_COLORS = { kitchen: '#e4572e', dining: '#3b8fc4', market: '#d9821a', support: '#6b4fa0' };
const STAR = '<svg class="star" viewBox="0 0 24 24"><path d="m12 2 2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17l-6 3.3 1.3-6.7-5-4.6 6.8-.8z" fill="#f2a33a" stroke="#2b2a33" stroke-width="1.2"/></svg>';

/** Collects the plan, words and pictures a pack needs. onProgress(text). */
export async function prepareContext(app, lesson, onProgress = () => {}) {
  const { content, world } = app;
  const plan = store.planFor(lesson.id);
  const result = planTeams(lesson, plan);
  const words = chooseWords(lesson, plan);
  const roleById = Object.fromEntries(content.roles.map((r) => [r.id, r]));
  const wordById = Object.fromEntries((lesson.words || []).map((w) => [w.id, w]));
  const roleIds = [...new Set([...(lesson.roles?.perTeam || []), ...(lesson.roles?.shared || [])].map((r) => r.role))].filter((id) => roleById[id]);
  const img = { food: {}, cast: {}, bust: {} };

  onProgress('Painting the mission scene…');
  img.scene = await missionScene(lesson);
  onProgress('Calling the cast for portraits…');
  for (const id of new Set([...roleIds.map((r) => roleById[r].cast), lesson.host?.cast].filter(Boolean))) {
    img.cast[id] = await portrait(id, { pose: 'Idle', at: 0.25, crop: 'full', size: 520 });
    img.bust[id] = await portrait(id, { pose: 'Wave', at: 0.3, crop: 'bust', size: 360 });
  }
  img.bust.host = await portrait(lesson.host?.cast || 'olivia', { pose: 'Wave', at: 0.35, crop: 'bust', size: 420 });
  onProgress('Plating the ingredients…');
  const models = new Set(words.map((w) => w.model).filter(Boolean));
  for (const card of lesson.cards || []) for (const it of card.items || []) if (it.word && wordById[it.word]?.model) models.add(wordById[it.word].model);
  for (const t of result.teams) if (t.mascot) models.add(t.mascot);
  for (const m of models) img.food[m] = await foodImage(m, 360);
  onProgress('Sketching the map…');
  try {
    const loc = world.locations.byId(lesson.id);
    const f = loc.focusPoint;
    img.map = world.snapshot({ position: [f.x + 16, f.y + 22, f.z + 26], target: [f.x, f.y, f.z], width: 900, height: 560 });
  } catch { img.map = null; }

  const t = (w) => store.translation(`${lesson.id}:word:${w.id}`, w.en);
  const tp = (i, fallback) => store.translation(`${lesson.id}:phrase:${i}`, fallback);
  const flags = {
    dyslexia: plan.needs.includes('dyslexia'), large: plan.needs.includes('large-print'),
    literacy: plan.needs.includes('low-literacy'), contrast: plan.needs.includes('low-vision'), colour: plan.needs.includes('colour-vision')
  };
  return { app, content, lesson, plan, result, words, roleById, wordById, roleIds, img, t, tp, flags, phaseById: Object.fromEntries(content.phases.map((p) => [p.id, p])) };
}

// ------------------------------------------------------------------ shared bits
const brigadeBadge = (b, size = 16) => `<span class="brig-badge" style="display:inline-flex;align-items:center;gap:1.2mm">${shapeSVG(b.shape, b.color, size)}<b>${esc(b.name)}</b></span>`;

function topbar(ctx, docTitle) {
  return `<div class="topbar">${LOGO.replace('class="brand-mark"', 'class="logo"')}<div class="brand">Let'em <em>Cook!</em><div class="kicker" style="margin-top:.6mm">Mission ${ctx.lesson.order} · ${esc(ctx.lesson.location)}</div></div><div class="doc"><b>${esc(docTitle)}</b>${esc(ctx.lesson.title)} · ${esc(ctx.lesson.level)}</div></div>`;
}
function foot(ctx, n) {
  return `<div class="foot"><span>Saffron Valley · ${esc(ctx.lesson.title)}${ctx.plan.targetLanguage && ctx.plan.targetLanguage !== 'English' ? ` · ${esc(ctx.plan.targetLanguage)}` : ''}</span><span>Art: Kenney, KayKit, Quaternius (CC0)${n ? ` · ${n}` : ''}</span></div>`;
}
const page = (ctx, title, inner, n = '') => `<section class="page">${topbar(ctx, title)}${inner}${foot(ctx, n)}</section>`;
function wordPic(ctx, w, cls = '') {
  const url = w?.model && ctx.img.food[w.model];
  return url ? `<img class="${cls}" src="${url}" alt="">` : '';
}

function bodyClass(ctx) {
  return [ctx.flags.dyslexia && 'dyslexia', ctx.flags.large && 'large', ctx.flags.contrast && 'contrast'].filter(Boolean).join(' ');
}

export async function wrapDocument(ctx, title, pages) {
  const fonts = await embeddedFonts();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)} · ${esc(ctx.lesson?.title || "Let'em Cook!")}</title>
<style>${fonts}${PRINT_CSS}</style></head><body class="${bodyClass(ctx)}">
<div class="noprint" style="position:sticky;top:0;z-index:9;background:#2b2a33;color:#fff8ec;padding:10px 16px;font:14px var(--text);display:flex;gap:12px;align-items:center">
<b style="font-family:var(--display)">${esc(title)}</b><span style="opacity:.75">${pages.length} page${pages.length > 1 ? 's' : ''} · A4 · print at 100% (no scaling)</span>
<button onclick="print()" style="margin-left:auto;background:#f2a33a;border:0;border-radius:99px;padding:8px 16px;font:600 14px var(--text);cursor:pointer">Print / Save as PDF</button></div>
${pages.join('\n')}</body></html>`;
}

// ------------------------------------------------------------------ 1. teacher guide
function guide(ctx) {
  const { lesson, plan, result, roleById, content, img } = ctx;
  const S = plan.students;
  const needs = (content.needs || []).filter((n) => plan.needs.includes(n.id));
  const teamType = (content.teamTypes || []).find((t) => t.id === plan.teamType);
  const checks = content.checks || [];
  const perTeamCards = (lesson.cards || []).filter((c) => c.copies === 'perTeam').length;
  const perStudent = (lesson.cards || []).filter((c) => c.copies === 'perStudent');
  const T = result.teams.length;

  const p1 = `
    <div class="hero"><img src="${img.scene}" alt=""><div class="seal">${sealSVG(lesson, true, 112)}</div>
      <div class="title"><div class="kicker">Mission ${lesson.order} · ${esc(lesson.location)} · hosted by ${esc(lesson.host?.name)}</div><h1>${esc(lesson.title)}</h1>
      <span class="chip dark">${esc(lesson.level)}</span><span class="chip">${lesson.minutes} minutes</span><span class="chip">${S} learners · ${T} brigade${T > 1 ? 's' : ''}</span><span class="chip">${ctx.words.length} words</span></div></div>
    <div class="quote">“${esc((lesson.pitch || []).join(' '))}”<div class="kicker" style="margin-top:2mm">— ${esc(lesson.host?.name)}, ${esc(lesson.host?.title)}</div></div>
    <div class="cols">
      <div><h2>The idea</h2><p>${esc(lesson.summary)}</p>
        <h3 style="margin-top:3mm">Learners will say…</h3><ul class="can">${(lesson.objectives || []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
        <h3 style="margin-top:3mm">Success looks like</h3><ul>${(lesson.successCriteria || []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>
      <div><div class="box cream"><h3>Language on the menu</h3>
          <p class="muted" style="margin-bottom:1.5mm">${esc(lesson.focus?.vocabulary || '')}</p>
          ${[...(lesson.focus?.functions || []), ...(lesson.focus?.grammar || [])].map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>
        ${img.map ? `<div style="margin-top:4mm;border-radius:4mm;overflow:hidden;height:46mm"><img src="${img.map}" alt="" style="width:100%;height:100%;object-fit:cover"></div><div class="muted" style="font-size:7.5pt;margin-top:1mm">${esc(lesson.location)} on the Saffron Valley trail.</div>` : ''}
      </div>
    </div>`;

  const p2 = `
    <h2>Your kitchen today</h2>
    <p class="muted">${S} learners → ${T} brigade${T > 1 ? 's' : ''}${result.shared.some((s) => s.count) ? ` + ${result.shared.filter((s) => s.count).map((s) => `${s.count} ${roleById[s.role]?.name}`).join(', ')}` : ''}. Mixing: <b>${esc(teamType?.label || plan.teamType)}</b>. ${esc(teamType?.tip || '')}</p>
    <table class="table" style="margin:2mm 0 4mm"><thead><tr><th>Brigade</th><th>Seats</th><th>Roles</th><th>Names (write by hand)</th></tr></thead><tbody>
      ${result.teams.map((b) => `<tr><td>${brigadeBadge(b)}</td><td>${b.size}</td><td>${b.roles.map((r) => `${r.teacher ? 'You' : r.count + '×'} ${esc(roleById[r.role]?.name || r.role)}`).join('<br>')}</td><td><div class="line" style="height:${Math.max(7, b.size * 3.2)}mm"></div></td></tr>`).join('')}
      ${result.shared.filter((s) => s.count || s.teacher).map((s) => `<tr><td><b>Shared station</b></td><td>${s.teacher ? '–' : s.count}</td><td>${s.teacher ? 'You play' : `${s.count}×`} ${esc(roleById[s.role]?.name || s.role)}</td><td><div class="line"></div></td></tr>`).join('')}
    </tbody></table>
    ${result.warnings.length ? `<div class="box cream" style="margin-bottom:4mm"><h3>Chef's notes</h3><ul>${result.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    <h2>Lesson flow · ${lesson.minutes} minutes</h2>
    ${(lesson.flow || []).map((f, i) => `<div class="phase"><div class="clock" style="background:${PHASE_COLORS[i % 5]}">${f.minutes}<small>min</small></div><div><div class="kicker" style="color:${PHASE_COLORS[i % 5]}">${esc(ctx.phaseById[f.phase]?.name || f.phase)}</div><h3>${esc(f.title)}</h3><ol>${(f.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>${f.tip ? `<div class="tip">Tip: ${esc(f.tip)}</div>` : ''}</div></div>`).join('')}`;

  const printList = [
    ['Role cards', `${T} set${T > 1 ? 's' : ''} (already one per brigade)`],
    ['Word ingredient cards', `${T} copies (one set per brigade)`],
    perTeamCards ? ['Mission materials', `already one per brigade${perStudent.length ? `; ${perStudent.map((c) => esc(c.title)).join(', ')}: ${S} copies` : ''}`] : ['Mission materials', perStudent.length ? `${S} copies of ${perStudent.map((c) => esc(c.title)).join(', ')}` : '1 copy'],
    ['Kitchen Passport', `${Math.ceil(S / 2)} sheets (2 passports per sheet)`],
    ['Secret ingredient cards', '1 set (cut and shuffle)'],
    ['Classroom poster', '1 (A3 if your printer can)'],
    ['Brigade table signs', `${T} (fold along the dashed line)`],
    ['Certificates', `${Math.ceil(T / 2)} sheets`]
  ];
  const p3 = `
    <div class="cols">
      <div>
        <h2>Print list</h2><table class="table" style="margin-bottom:4mm"><tbody>${printList.map(([a, b]) => `<tr><td><span class="check"></span>${a}</td><td class="muted">${b}</td></tr>`).join('')}</tbody></table>
        <h3>Also needed</h3><ul style="margin-bottom:3mm">${(lesson.materials || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
        <h3>Before class</h3><ul style="margin-bottom:3mm">${(lesson.preparation || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
        <h3>Home languages as a bridge</h3><p>${esc(lesson.homeLanguage || '')}</p>
        ${plan.languages.names.filter(Boolean).length ? `<p class="muted">Languages in this class: ${plan.languages.names.filter(Boolean).map(esc).join(', ')}</p>` : ''}
      </div>
      <div>
        <div class="box cream" style="margin-bottom:4mm"><h3>More support</h3><ul>${(lesson.differentiation?.support || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
          <h3 style="margin-top:2mm">More challenge</h3><ul>${(lesson.differentiation?.stretch || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
        ${needs.length ? `<div class="box" style="margin-bottom:4mm"><h3>Adapted for your class</h3>${needs.map((n) => `<p style="margin-bottom:1mm"><b>${esc(n.label)}</b></p><ul style="margin-bottom:2mm">${n.adaptations.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`).join('')}</div>` : ''}
        <h3>Inclusion in this mission</h3><ul style="margin-bottom:3mm">${(lesson.inclusion || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
        <h3>What to look for</h3><ul style="margin-bottom:2mm">${(lesson.assessment?.observe || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul><p class="muted">${esc(lesson.assessment?.evidence || '')}</p>
      </div>
    </div>`;

  const p4 = `
    <div class="cols">
      <div><h2>Access &amp; safety check</h2><table class="table"><tbody>${checks.map((c) => `<tr><td style="width:7mm"><span class="check">${plan.checks.includes(c.id) ? '✓' : ''}</span></td><td><b>${esc(c.label)}</b><div class="muted">${esc(c.detail)}</div></td></tr>`).join('')}</tbody></table></div>
      <div>
        <h2>Taste &amp; Tell</h2><ul style="margin-bottom:4mm">${(lesson.reflection || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
        <h2>Keep cooking</h2><p>${esc(lesson.extension || '')}</p>
        <div class="box cream" style="margin-top:5mm"><h3>After class</h3><p>Open <b>${esc(lesson.location)}</b> in Saffron Valley and press <b>Cooked!</b> to stamp the ${esc(lesson.seal?.name || 'seal')} and light the trail to the next mission.</p>
          <div style="display:flex;gap:3mm;align-items:center;margin-top:3mm">${sealSVG(lesson, true, 80)}<div><div class="kicker">Checked by</div><div class="line" style="width:60mm"></div><div class="kicker" style="margin-top:3mm">Date</div><div class="line" style="width:40mm"></div></div></div></div>
      </div>
    </div>`;
  return [page(ctx, 'Teacher mission guide', p1, '1'), page(ctx, 'Teacher mission guide', p2, '2'), page(ctx, 'Teacher mission guide', p3, '3'), page(ctx, 'Teacher mission guide', p4, '4')];
}

// ------------------------------------------------------------------ 2. role cards
function roleCard(ctx, roleId, brigade) {
  const role = ctx.roleById[roleId];
  if (!role) return '';
  const color = ROLE_COLORS[role.kind] || '#e4572e';
  const lessonPhrases = (ctx.lesson.phrases || []).map((p, i) => ({ ...p, text: ctx.tp(i, p.en) })).filter((p) => p.role === roleId).map((p) => p.text);
  const phrases = [...lessonPhrases, ...(role.phrases || [])].slice(0, ctx.flags.literacy ? 2 : 4);
  return `<div class="role-card">
    <div class="band" style="background:${color}"><h3>${esc(role.name)}</h3>${brigade ? `<span class="badge">${shapeSVG(brigade.shape, brigade.color, 14)} ${esc(brigade.name)}</span>` : '<span class="badge">Shared station</span>'}</div>
    <div class="bodyr">
      <div class="who"><div class="avatar" style="border-color:${color}">${ctx.img.bust[role.cast] ? `<img src="${ctx.img.bust[role.cast]}" alt="">` : ''}</div>
        <div><div class="kicker">Your mission</div><p class="mission">${esc(role.mission)}</p></div></div>
      ${ctx.flags.literacy ? '' : `<ul class="does">${(role.does || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`}
      <div class="kicker">Say it!</div><div class="say">${phrases.map((p) => `<div>${esc(p)}</div>`).join('')}</div>
      <div class="icons">${role.seated ? '<span>Can sit</span>' : ''}${role.quietFriendly ? '<span>Quiet role</span>' : ''}<span>Mission ${ctx.lesson.order}</span></div>
    </div></div>`;
}
function roles(ctx) {
  const perPage = ctx.flags.large ? 2 : 4;
  const cards = [];
  // One card per learner: a brigade with three line cooks gets three Line Cook cards.
  for (const b of ctx.result.teams) for (const r of b.roles) if (!r.teacher) for (let k = 0; k < r.count; k++) cards.push(roleCard(ctx, r.role, b));
  for (const s of ctx.result.shared) for (let i = 0; i < s.count; i++) cards.push(roleCard(ctx, s.role, null));
  const pages = [];
  for (let i = 0; i < cards.length; i += perPage) {
    pages.push(page(ctx, 'Role cards', `<div class="scissors">✂ Cut along the dashed lines · one card per learner · <b>Wear your role, chef. The kitchen needs your words!</b></div><div class="cut-grid" style="grid-template-columns:${perPage === 4 ? '1fr 1fr' : '1fr'};grid-template-rows:repeat(2,1fr)">${cards.slice(i, i + perPage).join('')}</div>`, `${pages.length + 1}`));
  }
  return pages;
}

// ------------------------------------------------------------------ 3. word cards
function wordCard(ctx, w) {
  const label = ctx.t(w);
  const translated = label !== w.en;
  const langs = Array.from({ length: ctx.plan.languages.count }, (_, i) => ctx.plan.languages.names[i] || `Language ${i + 1}`);
  const pic = w.model && ctx.img.food[w.model] ? `<img src="${ctx.img.food[w.model]}" alt="">` : `<div class="no-pic">${esc(label[0] || '?')}</div>`;
  if (ctx.flags.literacy) {
    return `<div class="word-card" style="grid-template-columns:1fr;text-align:center"><span class="group">${esc(w.group || '')}</span><div class="pic" style="max-height:none">${pic}</div><div class="w">${esc(label)}</div>${langs.slice(0, 2).map((l) => `<div class="lang"><div class="line"></div></div>`).join('')}</div>`;
  }
  return `<div class="word-card"><span class="group">${esc(w.group || '')}</span><div class="pic">${pic}</div>
    <div><div class="w">${esc(label)}</div>${translated ? `<div class="en">${esc(w.en)}</div>` : ''}
    <div class="lang">${langs.map((l) => `<div class="l">${esc(l)}</div><div class="line"></div>`).join('')}</div></div></div>`;
}
function wordsDoc(ctx) {
  const cols = ctx.flags.large || ctx.flags.literacy ? 2 : 2, rows = ctx.flags.large || ctx.flags.literacy ? 2 : 4;
  const per = cols * rows;
  const pages = [];
  for (let i = 0; i < ctx.words.length; i += per) {
    pages.push(page(ctx, 'Word ingredient cards', `<div class="scissors">✂ One set per brigade · write the word in your own language on the lines · <b>Point it, say it, cook it!</b></div><div class="cut-grid" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">${ctx.words.slice(i, i + per).map((w) => wordCard(ctx, w)).join('')}${'<div></div>'.repeat(Math.max(0, per - ctx.words.slice(i, i + per).length))}</div>`, `${pages.length + 1}`));
  }
  return pages;
}

// ------------------------------------------------------------------ 4. mission materials
function cardItems(ctx, card) {
  const W = (it) => ctx.wordById[it.word];
  const items = card.items || [];
  switch (card.kind) {
    case 'recipe': return items.map((it, i) => `<div class="step"><span class="n">${i + 1}</span><span>${wordPic(ctx, W(it))}</span><span>${esc(it.text)}</span></div>`).join('');
    case 'menu': return items.map((it) => `<div class="menu-row">${wordPic(ctx, W(it))}<span>${esc(it.text || (W(it) ? ctx.t(W(it)) : ''))}</span><span class="dots"></span><b>${esc(it.value || '')}</b></div>`).join('');
    case 'list': return items.map((it) => `<div class="listrow"><span class="check"></span><span>${wordPic(ctx, W(it))}</span><span>${esc(it.text || (W(it) ? ctx.t(W(it)) : ''))}</span><b>${esc(it.value || '')}</b></div>`).join('');
    case 'dialogue': return `<div class="dialogue">${items.map((it) => `<div class="d"><span class="who">${esc(ctx.roleById[it.speaker]?.name || it.speaker || '')}</span><div class="bubble ${it.blank ? 'blank' : ''}">${it.blank ? '' : esc(it.text)}</div></div>`).join('')}</div>`;
    case 'form': return items.map((it) => `<div style="margin:2.5mm 0"><div class="kicker" style="color:var(--soft)">${esc(it.text)}</div><div class="line"></div></div>`).join('');
    case 'grid': {
      const n = Math.ceil(Math.sqrt(items.length));
      return `<div class="bingo" style="grid-template-columns:repeat(${n},1fr)">${items.map((it) => `<div>${wordPic(ctx, W(it))}<span>${esc(W(it) ? ctx.t(W(it)) : it.text || '')}</span></div>`).join('')}</div>`;
    }
    default: return items.map((it) => `<p>${esc(it.text)}</p>`).join('');
  }
}
function missionCard(ctx, card, brigade, copiesNote, full = false) {
  const forRole = card.for && ctx.roleById[card.for] ? ctx.roleById[card.for].name : card.for === 'team' ? 'Whole brigade' : card.for === 'all' ? 'Everyone' : '';
  return `<div class="mission-card${full ? ' full' : ''}">${brigade ? `<div class="brig">${shapeSVG(brigade.shape, brigade.color, 16)} ${esc(brigade.name)}</div>` : copiesNote ? `<div class="brig muted">${esc(copiesNote)}</div>` : ''}
    <div class="kicker">${esc(forRole)}</div><h2>${esc(card.title)}</h2>${card.subtitle ? `<p class="muted">${esc(card.subtitle)}</p>` : ''}
    ${cardItems(ctx, card)}${card.note ? `<p class="muted" style="margin-top:3mm;font-size:8.5pt;margin-right:26mm">${esc(card.note)}</p>` : ''}
    ${ctx.img.bust.host ? `<img class="mc-host" src="${ctx.img.bust.host}" alt="">` : ''}</div>`;
}
function missionDoc(ctx) {
  const blocks = [];
  for (const card of ctx.lesson.cards || []) {
    // A half page holds about six picture rows (or a 3×3 grid); longer cards get a full page.
    const n = (card.items || []).length;
    const big = card.kind === 'grid' ? n > 9 : n > 6;
    if (card.copies === 'perTeam') for (const b of ctx.result.teams) blocks.push({ html: missionCard(ctx, card, b, '', big), big });
    else blocks.push({ html: missionCard(ctx, card, null, card.copies === 'perStudent' ? `Copies: ${ctx.plan.students}` : '', big), big });
  }
  const pages = [];
  let pending = [];
  const flush = () => { if (pending.length) { pages.push(page(ctx, 'Mission materials', `<div style="display:grid;grid-template-rows:${pending.length === 2 ? '1fr 1fr' : '1fr'};gap:5mm;flex:1;min-height:0">${pending.join('')}</div>`, `${pages.length + 1}`)); pending = []; } };
  for (const b of blocks) {
    if (b.big) { flush(); pending.push(b.html); flush(); continue; }
    pending.push(b.html);
    if (pending.length === 2) flush();
  }
  flush();
  return pages;
}

// ------------------------------------------------------------------ 5. passport
function passportDoc(ctx) {
  const { lesson } = ctx;
  const one = `<div class="passport">
    <div style="display:flex;flex-direction:column;min-height:0"><div class="kicker">Kitchen Passport · Mission ${lesson.order}</div><h2 style="margin:1mm 0 2mm">${esc(lesson.title)}</h2>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:2mm;align-items:end;margin-bottom:3mm"><span class="kicker" style="color:var(--soft)">Chef</span><div class="line"></div></div>
      <table class="table"><tbody>${(lesson.objectives || []).map((o) => `<tr><td>${esc(o)}</td><td class="faces" style="white-space:nowrap">${[1, 3, 5].map((l) => tasteFace(l, 22)).join('')}</td></tr>`).join('')}</tbody></table>
      <div class="cols" style="margin-top:3mm"><div><div class="kicker" style="color:var(--soft)">My new word</div><div class="line"></div></div><div><div class="kicker" style="color:var(--soft)">In my language</div><div class="line"></div></div></div>
      <div class="draw"><span class="kicker" style="color:var(--soft)">Draw the best dish of the day</span></div>
    </div>
    <div style="display:grid;gap:3mm;align-content:start;justify-items:center"><div class="stamp">Stamp<br>here</div>${sealSVG(lesson, false, 70)}<div class="muted" style="font-size:7pt;text-align:center">Circle a face:<br>not yet · getting there · yes!</div></div>
  </div>`;
  return [page(ctx, 'Kitchen Passport', `<div class="scissors">✂ Two passports per sheet · print ${Math.ceil(ctx.plan.students / 2)} sheets</div><div style="display:grid;grid-template-rows:1fr 1fr;gap:8mm;flex:1">${one}${one}</div>`)];
}

// ------------------------------------------------------------------ 6. twists
function twistsDoc(ctx) {
  const all = [...(ctx.lesson.twists || []), ...(ctx.content.twists || []).slice(0, 4)];
  const per = ctx.flags.large ? 4 : 8;
  const pages = [];
  for (let i = 0; i < all.length; i += per) {
    const slice = all.slice(i, i + per);
    pages.push(page(ctx, 'Secret ingredient cards', `<div class="scissors">✂ Cut, shuffle, and draw one when the kitchen needs a surprise</div><div class="cut-grid" style="grid-template-columns:1fr 1fr;grid-template-rows:repeat(${per / 2},1fr)">${slice.map((tw) => `<div class="twist">${STAR}<div class="kicker">Secret ingredient</div><div class="t">${esc(tw.title)}</div><div>${esc(tw.text)}</div></div>`).join('')}${'<div></div>'.repeat(per - slice.length)}</div>`, `${pages.length + 1}`));
  }
  return pages;
}

// ------------------------------------------------------------------ 7. poster
function posterDoc(ctx) {
  const { lesson } = ctx;
  const phrases = (lesson.phrases || []).slice(0, 6).map((p, i) => ctx.tp(i, p.en));
  const words = ctx.words.slice(0, 10);
  return [`<section class="page" style="padding:0;background:linear-gradient(180deg,#fff4dc,#fffdf8 55%)">
    <div style="height:118mm;position:relative;overflow:hidden"><img src="${ctx.img.scene}" alt="" style="width:100%;height:100%;object-fit:cover">
      <div style="position:absolute;left:12mm;top:10mm;right:12mm;display:flex;justify-content:space-between;align-items:flex-start">${LOGO.replace('class="brand-mark"', 'style="width:20mm;height:20mm"')}${sealSVG(lesson, true, 110)}</div></div>
    <div style="padding:8mm 14mm 0;flex:1;display:flex;flex-direction:column;gap:5mm">
      <div><div class="kicker">Mission ${lesson.order} · ${esc(lesson.location)} · ${esc(lesson.level)}</div><div class="poster-title">${esc(lesson.title)}</div></div>
      <div><span class="cta">${esc(lesson.cta || "Let'em cook!")}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm">${phrases.map((p) => `<div class="speech">${esc(p)}</div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:3mm;margin-top:auto;margin-bottom:16mm">${words.map((w) => `<div style="text-align:center;font-weight:700;font-size:10pt">${wordPic(ctx, w).replace('<img', '<img style="width:24mm;height:22mm;object-fit:contain;display:block;margin:0 auto"')}${esc(ctx.t(w))}</div>`).join('')}</div>
    </div>${foot(ctx, '')}</section>`];
}

// ------------------------------------------------------------------ 8. table tents
function tentsDoc(ctx) {
  return ctx.result.teams.map((b) => {
    const mascot = ctx.img.food[b.mascot];
    const half = `<div style="display:grid;justify-items:center;gap:3mm">
      <div style="position:relative;width:64mm;height:54mm;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle, ${b.color}38, transparent 70%)">${mascot ? `<img src="${mascot}" alt="" style="max-width:52mm;max-height:48mm">` : ''}<span style="position:absolute;right:0;bottom:0">${shapeSVG(b.shape, b.color, 64)}</span></div>
      <div style="font:800 34pt/1 var(--display)">${esc(b.name)}</div>
      <div class="kicker">Mission ${ctx.lesson.order} · ${esc(ctx.lesson.title)}</div>
      <div style="display:grid;grid-template-columns:auto 50mm;gap:2mm 4mm;align-items:end;margin-top:3mm;text-align:left">${b.roles.filter((r) => !r.teacher).flatMap((r) => Array.from({ length: r.count }, () => `<span style="font-weight:600">${esc(ctx.roleById[r.role]?.name || r.role)}</span><div class="line" style="height:6mm"></div>`)).join('')}</div></div>`;
    return `<section class="page" style="padding:0"><div class="tent-half flip">${half}</div><div class="fold">fold here</div><div class="tent-half">${half}</div></section>`;
  });
}

// ------------------------------------------------------------------ 9. certificates
function certificatesDoc(ctx) {
  const { lesson } = ctx;
  const cert = (b) => `<div class="cert"><div class="kicker">Let'em Cook! · Saffron Valley</div>${sealSVG(lesson, true, 92)}
    <div class="muted">This certifies that the</div><div class="big" style="display:flex;align-items:center;gap:3mm">${ctx.img.food[b.mascot] ? `<img src="${ctx.img.food[b.mascot]}" alt="" style="width:16mm;height:16mm;object-fit:contain">` : ''}${shapeSVG(b.shape, b.color, 30)} ${esc(b.name)}</div>
    <div class="muted">cooked <b>${esc(lesson.title)}</b> at ${esc(lesson.location)}<br>and earned the <b>${esc(lesson.seal?.name || 'Seal')}</b>.</div>
    <div style="display:flex;gap:2mm;margin:1mm 0">${STAR.replace('class="star"', 'width="22" height="22"').repeat(3)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10mm;width:100%;margin-top:2mm"><div><div class="line"></div><div class="kicker" style="color:var(--soft)">Head of the kitchen</div></div><div><div class="line"></div><div class="kicker" style="color:var(--soft)">Date</div></div></div></div>`;
  const pages = [];
  const teams = ctx.result.teams;
  for (let i = 0; i < teams.length; i += 2) {
    pages.push(`<section class="page"><div style="display:grid;grid-template-rows:1fr 1fr;gap:8mm;flex:1">${cert(teams[i])}${teams[i + 1] ? cert(teams[i + 1]) : '<div></div>'}</div>${foot(ctx, '')}</section>`);
  }
  return pages;
}

const BUILDERS = { guide, roles, words: wordsDoc, mission: missionDoc, passport: passportDoc, twists: twistsDoc, poster: posterDoc, tents: tentsDoc, certificates: certificatesDoc };

export async function buildDoc(ctx, id) {
  const meta = DOCS.find((d) => d.id === id);
  const pages = BUILDERS[id](ctx);
  return { id, title: meta.title, filename: `${String(DOCS.indexOf(meta) + 1).padStart(2, '0')}-${id}.html`, pages: pages.length, html: await wrapDocument(ctx, meta.title, pages) };
}

export async function buildAll(ctx, onProgress = () => {}) {
  const out = [];
  for (const d of DOCS) { onProgress(`Writing ${d.title.toLowerCase()}…`); out.push(await buildDoc(ctx, d.id)); }
  return out;
}
