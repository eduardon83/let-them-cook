# Content file: `public/content/lessons.json`

All texts that teachers read, hear or print live in **one JSON file**, apart from the code.
Edit it with any text editor; the app reloads it on the next page load. Keep a checked copy and
compare after every change (see the "After vibe coding" poster, step 03).

The app is **language-agnostic**: texts are written in English as the default target language.
Teachers can overwrite words and phrases with the language they teach, inside the app
("Plan my class → Target language"), and export/import those edits as a file.

## Top level

```jsonc
{
  "version": 1,
  "meta": { "title": "Let'em Cook!", "edition": "…", "checkedBy": "", "checkedOn": "" },
  "roles": [Role],          // 8 roles, fixed ids (below)
  "phases": [Phase],        // 5 phases, fixed ids (below)
  "teamTypes": [TeamType],  // 4 team types, fixed ids (below)
  "needs": [Need],          // specific-needs toggles, fixed ids (below)
  "checks": [Check],        // accessibility & safety checklist
  "twists": [Twist],        // general "Secret ingredient" event cards
  "tutorial": { "slides": [Slide] },
  "lessons": [Lesson]       // 8 missions, in trail order
}
```

## Fixed ids (the code depends on them)

| Kind | ids |
| --- | --- |
| Role | `head-chef`, `sous-chef`, `line-cook`, `waiter`, `customer`, `vendor`, `critic`, `guardian` |
| Phase | `mise`, `order`, `cook`, `service`, `taste` |
| Team type | `mixed-language`, `same-language`, `mixed-level`, `random` |
| Need | `dyslexia`, `large-print`, `low-literacy`, `colour-vision`, `low-vision`, `hearing`, `mobility`, `anxiety`, `newcomers` |
| Cast (3D characters) | `olivia`, `luka`, `yusuf`, `tomas`, `lena`, `noor`, `amara`, `petra`, `guest` |
| Lesson / map location | `market`, `pantry`, `school`, `bakery`, `cafe`, `festival`, `tower`, `grand` |
| Tutorial camera focus | `overview`, `pantry`, `stove`, `pass`, `dining`, `door`, `map` |

## Role

```jsonc
{
  "id": "head-chef",
  "name": "Head Chef",
  "cast": "olivia",                 // character drawn on the role card
  "mission": "You lead your brigade. You read the order and give clear instructions.",
  "does": ["Reads the order", "Gives instructions", "Checks the dish"],
  "phrases": ["First, …", "Please chop the …", "Well done!"],
  "teacherCanPlay": true,           // teacher may replace this actor
  "quietFriendly": false,           // suits a learner who prefers not to speak much
  "seated": true,                   // can be played sitting down
  "kind": "kitchen"                 // kitchen | dining | market | support
}
```

## Phase

`{ "id": "mise", "name": "Mise en place", "purpose": "Warm up and wake up the words." }`

## TeamType

`{ "id": "mixed-language", "label": "Mixed home languages", "recommended": true, "description": "…", "tip": "…" }`

## Need

```jsonc
{
  "id": "dyslexia",
  "label": "Dyslexia-friendly",
  "description": "One short sentence for the toggle.",
  "adaptations": ["Concrete change in the lesson", "…"]   // added to the teacher guide when on
}
```

Print effects handled by code: `dyslexia` (font, spacing), `large-print` (bigger cards),
`low-literacy` (picture-first cards, fewer words), `colour-vision` (shapes and patterns),
`low-vision` (high contrast). The others add guidance only.

## Check

`{ "id": "readable", "label": "Readable from the back row", "detail": "…" }`

## Twist ("Secret ingredient" event card)

`{ "title": "The critic is here!", "text": "One short instruction that changes the game for 2 minutes." }`

## Tutorial slide

```jsonc
{
  "id": "welcome",
  "focus": "overview",                       // camera focus in the 3D kitchen
  "title": "Welcome to Let'em Cook!",
  "chef": "What Chef Olívia says (1–2 short sentences, spoken aloud).",
  "text": "Two or three sentences for the teacher.",
  "bullets": ["optional", "short", "points"]
}
```

## Lesson (mission)

```jsonc
{
  "id": "market",
  "order": 1,
  "location": "Market Square",
  "title": "The Ingredient Hunt",
  "tagline": "One motivating line.",
  "host": { "cast": "tomas", "name": "Tomás", "title": "Market Vendor" },
  "level": "A1",                    // CEFR
  "minutes": 50,
  "focus": {
    "functions": ["Naming food", "Asking for things"],
    "grammar": ["Do you have …? Yes, I do / No, I don't"],
    "vocabulary": "Fruit and vegetables, colours, numbers 1–20"
  },
  "pitch": ["3–5 short lines the host says in the 3D scene"],
  "summary": "2–3 sentences for the teacher.",
  "objectives": ["I can … (student-facing can-do, 3–4)"],
  "successCriteria": ["Observable, teacher-facing"],
  "materials": ["…"],
  "preparation": ["…"],
  "roles": {
    "teamSize": { "min": 3, "ideal": 4, "max": 5 },
    "perTeam": [
      { "role": "head-chef", "count": 1 },
      { "role": "sous-chef", "count": 1, "optional": true },
      { "role": "line-cook", "fill": true }        // takes the remaining seats
    ],
    "shared": [
      { "role": "vendor", "perTeams": 2, "teacherCanCover": true }   // 1 vendor for every 2 teams
    ]
  },
  "flow": [
    { "phase": "mise", "minutes": 8, "title": "…", "steps": ["…"], "tip": "…" }
    // one entry per phase, in phase order; minutes add up to "minutes"
  ],
  "words": [
    { "id": "tomato", "en": "tomato", "model": "food/tomato", "group": "vegetables", "tags": [] }
    // exactly 24, most essential first. The teacher picks how many (6–24) are used.
    // tags may include: pork, alcohol, meat, fish, nuts, dairy, gluten, egg
  ],
  "phrases": [ { "en": "Do you have tomatoes?", "role": "head-chef" } ],
  "cards": [MissionCard],
  "twists": [Twist],               // 4 lesson-specific
  "differentiation": { "support": ["…"], "stretch": ["…"] },
  "inclusion": ["Lesson-specific accessibility and inclusion notes"],
  "assessment": { "observe": ["…"], "evidence": "…" },
  "homeLanguage": "How home languages act as a bridge in this mission.",
  "reflection": ["Taste & Tell prompts"],
  "extension": "Follow-up or homework idea.",
  "seal": { "name": "Market Seal", "motto": "Short motto" },
  "cta": "Short call to action for the poster"
}
```

### MissionCard (printable game material)

```jsonc
{
  "kind": "recipe",                 // recipe | menu | list | dialogue | form | grid
  "title": "…",
  "subtitle": "…",
  "for": "head-chef",               // a role id, "team" or "all"
  "copies": "perTeam",              // perTeam | perStudent | one
  "items": [
    { "text": "Chop the onion.", "word": "onion", "value": "", "speaker": "", "blank": false }
  ],
  "note": "Optional footer line."
}
```

- `recipe`: numbered steps. `word` (a word id of this lesson) shows its picture.
- `menu`: dishes with `value` = price.
- `list`: checklist; `value` = quantity.
- `dialogue`: lines with `speaker` (role id); `blank: true` leaves a line to complete.
- `form`: labelled lines to fill in.
- `grid`: a bingo grid; each item has a `word`.

## Picture models

`model` is `food/<name>` (Kenney Food Kit) or `kitchen/<name>` (KayKit Restaurant Bits), or `null`
for a word without a 3D model (a drawn placeholder is printed). See `src/core/catalog.js` for the
list of available names.
