import GPTPopup from "../components/GPTPopup";
import Terminal from "../components/Terminal";
import Vector72 from "../components/Vector72";
import HudMain from "../components/HUD/HudMain";
import { useState } from "react";
import "../styles/hud.css";

export default function Dashboard() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [showVector72, setShowVector72] = useState(false);
  const [showGPTPopup, setShowGPTPopup] = useState(false);

  return (
    <div className="hud-stage">
      {/* Main HUD: the Figma frame, with the three buttons wired to the panels */}
      <HudMain
        onOpenGPT={() => setShowGPTPopup((open) => !open)}
        onOpenIDE={() => setShowVector72((open) => !open)}
        onOpenTerminal={() => setShowTerminal((open) => !open)}
        active={{ gpt: showGPTPopup, ide: showVector72, terminal: showTerminal }}
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
