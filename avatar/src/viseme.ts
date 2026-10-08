export const VISEME_NAMES = ['aa', 'ih', 'ou', 'ee', 'oh'] as const;
export type VisemeName = (typeof VISEME_NAMES)[number];

export type VisemeWeights = Record<VisemeName, number>;

export interface SpectrumSample {
  /** Linear magnitudes, typically 0..1. Length may be any FFT bin count. */
  bins: ArrayLike<number>;
  /** Hertz represented by one bin: `sampleRate / fftSize`. */
  binHz: number;
  /** Overall loudness, 0..1. Below the silence floor every viseme is 0. */
  amplitude: number;
}

const SILENCE = 0.04;

const CENTERS: { name: VisemeName; hz: number }[] = [
  { name: 'ou', hz: 250 },
  { name: 'oh', hz: 500 },
  { name: 'aa', hz: 900 },
  { name: 'ih', hz: 1800 },
  { name: 'ee', hz: 3200 },
];

export function zeroVisemes(): VisemeWeights {
  return { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
}

/**
 * Map a frequency snapshot to the five VRM mouth presets.
 * The spectral centroid picks a vowel; `amplitude` scales how far the mouth opens.
 */
export function mapSpectrumToVisemes(sample: SpectrumSample): VisemeWeights {
  const weights = zeroVisemes();
  const amplitude = clamp01(sample.amplitude);
  if (amplitude < SILENCE || sample.bins.length === 0 || !(sample.binHz > 0)) return weights;

  let energy = 0;
  let weightedHz = 0;
  for (let i = 0; i < sample.bins.length; i++) {
    const mag = sample.bins[i];
    if (!Number.isFinite(mag) || mag <= 0) continue;
    const hz = i * sample.binHz;
    if (hz < 80 || hz > 8000) continue;
    energy += mag;
    weightedHz += mag * hz;
  }

  if (energy <= 0) {
    weights.aa = amplitude;
    return weights;
  }

  const centroid = weightedHz / energy;
  const logCentroid = Math.log(centroid);
  let sum = 0;
  const raw = CENTERS.map((band) => {
    const distance = Math.abs(logCentroid - Math.log(band.hz));
    const weight = 1 / (distance + 0.15);
    sum += weight;
    return weight;
  });
  CENTERS.forEach((band, index) => {
    weights[band.name] = (raw[index] / sum) * amplitude;
  });
  return weights;
}

/** Byte time-domain samples are centred on 128. Float samples are already -1..1. */
export function rmsFromTimeDomain(samples: ArrayLike<number>, encoding: 'byte' | 'float' = 'byte'): number {
  if (samples.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const x = encoding === 'byte' ? (sample - 128) / 128 : sample;
    acc += x * x;
  }
  return Math.min(1, Math.sqrt(acc / samples.length));
}

/** Speech RMS is quiet; lift it into the 0..1 viseme range. */
export function amplitudeFromRms(rms: number, gain = 3.5): number {
  if (!Number.isFinite(rms) || rms <= 0.02) return 0;
  return clamp01((rms - 0.02) * gain);
}

const FLAP_CYCLE: VisemeName[] = ['aa', 'ee', 'ih', 'oh', 'ou'];

/** Timed mouth flap used when only text (speechSynthesis) is available. */
export function timedMouthFlap(elapsedMs: number, syllableMs = 140, amount = 0.75): VisemeWeights {
  const weights = zeroVisemes();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return weights;
  const syllable = syllableMs > 0 ? syllableMs : 140;
  const phase = elapsedMs / syllable;
  const index = Math.floor(phase) % FLAP_CYCLE.length;
  const next = (index + 1) % FLAP_CYCLE.length;
  const frac = phase - Math.floor(phase);
  const t = frac * frac * (3 - 2 * frac);
  const open = clamp01(amount);
  weights[FLAP_CYCLE[index]] = (1 - t) * open;
  weights[FLAP_CYCLE[next]] = t * open;
  return weights;
}

export function lerpVisemes(current: VisemeWeights, target: VisemeWeights, t: number): VisemeWeights {
  const mix = clamp01(t);
  const next = zeroVisemes();
  for (const name of VISEME_NAMES) {
    next[name] = current[name] + (target[name] - current[name]) * mix;
  }
  return next;
}

export function dominantViseme(weights: VisemeWeights): VisemeName | null {
  let best: VisemeName | null = null;
  let score = 0;
  for (const name of VISEME_NAMES) {
    if (weights[name] > score) {
      score = weights[name];
      best = name;
    }
  }
  return best;
}

export function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(20000, Math.max(700, words * 340));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
