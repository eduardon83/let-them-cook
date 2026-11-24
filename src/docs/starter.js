// starter.js — the starter pack offered at the end of the tutorial: "How Let'em Cook! works"
// (phases, roles, the trail of missions) and a term-long Kitchen Passport with all 8 seals.
import JSZip from 'jszip';
import { portrait } from '../core/studio.js';
import { wrapDocument } from './pack.js';
import { esc, sealSVG, LOGO, download, toast } from '../ui/dom.js';

const PHASE_COLORS = ['#3f8f5b', '#3b8fc4', '#e4572e', '#6b4fa0', '#d9821a'];

function shell(title, inner, n) {
  return `<section class="page"><div class="topbar">${LOGO.replace('class="brand-mark"', 'class="logo"')}<div class="brand">Let'em <em>Cook!</em><div class="kicker" style="margin-top:.6mm">Starter pack</div></div><div class="doc"><b>${esc(title)}</b>Saffron Valley</div></div>${inner}<div class="foot"><span>Let'em Cook! · Saffron Valley</span><span>Art: Kenney, KayKit, Quaternius (CC0) · ${n}</span></div></section>`;
}

export async function downloadStarterPack(app) {
  const { content, lessons, world } = app;
  const ctx = { lesson: { title: 'Starter pack' }, flags: {}, plan: {} };
  const casts = {};
  for (const r of content.roles) casts[r.cast] = casts[r.cast] || await portrait(r.cast, { pose: 'Idle', at: 0.25, crop: 'full', size: 420 });
  const host = await portrait('olivia', { pose: 'Wave', at: 0.35, crop: 'full', size: 520 });
  const map = world.snapshot({ position: [-6, 104, 138], target: [-9, 0, 5], width: 1400, height: 900 });

  const p1 = shell('How it works', `
    <div class="hero" style="height:92mm"><img src="${map}" alt=""><div class="title"><div class="kicker">A classroom role-play game for language learners</div><h1>How Let'em Cook! works</h1><p style="margin:0">Your class runs a restaurant town. Brigades of learners play kitchen roles. Every word is an ingredient.</p></div></div>
    <div class="cols" style="grid-template-columns:1fr 46mm">
      <div><h2>Every lesson cooks in five steps</h2>
        ${content.phases.map((p, i) => `<div class="phase"><div class="clock" style="background:${PHASE_COLORS[i]}">${i + 1}</div><div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.purpose)}</p></div></div>`).join('')}</div>
      <div style="display:grid;align-content:end"><img src="${host}" alt="" style="width:100%"><div class="quote" style="font-size:9.5pt;margin:0">${esc(content.tutorial?.slides?.[0]?.chef || '')}</div></div>
    </div>`, 1);

  const p2 = shell('The brigade', `<h2>Who's in the kitchen</h2><p class="muted">Every role can be played sitting down, and there is always a quiet role. You can step into any role marked “teacher can play”.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;flex:1">${content.roles.map((r) => `<div class="box" style="display:grid;grid-template-columns:24mm 1fr;gap:3mm;align-items:center;padding:3mm">
      <div style="background:radial-gradient(circle at 50% 70%,#fde7c4,#fff 70%);border-radius:3mm;height:40mm;overflow:hidden;display:grid;place-items:end center"><img src="${casts[r.cast]}" alt="" style="width:100%"></div>
      <div><h3>${esc(r.name)}</h3><p style="font-size:9pt;margin-bottom:1.5mm">${esc(r.mission)}</p>${(r.phrases || []).slice(0, 2).map((p) => `<span class="chip">${esc(p)}</span>`).join('')}
      <div class="muted" style="font-size:7.5pt;margin-top:1mm">${[r.teacherCanPlay && 'Teacher can play', r.quietFriendly && 'Quiet role', r.seated && 'Can sit'].filter(Boolean).join(' · ')}</div></div></div>`).join('')}</div>`, 2);

  const p3 = shell('The trail', `<h2>Eight missions, from first words to the Grand Service</h2>
    <table class="table"><thead><tr><th></th><th>Mission</th><th>Level</th><th>Time</th><th>Language</th></tr></thead><tbody>
    ${lessons.map((l) => `<tr><td style="width:18mm">${sealSVG(l, true, 52)}</td><td><b>${esc(l.title)}</b><div class="muted">${esc(l.location)} · ${esc(l.host?.name)}</div></td><td>${esc(l.level)}</td><td>${l.minutes} min</td><td>${esc(l.focus?.vocabulary || '')}</td></tr>`).join('')}</tbody></table>
    <div class="box cream" style="margin-top:4mm"><h3>Plan → Print → Play</h3><p>Open a mission on the map, tell it about your class (learners, words, home languages, needs), print the pack it makes for you, and play. Afterwards, press <b>Cooked!</b> to stamp the seal and light the trail to the next mission.</p></div>`, 3);

  const passport = shell('Kitchen Passport', `<div style="text-align:center;margin:2mm 0 5mm"><div class="kicker">This passport belongs to chef</div><div class="line" style="width:110mm;margin:3mm auto 0"></div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5mm;flex:1;align-content:start">${lessons.map((l) => `<div style="text-align:center;display:grid;justify-items:center;gap:2mm">${sealSVG(l, false, 120)}<b style="font-size:9pt">${esc(l.title)}</b><div class="passport" style="display:block;padding:2mm;border-style:dashed;width:34mm;height:16mm;border-radius:3mm"><span class="muted" style="font-size:7pt">teacher's stamp</span></div></div>`).join('')}</div>
    <div class="box cream" style="text-align:center"><b>Every word is an ingredient.</b> Collect all eight seals to earn your apron at the Grand Restaurant!</div>`, 4);

  const guide = await wrapDocument(ctx, 'How Let\'em Cook! works', [p1, p2, p3]);
  const pass = await wrapDocument(ctx, 'Kitchen Passport (term)', [passport]);
  const zip = new JSZip();
  const folder = zip.folder('letemcook-starter-pack');
  folder.file('01-how-it-works.html', guide);
  folder.file('02-kitchen-passport-term.html', pass);
  folder.file('README.txt', "Let'em Cook! starter pack\r\nOpen each file in a browser and press Print (A4, 100%, background graphics on).\r\nArt: Kenney, KayKit, Quaternius (CC0).");
  download('letemcook-starter-pack.zip', await zip.generateAsync({ type: 'blob' }));
  toast('Starter pack downloaded.');
}
