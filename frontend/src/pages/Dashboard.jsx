import GPTPopup from "../components/GPTPopup";
import Terminal from "../components/Terminal";
import Vector72 from "../components/Vector72";
import { useState } from "react";

export default function Dashboard() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [showVector72, setShowVector72] = useState(false);
  const [showGPTPopup, setShowGPTPopup] = useState(false);

  return (
    <div className="relative w-screen h-screen">
    <div style={{width: '100%', height: '100%', background: 'linear-gradient(270deg, #021420 0%, #001C2B 6%, #002435 13%, #022435 19%, #002538 23%, #032840 25%, #022B44 29%, #002E45 33%, #003048 40%, #003149 43%, #00314A 45%, #01314C 50%, #00314A 55%, #003149 57%, #003048 60%, #002E45 67%, #022B44 71%, #032840 75%, #002538 77%, #022435 81%, #002435 87%, #001C2B 94%, #021420 100%)', boxShadow: '0px 0.8346264958381653px 0.8346264958381653px rgba(0, 0, 0, 0.25)', border: '0.63px black solid'}}></div>
    {/* Main HUD */}
    <h1 className="text-3xl p-4">AI Development Assistant HUD</h1>

{/* GPT Assistant Overlay */}
{showGPTPopup && <GPTPopup onClose={() => setShowGPTPopup(false)} />}

{/* Terminal Overlay */}
{showTerminal && <Terminal onClose={() => setShowTerminal(false)} />}

{/* Vector 72 Overlay */}
{showVector72 && <Vector72 onClose={() => setShowVector72(false)} />}

{/* Buttons to Toggle Overlays */}
<div className="relative">
  <button onClick={() => setShowGPTPopup(!showGPTPopup)} className="btn">GPTPopup</button>
  <button onClick={() => setShowTerminal(!showTerminal)} className="btn">Terminal Release</button>
  <button onClick={() => setShowVector72(!showVector72)} className="btn">Vector72</button>
</div>
</div>
);
}