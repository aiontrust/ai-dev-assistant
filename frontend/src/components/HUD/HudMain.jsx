import { Fragment, useEffect, useState } from "react";
import VoiceDeck from "./VoiceDeck";
import HudPlate from "./HudPlate";
import { Hotspot, place } from "./Board";
import { SLOTS } from "./hudLayout";
import { useHudLights } from "./hudLights";

// The Figma frame ("Interactive Dashboard" > 591:103) exported as one SVG plate.
// All coordinates below are in that frame's pixel space (895 x 692).
export const HUD_W = 895;
export const HUD_H = 692;

// Interactive regions, from the Figma layer positions.
const REGIONS = {
  gptPopup: { x: 726.4, y: 420.6, w: 24, h: 63.6, label: "Open GPT assistant" },
  ide: { x: 726.4, y: 506.8, w: 24, h: 63.6, label: "Open IDE editor" },
  terminal: { x: 423.2, y: 543.5, w: 52.9, h: 88.4, label: "Terminal release" },
};

// Status consoles on the right panel ("RP Vector"): Figma frames Server / Terminal /
// Build Console. `art` is the layer holding the label drawn on the plate, which is
// replaced by `title` (the plate's lettering reads HUD / IDE / GPT).
const CONSOLES = {
  server: { x: 683, y: 118.4, w: 171.5, h: 30.9, title: "SERVER", art: "SERVER", labelY: 110.5 },
  terminal: { x: 683, y: 200, w: 171.5, h: 30.9, title: "TERMINAL", art: "IDE", labelY: 192.5 },
  build: { x: 683, y: 284.3, w: 171.5, h: 30.9, title: "BUILD", art: "BUILD", labelY: 276.8 },
};

function ConsoleReadout({ region, status }) {
  const lines = status?.lines?.length ? status.lines.slice(0, 3) : ["STANDBY"];
  const tone = status?.lines?.length ? status.tone || "ok" : "idle";
  return (
    <div
      className={`hud-console hud-console--${tone}`}
      role="status"
      aria-label={`${region.title} console`}
      style={place(region)}
    >
      {lines.map((line, i) => (
        <div className={`hud-console__line${i === 0 ? " hud-console__line--head" : ""}`} key={`${i}-${line}`}>
          {line}
        </div>
      ))}
    </div>
  );
}

/**
 * The main HUD frame: the Figma plate with the interactive parts on top.
 * Rendered inside a <Board>, which does the scaling.
 *
 * Props:
 *  - onOpenGPT / onOpenIDE / onOpenTerminal: click handlers for the three buttons
 *  - active: { gpt, ide, terminal } booleans for pressed state
 *  - status: { server, terminal, build }, each { lines: [headline, ...details], tone }
 *    where tone is "ok" | "busy" | "warn"
 *  - voice: the object from useVoiceCapture(); when given, the speaker ring,
 *    waveform and Audio Vector consoles come alive
 *  - lights: signal object from createLightSignals(); drives the plate's lights
 */
export default function HudMain({
  onOpenGPT,
  onOpenIDE,
  onOpenTerminal,
  active = {},
  status = {},
  voice,
  lights,
}) {
  const [plate, setPlate] = useState(null);
  useHudLights(lights ? plate : null, lights, voice);
  const cpu = lights?.cpu;

  // Hide the plate's own console lettering; the titles above are drawn instead.
  useEffect(() => {
    if (!plate) return;
    Object.values(CONSOLES).forEach(({ art }) => {
      const el = plate.querySelector(`[id="${art}"]`);
      if (el) el.style.display = "none";
    });
  }, [plate]);

  return (
    <div className="hud-frame" style={{ left: 0, top: 0, width: HUD_W, height: HUD_H }}>
      <HudPlate width={HUD_W} height={HUD_H} label="SATI AI development assistant HUD" onReady={setPlate} />

      {lights && (
        <div className="hud-cpu" style={place(SLOTS.cpu)} aria-label="CPU load">
          {cpu === null || cpu === undefined ? "--" : `${Math.round(cpu * 100)}%`}
        </div>
      )}

      {voice && <VoiceDeck voice={voice} />}

      {Object.entries(CONSOLES).map(([key, region]) => (
        <Fragment key={key}>
          {plate && (
            <div className="hud-console-title" style={{ left: 684.3, top: region.labelY }}>
              {region.title}
            </div>
          )}
          <ConsoleReadout region={region} status={status[key]} />
        </Fragment>
      ))}

      <Hotspot box={REGIONS.gptPopup} label={REGIONS.gptPopup.label} onClick={onOpenGPT} active={!!active.gpt} />
      <Hotspot box={REGIONS.ide} label={REGIONS.ide.label} onClick={onOpenIDE} active={!!active.ide} />
      <Hotspot
        box={REGIONS.terminal}
        label={REGIONS.terminal.label}
        onClick={onOpenTerminal}
        active={!!active.terminal}
      />
    </div>
  );
}
