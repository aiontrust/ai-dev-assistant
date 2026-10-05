import { useEffect, useRef, useState } from "react";
import { DESIGN, listSlots } from "./hudLayout";

// Absolutely positioned box in Figma pixel space.
export function Slot({ box, as: Tag = "div", className = "", style, children, ...rest }) {
  return (
    <Tag
      className={`hud-slot ${className}`}
      style={{ left: box.x, top: box.y, width: box.w, height: box.h, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const ART_URL = `${process.env.PUBLIC_URL || ""}/hud/dashboard.svg`;

// Draws the exported Figma art at its design size and scales the whole board
// to fit the window. Live widgets are children placed with <Slot>.
// If the art file is missing, shows a plain board with every slot outlined.
export default function HudStage({ children }) {
  const viewport = useRef(null);
  const [scale, setScale] = useState(1);
  const [artOk, setArtOk] = useState(true);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return undefined;
    const fit = () =>
      setScale(Math.min(el.clientWidth / DESIGN.width, el.clientHeight / DESIGN.height) || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={viewport} className="hud-viewport">
      <div
        className="hud-board-box"
        style={{ width: DESIGN.width * scale, height: DESIGN.height * scale }}
      >
        <div
          className={`hud-board ${artOk ? "" : "hud-board--noart"}`}
          style={{ width: DESIGN.width, height: DESIGN.height, transform: `scale(${scale})` }}
        >
          {artOk ? (
            <img
              className="hud-art"
              src={ART_URL}
              alt=""
              draggable={false}
              onError={() => setArtOk(false)}
            />
          ) : (
            listSlots().map(([name, box]) => (
              <Slot key={name} box={box} className="hud-outline">
                <span className="hud-outline-label">{name}</span>
              </Slot>
            ))
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
