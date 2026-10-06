import GPTPopup from "../components/GPTPopup";
import Terminal from "../components/Terminal";
import Vector72 from "../components/Vector72";
import HudMain from "../components/HUD/HudMain";
import useVoiceCapture from "../hooks/useVoiceCapture";
import { useEffect, useState } from "react";
import "../styles/hud.css";

const FEED_LIMIT = 20;

const STATUS_LINES = {
  recording: "MIC LIVE",
  processing: "TRANSCRIBING",
  uploaded: "TRANSCRIPT READY",
};

const append = (lines, line) => [...lines, line].slice(-FEED_LIMIT);

export default function Dashboard() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [showVector72, setShowVector72] = useState(false);
  const [showGPTPopup, setShowGPTPopup] = useState(false);

  const voice = useVoiceCapture();
  const [feeds, setFeeds] = useState({ hud: [], ide: [], gpt: [] });

  // Voice status goes to the HUD console, transcripts to the GPT console.
  useEffect(() => {
    const line = STATUS_LINES[voice.state];
    if (line) setFeeds((f) => ({ ...f, hud: append(f.hud, line) }));
  }, [voice.state]);

  useEffect(() => {
    if (voice.error) {
      setFeeds((f) => ({ ...f, hud: append(f.hud, `ERR ${voice.error.toUpperCase()}`) }));
    }
  }, [voice.error]);

  useEffect(() => {
    if (voice.transcript) {
      setFeeds((f) => ({ ...f, gpt: append(f.gpt, `> ${voice.transcript}`) }));
    }
  }, [voice.transcript]);

  return (
    <div className="hud-stage">
      {/* Main HUD: the Figma frame, with the three buttons wired to the panels */}
      <HudMain
        onOpenGPT={() => setShowGPTPopup((open) => !open)}
        onOpenIDE={() => setShowVector72((open) => !open)}
        onOpenTerminal={() => setShowTerminal((open) => !open)}
        active={{ gpt: showGPTPopup, ide: showVector72, terminal: showTerminal }}
        feeds={feeds}
        voice={voice}
      />

      {/* GPT Assistant Overlay */}
      {showGPTPopup && (
        <div className="hud-overlay hud-overlay--gpt">
          <GPTPopup onClose={() => setShowGPTPopup(false)} />
        </div>
      )}

      {/* Terminal Overlay */}
      {showTerminal && (
        <div className="hud-overlay hud-overlay--terminal">
          <Terminal onClose={() => setShowTerminal(false)} />
        </div>
      )}

      {/* IDE / Vector 72 Overlay */}
      {showVector72 && (
        <div className="hud-overlay hud-overlay--vector72">
          <Vector72 onClose={() => setShowVector72(false)} />
        </div>
      )}
    </div>
  );
}
