// print-style.js — fonts and CSS embedded in every printable document, so a downloaded pack
// opens and prints correctly offline, on any computer, without the app.
import frauncesLatin from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url';
import frauncesExt from '@fontsource-variable/fraunces/files/fraunces-latin-ext-wght-normal.woff2?url';
import lexendLatin from '@fontsource-variable/lexend/files/lexend-latin-wght-normal.woff2?url';
import lexendExt from '@fontsource-variable/lexend/files/lexend-latin-ext-wght-normal.woff2?url';

let fontCSS = null;
async function toDataURL(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });
}
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

export async function embeddedFonts() {
  if (fontCSS) return fontCSS;
  const [fl, fe, ll, le] = await Promise.all([frauncesLatin, frauncesExt, lexendLatin, lexendExt].map(toDataURL));
  const face = (family, src, range) => `@font-face{font-family:'${family}';font-weight:100 900;font-display:block;src:url(${src}) format('woff2');unicode-range:${range};}`;
  fontCSS = face('LC Display', fe, EXT) + face('LC Display', fl, LATIN) + face('LC Text', le, EXT) + face('LC Text', ll, LATIN);
  return fontCSS;
}

export const PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
:root { --ink:#2b2a33; --soft:#5d5a68; --paper:#fffdf8; --cream:#fbf3e3; --saffron:#f2a33a; --deep:#d9821a; --tomato:#e4572e; --basil:#3f8f5b; --plum:#6b4fa0; --sky:#3b8fc4; --line:rgba(43,42,51,.16); --display:'LC Display', Georgia, serif; --text:'LC Text', Arial, sans-serif; --fs:1; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: #5a5363; font-family: var(--text); color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: calc(10.5pt * var(--fs)); line-height: 1.45; }
.page { width: 210mm; height: 297mm; margin: 8mm auto; background: var(--paper); position: relative; overflow: hidden; padding: 12mm 13mm 14mm; box-shadow: 0 12px 40px rgba(0,0,0,.35); break-after: page; page-break-after: always; display: flex; flex-direction: column; }
.page:last-child { break-after: auto; page-break-after: auto; }
@media print { body { background: none; } .page { margin: 0; box-shadow: none; } .noprint { display: none !important; } }
h1, h2, h3, h4 { font-family: var(--display); margin: 0; letter-spacing: -0.01em; line-height: 1.08; }
h1 { font-size: calc(30pt * var(--fs)); font-weight: 750; }
h2 { font-size: calc(17pt * var(--fs)); font-weight: 700; margin-bottom: 2.5mm; }
h3 { font-size: calc(12.5pt * var(--fs)); font-weight: 700; margin-bottom: 1.5mm; }
p { margin: 0 0 2mm; }
ul, ol { margin: 0; padding-left: 5mm; }
li { margin-bottom: 1mm; }
.kicker { font: 700 calc(7.5pt * var(--fs))/1.2 var(--text); letter-spacing: .16em; text-transform: uppercase; color: var(--deep); }
.muted { color: var(--soft); }
.chip { display: inline-block; padding: 1mm 2.6mm; border-radius: 99px; background: var(--cream); border: .3mm solid var(--line); font-size: calc(8.5pt * var(--fs)); margin: 0 1mm 1mm 0; }
.chip.dark { background: var(--ink); color: #fff8ec; border-color: transparent; font-weight: 700; }
.topbar { display: flex; align-items: center; gap: 3mm; margin-bottom: 5mm; }
.topbar svg.logo { width: 9mm; height: 9mm; }
.topbar .brand { font: 800 calc(12pt * var(--fs)) var(--display); }
.topbar .brand em { font-style: normal; color: var(--tomato); }
.topbar .doc { margin-left: auto; text-align: right; font-size: calc(8pt * var(--fs)); color: var(--soft); }
.topbar .doc b { display: block; color: var(--ink); font: 700 calc(10pt * var(--fs)) var(--display); }
.foot { position: absolute; left: 13mm; right: 13mm; bottom: 6mm; display: flex; justify-content: space-between; font-size: calc(7pt * var(--fs)); color: var(--soft); }
.grow { flex: 1; min-height: 0; }
.hero { position: relative; border-radius: 6mm; overflow: hidden; height: 78mm; margin-bottom: 6mm; background: var(--cream); }
.hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero .title { position: absolute; left: 6mm; bottom: 6mm; max-width: 108mm; background: rgba(255,253,248,.94); border-radius: 4mm; padding: 4mm 5mm; }
.hero .title h1 { margin: 1mm 0 1.5mm; }
.hero .seal { position: absolute; right: 5mm; top: 5mm; width: 30mm; height: 30mm; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.cols3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; }
.box { border: .35mm solid var(--line); border-radius: 4mm; padding: 4mm; background: #fff; }
.box.cream { background: var(--cream); border-color: #efd9b0; }
.quote { font: italic 500 calc(11.5pt * var(--fs))/1.5 var(--display); padding: 4mm 5mm; border-left: 1.4mm solid var(--saffron); background: #fff6e4; border-radius: 0 4mm 4mm 0; margin-bottom: 5mm; }
.can li { list-style: none; position: relative; padding-left: 6mm; }
.can li::before { content: '✓'; position: absolute; left: 0; top: .2mm; width: 4mm; height: 4mm; border-radius: 50%; background: var(--basil); color: white; font-size: 7pt; display: grid; place-items: center; line-height: 4mm; text-align: center; }
.phase { display: grid; grid-template-columns: 16mm 1fr; gap: 3mm; margin-bottom: 3mm; break-inside: avoid; }
.phase .clock { border-radius: 4mm; color: #fff; display: grid; place-items: center; align-content: center; height: 16mm; font: 800 calc(14pt * var(--fs))/1 var(--display); }
.phase .clock small { font: 500 calc(6.5pt * var(--fs)) var(--text); }
.phase .tip { background: #fff3d6; border-radius: 2.5mm; padding: 1.5mm 3mm; margin-top: 1.5mm; font-size: calc(9pt * var(--fs)); }
.table { width: 100%; border-collapse: collapse; font-size: calc(9pt * var(--fs)); }
.table td, .table th { border-bottom: .3mm solid var(--line); padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
.table th { font-size: calc(7.5pt * var(--fs)); letter-spacing: .1em; text-transform: uppercase; color: var(--soft); }
.check { display: inline-block; width: 3.6mm; height: 3.6mm; border: .4mm solid var(--ink); border-radius: 1mm; margin-right: 2mm; vertical-align: -.6mm; text-align: center; font-size: 7pt; line-height: 3mm; }
.line { border-bottom: .35mm solid #9a95a6; height: 7mm; }
.cut-grid { display: grid; flex: 1; min-height: 0; }
.cut-grid > * { border: .35mm dashed #a9a3b4; margin: -.175mm; position: relative; overflow: hidden; }
.scissors { font-size: calc(8pt * var(--fs)); color: var(--soft); margin: -2mm 0 2mm; }
.word-card { display: grid; grid-template-columns: 42% 1fr; align-items: center; padding: 3mm 4mm; gap: 3mm; }
.word-card .pic { height: 100%; max-height: 52mm; display: grid; place-items: center; background: radial-gradient(circle at 50% 60%, #fff3dc, transparent 70%); }
.word-card .pic img { max-width: 100%; max-height: 46mm; object-fit: contain; }
.word-card .w { font: 800 calc(19pt * var(--fs))/1.05 var(--display); word-break: break-word; }
.word-card .en { font-size: calc(8pt * var(--fs)); color: var(--soft); margin-top: 1mm; }
.word-card .lang { margin-top: 2mm; }
.word-card .lang .l { font-size: calc(6.5pt * var(--fs)); color: var(--soft); text-transform: uppercase; letter-spacing: .08em; margin-top: 1.4mm; }
.word-card .lang .line { height: 5mm; }
.word-card .group { position: absolute; top: 2.5mm; right: 3mm; font-size: calc(6.5pt * var(--fs)); text-transform: uppercase; letter-spacing: .1em; color: var(--soft); }
.word-card .no-pic { width: 34mm; height: 34mm; border-radius: 50%; border: .6mm dashed var(--saffron); display: grid; place-items: center; font: 800 26pt var(--display); color: var(--saffron); }
.role-card { display: flex; flex-direction: column; }
.role-card .band { padding: 3mm 4mm; color: #fff; display: flex; align-items: center; gap: 2mm; }
.role-card .band h3 { margin: 0; color: #fff; font-size: calc(15pt * var(--fs)); }
.role-card .band .badge { margin-left: auto; display: flex; align-items: center; gap: 1mm; font-size: calc(7.5pt * var(--fs)); background: rgba(255,255,255,.92); color: var(--ink); padding: 1mm 2.5mm; border-radius: 99px; font-weight: 700; }
.role-card .bodyr { padding: 3mm 4.5mm 3mm; flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 1.6mm; }
.role-card .who { display: grid; grid-template-columns: 30mm 1fr; gap: 4mm; align-items: center; }
.role-card .avatar { width: 30mm; height: 30mm; border-radius: 50%; overflow: hidden; border: 1.2mm solid; background: radial-gradient(circle at 50% 70%, #fde7c4, #fff6e6); }
.role-card .avatar img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 15%; }
.role-card .mission { font: 700 calc(12pt * var(--fs))/1.25 var(--display); margin: .8mm 0 0; }
.role-card .does { margin: 0; }
.role-card .say { display: grid; gap: 1.4mm; }
.role-card .say div { background: #fff6e4; border-radius: 3mm 3mm 3mm 1mm; padding: 1.4mm 2.6mm; font-weight: 600; font-size: calc(9pt * var(--fs)); }
.role-card .icons { display: flex; gap: 1.5mm; margin-top: auto; flex-wrap: wrap; }
.role-card .icons span { font-size: calc(7pt * var(--fs)); border: .3mm solid var(--line); border-radius: 99px; padding: .6mm 2mm; }
.twist { padding: 4mm; display: flex; flex-direction: column; gap: 2mm; background: repeating-linear-gradient(45deg, #fff8ec 0 6mm, #fff3de 6mm 12mm); }
.twist .t { font: 800 calc(13pt * var(--fs)) var(--display); }
.twist .star { width: 9mm; height: 9mm; }
.mission-card { border: .5mm solid var(--ink); border-radius: 5mm; padding: 5mm 6mm; position: relative; background: #fff; break-inside: avoid; }
.mission-card .brig { position: absolute; top: 4mm; right: 5mm; display: flex; align-items: center; gap: 1.5mm; font-size: calc(8pt * var(--fs)); font-weight: 700; }
.mission-card h2 { margin-right: 40mm; }
.menu-row { display: flex; align-items: baseline; gap: 2mm; margin: 2.2mm 0; font-size: calc(11pt * var(--fs)); }
.menu-row .dots { flex: 1; border-bottom: .5mm dotted #9a95a6; transform: translateY(-1mm); }
.menu-row img, .step img, .listrow img { width: 14mm; height: 14mm; object-fit: contain; }
.mission-card .mc-host { position: absolute; right: 4mm; bottom: 4mm; width: 22mm; height: 22mm; border-radius: 50%; object-fit: cover; object-position: 50% 15%; border: .8mm solid var(--saffron); background: #fff6e6; }
/* Full-page cards: bigger pictures and type, so A1 readers can work from the pictures. */
.mission-card.full .step, .mission-card.full .listrow, .mission-card.full .menu-row { font-size: calc(13pt * var(--fs)); margin: 3.6mm 0; }
.mission-card.full .step { grid-template-columns: 10mm 22mm 1fr; }
.mission-card.full .listrow { grid-template-columns: 7mm 22mm 1fr auto; }
.mission-card.full .step img, .mission-card.full .listrow img, .mission-card.full .menu-row img { width: 21mm; height: 21mm; }
.mission-card.full .dialogue .d { margin: 4mm 0; font-size: calc(12pt * var(--fs)); }
.step { display: grid; grid-template-columns: 9mm 15mm 1fr; align-items: center; gap: 2mm; margin: 1.8mm 0; font-size: calc(11pt * var(--fs)); }
.step .n { width: 8mm; height: 8mm; border-radius: 50%; background: var(--ink); color: #fff; display: grid; place-items: center; font: 800 10pt var(--display); }
.listrow { display: grid; grid-template-columns: 6mm 15mm 1fr auto; align-items: center; gap: 2mm; margin: 1.5mm 0; font-size: calc(11pt * var(--fs)); }
.dialogue .d { display: grid; grid-template-columns: 26mm 1fr; gap: 2mm; margin: 2.2mm 0; align-items: end; font-size: calc(10.5pt * var(--fs)); }
.dialogue .who { font-size: calc(7.5pt * var(--fs)); font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--deep); }
.dialogue .bubble { background: #fff6e4; padding: 1.8mm 3mm; border-radius: 3mm 3mm 3mm 1mm; }
.dialogue .bubble.blank { background: none; border-bottom: .4mm solid #9a95a6; border-radius: 0; height: 8mm; }
.bingo { display: grid; gap: 2mm; margin-top: 3mm; }
.bingo div { border: .4mm solid var(--line); border-radius: 3mm; display: grid; place-items: center; text-align: center; padding: 1.5mm; font-weight: 700; font-size: calc(9pt * var(--fs)); aspect-ratio: 1; }
.bingo img { width: 70%; max-height: 22mm; object-fit: contain; }
.passport { border: .6mm solid var(--ink); border-radius: 6mm; padding: 5mm 6mm; display: grid; grid-template-columns: 1fr 34mm; gap: 4mm; position: relative; }
.passport .stamp { width: 34mm; height: 34mm; border: .6mm dashed var(--saffron); border-radius: 50%; display: grid; place-items: center; text-align: center; font-size: calc(7pt * var(--fs)); color: var(--deep); }
.faces { display: flex; gap: 1.6mm; }
.passport .draw { flex: 1; min-height: 25mm; margin-top: 3mm; border: .4mm dashed #c9c3d6; border-radius: 4mm; padding: 2mm 3mm; background: repeating-linear-gradient(0deg, transparent 0 6mm, #f6efe2 6mm 6.3mm); }
.cert > *, svg { flex-shrink: 0; }
.faces svg { width: 7mm; height: 7mm; }
.poster-title { font: 800 calc(44pt * var(--fs))/0.95 var(--display); letter-spacing: -0.02em; }
.cta { display: inline-block; background: var(--tomato); color: #fff; padding: 3mm 7mm; border-radius: 99px; font: 800 calc(18pt * var(--fs)) var(--display); transform: rotate(-3deg); box-shadow: 1mm 1.5mm 0 var(--ink); }
.speech { background: #fff; border: .5mm solid var(--ink); border-radius: 5mm 5mm 5mm 1.5mm; padding: 2.5mm 4mm; font: 700 calc(12pt * var(--fs)) var(--display); box-shadow: 1mm 1mm 0 var(--ink); }
.cert { border: 1.6mm solid var(--saffron); outline: .5mm solid var(--ink); outline-offset: -3.5mm; border-radius: 6mm; padding: 8mm 10mm; text-align: center; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; background: radial-gradient(circle at 50% 30%, #fff6e2, #fff 70%); }
.cert .big { font: 800 calc(26pt * var(--fs))/1 var(--display); }
.tent-half { flex: 1; display: grid; place-items: center; text-align: center; padding: 8mm; position: relative; }
.tent-half.flip { transform: rotate(180deg); }
.fold { border-top: .4mm dashed #a9a3b4; text-align: center; font-size: 7pt; color: var(--soft); }
.shape svg { display: block; }
/* specific needs */
body.dyslexia { --display: 'LC Text', Arial, sans-serif; letter-spacing: .03em; word-spacing: .12em; line-height: 1.7; }
body.dyslexia .page { background: #fdf8ea; }
body.dyslexia .quote, body.dyslexia h1, body.dyslexia h2 { font-style: normal; }
body.large { --fs: 1.25; }
body.contrast { --soft: #222; --line: rgba(0,0,0,.55); }
body.contrast .muted { color: #222; }
`;
