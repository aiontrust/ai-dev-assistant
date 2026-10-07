import { useEffect, useRef } from "react";

// Light layers in public/hud/dashboard.svg, by their Figma layer names.
const range = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);

const GROUPS = {
  os: range("OS Light", 6), // gauge segments around the left sphere, clockwise
  sphere: range("Sphere Light", 6), // inner dashed ring of the left sphere
  ring: range("OSVL", 28), // speaker outer ring, clockwise from the left
  core: range("SV Light", 8), // speaker inner ring, clockwise from the top
};

// Circuit traces and right-panel connectors, keyed by short names.
const TRACES = {
  L1: "Vector L1", // left panel border, around the OS gauge
  L2: "Vector L2", // left outputs down to the speaker
  L3: "Vector L3", // bottom-left run
  L4: "Vector L4", // right side, around the chat area
  L5: "Vector L5", // speaker out to the waveform panel
  L6: "Vector L6", // top-right run from the WebSocket panel
  RP: "RP Vector Light", // trunk from the speaker up to the consoles
  RPV1: "RPV1", // Server console end
  RPV2: "RPV2", // Terminal console end
  RPV3: "RPV3", // Build console end
  RPV4: "RPV4", // speaker end
  OVL1: "OVL1", // Output Vector edge lights, bottom (OVL1) to top (OVL5)
  OVL2: "OVL2",
  OVL3: "OVL3",
  OVL4: "OVL4",
  OVL5: "OVL5",
};

// Which traces light, and when (ms), for each kind of data movement.
const FLOWS = {
  metrics: [["L1", 0]],
  voice: [["L5", 0], ["L2", 140]],
  terminal: [["L3", 0]],
  chat: [["L4", 0], ["L6", 140]],
  backend: [["L6", 0]],
  socket: [["L6", 0]],
  outputs: [["OVL5", 0], ["OVL4", 60], ["OVL3", 120], ["OVL2", 180], ["OVL1", 240]],
  "console:server": [["RPV4", 0], ["RP", 90], ["RPV1", 200]],
  "console:terminal": [["RPV4", 0], ["RP", 90], ["RPV2", 200]],
  "console:build": [["RPV4", 0], ["RP", 90], ["RPV3", 200]],
};

const DIM = 0.14; // an "off" light stays faintly visible so the design still reads
const BOOT_MS = 1500;

/** Creates the shared signal object the HUD reads every frame. */
export function createLightSignals() {
  return {
    bootAt: null, // set when the plate first appears
    cpu: null, // 0..1
    online: null, // backend reachable?
    thinking: false, // waiting on the assistant
    speaking: false, // reading a reply aloud
    energy: 0, // speech energy, bumped on each spoken word
    pulses: {}, // trace key -> time (ms) the pulse starts
  };
}

/** Sends a pulse along the traces for one kind of data movement. */
export function pulse(signals, flow) {
  const now = performance.now();
  for (const [key, delay] of FLOWS[flow] || []) signals.pulses[key] = now + delay;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Brightness of a chase: 1 at the head, fading over `tail` lights behind it. */
function chase(i, head, count, tail) {
  const behind = (head - i + count) % count;
  return clamp01(1 - behind / tail);
}

/**
 * Animates the HUD's lights from the shared signals.
 *  - root: the element holding the inline plate SVG (null until it is loaded)
 *  - signals: object from createLightSignals(), updated by the dashboard
 *  - voice: the useVoiceCapture() object (state + live levels)
 */
export function useHudLights(root, signals, voice) {
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useEffect(() => {
    if (!root) return undefined;
    const find = (id) => root.querySelector(`[id="${id}"]`);
    const track = (ids) =>
      ids.map((id) => ({ el: find(id), cur: 0, shown: -1, glow: 0 })).filter((l) => l.el);

    const lights = {
      os: track(GROUPS.os),
      sphere: track(GROUPS.sphere),
      ring: track(GROUPS.ring),
      core: track(GROUPS.core),
    };
    const traceKeys = Object.keys(TRACES);
    const traces = Object.fromEntries(
      traceKeys.map((k) => [k, { el: find(TRACES[k]), cur: 0, shown: -1, glow: 0 }])
    );
    const ringLevels = new Array(lights.ring.length).fill(0);

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (signals.bootAt === null) signals.bootAt = performance.now();

    const write = (light, target, rate) => {
      light.cur += (target - light.cur) * rate;
      if (Math.abs(light.cur - light.shown) > 0.004) {
        light.el.style.opacity = light.cur.toFixed(3);
        light.shown = light.cur;
      }
    };

    let raf = 0;
    let last = 0;
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      const s = signals;
      const v = voiceRef.current;
      const since = t - s.bootAt;
      // Slow effects (gauge, idle chases) only need 30 fps; repainting the plate is costly.
      const fast =
        since < BOOT_MS || v?.state === "recording" || s.speaking || Object.keys(s.pulses).length > 0;
      if (!fast && t - last < 33) return;
      last = t;
      // 0 -> 1 as the power-on sequence reaches a light `offset` ms in.
      const boot = (offset) => (reduceMotion || since > BOOT_MS ? 1 : clamp01((since - offset) / 180));
      const sec = t / 1000;

      // OS gauge: one segment per sixth of CPU load.
      const lit = s.cpu === null ? 0 : Math.max(1, Math.ceil(s.cpu * 6));
      lights.os.forEach((l, i) => write(l, (i < lit ? 1 : DIM) * boot(300 + i * 80), 0.12));

      // Sphere ring: a chase that speeds up with load; still when offline.
      const spinning = !reduceMotion && s.online !== false;
      const speed = 0.35 + (s.cpu || 0) * 2.4; // revolutions per second
      const sphereHead = (sec * speed * 6) % 6;
      lights.sphere.forEach((l, i) => {
        const level = spinning ? 0.3 + 0.7 * chase(i, sphereHead, 6, 2.5) : 0.35;
        write(l, level * boot(500 + i * 60), 0.3);
      });

      // Speaker: mic level while recording, chase while thinking, word pulses while speaking.
      const mode =
        v?.state === "recording"
          ? "rec"
          : v?.state === "processing" || s.thinking
            ? "think"
            : s.speaking
              ? "speak"
              : "idle";
      s.energy *= 0.93;
      const levels = v?.levelsRef?.current || [];
      const coreHead = (sec * 1.5 * 8) % 8;

      lights.ring.forEach((l, i) => {
        let level;
        if (mode === "rec") {
          const raw = levels[Math.floor((i * levels.length) / lights.ring.length)] || 0;
          ringLevels[i] = Math.max(raw, ringLevels[i] * 0.88);
          level = 0.15 + 0.85 * clamp01(ringLevels[i] * 2.2);
        } else if (mode === "speak") {
          level = 0.2 + 0.8 * s.energy * (0.55 + 0.45 * Math.sin(sec * 8 + i * 0.9));
        } else {
          ringLevels[i] = 0;
          level = mode === "think" ? 0.3 : 0.4;
        }
        write(l, level * boot(600 + i * 25), mode === "rec" || mode === "speak" ? 0.45 : 0.12);
      });

      lights.core.forEach((l, i) => {
        let level;
        if (mode === "rec") level = 1;
        else if (mode === "think") level = reduceMotion ? 0.8 : 0.2 + 0.8 * chase(i, coreHead, 8, 3);
        else if (mode === "speak") level = 0.4 + 0.6 * s.energy;
        else level = reduceMotion ? 0.5 : 0.45 + 0.15 * Math.sin(sec * 1.4);
        write(l, level * boot(1200 + i * 35), 0.3);
      });

      // Traces: steady when online, dim when offline, flaring as data moves.
      const base = s.online === false ? 0.18 : 0.6;
      traceKeys.forEach((k, i) => {
        const tr = traces[k];
        if (!tr.el) return;
        const start = s.pulses[k];
        let p = 0;
        if (start !== undefined && t >= start) {
          p = Math.exp(-(t - start) / 320);
          if (p < 0.01) delete s.pulses[k];
        }
        write(tr, (base + (1 - base) * p) * boot(i * 40), p > tr.cur ? 1 : 0.2);
        const glow = p > 0.03 ? p : 0;
        if (Math.abs(glow - tr.glow) > 0.02) {
          tr.el.style.filter = glow
            ? `drop-shadow(0 0 ${(2.5 * glow).toFixed(2)}px rgba(166, 214, 164, ${(0.9 * glow).toFixed(2)}))`
            : "";
          tr.glow = glow;
        }
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [root, signals]);
}
