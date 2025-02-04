import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";

export default function HUDAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("// Your generated code will appear here\n");

  return (
    <div className="relative w-full p-4 bg-gray-900 text-white rounded-lg shadow-md">
      <div className="flex justify-between items-center">
        <p className="text-lg font-semibold">Ask GPT Assistant</p>
        <Button onClick={() => setIsOpen(true)} className="bg-blue-500 hover:bg-blue-600">
          Open in IDE
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="w-3/4 h-3/4 bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <p className="text-white font-semibold">IDE Editor</p>
              <Button onClick={() => setIsOpen(false)} className="bg-red-500 hover:bg-red-600">
                Close
              </Button>
            </div>
            <Editor
              height="90%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
