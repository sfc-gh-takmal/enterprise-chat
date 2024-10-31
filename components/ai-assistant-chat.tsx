'use client'

import React, { useState, useRef, useEffect, ChangeEvent } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusCircle, Menu, ChevronUp, ArrowUp, HelpCircle, ChevronLeft, ChevronRight, Search, Paperclip, Loader2, Pin, ChevronDown } from 'lucide-react'
import { ChatControls } from './chat-controls'
import SnowflakeLLMService from '@/lib/snowflake-llm-service';
import { toast } from 'react-hot-toast';
import SnowflakeDBService from '@/lib/snowflake-db-service';
import { v4 as uuidv4 } from 'uuid'; // You'll need to install this package
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ResizeHandle } from '@/components/ui/resize-handle'
import { SnowflakeSearchService } from '@/lib/snowflake-search-service';
import { Toggle } from "@/components/ui/toggle"

interface SuggestedPrompt {
  title: string
  description: string
}

const suggestedPrompts: SuggestedPrompt[] = [
  { title: "Analyze market trends", description: "for the tech industry in Q1 2024" },
  { title: "Explain machine learning", description: "concepts for predictive analytics" },
  { title: "Summarize financial report", description: "highlighting key performance indicators" },
  { title: "Optimize SQL query", description: "for better performance on large datasets" },
]

interface SearchSource {
  chunk: string;
  relative_path: string;
  category: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  sources?: SearchSource[];
}

const snowflakeModels = [
  'llama3.1-8b',
  'llama3.1-70b',
  'llama3.1-405b',
  'snowflake-arctic',
  'reka-core',
  'reka-flash',
  'mistral-large',
  'mixtral-8x7b',
  'mistral-7b',
  'jamba-instruct',
  'gemma-7b'
];

const uploadFileToSnowflake = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file, file.name);

  try {
    console.log('Uploading file:', file.name);
    const response = await fetch('/api/upload-to-snowflake', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Upload failed with status: ${response.status}`);
    }

    console.log('Upload response:', result);
    console.log('Stage contents:', result.stageContents);
    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export function AIAssistantChat() {
  const [selectedModel, setSelectedModel] = useState(snowflakeModels[0])
  const [inputMessage, setInputMessage] = useState("")
  const [isChatControlsOpen, setIsChatControlsOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const chatControlsRef = useRef<HTMLDivElement>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [snowflakeLLMService] = useState(() => new SnowflakeLLMService({
    maxTokens: 4000,  // Adjust based on your model's limits
    maxMessages: 10   // Keep last 10 messages in context
  }));
  const [snowflakeDBService] = useState(() => new SnowflakeDBService());
  const [currentUser, setCurrentUser] = useState<{ user_id: string; username: string } | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ignoredFiles, setIgnoredFiles] = useState<string[]>([]);
  const [isIgnoredFilesDialogOpen, setIsIgnoredFilesDialogOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isChatControlsPinned, setIsChatControlsPinned] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(256); // 256px = 16rem = w-64
  const [rightPanelWidth, setRightPanelWidth] = useState(256);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const MIN_PANEL_WIDTH = 256; // 16rem = w-64
  const [useRAG, setUseRAG] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [snowflakeSearchService] = useState(() => new SnowflakeSearchService());
  const [systemMessages, setSystemMessages] = useState<string[]>([
    "You are a helpful assistant",
    "You are an expert in programming"
  ]);
  const [selectedSystemMessage, setSelectedSystemMessage] = useState<string>(systemMessages[0]);

  useEffect(() => {
    console.log('RAG state changed:', useRAG);
  }, [useRAG]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chatControlsRef.current && 
          !chatControlsRef.current.contains(event.target as Node) && 
          !isChatControlsPinned) {
        setIsChatControlsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isChatControlsPinned])

  useEffect(() => {
    const createInitialUser = async () => {
      try {
        const mockUser = { user_id: uuidv4(), username: 'Taj Akmal', email: 'taj@example.com' };
        await snowflakeDBService.createUser(mockUser);
        setCurrentUser(mockUser);
      } catch (error) {
        console.error('Error creating initial user:', error);
        toast.error('Failed to initialize user. Please try refreshing the page.');
      }
    };

    createInitialUser();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = e.clientX;
        if (newWidth >= MIN_PANEL_WIDTH + 20) {
          setLeftPanelWidth(newWidth);
          if (isSidebarCollapsed) {
            setIsSidebarCollapsed(false);
          }
        } else if (newWidth < MIN_PANEL_WIDTH - 50) {
          setLeftPanelWidth(MIN_PANEL_WIDTH);
          setIsSidebarCollapsed(true);
        }
      }
      if (isResizingRight) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= MIN_PANEL_WIDTH + 20) {
          setRightPanelWidth(newWidth);
          if (!isChatControlsOpen) {
            setIsChatControlsOpen(true);
          }
        } else if (newWidth < MIN_PANEL_WIDTH - 50) {
          setRightPanelWidth(MIN_PANEL_WIDTH);
          setIsChatControlsOpen(false);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, isSidebarCollapsed, isChatControlsOpen]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await snowflakeSearchService.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Failed to load document categories');
      }
    };
    loadCategories();
  }, [snowflakeSearchService]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !snowflakeLLMService || !currentUser) return;

    setIsLoading(true);
    setIsTyping(true);
    console.log('Message sending with RAG:', useRAG);
    console.log('Using system message:', selectedSystemMessage);
    
    const userMessage: ChatMessage = { role: 'user', content: inputMessage };
    setChatHistory((prev) => [...prev, userMessage]);
    setInputMessage('');

    try {
      let searchResults;
      let promptWithContext = inputMessage;
      let messagesForLLM: SnowflakeLLMMessage[] = [];

      // Add system message if present
      if (selectedSystemMessage) {
        messagesForLLM.push({ role: 'system', content: selectedSystemMessage });
      }

      // Add chat history
      chatHistory.forEach(msg => {
        messagesForLLM.push({
          role: msg.role,
          content: msg.content
        });
      });

      // Add current user message
      messagesForLLM.push({
        role: 'user',
        content: inputMessage
      });

      if (useRAG) {
        console.log('RAG is enabled, fetching search results...');
        searchResults = await snowflakeSearchService.searchDocuments(inputMessage, selectedCategory);
        console.log('Retrieved search results:', searchResults);

        if (searchResults?.results && searchResults.results.length > 0) {
          console.log('Found relevant documents, creating context...');
          const contextChunks = searchResults.results
            .map(result => result.chunk)
            .join('\n\n');

          // Modify the last user message to include context
          messagesForLLM[messagesForLLM.length - 1] = {
            role: 'user',
            content: `
              Context:
              ${contextChunks}

              Question: ${inputMessage}
            `
          };
        } else {
          console.log('No relevant documents found');
          promptWithContext = `
            ${selectedSystemMessage}

            Question: ${inputMessage}

            Answer:
          `;
        }
      } else {
        console.log('RAG is disabled');
        promptWithContext = `
          ${selectedSystemMessage}

          Question: ${inputMessage}

          Answer:
        `;
      }

      console.log('Sending messages to LLM:', messagesForLLM);

      const response = await fetch('/api/snowflake-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messagesForLLM,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let assistantMessage = '';
      let finalSources = useRAG ? searchResults?.results : undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
              if (assistantMessage === '') {
                setIsTyping(false);
                setChatHistory((prev) => [...prev, { 
                  role: 'assistant', 
                  content: data.choices[0].delta.content,
                  sources: finalSources  // Include sources in initial message
                }]);
              } else {
                setChatHistory((prev) => [
                  ...prev.slice(0, -1),
                  { 
                    role: 'assistant', 
                    content: prev[prev.length - 1].content + data.choices[0].delta.content,
                    sources: finalSources  // Preserve sources during updates
                  },
                ]);
              }
              assistantMessage += data.choices[0].delta.content;
            }
          }
        }
      }

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      toast.error(errorMessage);
      setChatHistory((prev) => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const ignoredFileNames: string[] = [];
    const uploadingFileNames: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (['pdf', 'csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
        uploadingFileNames.push(file.name);
        setUploadingFiles(prev => [...prev, file.name]);
        try {
          await uploadFileToSnowflake(file);
          toast.success(`File ${file.name} uploaded successfully`);
        } catch (error) {
          toast.error(`Failed to upload file ${file.name}: ${error}`);
        } finally {
          setUploadingFiles(prev => prev.filter(name => name !== file.name));
        }
      } else {
        ignoredFileNames.push(file.name);
      }
    }

    setIsUploading(false);
    if (ignoredFileNames.length > 0) {
      setIgnoredFiles(ignoredFileNames);
      setIsIgnoredFilesDialogOpen(true);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleLeftResizeStart = (e: React.MouseEvent) => {
    setIsResizingLeft(true);
    e.preventDefault();
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    setIsResizingRight(true);
    e.preventDefault();
  };

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Sidebar */}
      <div 
        className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative ${
          isSidebarCollapsed ? 'w-16' : ''
        }`}
        style={{ width: isSidebarCollapsed ? '4rem' : `${leftPanelWidth}px` }}
      >
        <div className="p-4 flex flex-col items-center">
          {isSidebarCollapsed ? (
            <Button variant="ghost" size="icon" className="w-10 h-10 p-0">
              <Search className="h-4 w-4" />
            </Button>
          ) : (
            <Input type="text" placeholder="Search" className="w-full" />
          )}
        </div>
        {!isSidebarCollapsed && (
          <ScrollArea className="flex-grow px-4">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Previous 30 days</h3>
            <ul className="space-y-1">
              {/* Placeholder items removed */}
            </ul>
          </ScrollArea>
        )}
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" alt="Taj Akmal" />
              <AvatarFallback>TA</AvatarFallback>
            </Avatar>
            {!isSidebarCollapsed && (
              <div>
                <p className="text-sm font-medium">Taj Akmal</p>
              </div>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          className="absolute top-1/2 -right-3 bg-white border border-gray-200 rounded-full shadow-md"
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {!isSidebarCollapsed && (
          <ResizeHandle
            className="-right-1"
            onMouseDown={handleLeftResizeStart}
          />
        )}
      </div>

      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300 ease-in-out"
        style={{ 
          marginRight: isChatControlsOpen ? `${rightPanelWidth}px` : '0'
        }}
      >
        <header className="border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {snowflakeModels.map((model) => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {useRAG && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => setIsChatControlsOpen(!isChatControlsOpen)}>
            <Menu className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-auto p-8" ref={chatContainerRef}>
          <div className="max-w-2xl mx-auto">
            {chatHistory.length === 0 ? (
              <>
                <h1 className="text-4xl font-bold mb-2">Hello, Taj Akmal</h1>
                <p className="text-2xl text-gray-500 mb-8">How can I help you today?</p>
                
                <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center">
                  <ChevronUp className="mr-2 h-4 w-4" /> Suggested
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {suggestedPrompts.map((prompt, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-xl cursor-pointer hover:bg-gray-100">
                      <h3 className="font-semibold mb-1">{prompt.title}</h3>
                      <p className="text-sm text-gray-500">{prompt.description}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {chatHistory.map((message, index) => (
                  <div key={index}>
                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3/4 p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {message.content}
                      </div>
                    </div>
                    
                    {/* Show sources if they exist and message is from assistant */}
                    {message.role === 'assistant' && message.sources && (
                      <div className="mt-2 space-y-2">
                        <div className="text-sm text-gray-500 font-medium ml-3">Sources used:</div>
                        {message.sources.map((source, sourceIndex) => (
                          <details key={sourceIndex} className="ml-3 bg-gray-50 rounded-lg">
                            <summary className="cursor-pointer p-2 hover:bg-gray-100 flex items-center">
                              <ChevronDown className="h-4 w-4 mr-2" />
                              <span className="text-sm font-medium">{source.relative_path}</span>
                              {source.category && (
                                <span className="ml-2 text-xs text-gray-500">({source.category})</span>
                              )}
                            </summary>
                            <div className="p-3 text-sm text-gray-700 border-t border-gray-200">
                              {source.chunk}
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-3/4 p-3 rounded-lg bg-gray-100">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center space-x-2 mb-2">
              <div className="relative">
                <Button variant="ghost" size="icon" onClick={triggerFileUpload} disabled={isUploading}>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                {uploadingFiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {uploadingFiles.length}
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.csv,.xlsx,.xls"
                multiple
                style={{ display: 'none' }}
              />
              <Input
                type="text"
                placeholder="Send a message"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                size="icon" 
                className="bg-black text-white rounded-full hover:bg-gray-800"
                onClick={handleSendMessage}
                disabled={isLoading}
              >
                <ArrowUp className={`h-4 w-4 ${isLoading ? 'opacity-50' : ''}`} />
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 flex-1 text-center">
                LLMs can make mistakes. Verify important information.
              </p>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </footer>
      </div>

      <div 
        ref={chatControlsRef} 
        className="fixed inset-y-0 right-0 z-10"
        style={{ width: isChatControlsOpen ? `${rightPanelWidth}px` : '0' }}
      >
        <ChatControls 
          isOpen={isChatControlsOpen} 
          isPinned={isChatControlsPinned}
          onPinClick={() => setIsChatControlsPinned(!isChatControlsPinned)}
          useRAG={useRAG}
          onRAGChange={(value) => {
            console.log('RAG toggle changed:', value);
            setUseRAG(value);
          }}
          systemMessages={systemMessages}
          onSystemMessagesChange={setSystemMessages}
          selectedSystemMessage={selectedSystemMessage}
          onSystemMessageSelect={setSelectedSystemMessage}
        />
        {isChatControlsOpen && (
          <ResizeHandle
            className="left-0"
            onMouseDown={handleRightResizeStart}
          />
        )}
      </div>

      <Dialog open={isIgnoredFilesDialogOpen} onOpenChange={setIsIgnoredFilesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignored Files</DialogTitle>
            <DialogDescription>
              The following files were not uploaded because they are not supported:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5">
            {ignoredFiles.map((fileName, index) => (
              <li key={index}>{fileName}</li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {uploadingFiles.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
          <h3 className="font-semibold mb-2">Uploading Files:</h3>
          <ul>
            {uploadingFiles.map((fileName, index) => (
              <li key={index} className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {fileName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
