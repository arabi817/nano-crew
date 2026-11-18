// 효과음은 파일 없이 코드로 만들어요 (저작권 걱정 없음). 4단계에서 더 다듬습니다.
let ctx = null;
export let muted = false;
export function setMuted(v) { muted = v; }
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { }
}
function tone(f, dur, { type = 'sine', vol = 0.18, at = 0, to = null } = {}) {
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
export function sfx(name) {
  if (muted) return;
  unlockAudio(); if (!ctx) return;
  switch (name) {
    case 'ok': tone(660, 0.12, { type: 'triangle' }); tone(990, 0.22, { type: 'triangle', at: 0.1 }); break;
    case 'bad': tone(190, 0.28, { type: 'square', vol: 0.08, to: 110 }); break;
    case 'tick': tone(880, 0.07, { type: 'triangle', vol: 0.12 }); break;
    case 'click': tone(520, 0.05, { type: 'square', vol: 0.05 }); break;
    case 'start': tone(392, 0.15, { type: 'triangle' }); tone(523, 0.15, { type: 'triangle', at: 0.14 }); tone(784, 0.3, { type: 'triangle', at: 0.28 }); break;
  }
}
