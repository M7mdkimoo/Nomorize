import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, X, Minimize2, Phone, Mic, MicOff, FileText, Image as ImageIcon, Video, ScanText, Volume2, VolumeX } from 'lucide-react';
import { ChatMessage, Memory, MemoryType } from '../types';
import { CortexService } from '../services/cortexService';

interface CortexChatProps {
  memories: Memory[];
  onClose: () => void;
  onHighlightMemories: (ids: string[]) => void;
  isOpen: boolean;
  apiKey?: string;
  userName?: string;
  activeAction?: { type: 'summarize'; memoryId: string } | { type: 'summarize_batch'; memoryIds: string[] } | null;
  onClearAction?: () => void;
  aiModel?: string;
  aiTone?: string;
}

const CortexChat: React.FC<CortexChatProps> = ({
  memories,
  onClose,
  onHighlightMemories,
  isOpen,
  apiKey,
  userName,
  activeAction,
  onClearAction,
  aiModel,
  aiTone
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'cortex',
      text: `Hello${userName ? ' ' + userName : ''}, I'm Cortex. I've analyzed your current session. How can I help you with your memories today?`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Voice typing states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-to-speech states
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'init') {
      setMessages([{
        ...messages[0],
        text: `Hello${userName ? ' ' + userName : ''}, I'm Cortex. I've analyzed your current session. How can I help you with your memories today?`
      }]);
    }
  }, [userName]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (isOpen && activeAction) {
      const runAction = async () => {
        if (isThinking) return;

        let contextIds: string[] = [];
        let userText = "";

        if (activeAction.type === 'summarize') {
          contextIds = [activeAction.memoryId];
          userText = "Summarize this specific memory for me.";
        } else if (activeAction.type === 'summarize_batch') {
          contextIds = activeAction.memoryIds;
          userText = `Summarize these ${activeAction.memoryIds.length} selected memories for me.`;
        }

        if (contextIds.length === 0) return;

        const userMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'user',
          text: userText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsThinking(true);
        onHighlightMemories(contextIds);

        const response = await CortexService.generateResponse(userText, memories, contextIds, apiKey, userName, aiTone || 'friendly', aiModel);

        setIsThinking(false);
        setMessages(prev => [...prev, response]);
        if (response.sender === 'cortex') {
          speakText(response.text);
        }
        if (onClearAction) onClearAction();
      };

      runAction();
    }
  }, [activeAction, isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          alert("Microphone access denied. Please enable microphone permissions in your browser settings to use voice input.");
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!speechSynthesisRef.current || !isTTSEnabled) return;

    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    speechSynthesisRef.current.speak(utterance);
  };

  const toggleTTS = () => {
    setIsTTSEnabled(!isTTSEnabled);
    if (isTTSEnabled) {
      // Stop any ongoing speech when disabling
      speechSynthesisRef.current?.cancel();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    onHighlightMemories([]);

    const response = await CortexService.generateResponse(userMsg.text, memories, undefined, apiKey, userName, aiTone || 'friendly', aiModel);

    setIsThinking(false);
    setMessages(prev => [...prev, response]);
    if (response.sender === 'cortex') {
      speakText(response.text);
    }

    if (response.relatedMemoryIds && response.relatedMemoryIds.length > 0) {
      onHighlightMemories(response.relatedMemoryIds);
    }
  };

  const handleClose = () => {
    onHighlightMemories([]);
    onClose();
  };

  const getIconForType = (type: MemoryType) => {
    switch (type) {
      case MemoryType.IMAGE: return <ImageIcon className="w-3 h-3" />;
      case MemoryType.VIDEO_DESC: return <Video className="w-3 h-3" />;
      case MemoryType.OCR: return <ScanText className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const startVoiceChat = () => {
    // Voice chat would require additional setup with Gemini Live API
    // For now, we'll show a message about the feature
    const confirmed = confirm("Voice chat with Cortex is ready to be implemented! This would enable real-time voice conversations with AI-powered memory assistance.\n\nWould you like me to implement the full voice chat functionality?");

    if (confirmed) {
      alert("To implement full voice chat, we would need:\n1. Gemini Live Audio API integration\n2. WebRTC audio streaming\n3. Real-time audio processing\n4. Voice activity detection\n\nThis is a complex feature that requires careful implementation. For now, please use the text chat which provides the same AI capabilities!");
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed z-50 transition-all duration-300 ease-in-out shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden
      ${isExpanded
        ? 'bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-[400px] h-[600px] max-h-[90vh] md:rounded-2xl'
        : 'bottom-6 right-6 w-auto h-auto rounded-full'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 bg-cortex-600 text-white ${isExpanded ? 'rounded-t-2xl' : 'rounded-full p-3'}`}>
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => !isExpanded && setIsExpanded(true)}>
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          {isExpanded && (
            <div className="flex flex-col">
              <span className="font-semibold tracking-wide leading-none">Cortex AI</span>
              {aiModel === 'gemini-3-pro-preview' && <span className="text-[10px] opacity-80">Thinking Model</span>}
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleTTS}
              className={`p-1.5 rounded-lg transition-colors text-white/90 ${isTTSEnabled ? 'bg-white/20' : 'hover:bg-white/20'}`}
              title={isTTSEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
            >
              {isTTSEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={startVoiceChat}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/90"
              title="Start Voice Chat (Coming Soon)"
            >
              <Phone className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button onClick={() => setIsExpanded(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Minimize">
              <Minimize2 className="w-4 h-4" />
            </button>
            <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Chat Area */}
      {isExpanded && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap
                    ${msg.sender === 'user'
                      ? 'bg-cortex-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                    }`}
                >
                  {msg.text}

                  {msg.sender === 'cortex' && msg.relatedMemoryIds && msg.relatedMemoryIds.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" /> Suggested Memories
                      </p>
                      <div className="space-y-2">
                        {msg.relatedMemoryIds.map(id => {
                          const relatedMem = memories.find(m => m.id === id);
                          if (!relatedMem) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => onHighlightMemories([id])}
                              className="w-full text-left bg-slate-50 dark:bg-slate-900/50 hover:bg-cortex-50 dark:hover:bg-cortex-900/20 border border-slate-200 dark:border-slate-700 p-2 rounded-lg transition-all flex items-start space-x-2 group"
                            >
                              <div className="p-1.5 bg-white dark:bg-slate-800 rounded-md text-cortex-500 shadow-sm">
                                {getIconForType(relatedMem.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-cortex-600 dark:group-hover:text-cortex-400 transition-colors">
                                  {relatedMem.content}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(relatedMem.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-cortex-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-cortex-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-cortex-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl">
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-2 border border-transparent focus-within:border-cortex-500 transition-colors">
              <div className="pl-2">
                <Sparkles className="w-4 h-4 text-cortex-500" />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Ask Cortex..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />

              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="p-2 bg-cortex-600 text-white rounded-full hover:bg-cortex-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default CortexChat;