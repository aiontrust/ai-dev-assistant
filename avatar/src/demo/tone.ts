/** A short swept tone so the demo can exercise audio visemes without a sound file. */
export function makeToneWavBase64(durationSec = 2.2, sampleRate = 16000): string {
  const length = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const syllable = Math.pow(Math.max(0, Math.sin(Math.PI * 5.5 * t)), 1.3);
    const fundamental = 160 + (t * 520) % 740;
    const sample =
      Math.sin(2 * Math.PI * fundamental * t) * 0.62 +
      Math.sin(2 * Math.PI * fundamental * 2.03 * t) * 0.22 +
      Math.sin(2 * Math.PI * fundamental * 3.1 * t) * 0.1;
    samples[i] = Math.max(-1, Math.min(1, sample * syllable));
  }
  return encodeWavBase64(samples, sampleRate);
}

function encodeWavBase64(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + chunk)));
  }
  return btoa(binary);
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
}
