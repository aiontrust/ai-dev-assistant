import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Hotspot, place } from "./HUD/Board";

// Figma frame "Vector 72" (595:105), exported as public/hud/ide.svg (893 x 692).
// It is the same size as the main HUD and replaces it while open.
export const IDE_W = 893;
export const IDE_H = 692;

const EDITOR = { x: 85.35, y: 140.86, w: 715.36, h: 350.38 };
const TAB = { x: 108, y: 121.87, w: 190, h: 18.16 }; // stops short of the tab's stripes
const OUTPUT = { x: 8.76, y: 572, w: 874.79, h: 93.7 };
const UP = { x: 431.66, y: 86.29, w: 23.79, h: 24 };
const DOWN = { x: 431.66, y: 526, w: 23.79, h: 24 };

const INDENT = "  ";

/** 1-based line and column of a character offset. */
function caretPosition(text, offset) {
  const before = text.slice(0, offset).split("\n");
  return { line: before.length, col: before[before.length - 1].length + 1 };
}

/** Saves the document to the user's downloads. */
function download(doc) {
  const url = URL.createObjectURL(new Blob([doc.code], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * The IDE editor frame.
 *
 * Props:
 *  - doc: { name, code } being edited
 *  - onChange(code): the editor text changed
 *  - log: array of strings for the output console along the bottom
 *  - onLog(line): append a line to that console
 *  - gptOpen / onToggleGPT: the ▲ button opens the assistant next to the editor
 *  - onClose: the ▼ button returns to the HUD
 */
export default function IdeFrame({ doc, onChange, log, onLog, gptOpen = false, onToggleGPT, onClose }) {
  const editorRef = useRef(null);
  const gutterRef = useRef(null);
  const outputRef = useRef(null);
  const pendingCaret = useRef(null); // where the caret goes after a programmatic edit
  const [caret, setCaret] = useState({ line: 1, col: 1 });

  const lineCount = doc.code.split("\n").length;

  // Restore the caret before the next keystroke can land; a controlled
  // textarea otherwise jumps it to the end when its value is replaced.
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (el && pendingCaret.current !== null) {
      el.selectionStart = pendingCaret.current;
      el.selectionEnd = pendingCaret.current;
      pendingCaret.current = null;
      setCaret(caretPosition(el.value, el.selectionStart));
    }
  }, [doc.code]);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const trackCaret = () => {
    const el = editorRef.current;
    if (el) setCaret(caretPosition(el.value, el.selectionStart));
  };

  const onKeyDown = (e) => {
    const el = e.currentTarget;
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const { selectionStart: start, selectionEnd: end } = el;
      pendingCaret.current = start + INDENT.length;
      onChange(doc.code.slice(0, start) + INDENT + doc.code.slice(end));
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      download(doc);
      onLog(`SAVED ${doc.name}`);
    }
  };

  return (
    <div className="hud-frame hud-ide" style={{ left: 0, top: 0, width: IDE_W, height: IDE_H }}>
      <img
        className="hud-plate"
        src={`${process.env.PUBLIC_URL}/hud/ide.svg`}
        width={IDE_W}
        height={IDE_H}
        alt="IDE editor"
        draggable={false}
      />

      <div className="hud-ide__tab" style={place(TAB)}>
        <span>{doc.name}</span>
        <span>
          LN {caret.line} COL {caret.col}
        </span>
      </div>

      <div className="hud-ide__editor" style={place(EDITOR)}>
        <div className="hud-ide__gutter" aria-hidden="true">
          <div ref={gutterRef}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        </div>
        <textarea
          ref={editorRef}
          value={doc.code}
          placeholder="// Code from the GPT assistant opens here. Ctrl+S saves a copy."
          aria-label={`Editing ${doc.name}`}
          spellCheck={false}
          wrap="off"
          onChange={(e) => {
            onChange(e.target.value);
            trackCaret();
          }}
          onKeyDown={onKeyDown}
          onKeyUp={trackCaret}
          onClick={trackCaret}
          onScroll={(e) => {
            if (gutterRef.current) {
              gutterRef.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`;
            }
          }}
        />
      </div>

      <div className="hud-ide__output" ref={outputRef} style={place(OUTPUT)} role="log" aria-label="IDE output">
        {log.length === 0 ? (
          <div className="hud-ide__idle">STANDBY</div>
        ) : (
          // Log lines are append-only, so the index is a stable key.
          // eslint-disable-next-line react/no-array-index-key
          log.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>

      <Hotspot box={UP} label={gptOpen ? "Close GPT assistant" : "Open GPT assistant"} onClick={onToggleGPT} active={gptOpen} />
      <Hotspot box={DOWN} label="Back to HUD" onClick={onClose} />
    </div>
  );
}
