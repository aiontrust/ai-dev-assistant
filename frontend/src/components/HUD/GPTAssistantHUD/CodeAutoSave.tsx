import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Editor from "@monaco-editor/react";

export default function HudGPTIde() {
  const [code, setCode] = useState("");

  // Load saved code from local storage on mount
  useEffect(() => {
    const savedCode = localStorage.getItem("hud-ide-code");
    if (savedCode) setCode(savedCode);
  }, []);

  // Auto-save code to local storage
  const handleCodeChange = (newValue) => {
    setCode(newValue);
    localStorage.setItem("hud-ide-code", newValue);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open in IDE</Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-4xl h-[80vh] p-0 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
