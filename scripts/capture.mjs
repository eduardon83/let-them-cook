// capture.mjs — opens the running app in the locally installed Chrome/Edge and saves screenshots.
//
//   npm run dev            (in another terminal)
//   npm run capture -- --url http://127.0.0.1:4173/ --out captures --eval "<js run before shot>" --name shot
//
// Uses playwright-core with the system browser, so nothing is downloaded. Console errors are
// printed so a broken frame is never described as working.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const url = args.url || 'http://127.0.0.1:4173/';
const out = args.out || 'captures';
const name = args.name || 'shot';
const width = Number(args.width || 1600), height = Number(args.height || 900);
const wait = Number(args.wait || 1500);
const steps = args.steps ? JSON.parse(fs.readFileSync(args.steps, 'utf8')) : [{ name, eval: args.eval, wait }];

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find((p) => fs.existsSync(p));

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath, headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[${m.type()}]`, m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
if (args.storage) await page.addInitScript((s) => { try { localStorage.setItem('letemcook.v1', s); } catch {} }, fs.readFileSync(args.storage, 'utf8'));
await page.goto(url, { waitUntil: 'load' });
let fatal = null;
page.on('pageerror', (e) => { fatal = e; });
await page.waitForFunction(() => window.__sceneReady === true || window.__bootError, null, { timeout: 120000 }).catch(() => {});
if (fatal || !(await page.evaluate(() => window.__sceneReady))) {
  await page.screenshot({ path: path.join(out, `${name}-failed.png`) });
  console.log('Scene did not become ready.', fatal?.message || '');
  await browser.close(); process.exit(2);
}
for (const step of steps) {
  if (step.eval) await page.evaluate(step.eval);
  await page.waitForTimeout(step.wait ?? wait);
  const file = path.join(out, `${step.name}.png`);
  await page.screenshot({ path: file });
  console.log('saved', file);
}
await browser.close();
