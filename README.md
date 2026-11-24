# Let'em Cook!

A 3D mission map for teachers who run **Let'em Cook!**, a classroom role-play game for people
learning a new language. The class runs a restaurant town: brigades of learners play kitchen and
restaurant roles, and every word is an ingredient.

The teacher explores **Saffron Valley**. Eight buildings along a trail are eight missions, from
first words at the market (A1) to the Grand Service (B1). Each mission is a complete lesson plan.
For each mission the teacher can:

1. **Hear the idea** from the host chef in a small animated 3D scene.
2. **Read the plan**: objectives, a five-phase flow with timings, materials, differentiation,
   inclusion notes, assessment, home-language bridge, twists and phrases.
3. **Plan the class**: number of learners (the app works out the brigades and roles), number of
   target words, how brigades are mixed, which actors the teacher plays, home languages,
   specific needs, foods to leave out, play style and an access & safety checklist. The words
   and phrases can be typed in the language being taught.
4. **Print & play**: nine illustrated A4 documents made for that class (teacher guide, role
   cards per brigade, word cards with home-language lines, mission materials, Kitchen Passport,
   twist cards, poster, table signs, certificates), one by one or as a ZIP. The pictures are
   rendered from the same 3D models as the valley.
5. **Run it in class** with the Kitchen Pass (projector view: phase timer, brigade stars or a
   class goal, twist draw, kitchen bell, word board).
6. **Mark it as cooked** and leave feedback. The seal is stamped, the landmark raises its flag,
   and the trail lights up to the next mission.

A welcome tutorial shows the game happening in a restaurant kitchen, and offers a starter pack.

The valley is alive: wind in the trees and grass, rain or snow that comes and goes on its own
(snow settles on roofs and melts), clouds, smoke from chimneys, birds, butterflies, fireflies at
night, villagers walking the trail, a boat on the lake, a jumping fish, flowing water and two
waterfalls. Day/night, weather, sound and "calm motion" are switches in the top bar.

## Run it

```sh
npm install
npm run dev          # http://127.0.0.1:4173
npm run build        # static site in dist/ (works from any folder: GitHub Pages, a USB stick…)
```

Needs a browser with WebGL 2 (recent Chrome, Edge, Firefox or Safari).

## Edit the lessons (no code needed)

All teacher-facing text lives in **`public/content/lessons.json`**, apart from the code.
The schema and the ids the code depends on are documented in **[docs/CONTENT.md](docs/CONTENT.md)**.
After a build, edit `dist/content/lessons.json` directly; there is nothing to recompile.

Before using a mission in class, a person should check every word, phrase and answer against the
curriculum and trusted sources, and record it in `meta.checkedBy` / `meta.checkedOn`.

Teachers can also overwrite words and phrases inside the app (Plan my class → *The words in the
language you teach*) and share them with colleagues from the Chef's Journal.

## Where things are

| Path | What |
| --- | --- |
| `public/content/lessons.json` | Lesson content (8 missions, roles, needs, checks, twists, tutorial) |
| `public/assets/` | 3D bundles built from the CC0 packs (committed) |
| `scripts/prepare-assets.mjs` | Rebuilds the bundles from the source packs: `npm run assets -- "<packs folder>"` |
| `scripts/capture.mjs` | Screenshots from the running app with the local Chrome/Edge (`npm run capture`) |
| `src/world/` | The valley: layout, terrain, water, trail, landmarks, vegetation, weather, life, sky, camera |
| `src/stage/` | Character scenes: mission hosts and the tutorial kitchen |
| `src/core/` | Assets, characters (outfits, hats), state store, team planner, illustration studio |
| `src/ui/` | Map HUD, mission panel, planner, packs, Cooked!, journal, tutorial, Kitchen Pass |
| `src/docs/` | Printable documents (A4 HTML with embedded fonts and pictures) |

Start reading at `src/world/layout.js` (every position on the map) and `src/ui/app.js`.

## Privacy and safety

* No accounts, no tracking, no analytics, no adverts, no external requests (fonts are bundled).
* Plans, notes and translations are stored only in the browser (`localStorage`) and can be
  exported/imported as a file. Learner names are never asked for.
* Read-aloud uses the device's own speech voices only.
* Rewards celebrate brigades and learning, never individual rankings. No streaks, no timers that
  pressure, no flashing content. "Calm motion" follows the system's reduced-motion setting.
* See `compliance/manifest.yaml`.

## Credits

3D models: Kenney (Fantasy Town Kit 2.0, Hexagon Kit 2.0, Food Kit 2.0), Kay Lousberg
(KayKit Restaurant Bits), Quaternius (Ultimate Modular Men & Women). All CC0. See
[CREDITS.md](CREDITS.md). Fonts: Fraunces and Lexend (SIL OFL). Libraries: three.js, Vite, JSZip (MIT).
