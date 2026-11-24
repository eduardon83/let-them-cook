// store.js — everything the teacher saves, kept in this browser only (localStorage).
// No accounts, no server, no analytics. The Chef's Journal can export/import it as a file
// (backup, or to move to another computer). Student names are never asked for or stored.
const KEY = 'letemcook.v1';

export const DEFAULT_PLAN = {
  students: 20,
  words: 12,
  teamType: 'mixed-language',
  teacherRoles: [],
  needs: [],
  checks: [],
  languages: { count: 2, names: ['', ''] },
  avoid: ['pork', 'alcohol'],
  mode: 'cooperative',
  targetLanguage: 'English'
};

const DEFAULT_STATE = {
  v: 1,
  tutorialSeen: false,
  completed: {},          // lessonId → { date, feedback }
  plans: {},              // lessonId → plan overrides
  defaults: { ...DEFAULT_PLAN },
  translations: {},       // "lessonId:word:id" | "lessonId:phrase:n" | "role:id:phrase:n" → text
  settings: { night: false, weather: 'auto', calm: false, sound: false, readAloud: false, freeRoam: false }
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed, settings: { ...DEFAULT_STATE.settings, ...parsed.settings }, defaults: { ...DEFAULT_PLAN, ...parsed.defaults } };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

let state = read();
const listeners = new Set();

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: keep working in memory */ }
  for (const fn of listeners) fn(state);
}

export const store = {
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  update(mutator) { mutator(state); write(); },

  planFor(lessonId) {
    const saved = state.plans[lessonId] || {};
    const plan = { ...DEFAULT_PLAN, ...state.defaults, ...saved };
    plan.languages = { ...DEFAULT_PLAN.languages, ...(state.defaults.languages || {}), ...(saved.languages || {}) };
    return structuredClone(plan);
  },
  savePlan(lessonId, plan, { asDefault = false } = {}) {
    state.plans[lessonId] = structuredClone(plan);
    if (asDefault) {
      const { teacherRoles, ...classProfile } = plan;
      state.defaults = { ...state.defaults, ...structuredClone(classProfile) };
    }
    write();
  },

  isDone(lessonId) { return !!state.completed[lessonId]; },
  complete(lessonId, feedback) { state.completed[lessonId] = { date: new Date().toISOString(), feedback }; write(); },
  uncomplete(lessonId) { delete state.completed[lessonId]; write(); },

  translation(key, fallback) { const t = state.translations[key]; return t && t.trim() ? t : fallback; },
  setTranslation(key, value) { if (value && value.trim()) state.translations[key] = value; else delete state.translations[key]; write(); },

  setting(name) { return state.settings[name]; },
  setSetting(name, value) { state.settings[name] = value; write(); },

  exportJSON() { return JSON.stringify({ app: "Let'em Cook!", exported: new Date().toISOString(), ...state }, null, 2); },
  importJSON(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !('completed' in data)) throw new Error('This file is not a Let\'em Cook! journal.');
    const { app, exported, ...rest } = data;
    state = { ...structuredClone(DEFAULT_STATE), ...rest, settings: { ...DEFAULT_STATE.settings, ...rest.settings } };
    write();
  },
  reset() { state = structuredClone(DEFAULT_STATE); state.tutorialSeen = true; write(); }
};
