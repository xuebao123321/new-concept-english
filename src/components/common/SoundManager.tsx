// Web Audio API 合成音效 — 无需外部文件

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return localStorage.getItem('nce_sound') !== 'off';
}

export function toggleSound(): boolean {
  const current = isSoundEnabled();
  localStorage.setItem('nce_sound', current ? 'off' : 'on');
  return !current;
}

function play(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* 静默失败 */ }
}

export function playCorrect() {
  play(880, 0.15, 'sine', 0.12);
  setTimeout(() => play(1320, 0.12, 'sine', 0.1), 100);
}

export function playWrong() {
  play(220, 0.3, 'triangle', 0.1);
}

export function playLevelUp() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => play(f, 0.2, 'sine', 0.12), i * 120);
  });
}

export function playComplete() {
  [523, 659, 784, 880, 1047, 1320].forEach((f, i) => {
    setTimeout(() => play(f, 0.18, 'sine', 0.1), i * 100);
  });
}
