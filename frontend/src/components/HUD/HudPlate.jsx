import { useEffect, useLayoutEffect, useRef, useState } from "react";

const PLATE_URL = `${process.env.PUBLIC_URL}/hud/dashboard.svg`;

// The plate is fetched once and reused when the HUD remounts (e.g. back from the IDE).
let cached = null;
let pending = null;
function loadPlate() {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch(PLATE_URL).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    });
  }
  return pending.then((text) => {
    cached = text;
    return text;
  });
}

/**
 * The HUD plate as inline SVG, so its Figma-named light layers can be animated.
 * Falls back to a plain <img> if the SVG can't be fetched.
 * onReady(element) runs once the SVG is in the page.
 */
export default function HudPlate({ width, height, label, onReady }) {
  const ref = useRef(null);
  const [svg, setSvg] = useState(cached);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (svg) return undefined;
    let live = true;
    loadPlate()
      .then((text) => live && setSvg(text))
      .catch(() => {
        pending = null;
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [svg]);

  useLayoutEffect(() => {
    if (svg && ref.current) onReady?.(ref.current);
  }, [svg, onReady]);

  if (failed) {
    return (
      <img className="hud-plate" src={PLATE_URL} width={width} height={height} alt={label} draggable={false} />
    );
  }
  return (
    <div
      ref={ref}
      className="hud-plate hud-plate--inline"
      style={{ width, height }}
      role="img"
      aria-label={label}
      // The SVG is our own static asset from public/hud.
      dangerouslySetInnerHTML={{ __html: svg || "" }}
    />
  );
}
