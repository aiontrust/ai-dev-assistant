import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Paperclip, Play, Code, X } from "lucide-react";

export default function GPTAssistantHUD() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [code, setCode] = useState("// Code will appear here");
  const [model, setModel] = useState("GPT-4o");

  const handleSend = () => {
    // Simulate AI response (Replace with actual API call)
    const mockResponse = `console.log('Hello from GPT!');`;
    setResponse(mockResponse);
    setCode(mockResponse);
    setEditorOpen(true);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <Card className="p-4 border border-gray-700 bg-gray-900 text-white">
        {/* File Context & Model Selector */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">index.html (Current file)</span>
          <Select value={model} onValueChange={setModel} className="text-sm">
            <SelectItem value="GPT-4o">GPT-4o</SelectItem>
            <SelectItem value="GPT-4">GPT-4</SelectItem>
            <SelectItem value="GPT-3.5">GPT-3.5</SelectItem>
          </Select>
        </div>

        {/* Response Display */}
        {response && (
          <CardContent className="bg-gray-800 p-2 rounded-md mb-2 text-green-400">
            <pre>{response}</pre>
          </CardContent>
        )}

        {/* Input Field & Action Buttons */}
        <div className="flex gap-2 items-center">
          <Input
            className="flex-grow bg-gray-800 text-white border-gray-600"
            placeholder="Ask GPT..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button variant="ghost"><Paperclip size={18} /></Button>
          <Button variant="ghost"><Mic size={18} /></Button>
          <Button onClick={handleSend} className="bg-blue-500"><Play size={18} /></Button>
        </div>
      </Card>

      {/* IDE Editor View */}
      {editorOpen && (
        <Card className="mt-4 border border-gray-700 bg-gray-900 text-white relative">
          <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <span className="text-sm">Code Editor</span>
            <Button onClick={() => setEditorOpen(false)} variant="ghost"><X size={18} /></Button>
          </div>
          <Editor
            height="300px"
            defaultLanguage="javascript"
            value={code}
            onChange={setCode}
            theme="vs-dark"
          />
        </Card>
      )}
    </div>
  );
}
