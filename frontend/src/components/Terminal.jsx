import { useEffect, useRef, useState } from "react";
import { Hotspot, place } from "./HUD/Board";

// Figma frame "Terminal" (869:7), exported as public/hud/terminal.svg (895 x 146).
// It docks directly below the main HUD, lined up with the HUD's release tab.
export const TERMINAL_W = 895;
export const TERMINAL_H = 146;

const CONSOLE = { x: 10.96, y: 27.86, w: 874.16, h: 93.7 };
const DISENGAGE = { x: 427.17, y: 0, w: 47.27, h: 26 };

/**
 * The terminal panel: a scrolling log with a prompt line.
 *
 * Props:
 *  - lines: array of strings to show (the log)
 *  - onCommand(line): called when Enter is pressed on a non-empty line
 *  - history: earlier command lines, newest last (Up / Down walk through them)
 *  - busy: true while a command is still running
 *  - onClose: the DISENGAGE button
 */
export default function Terminal({ lines, onCommand, history = [], busy = false, onClose }) {
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState(null); // index into history while browsing it
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (busy || !input.trim()) return;
      onCommand(input);
      setInput("");
      setCursor(null);
    } else if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setInput(history[next]);
    } else if (e.key === "ArrowDown" && cursor !== null) {
      e.preventDefault();
      const next = cursor + 1;
      setCursor(next < history.length ? next : null);
      setInput(next < history.length ? history[next] : "");
    }
  };

  return (
    <div className="hud-frame hud-terminal" style={{ width: TERMINAL_W, height: TERMINAL_H }}>
      <img
        className="hud-plate"
        src={`${process.env.PUBLIC_URL}/hud/terminal.svg`}
        width={TERMINAL_W}
        height={TERMINAL_H}
        alt=""
        draggable={false}
      />

      <div
        className="hud-term"
        style={place(CONSOLE)}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="hud-term__log" ref={logRef} role="log" aria-label="Terminal output">
          {lines.map((line, i) => (
            // Lines are append-only, so the index is a stable key.
            // eslint-disable-next-line react/no-array-index-key
            <div className="hud-term__line" key={i}>
              {line || " "}
            </div>
          ))}
        </div>
        <label className="hud-term__prompt">
          <span aria-hidden="true">{busy ? "…" : ">"}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCursor(null);
            }}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            aria-label="Terminal command"
          />
        </label>
      </div>

      <Hotspot box={DISENGAGE} label="Disengage terminal" onClick={onClose} />
    </div>
  );
}
