import { useCallback, useEffect, useRef, useState } from "react";
import { Hotspot, place } from "./HUD/Board";

// Figma frame "GPT Popup" (717:28), exported as public/hud/gpt-popup.svg (203 x 414).
export const GPT_W = 203;
export const GPT_H = 414;

const LOG = { x: 6, y: 17, w: 188, h: 360 };
const GUTTER = { x: 197.04, y: 17, h: 362 }; // scrollbar track drawn on the plate
const INPUT = { x: 5.84, y: 384.39, w: 190.11, h: 18.16 };
const ATTACH = { x: 15.5, y: 402.6, w: 15, h: 10 };
const MIC = { x: 28.9, y: 402.3, w: 12.2, h: 10.5 };
const SEND = { x: 166, y: 402.6, w: 13.6, h: 10.5 };
const CLOSE = { x: 182.3, y: 2, w: 12.5, h: 12.5 };
const MODEL = { x: 6, y: 3, w: 172, h: 10 }; // model picker, left of the close button

const MAX_ATTACHMENT = 100 * 1024;

/** Splits reply text into plain text and ```fenced``` code parts. */
export function splitCode(text) {
  const parts = [];
  const fence = /```([\w+-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = fence.exec(text))) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "", text: m[2].replace(/\n$/, "") });
    last = fence.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

function Message({ message, onOpenCode }) {
  if (message.role !== "assistant") {
    return <div className={`hud-chat__msg hud-chat__msg--${message.role}`}>{message.text}</div>;
  }
  return (
    <div className="hud-chat__msg hud-chat__msg--assistant">
      {splitCode(message.text).map((part, i) =>
        part.type === "code" ? (
          // eslint-disable-next-line react/no-array-index-key
          <div className="hud-chat__code" key={i}>
            <pre>{part.text}</pre>
            <button type="button" onClick={() => onOpenCode(part.text, part.lang)}>
              Open in IDE
            </button>
          </div>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i}>{part.text}</span>
        )
      )}
      {message.via && (
        <div className="hud-chat__via">
          via {message.via}
          {message.fallbackFrom ? ` (${message.fallbackFrom} unavailable)` : ""}
        </div>
      )}
    </div>
  );
}

/** Label for a provider in the picker: name, model, and whether it can answer. */
function providerOption(p) {
  return `${p.label}${p.model ? ` · ${p.model}` : ""}${p.available ? "" : " (offline)"}`;
}

/** Header picker for which model answers first. */
function ModelPicker({ providers, onSelect }) {
  if (!providers) {
    return (
      <div className="hud-chat__model hud-chat__model--offline" style={place(MODEL)}>
        MODELS UNAVAILABLE (BACKEND OFFLINE)
      </div>
    );
  }
  const active = providers.providers.find((p) => p.active);
  return (
    <label className={`hud-chat__model${active?.available ? "" : " hud-chat__model--offline"}`} style={place(MODEL)}>
      <i aria-hidden="true" />
      <select
        value={providers.active}
        aria-label="Model that answers first"
        title={active && !active.available ? active.reason : undefined}
        onChange={(e) => onSelect(e.target.value)}
      >
        {providers.providers.map((p) => (
          <option key={p.id} value={p.id} title={p.reason || undefined}>
            {providerOption(p)}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The GPT assistant popup.
 *
 * Props:
 *  - messages: [{ role: "user" | "assistant" | "system", text, via?, fallbackFrom? }]
 *  - providers / onSelectProvider: model providers from useProviders() and the picker's handler
 *  - pending: true while waiting for a reply
 *  - onSend(prompt): send a prompt (any attached file is already folded in)
 *  - onOpenCode(code, lang): open a code block in the IDE
 *  - dictation: latest voice transcript; appended to the input when it changes
 *  - recording / onToggleMic: microphone state and button
 *  - onClose: the close button
 */
export default function GPTPopup({
  messages,
  pending = false,
  onSend,
  onOpenCode,
  dictation = "",
  recording = false,
  onToggleMic,
  onClose,
  providers = null,
  onSelectProvider,
}) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null); // { name, text }
  const [notice, setNotice] = useState("");
  const [thumb, setThumb] = useState(null); // { top, height } while the log overflows
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (dictation) setInput((text) => (text ? `${text} ${dictation}` : dictation));
  }, [dictation]);

  const updateThumb = useCallback(() => {
    const el = logRef.current;
    if (!el || el.scrollHeight <= el.clientHeight + 1) {
      setThumb(null);
      return;
    }
    const height = Math.max(5, (GUTTER.h * el.clientHeight) / el.scrollHeight);
    const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight);
    setThumb({ top: GUTTER.y + ratio * (GUTTER.h - height), height });
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    updateThumb();
  }, [messages, pending, updateThumb]);

  const send = () => {
    const text = input.trim();
    if (pending || (!text && !attachment)) return;
    const prompt = attachment
      ? `${text}\n\nAttached file ${attachment.name}:\n\`\`\`\n${attachment.text}\n\`\`\``.trim()
      : text;
    onSend(prompt);
    setInput("");
    setAttachment(null);
    setNotice("");
  };

  const attach = async (file) => {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT) {
      setNotice(`${file.name} is over 100 KB`);
      return;
    }
    setAttachment({ name: file.name, text: await file.text() });
    setNotice("");
  };

  return (
    <div className="hud-frame hud-gpt" style={{ width: GPT_W, height: GPT_H }}>
      <img
        className="hud-plate"
        src={`${process.env.PUBLIC_URL}/hud/gpt-popup.svg`}
        width={GPT_W}
        height={GPT_H}
        alt=""
        draggable={false}
      />

      <ModelPicker providers={providers} onSelect={onSelectProvider} />

      <div
        className="hud-chat"
        ref={logRef}
        style={place(LOG)}
        onScroll={updateThumb}
        role="log"
        aria-label="GPT assistant conversation"
      >
        {messages.length === 0 && !pending && (
          <div className="hud-chat__empty">Ask the assistant. Code in replies opens in the IDE.</div>
        )}
        {messages.map((m, i) => (
          // Messages are append-only, so the index is a stable key.
          // eslint-disable-next-line react/no-array-index-key
          <Message key={i} message={m} onOpenCode={onOpenCode} />
        ))}
        {pending && <div className="hud-chat__msg hud-chat__msg--system">Thinking…</div>}
      </div>
      {thumb && (
        <div className="hud-chat__thumb" style={{ left: GUTTER.x, top: thumb.top, height: thumb.height }} />
      )}

      {(attachment || notice) && (
        <div className="hud-chat__chip" style={{ left: INPUT.x, top: INPUT.y - 11, width: INPUT.w }}>
          {attachment ? (
            <>
              <span>{attachment.name}</span>
              <button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)}>
                ×
              </button>
            </>
          ) : (
            <span>{notice}</span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        className="hud-chat__input"
        style={place(INPUT)}
        value={input}
        placeholder="Hello! How can I assist you today?"
        aria-label="Message the GPT assistant"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            send();
          }
        }}
      />
      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => {
          attach(e.target.files[0]);
          e.target.value = "";
        }}
      />

      <Hotspot box={ATTACH} label="Attach a file" onClick={() => fileRef.current?.click()} />
      <Hotspot
        box={MIC}
        label={recording ? "Stop dictation" : "Dictate"}
        onClick={onToggleMic}
        active={recording}
      />
      <Hotspot box={SEND} label="Send" onClick={send} disabled={pending} />
      <Hotspot box={CLOSE} label="Close GPT assistant" onClick={onClose} />
    </div>
  );
}
