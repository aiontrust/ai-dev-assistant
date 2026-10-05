import GPTPopup from "../components/GPTPopup";
import Terminal from "../components/Terminal";
import Vector72 from "../components/Vector72";
import { useState } from "react";
import "../styles/hud.css";

export default function Dashboard() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [showVector72, setShowVector72] = useState(false);
  const [showGPTPopup, setShowGPTPopup] = useState(false);

  return (
    <div className="hud-stage">
      {/* Main HUD */}
      <h1 className="hud-title">AI Development Assistant HUD</h1>

      {/* Buttons to Toggle Overlays */}
      <div className="hud-toolbar">
        <button onClick={() => setShowGPTPopup(!showGPTPopup)} className="btn">GPTPopup</button>
        <button onClick={() => setShowTerminal(!showTerminal)} className="btn">Terminal Release</button>
        <button onClick={() => setShowVector72(!showVector72)} className="btn">Vector72</button>
      </div>

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

      {/* Vector 72 Overlay */}
      {showVector72 && (
        <div className="hud-overlay hud-overlay--vector72">
          <Vector72 onClose={() => setShowVector72(false)} />
        </div>
      )}
    </div>
  );
}
