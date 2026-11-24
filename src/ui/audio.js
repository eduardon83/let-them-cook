// audio.js — optional sound, off by default (never autoplays).
// speak(): reads chef lines aloud with the device's own voices only (localService), so no text
// is sent to an online speech service. ambience: wind, rain, birdsong and night crickets are
// synthesised with WebAudio — no audio files, no network.
let voices = [];
function loadVoices() { voices = speechSynthesis?.getVoices?.() || []; }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

export const canSpeak = () => 'speechSynthesis' in window;

export function speak(text, { lang = 'en', onend } = {}) {
  if (!canSpeak()) { onend?.(); return; }
  speechSynthesis.cancel();
  const local = voices.filter((v) => v.localService && v.lang?.toLowerCase().startsWith(lang));
  const u = new SpeechSynthesisUtterance(text);
  u.voice = local.find((v) => /female|zira|hazel|susan|samantha/i.test(v.name)) || local[0] || null;
  if (!u.voice && voices.length) { onend?.(); return; } // only offline voices, never an online one
  u.rate = 0.95; u.pitch = 1.05; u.lang = u.voice?.lang || 'en-GB';
  u.onend = () => onend?.(); u.onerror = () => onend?.();
  speechSynthesis.speak(u);
}
export function stopSpeaking() { if (canSpeak()) speechSynthesis.cancel(); }

// ---------------------------------------------------------------- ambience
let ac = null, nodes = null, enabled = false;

function noiseBuffer(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  return b;
}

function build() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const master = ac.createGain(); master.gain.value = 0.0; master.connect(ac.destination);
  const buf = noiseBuffer(ac);
  const mk = (freq, type) => {
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(master); src.start();
    return { g, f };
  };
  nodes = { master, wind: mk(420, 'lowpass'), rain: mk(2600, 'bandpass') };
  nodes.rain.f.Q.value = 0.6;
}

function chirp(night) {
  if (!ac || !enabled) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  if (night) { o.frequency.setValueAtTime(4200, t); g.gain.setValueAtTime(0, t); for (let i = 0; i < 3; i++) { g.gain.linearRampToValueAtTime(0.012, t + i * 0.09 + 0.02); g.gain.linearRampToValueAtTime(0, t + i * 0.09 + 0.06); } }
  else { const f = 2200 + Math.random() * 1800; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.08); o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.16); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.02); g.gain.linearRampToValueAtTime(0, t + 0.18); }
  o.connect(g).connect(nodes.master); o.start(t); o.stop(t + 0.4);
}

let chirpTimer = null;
export const ambience = {
  get enabled() { return enabled; },
  async setEnabled(on) {
    enabled = on;
    if (on && !ac) build();
    if (!ac) return;
    if (on) await ac.resume();
    nodes.master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.4);
    clearInterval(chirpTimer);
    if (on) chirpTimer = setInterval(() => { if (Math.random() < 0.55) chirp(ambience.night); }, 1400);
  },
  night: false,
  /** Called a few times per second with the valley's weather state. */
  update({ wind = 1, rain = 0 }) {
    if (!ac || !enabled) return;
    nodes.wind.g.gain.setTargetAtTime(0.04 + wind * 0.035, ac.currentTime, 0.8);
    nodes.rain.g.gain.setTargetAtTime(rain * 0.16, ac.currentTime, 0.8);
  },
  /** Short UI cues: "pop" for actions, "ding" for celebrations. */
  cue(kind = 'pop') {
    if (!ac || !enabled) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = kind === 'ding' ? 'triangle' : 'sine';
    const f = kind === 'ding' ? 880 : 520;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(kind === 'ding' ? 1320 : 760, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'ding' ? 0.12 : 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'ding' ? 0.9 : 0.18));
    o.connect(g).connect(nodes.master); o.start(t); o.stop(t + 1);
  }
};
