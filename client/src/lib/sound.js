/**
 * Tiny WebAudio blip kit. No files, no dependencies, muteable.
 * Sound is decoration only — every cue is also visible.
 */

let ctx = null;
let muted = false;

try {
  muted = localStorage.getItem('sideeye.muted') === '1';
} catch {
  /* noop */
}

export const isMuted = () => muted;

export function setMuted(v) {
  muted = v;
  try {
    localStorage.setItem('sideeye.muted', v ? '1' : '0');
  } catch {
    /* noop */
  }
}

function ac() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { dur = 0.12, type = 'sine', gain = 0.06, delay = 0, slide = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export const sfx = {
  tap: () => tone(520, { dur: 0.05, type: 'triangle', gain: 0.035 }),
  lock: () => {
    tone(660, { dur: 0.08, type: 'triangle', gain: 0.05 });
    tone(990, { dur: 0.1, type: 'triangle', gain: 0.04, delay: 0.06 });
  },
  join: () => tone(880, { dur: 0.09, type: 'sine', gain: 0.04 }),
  reveal: () => tone(300, { dur: 0.13, type: 'square', gain: 0.028 }),
  drum: () => {
    tone(120, { dur: 0.5, type: 'sawtooth', gain: 0.035, slide: 60 });
  },
  sting: () => {
    tone(180, { dur: 0.28, type: 'sawtooth', gain: 0.05 });
    tone(360, { dur: 0.4, type: 'square', gain: 0.035, delay: 0.09 });
    tone(540, { dur: 0.5, type: 'triangle', gain: 0.04, delay: 0.18 });
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, { dur: 0.22, type: 'triangle', gain: 0.05, delay: i * 0.1 })
    );
  },
  tick: () => tone(1200, { dur: 0.035, type: 'square', gain: 0.02 }),
};
