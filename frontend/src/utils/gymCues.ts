/**
 * Audio and haptics for a phone sitting face-up on a bench. Both are best-effort:
 * iOS refuses to build an AudioContext until a user gesture, and refuses to
 * vibrate at all, so every call here has to survive doing nothing.
 */

let ctx: AudioContext | null = null;

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const audioContext = (): AudioContext | null => {
  try {
    if (!ctx) {
      const w = window as WindowWithWebkitAudio;
      const Ctor = window.AudioContext || w.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

export const tone = (freq: number, seconds: number, gain: number) => {
  const ac = audioContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0, ac.currentTime);
    amp.gain.linearRampToValueAtTime(gain, ac.currentTime + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + seconds);
    osc.connect(amp).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + seconds + 0.02);
  } catch {
    /* no audio on this device */
  }
};

export const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no haptics on this device */
  }
};

/** Unlock audio on the tap that starts the session, so later cues can fire. */
export const armAudio = () => tone(880, 0.09, 0.16);

export const countdownTick = () => tone(660, 0.07, 0.1);

export const restOver = () => {
  tone(990, 0.22, 0.2);
  buzz([120, 70, 120]);
};

export const stepAdvanced = () => tone(760, 0.05, 0.09);

export const sessionOver = () => {
  tone(660, 0.12, 0.18);
  window.setTimeout(() => tone(880, 0.12, 0.18), 140);
  window.setTimeout(() => tone(1175, 0.3, 0.2), 290);
  buzz([90, 60, 90, 60, 180]);
};
