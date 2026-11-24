// prepare-assets.mjs — builds the runtime asset bundles in public/assets from the CC0 source packs.
//
//   npm run assets -- "<path to the folder that holds the asset packs>"
//
// Each kit becomes ONE .glb whose top-level nodes are named after the source file
// (e.g. "tree-high", "crate_tomatoes"), so the app loads 4 files instead of ~600 and the
// shared colour atlas is stored once. Characters are converted one by one and keep only
// the animations the app uses. The generated files are committed, so the source packs are
// only needed to rebuild them. Licences: see CREDITS.md (all packs are CC0).
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, unpartition, resample } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] || process.env.LETEMCOOK_ASSETS;
if (!SRC || !fs.existsSync(SRC)) {
  console.error('Pass the folder that contains the asset packs, e.g.\n  npm run assets -- "C:/…/prototype"');
  process.exit(1);
}
const OUT = path.resolve('public/assets');
fs.mkdirSync(path.join(OUT, 'characters'), { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const KITS = [
  { name: 'town', dir: 'kenney_fantasy-town-kit_2.0/Models/GLB format', ext: '.glb' },
  { name: 'hex', dir: 'kenney_hexagon-kit/Models/GLB format', ext: '.glb' },
  { name: 'food', dir: 'kenney_food-kit/Models/GLB format', ext: '.glb' },
  { name: 'kitchen', dir: 'KayKit_Restaurant_Bits_1.0_FREE/KayKit_Restaurant_Bits_1.0_FREE/Assets/gltf', ext: '.gltf' }
];

// Character files → runtime ids. Outfits are recoloured at runtime (src/core/characters.js).
const MEN = 'Ultimate Modular Men- Feb 2022-20261118T061817Z-1-001/Ultimate Modular Men- Feb 2022/Individual Characters/glTF';
const WOMEN = 'Ultimate Modular Women - April 2022-20261118T061826Z-1-001/Ultimate Modular Women - April 2022/Individual Characters/glTF';
const CHARACTERS = [
  ['m-farmer', MEN, 'Farmer'], ['m-casual', MEN, 'Casual_2'], ['m-hoodie', MEN, 'Casual_Hoodie'],
  ['m-suit', MEN, 'Suit'], ['m-worker', MEN, 'Worker'], ['m-beach', MEN, 'Beach'],
  ['w-casual', WOMEN, 'Casual'], ['w-worker', WOMEN, 'Worker'], ['w-suit', WOMEN, 'Suit'],
  ['w-formal', WOMEN, 'Formal'], ['w-adventurer', WOMEN, 'Adventurer'], ['w-medieval', WOMEN, 'Medieval']
];
const KEEP_ANIMATIONS = new Set(['Idle', 'Idle_Neutral', 'Walk', 'Run', 'Wave', 'Interact']);

function findSourceDir(rel) {
  // Some downloads nest the pack in a same-named folder; accept both layouts.
  const direct = path.join(SRC, rel);
  if (fs.existsSync(direct)) return direct;
  throw new Error(`Missing source folder: ${direct}`);
}

async function bundleKit({ name, dir, ext }) {
  const folder = findSourceDir(dir);
  const files = fs.readdirSync(folder).filter((f) => f.endsWith(ext)).sort();
  const target = new Document();
  for (const file of files) {
    const key = path.basename(file, ext);
    const doc = await io.read(path.join(folder, file));
    const root = doc.getRoot();
    const scene = root.getDefaultScene() || root.listScenes()[0];
    // Prefix keeps model names unique: a burger has a child part called "tomato", for example.
    const wrapper = doc.createNode(`M__${key}`);
    for (const child of scene.listChildren()) { scene.removeChild(child); wrapper.addChild(child); }
    scene.addChild(wrapper);
    mergeDocuments(target, doc);
  }
  const scenes = target.getRoot().listScenes();
  const main = scenes[0];
  for (const extra of scenes.slice(1)) {
    for (const child of extra.listChildren()) { extra.removeChild(child); main.addChild(child); }
    extra.dispose();
  }
  target.getRoot().setDefaultScene(main);
  await target.transform(unpartition(), dedup(), prune());
  const out = path.join(OUT, `${name}.glb`);
  await io.write(out, target);
  console.log(`${name}.glb  ${files.length} models  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

async function convertCharacter([id, dir, file]) {
  const doc = await io.read(path.join(findSourceDir(dir), `${file}.gltf`));
  for (const clip of doc.getRoot().listAnimations()) {
    if (!KEEP_ANIMATIONS.has(clip.getName())) clip.dispose();
  }
  await doc.transform(resample(), unpartition(), dedup(), prune());
  const out = path.join(OUT, 'characters', `${id}.glb`);
  await io.write(out, doc);
  console.log(`characters/${id}.glb  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

for (const kit of KITS) await bundleKit(kit);
for (const character of CHARACTERS) await convertCharacter(character);
console.log('Done →', OUT);
