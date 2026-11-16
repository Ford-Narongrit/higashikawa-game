"use client";
// Synthesized effects (no audio files). Browsers only allow audio after a user click,
// so enableSound() must be called from a click handler.

let ctx: AudioContext | null = null;
let enabled = false;

export function enableSound(on: boolean) {
  enabled = on;
  if (on && !ctx) ctx = new AudioContext();
  if (on) ctx?.resume();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "triangle", gain = 0.18) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export type SoundName = "box" | "photo" | "admin" | "minus";

export function playSound(name: SoundName) {
  if (!enabled || !ctx) return;
  switch (name) {
    case "box": // shake ticks, then sparkle arpeggio
      [0, 0.15, 0.3, 0.45].forEach((s) => tone(220, s, 0.08, "square", 0.08));
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 1.0 + i * 0.08, 0.5));
      break;
    case "photo": // camera-ish pop
      tone(1320, 0, 0.12, "square", 0.08);
      tone(1760, 0.08, 0.25);
      break;
    case "admin": // fanfare
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.3, "sawtooth", 0.1));
      tone(1047, 0.36, 0.8, "sawtooth", 0.12);
      break;
    case "minus": // descending
      [440, 370, 311, 262].forEach((f, i) => tone(f, i * 0.15, 0.3, "sawtooth", 0.1));
      break;
  }
}
