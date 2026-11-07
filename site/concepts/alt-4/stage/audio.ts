// The Floor's sound, synthesised with the Web Audio API (no audio files, no licences).
// - hold: a low drone whose filter opens, a rising tension tone, a noise riser and a heartbeat that quickens with p.
// - gavel: a wooden crack with a sub-bass drop and a hall reverb tail, after a held breath of silence.
// - tap: a small wooden knock.
// The same voice functions schedule onto a live AudioContext or an OfflineAudioContext (for the video's sound track).

type Ctx = BaseAudioContext;

function noiseBuffer(ctx: Ctx, seconds: number) {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = 1234567;
  for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; }
  return b;
}

function hallImpulse(ctx: Ctx, seconds = 2.6) {
  const len = Math.ceil(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let s = 987654 + c * 77;
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const t = i / len;
      d[i] = ((s / 0x3fffffff) - 1) * Math.pow(1 - t, 3.2) * (i < ctx.sampleRate * 0.012 ? i / (ctx.sampleRate * 0.012) : 1);
    }
  }
  return b;
}

export type Bus = { ctx: Ctx; dry: AudioNode; wet: AudioNode; noise: AudioBuffer };

export function makeBus(ctx: Ctx, out: AudioNode): Bus {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8; limiter.knee.value = 0; limiter.ratio.value = 14;
  limiter.attack.value = 0.002; limiter.release.value = 0.18;
  limiter.connect(out);
  const verb = ctx.createConvolver();
  verb.buffer = hallImpulse(ctx);
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  wet.connect(verb); verb.connect(limiter);
  return { ctx, dry: limiter, wet, noise: noiseBuffer(ctx, 3) };
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function partial(b: Bus, t: number, freq: number, peak: number, decay: number, type: OscillatorType = 'sine', send = 0.4) {
  const { ctx } = b;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.96, t + decay);
  const g = ctx.createGain(); env(g, t, peak, 0.002, decay);
  o.connect(g); g.connect(b.dry);
  if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(b.wet); }
  o.start(t); o.stop(t + decay + 0.05);
}

function noiseHit(b: Bus, t: number, peak: number, decay: number, filter: BiquadFilterType, freq: number, q = 0.8, send = 0.5) {
  const { ctx } = b;
  const src = ctx.createBufferSource(); src.buffer = b.noise;
  const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, peak, 0.001, decay);
  src.connect(f); f.connect(g); g.connect(b.dry);
  if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(b.wet); }
  src.start(t, Math.random() * 1.5); src.stop(t + decay + 0.05);
}

function drop(b: Bus, t: number, from: number, to: number, peak: number, glide: number, decay: number, send = 0.25) {
  const { ctx } = b;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + glide);
  const g = ctx.createGain(); env(g, t, peak, 0.004, decay);
  o.connect(g); g.connect(b.dry);
  if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(b.wet); }
  o.start(t); o.stop(t + decay + 0.05);
}

/** The big gavel: crack + wood body + sub drop + rumble + hall. */
export function gavel(b: Bus, t: number) {
  noiseHit(b, t, 1.0, 0.045, 'highpass', 1800, 0.7, 0.8);
  noiseHit(b, t, 0.7, 0.09, 'bandpass', 3200, 1.4, 0.6);
  partial(b, t, 196, 0.75, 0.26, 'triangle', 0.6);
  partial(b, t, 463, 0.42, 0.16, 'sine', 0.6);
  partial(b, t, 811, 0.24, 0.09, 'sine', 0.5);
  drop(b, t, 96, 34, 1.0, 0.55, 1.6, 0.3);
  noiseHit(b, t + 0.005, 0.55, 1.3, 'lowpass', 170, 0.7, 0.4);
}

/** A small knock: the Register button, a click on the floor. */
export function tap(b: Bus, t: number, size = 1) {
  noiseHit(b, t, 0.35 * size, 0.03, 'highpass', 2200, 0.7, 0.5);
  partial(b, t, 230, 0.36 * size, 0.15, 'triangle', 0.5);
  partial(b, t, 520, 0.18 * size, 0.09, 'sine', 0.4);
  drop(b, t, 80, 45, 0.3 * size, 0.2, 0.35, 0.2);
  // A charged release (size > 1) adds a sub thump under the knock: your own small gavel.
  if (size > 1) drop(b, t, 64, 30, 0.5 * Math.min(1, (size - 1) * 2), 0.32, 0.6, 0.3);
}

/** One heartbeat (lub-dub). */
export function beat(b: Bus, t: number, level: number) {
  drop(b, t, 82, 44, 0.55 * level, 0.09, 0.2, 0.05);
  drop(b, t + 0.17, 76, 42, 0.36 * level, 0.08, 0.17, 0.05);
}

/** Heartbeats per second for a hold progress p (62 bpm at rest, ~170 bpm at full). */
export const beatRate = (p: number) => (62 + 108 * p * p) / 60;

/** The hold drone. set(p, t) moves it; stop(t) cuts it hard (the held breath before the gavel). */
export function drone(b: Bus, t0: number) {
  const { ctx } = b;
  const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t0); out.connect(b.dry);
  const send = ctx.createGain(); send.gain.value = 0.3; out.connect(send); send.connect(b.wet);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7; lp.frequency.setValueAtTime(120, t0); lp.connect(out);
  const oscs = [55, 55.35, 27.5].map((f, i) => {
    const o = ctx.createOscillator(); o.type = i === 2 ? 'sine' : 'sawtooth'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = i === 2 ? 0.9 : 0.35; o.connect(g); g.connect(lp); o.start(t0); return o;
  });
  const tone = ctx.createOscillator(); tone.type = 'sine'; tone.frequency.setValueAtTime(220, t0);
  const toneG = ctx.createGain(); toneG.gain.setValueAtTime(0.0001, t0); tone.connect(toneG); toneG.connect(out); tone.start(t0);
  const riser = ctx.createBufferSource(); riser.buffer = b.noise; riser.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2; bp.frequency.setValueAtTime(400, t0);
  const riserG = ctx.createGain(); riserG.gain.setValueAtTime(0.0001, t0);
  riser.connect(bp); bp.connect(riserG); riserG.connect(out); riser.start(t0);
  const all = [...oscs, tone, riser];
  return {
    set(p: number, t: number) {
      const k = 0.03;
      out.gain.setTargetAtTime(Math.max(0.0001, 0.42 * Math.pow(p, 1.3)), t, k);
      lp.frequency.setTargetAtTime(120 + 1700 * p * p, t, k);
      tone.frequency.setTargetAtTime(220 * (1 + p * 1.2), t, k);
      toneG.gain.setTargetAtTime(Math.max(0.0001, 0.09 * p), t, k);
      bp.frequency.setTargetAtTime(400 + 4200 * p * p, t, k);
      riserG.gain.setTargetAtTime(Math.max(0.0001, 0.22 * p * p), t, k);
    },
    stop(t: number) {
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0.0001, t + 0.012);
      all.forEach((n) => n.stop(t + 0.05));
    },
  };
}

/** A near-silent room tone after the gavel, so the page never feels dead. */
export function room(b: Bus, t: number) {
  const { ctx } = b;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 3); g.connect(b.dry);
  [110, 164.8, 220.4].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = [0.5, 0.3, 0.14][i]; o.connect(og); og.connect(g); o.start(t);
  });
  return g;
}

/* ------------------------------------------------------------------ live engine */

const KEY = 'alt4.sound';
export class Sound {
  ctx: AudioContext | null = null;
  bus: Bus | null = null;
  master: GainNode | null = null;
  enabled: boolean;
  private d: ReturnType<typeof drone> | null = null;
  private nextBeat = 0;
  private p = 0;
  private roomOn = false;
  constructor(private disabled = false) {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* storage blocked */ }
    this.enabled = !disabled && saved !== 'off';
  }
  /** Call inside a user gesture. */
  wake() {
    if (this.disabled) return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 1 : 0;
      this.master.connect(this.ctx.destination);
      this.bus = makeBus(this.ctx, this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setEnabled(on: boolean) {
    this.enabled = on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage blocked */ }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }
  private get now() { return this.ctx ? this.ctx.currentTime : 0; }
  holdStart() {
    if (!this.bus || this.d) return;
    this.d = drone(this.bus, this.now);
    this.nextBeat = this.now + 0.05;
  }
  hold(p: number) {
    this.p = p;
    if (!this.bus) return;
    if (!this.d && p > 0.001) this.holdStart();
    if (!this.d) return;
    this.d.set(p, this.now);
    // Schedule heartbeats a little ahead of time.
    while (this.nextBeat < this.now + 0.12) {
      if (this.p > 0.02) beat(this.bus, Math.max(this.nextBeat, this.now), 0.4 + 0.6 * this.p);
      this.nextBeat += 1 / beatRate(this.p);
    }
    if (p <= 0.001) { this.d.stop(this.now); this.d = null; }
  }
  /** The held breath: the drone cuts, then the gavel lands `gap` seconds later. */
  strike(gap: number) {
    if (!this.bus) return;
    const t = this.now;
    this.d?.stop(t); this.d = null;
    gavel(this.bus, t + gap);
    if (!this.roomOn) { room(this.bus, t + gap + 0.8); this.roomOn = true; }
  }
  tap(size = 1) { if (this.bus) tap(this.bus, this.now, size); }
}

/* ------------------------------------------------------------------ offline (video sound track) */

export type LogEntry = { t: number; type: 'hold'; p: number } | { t: number; type: 'strike'; gap: number } | { t: number; type: 'tap'; size: number };

/** Renders the whole sound track from a capture log (times in seconds from the video's first frame). */
export async function renderLog(log: LogEntry[], duration: number, rate = 48000): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * rate), rate);
  const b = makeBus(ctx, ctx.destination);
  let d: ReturnType<typeof drone> | null = null;
  let p = 0, nextBeat = 0;
  for (const e of log) {
    if (e.type === 'hold') {
      if (!d && e.p > 0.001) { d = drone(b, e.t); nextBeat = e.t + 0.05; }
      if (d) {
        d.set(e.p, e.t);
        while (nextBeat < e.t + 1 / 60) {
          if (p > 0.02) beat(b, nextBeat, 0.4 + 0.6 * p);
          nextBeat += 1 / beatRate(p);
        }
        if (e.p <= 0.001) { d.stop(e.t); d = null; }
      }
      p = e.p;
    } else if (e.type === 'strike') {
      d?.stop(e.t); d = null;
      gavel(b, e.t + e.gap);
      room(b, e.t + e.gap + 0.8);
    } else tap(b, e.t, e.size);
  }
  return ctx.startRendering();
}

/** 16-bit PCM WAV, base64 (sent back to Node by video.mjs). */
export function wavBase64(buf: AudioBuffer) {
  const ch = buf.numberOfChannels, len = buf.length, rate = buf.sampleRate;
  const bytes = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) bytes.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); bytes.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, ch, true);
  bytes.setUint32(24, rate, true); bytes.setUint32(28, rate * ch * 2, true); bytes.setUint16(32, ch * 2, true);
  bytes.setUint16(34, 16, true); str(36, 'data'); bytes.setUint32(40, len * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
    const v = Math.max(-1, Math.min(1, data[c][i]));
    bytes.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2;
  }
  let bin = '';
  const u8 = new Uint8Array(bytes.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
}
