import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronUp, Plus, Pin } from 'lucide-react'
import { Toggle } from "@/components/ui/toggle"

interface Tool {
  name: string;
  enabled: boolean;
}

interface ChatControlsProps {
  isOpen: boolean;
  isPinned: boolean;
  onPinClick: () => void;
  useRAG: boolean;
  onRAGChange: (value: boolean) => void;
  systemMessages: string[];
  onSystemMessagesChange: (messages: string[]) => void;
  selectedSystemMessage: string;
  onSystemMessageSelect: (message: string) => void;
}

export function ChatControls({ 
  isOpen, 
  isPinned, 
  onPinClick, 
  useRAG, 
  onRAGChange,
  systemMessages,
  onSystemMessagesChange,
  selectedSystemMessage,
  onSystemMessageSelect
}: ChatControlsProps) {
  const [isSystemMessageOpen, setIsSystemMessageOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(true)
  const [tools, setTools] = useState<Tool[]>([
    { name: "Web Search", enabled: false },
    { name: "Cortex Analyst", enabled: false },
    { name: "Cortex Search", enabled: useRAG }
  ])

  useEffect(() => {
    setTools(prevTools => 
      prevTools.map(tool => 
        tool.name === "Cortex Search" 
          ? { ...tool, enabled: useRAG }
          : tool
      )
    );
  }, [useRAG]);

  const handleToolToggle = (index: number) => {
    console.log('Tool toggle clicked:', index, tools[index].name);
    const updatedTools = tools.map((tool, i) => {
      if (i === index) {
        if (tool.name === "Cortex Search") {
          console.log('Toggling Cortex Search:', !tool.enabled);
          onRAGChange(!tool.enabled);
        }
        return { ...tool, enabled: !tool.enabled };
      }
      return tool;
    });
    setTools(updatedTools);
  };

  const addNewTool = () => {
    setTools([...tools, { name: "New tool", enabled: false }]);
  };

  const addNewSystemMessage = () => {
    const newMessages = [...systemMessages, "New system message"];
    onSystemMessagesChange(newMessages);
  };

  return (
    <div className={`h-full bg-white shadow-lg p-4 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Chat Controls</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPinClick}
          className={`${isPinned ? 'text-blue-500' : 'text-gray-500'}`}
        >
          <Pin className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
        </Button>
      </div>
      
      <div className="mb-4">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setIsSystemMessageOpen(!isSystemMessageOpen)}
        >
          <span className="font-medium">System Message</span>
          {isSystemMessageOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {isSystemMessageOpen && (
          <div className="mt-2">
            <Button variant="outline" size="sm" className="mb-2 w-full" onClick={addNewSystemMessage}>
              <Plus size={16} className="mr-2" /> Add New
            </Button>
            <ul className="space-y-1">
              {systemMessages.map((message, index) => (
                <li 
                  key={index} 
                  className={`text-sm py-1 px-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
                    message === selectedSystemMessage ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onSystemMessageSelect(message)}
                >
                  {message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setIsToolsOpen(!isToolsOpen)}
        >
          <span className="font-medium">Tools</span>
          {isToolsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {isToolsOpen && (
          <div className="mt-2">
            <Button variant="outline" size="sm" className="mb-2 w-full" onClick={addNewTool}>
              <Plus size={16} className="mr-2" /> Add New
            </Button>
            <ul className="space-y-1">
              {tools.map((tool, index) => (
                <li 
                  key={index} 
                  className="flex items-center justify-between text-sm py-1 px-2 rounded-lg hover:bg-gray-100"
                >
                  <Switch
                    checked={tool.enabled}
                    onCheckedChange={() => handleToolToggle(index)}
                    className="mr-2"
                  />
                  <span className="flex-1 cursor-pointer">
                    {tool.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
