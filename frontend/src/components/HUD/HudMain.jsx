import { useEffect, useRef, useState } from "react";

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

/** Scale factor that fits the HUD_W x HUD_H stage inside the element `ref` points at. */
function useFitScale(ref) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const { clientWidth, clientHeight } = el;
      if (clientWidth && clientHeight) {
        setScale(Math.min(clientWidth / HUD_W, clientHeight / HUD_H));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return scale;
}

function Hotspot({ region, onClick, active = false }) {
  return (
    <button
      type="button"
      className="hud-hotspot"
      aria-label={region.label}
      title={region.label}
      aria-pressed={active}
      onClick={onClick}
      style={{ left: region.x, top: region.y, width: region.w, height: region.h }}
    />
  );
}

function ConsoleReadout({ region, lines }) {
  const hasLines = Array.isArray(lines) && lines.length > 0;
  const shown = hasLines ? lines.slice(-3) : ["STANDBY"];
  return (
    <div
      className={`hud-console${hasLines ? "" : " hud-console--idle"}`}
      role="log"
      aria-label={region.label}
      style={{ left: region.x, top: region.y, width: region.w, height: region.h }}
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
 * The main HUD. Renders the Figma plate scaled to fit its container and layers
 * the interactive parts on top.
 *
 * Props:
 *  - onOpenGPT / onOpenIDE / onOpenTerminal: click handlers for the three buttons
 *  - active: { gpt, ide, terminal } booleans for pressed state
 *  - feeds: { hud, ide, gpt } arrays of strings shown in the right-hand consoles
 */
export default function HudMain({
  onOpenGPT,
  onOpenIDE,
  onOpenTerminal,
  active = {},
  feeds = {},
}) {
  const viewportRef = useRef(null);
  const scale = useFitScale(viewportRef);

  return (
    <div className="hud-viewport" ref={viewportRef}>
      <div
        className="hud-canvas"
        style={{ width: HUD_W, height: HUD_H, transform: `scale(${scale})` }}
      >
        <img
          className="hud-plate"
          src={`${process.env.PUBLIC_URL}/hud/dashboard.svg`}
          width={HUD_W}
          height={HUD_H}
          alt="SATI AI development assistant HUD"
          draggable={false}
        />

        <ConsoleReadout region={CONSOLES.hud} lines={feeds.hud} />
        <ConsoleReadout region={CONSOLES.ide} lines={feeds.ide} />
        <ConsoleReadout region={CONSOLES.gpt} lines={feeds.gpt} />

        <Hotspot region={REGIONS.gptPopup} onClick={onOpenGPT} active={!!active.gpt} />
        <Hotspot region={REGIONS.ide} onClick={onOpenIDE} active={!!active.ide} />
        <Hotspot region={REGIONS.terminal} onClick={onOpenTerminal} active={!!active.terminal} />
      </div>
    </div>
  );
}
