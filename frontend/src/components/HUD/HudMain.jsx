import { useState } from "react";
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

// Console read-outs on the right-hand panels (labelled HUD / IDE / GPT in the design).
const CONSOLES = {
  hud: { x: 683, y: 118.4, w: 171.5, h: 30.9, label: "HUD console" },
  ide: { x: 683, y: 200, w: 171.5, h: 30.9, label: "IDE console" },
  gpt: { x: 683, y: 284.3, w: 171.5, h: 30.9, label: "GPT console" },
};

function ConsoleReadout({ region, lines }) {
  const hasLines = Array.isArray(lines) && lines.length > 0;
  const shown = hasLines ? lines.slice(-3) : ["STANDBY"];
  return (
    <div
      className={`hud-console${hasLines ? "" : " hud-console--idle"}`}
      role="log"
      aria-label={region.label}
      style={place(region)}
    >
      {shown.map((line, i) => (
        <div className="hud-console__line" key={`${i}-${line}`}>
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
 *  - feeds: { hud, ide, gpt } arrays of strings shown in the right-hand consoles
 *  - voice: the object from useVoiceCapture(); when given, the speaker ring,
 *    waveform and status lights come alive
 *  - lights: signal object from createLightSignals(); drives the plate's lights
 */
export default function HudMain({
  onOpenGPT,
  onOpenIDE,
  onOpenTerminal,
  active = {},
  feeds = {},
  voice,
  lights,
}) {
  const [plate, setPlate] = useState(null);
  useHudLights(lights ? plate : null, lights, voice);
  const cpu = lights?.cpu;

  return (
    <div className="hud-frame" style={{ left: 0, top: 0, width: HUD_W, height: HUD_H }}>
      <HudPlate width={HUD_W} height={HUD_H} label="SATI AI development assistant HUD" onReady={setPlate} />

      {lights && (
        <div className="hud-cpu" style={place(SLOTS.cpu)} aria-label="CPU load">
          {cpu === null || cpu === undefined ? "--" : `${Math.round(cpu * 100)}%`}
        </div>
      )}

      {voice && <VoiceDeck voice={voice} />}

      <ConsoleReadout region={CONSOLES.hud} lines={feeds.hud} />
      <ConsoleReadout region={CONSOLES.ide} lines={feeds.ide} />
      <ConsoleReadout region={CONSOLES.gpt} lines={feeds.gpt} />

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
