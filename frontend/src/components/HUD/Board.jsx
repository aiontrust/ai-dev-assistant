import { useEffect, useRef, useState } from "react";

// Design width shared by every HUD frame (Figma frame 591:103 is 895 px wide).
export const BOARD_W = 895;

/** Scale factor that fits a width x height board inside the element `ref` points at. */
function useFitScale(ref, width, height) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const { clientWidth, clientHeight } = el;
      if (clientWidth && clientHeight) {
        setScale(Math.min(clientWidth / width, clientHeight / height));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, width, height]);
  return scale;
}

/**
 * Fixed-size canvas in Figma pixel space, scaled to fit the window. Children are
 * placed with absolute Figma coordinates, so every frame scales together.
 */
export default function Board({ height, children }) {
  const viewportRef = useRef(null);
  const scale = useFitScale(viewportRef, BOARD_W, height);

  return (
    <div className="hud-viewport" ref={viewportRef}>
      <div
        className="hud-canvas"
        style={{ width: BOARD_W, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

/** Inline style that places an element on a Figma box { x, y, w, h }. */
export const place = (box) => ({ left: box.x, top: box.y, width: box.w, height: box.h });

/** Invisible button laid over a control drawn on the plate. */
export function Hotspot({ box, label, onClick, active = false, disabled = false }) {
  return (
    <button
      type="button"
      className="hud-hotspot"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      style={place(box)}
    />
  );
}
