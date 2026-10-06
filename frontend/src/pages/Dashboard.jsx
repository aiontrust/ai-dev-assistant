import { useCallback, useEffect, useState } from "react";
import Board from "../components/HUD/Board";
import HudMain, { HUD_H } from "../components/HUD/HudMain";
import IdeFrame from "../components/IdeFrame";
import GPTPopup from "../components/GPTPopup";
import Terminal, { TERMINAL_H } from "../components/Terminal";
import useVoiceCapture from "../hooks/useVoiceCapture";
import { askAssistant } from "../utils/api";
import { runCommand } from "../utils/terminal";
import "../styles/hud.css";

const FEED_LIMIT = 20;
const LOG_LIMIT = 500;

// The terminal docks under the HUD, lined up with the release tab. Its panel starts
// just below the plate's lower corners (y 588), so the DISENGAGE handle overlaps the
// board's bottom edge. (Figma parks it at y 710.6, which leaves an empty gap.)
const TERMINAL_TOP = 561;
// The GPT popup floats in the top-right corner, clear of the ▲ / ▼ buttons.
const GPT_POS = { left: 676, top: 2 };

const STATUS_LINES = {
  recording: "MIC LIVE",
  processing: "TRANSCRIBING",
  uploaded: "TRANSCRIPT READY",
};

const EXTENSIONS = {
  javascript: "js", js: "js", jsx: "jsx", typescript: "ts", ts: "ts", tsx: "tsx",
  python: "py", py: "py", html: "html", css: "css", json: "json", bash: "sh", sh: "sh",
  cpp: "cpp", "c++": "cpp", c: "c", java: "java", go: "go", rust: "rs", sql: "sql",
};

const append = (lines, more, limit) => [...lines, ...[].concat(more)].slice(-limit);

export default function Dashboard() {
  const [view, setView] = useState("hud"); // "hud" | "ide"
  const [gptOpen, setGptOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

  const voice = useVoiceCapture();
  const [feeds, setFeeds] = useState({ hud: [], gpt: [] });
  const pushFeed = useCallback(
    (key, line) => setFeeds((f) => ({ ...f, [key]: append(f[key], line, FEED_LIMIT) })),
    []
  );

  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [dictation, setDictation] = useState("");

  const [doc, setDoc] = useState({ name: "untitled.txt", code: "" });
  const [ideLog, setIdeLog] = useState([]);
  const logIde = useCallback((line) => setIdeLog((l) => append(l, line, LOG_LIMIT)), []);

  const [termLines, setTermLines] = useState(["SATI terminal. Type help."]);
  const [termHistory, setTermHistory] = useState([]);
  const [termBusy, setTermBusy] = useState(false);

  // Voice status goes to the HUD console, transcripts to the GPT console and,
  // while the assistant is open, into its input box.
  useEffect(() => {
    const line = STATUS_LINES[voice.state];
    if (line) pushFeed("hud", line);
  }, [voice.state, pushFeed]);

  useEffect(() => {
    if (voice.error) pushFeed("hud", `ERR ${voice.error.toUpperCase()}`);
  }, [voice.error, pushFeed]);

  useEffect(() => {
    if (voice.transcript) pushFeed("gpt", `> ${voice.transcript}`);
    setDictation(gptOpen ? voice.transcript : "");
    // Only a new transcript should be dictated, not reopening the popup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript, pushFeed]);

  const ask = useCallback(
    async (prompt) => {
      pushFeed("gpt", `> ${prompt}`);
      try {
        const reply = await askAssistant(prompt);
        pushFeed("gpt", `< ${reply.split("\n")[0]}`);
        return reply;
      } catch (e) {
        pushFeed("gpt", "ERR ASSISTANT OFFLINE");
        throw e;
      }
    },
    [pushFeed]
  );

  const sendChat = async (prompt) => {
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setPending(true);
    try {
      const reply = await ask(prompt);
      setMessages((m) => [...m, { role: "assistant", text: reply || "(empty reply)" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "system", text: `Assistant offline: ${e.message}` }]);
    } finally {
      setPending(false);
    }
  };

  const openCode = (code, lang) => {
    const name = `snippet.${EXTENSIONS[lang.toLowerCase()] || "txt"}`;
    setDoc({ name, code });
    setView("ide");
    logIde(`OPENED ${name} FROM GPT`);
  };

  const printTerm = (lines) => setTermLines((l) => append(l, lines, LOG_LIMIT));

  const runTerm = async (line) => {
    printTerm(`> ${line}`);
    setTermHistory((h) => append(h, line, 100));
    setTermBusy(true);
    try {
      await runCommand(line, {
        print: printTerm,
        clear: () => setTermLines([]),
        history: termHistory,
        ask,
        open: (target) => {
          if (target === "gpt") setGptOpen(true);
          else setView(target);
        },
        toggleRecording: voice.toggle,
        close: () => setTerminalOpen(false),
      });
    } finally {
      setTermBusy(false);
    }
  };

  // Escape closes the topmost panel.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (gptOpen) setGptOpen(false);
      else if (terminalOpen) setTerminalOpen(false);
      else if (view === "ide") setView("hud");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gptOpen, terminalOpen, view]);

  const boardHeight = terminalOpen ? TERMINAL_TOP + TERMINAL_H : HUD_H;

  return (
    <div className="hud-stage">
      <Board height={boardHeight}>
        {view === "hud" ? (
          <HudMain
            onOpenGPT={() => setGptOpen((open) => !open)}
            onOpenIDE={() => setView("ide")}
            onOpenTerminal={() => setTerminalOpen((open) => !open)}
            active={{ gpt: gptOpen, terminal: terminalOpen }}
            feeds={{ ...feeds, ide: ideLog }}
            voice={voice}
          />
        ) : (
          <IdeFrame
            doc={doc}
            onChange={(code) => setDoc((d) => ({ ...d, code }))}
            log={ideLog}
            onLog={logIde}
            gptOpen={gptOpen}
            onToggleGPT={() => setGptOpen((open) => !open)}
            onClose={() => setView("hud")}
          />
        )}

        {gptOpen && (
          <div className="hud-dock" style={GPT_POS}>
            <GPTPopup
              messages={messages}
              pending={pending}
              onSend={sendChat}
              onOpenCode={openCode}
              dictation={dictation}
              recording={voice.state === "recording"}
              onToggleMic={voice.toggle}
              onClose={() => setGptOpen(false)}
            />
          </div>
        )}

        {terminalOpen && (
          <div className="hud-dock" style={{ left: 0, top: TERMINAL_TOP }}>
            <Terminal
              lines={termLines}
              onCommand={runTerm}
              history={termHistory}
              busy={termBusy}
              onClose={() => setTerminalOpen(false)}
            />
          </div>
        )}
      </Board>
    </div>
  );
}
