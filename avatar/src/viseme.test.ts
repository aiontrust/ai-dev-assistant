import { describe, expect, it } from 'vitest';
import {
  amplitudeFromRms,
  dominantViseme,
  estimateSpeechMs,
  lerpVisemes,
  mapSpectrumToVisemes,
  rmsFromTimeDomain,
  timedMouthFlap,
  VISEME_NAMES,
  zeroVisemes,
} from './viseme';

function peakAt(hz: number, binHz = 50, count = 160): number[] {
  const bins = new Array<number>(count).fill(0);
  const center = Math.round(hz / binHz);
  for (let offset = -4; offset <= 4; offset++) {
    const index = center + offset;
    if (index > 0 && index < count) bins[index] = 1 - Math.abs(offset) / 5;
  }
  return bins;
}

describe('mapSpectrumToVisemes', () => {
  it('keeps the mouth closed when the signal is silent or empty', () => {
    expect(mapSpectrumToVisemes({ bins: peakAt(900), binHz: 50, amplitude: 0 })).toEqual(zeroVisemes());
    expect(mapSpectrumToVisemes({ bins: peakAt(900), binHz: 50, amplitude: 0.02 })).toEqual(zeroVisemes());
    expect(mapSpectrumToVisemes({ bins: [], binHz: 50, amplitude: 1 })).toEqual(zeroVisemes());
    expect(mapSpectrumToVisemes({ bins: peakAt(900), binHz: 0, amplitude: 1 })).toEqual(zeroVisemes());
  });

  it('picks a vowel from the spectral centroid and scales it by amplitude', () => {
    const loud = 0.8;
    expect(dominantViseme(mapSpectrumToVisemes({ bins: peakAt(250), binHz: 50, amplitude: loud }))).toBe('ou');
    expect(dominantViseme(mapSpectrumToVisemes({ bins: peakAt(500), binHz: 50, amplitude: loud }))).toBe('oh');
    expect(dominantViseme(mapSpectrumToVisemes({ bins: peakAt(900), binHz: 50, amplitude: loud }))).toBe('aa');
    expect(dominantViseme(mapSpectrumToVisemes({ bins: peakAt(1800), binHz: 50, amplitude: loud }))).toBe('ih');
    expect(dominantViseme(mapSpectrumToVisemes({ bins: peakAt(3200), binHz: 50, amplitude: loud }))).toBe('ee');

    const quiet = mapSpectrumToVisemes({ bins: peakAt(900), binHz: 50, amplitude: 0.2 });
    const strong = mapSpectrumToVisemes({ bins: peakAt(900), binHz: 50, amplitude: 0.8 });
    expect(strong.aa).toBeGreaterThan(quiet.aa);
    expect(strong.aa).toBeLessThanOrEqual(0.8);
    for (const name of VISEME_NAMES) {
      expect(strong[name]).toBeGreaterThanOrEqual(0);
      expect(strong[name]).toBeLessThanOrEqual(1);
    }
  });

  it('opens on aa when the sound is loud but has no tonal peak', () => {
    const weights = mapSpectrumToVisemes({ bins: [0, 0, 0, 0], binHz: 50, amplitude: 0.5 });
    expect(weights.aa).toBeCloseTo(0.5);
    expect(weights.ee).toBe(0);
  });
});

describe('amplitude and timed flap', () => {
  it('measures RMS and lifts speech-level energy into a viseme amplitude', () => {
    expect(rmsFromTimeDomain(new Uint8Array(16).fill(128))).toBe(0);
    expect(rmsFromTimeDomain(new Uint8Array(8).fill(0))).toBeCloseTo(1);
    expect(amplitudeFromRms(0)).toBe(0);
    expect(amplitudeFromRms(0.02)).toBe(0);
    expect(amplitudeFromRms(0.3)).toBeCloseTo(0.98);
    expect(amplitudeFromRms(2)).toBe(1);
  });

  it('crossfades the mouth flap over successive syllables', () => {
    expect(dominantViseme(timedMouthFlap(0))).toBe('aa');
    expect(dominantViseme(timedMouthFlap(140))).toBe('ee');
    expect(dominantViseme(timedMouthFlap(280))).toBe('ih');
    const mid = timedMouthFlap(70);
    const sum = VISEME_NAMES.reduce((total, name) => total + mid[name], 0);
    expect(sum).toBeCloseTo(0.75);
    expect(mid.aa).toBeGreaterThan(0);
    expect(mid.ee).toBeGreaterThan(0);
    expect(timedMouthFlap(-10)).toEqual(zeroVisemes());
  });

  it('lerps visemes and estimates speech length from the transcript', () => {
    const mixed = lerpVisemes(zeroVisemes(), { aa: 1, ih: 0, ou: 0, ee: 0, oh: 0 }, 0.25);
    expect(mixed.aa).toBeCloseTo(0.25);
    expect(estimateSpeechMs('hello')).toBe(700);
    expect(estimateSpeechMs('one two three four')).toBe(1360);
  });
});
