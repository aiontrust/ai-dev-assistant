import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const VisualSpeaker = ({ text }: { text: string }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (text) {
      speakText(text);
    }
  }, [text]);

  const speakText = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    synth.speak(utterance);
  };

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full h-full rounded-full border-2 border-blue-400"
          animate={{ opacity: isSpeaking ? [0.2, 1, 0.2] : 0.2, scale: isSpeaking ? [1, 1.2, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: i * 0.3 }}
        />
      ))}
      <div className="w-16 h-16 bg-blue-500 rounded-full shadow-md" />
    </div>
  );
};

export default VisualSpeaker;
