// Where each live widget sits on the Figma dashboard.
//
// Coordinates are in Figma pixels, relative to the "Vector 71" frame
// (node 591:103 in file uGBVFAHXf0JhW9vxc9w5Uy), which is exported as
// public/hud/dashboard.svg. If you move something in Figma, update its box
// here and re-export the SVG; nothing else needs to change.

export const DESIGN = { width: 895, height: 692 };

const box = (x, y, w, h) => ({ x, y, w, h });

export const SLOTS = {
  title: box(92.86, 13.88, 156.72, 47.79), // "S A T I"
  cpu: box(189.48, 87.12, 30.26, 13.77),
  outputs: [
    box(243.74, 100.69, 66.8, 24.25),
    box(243.74, 139.5, 66.77, 24.16),
    box(243.74, 178.74, 66.77, 24.16),
    box(243.74, 216.92, 66.77, 24.16),
    box(243.74, 256.16, 66.77, 24.16),
  ],
  websocket: box(407.14, 112.79, 73.66, 56.34),
  server: box(677.38, 96.72, 179.36, 66.26),
  ide: box(677.38, 178.53, 179.26, 66.26),
  build: box(677.38, 262.63, 179.46, 66.26),
  speaker: box(344.32, 215.67, 206.8, 206.8),
  recording: box(591.82, 351.11, 85.14, 12.31),
  processing: box(678.42, 351.11, 85.14, 12.31),
  uploaded: box(764.82, 351.11, 85.14, 12.31),
  waveform: box(591.82, 364.25, 258.56, 48.21),
  chatStatus: box(653.8, 442.09, 172.16, 17.32),
  chatInput: box(640.02, 459.62, 196.58, 40.48),
  prometheus: box(317.72, 420.91, 98.81, 127.3),
  grafana: box(475.9, 421.22, 104.65, 107.58),
  terminal: box(423.2, 543.51, 52.9, 88.38),
};

// Flat [name, box] list, used to draw labelled outlines when the art is missing.
export function listSlots() {
  return Object.entries(SLOTS).flatMap(([name, value]) =>
    Array.isArray(value)
      ? value.map((b, i) => [`${name} ${i + 1}`, b])
      : [[name, value]]
  );
}
