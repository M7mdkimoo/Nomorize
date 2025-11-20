
import React, { useState, useRef, useEffect } from 'react';
import { MemoryType, Memory } from '../types';
import { FileText, Mic, Image as ImageIcon, Video, ScanText, X, Plus, Loader2, Sparkles, Calendar, Clock, Star, FolderUp, FileImage, Link as LinkIcon, CheckSquare, Square } from 'lucide-react';
import { CortexService } from '../services/cortexService';

interface AddMemoryFormProps {
  memories: Memory[];
  onSave: (type: MemoryType, content: string, tags: string[], imageFile?: File, reminderTime?: number, linkedMemoryIds?: string[]) => void;
  onBulkSave?: (files: File[]) => void;
  onCancel: () => void;
  apiKey?: string;
}

const AddMemoryForm: React.FC<AddMemoryFormProps> = ({ memories, onSave, onBulkSave, onCancel, apiKey }) => {
  const [activeType, setActiveType] = useState<MemoryType>(MemoryType.TEXT);
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [reminderInput, setReminderInput] = useState<string>('');
  
  // Track if the current input (image or url) has been automatically processed
  const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);
  
  // Proactive Linking
  const [suggestedLinkIds, setSuggestedLinkIds] = useState<string[]>([]);
  const [confirmedLinkIds, setConfirmedLinkIds] = useState<string[]>([]);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  
  // Bulk State
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Auto-Analyze Image Effect
  useEffect(() => {
      if (selectedImage && !hasAutoAnalyzed && !isAnalyzing) {
          runAnalysis(content, selectedImage);
      }
  }, [selectedImage]); 

  // Auto-Analyze Video URL Effect
  useEffect(() => {
      if (activeType === MemoryType.VIDEO_DESC && !hasAutoAnalyzed && !isAnalyzing) {
          const urlRegex = /^https?:\/\/[^\s]+$/;
          const trimmed = content.trim();
          
          if (trimmed === '') {
              setHasAutoAnalyzed(false);
          } else if (urlRegex.test(trimmed)) {
              const timer = setTimeout(() => {
                  runAnalysis(trimmed, undefined);
              }, 1000);
              return () => clearTimeout(timer);
          }
      }
  }, [content, activeType, hasAutoAnalyzed, isAnalyzing]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setHasAutoAnalyzed(false); // Reset to trigger auto-analysis
    }
  };

  // Bulk Handlers
  const handleBulkSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
          setBulkFiles(files);
      }
  };

  const handleBulkSubmit = () => {
      if (onBulkSave && bulkFiles.length > 0) {
          onBulkSave(bulkFiles);
      }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          setActiveType(MemoryType.IMAGE);
          setSelectedImage(blob);
          setHasAutoAnalyzed(false); 
          e.preventDefault(); 
          return;
        }
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      setTimeout(() => {
        setContent(prev => prev + (prev ? ' ' : '') + "This is a simulated voice transcription of my thoughts regarding the project timeline.");
        setIsListening(false);
      }, 2000);
    }
  };

  // Unified Analysis Function
  const runAnalysis = async (textToAnalyze: string, fileToAnalyze?: File) => {
    if (!textToAnalyze && !fileToAnalyze) return;
    
    setIsAnalyzing(true);
    setSuggestedLinkIds([]);
    setConfirmedLinkIds([]);

    try {
        const result = await CortexService.analyzeContent(textToAnalyze, fileToAnalyze, apiKey);
        
        let newContent = result.analysis || "";
        
        if (newContent) {
            setContent(prev => {
                if (prev.includes("--- Cortex Analysis ---")) {
                    return prev.split("--- Cortex Analysis ---")[0].trim() + `\n\n--- Cortex Analysis ---\n${newContent}`;
                }
                if (prev.trim().length > 0 && !prev.includes(newContent)) {
                    return `${prev}\n\n--- Cortex Analysis ---\n${newContent}`;
                }
                return newContent;
            });
        }

        if (result.tags && result.tags.length > 0) {
            const newTags = [...tags, ...result.tags];
            setTags([...new Set(newTags)]);
        }
        
        if (result.reminderISO) {
            try {
                const date = new Date(result.reminderISO);
                if (!isNaN(date.getTime())) {
                    const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                    setReminderInput(localIso);
                    
                    // Proactively check for links if we found a reminder
                    if (memories.length > 0) {
                        setIsCheckingLinks(true);
                        // Construct temp memory for matching
                        const tempMem: Memory = {
                            id: 'temp',
                            type: activeType,
                            content: newContent || content,
                            timestamp: Date.now(),
                            tags: [...tags, ...(result.tags || [])],
                            reminderTimestamp: date.getTime()
                        };
                        
                        const links = await CortexService.findConnections(tempMem, memories, apiKey);
                        setSuggestedLinkIds(links);
                        setConfirmedLinkIds(links); // Select all by default
                        setIsCheckingLinks(false);
                    }
                }
            } catch (e) {
                console.error("Invalid date from AI", e);
            }
        }
        setHasAutoAnalyzed(true);
    } catch (error) {
        console.error("Analysis failed", error);
        setIsCheckingLinks(false);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleAnalyzeClick = () => {
      runAnalysis(content, selectedImage || undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedImage) return;
    
    const reminderTimestamp = reminderInput ? new Date(reminderInput).getTime() : undefined;
    onSave(activeType, content, tags, selectedImage || undefined, reminderTimestamp, confirmedLinkIds);
  };

  const toggleLinkSelection = (id: string) => {
      setConfirmedLinkIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const resetFormState = (newType: MemoryType) => {
      setActiveType(newType);
      setIsBulkMode(false);
      setIsFeedbackMode(false);
      setContent('');
      setTags([]);
      setSelectedImage(null);
      setReminderInput('');
      setTagInput('');
      setBulkFiles([]);
      setHasAutoAnalyzed(false);
      setSuggestedLinkIds([]);
      setConfirmedLinkIds([]);
  };

  const activateBulkMode = () => {
      resetFormState(MemoryType.IMAGE);
      setIsBulkMode(true);
  };

  const toggleFeedbackMode = () => {
      const newMode = !isFeedbackMode;
      setIsBulkMode(false);
      setIsFeedbackMode(newMode);
      setHasAutoAnalyzed(false);
      if (newMode) {
          setActiveType(MemoryType.TEXT);
          setTags(prev => [...new Set([...prev, 'feedback'])]);
      } else {
          setTags(prev => prev.filter(t => t !== 'feedback'));
      }
  };

  const getTypeDescription = () => {
    if (isBulkMode) return "Select a folder containing images to analyze and import them all at once.";
    if (isFeedbackMode) return "Record your experience. How was it? What should you remember for next time?";
    switch(activeType) {
      case MemoryType.TEXT: return "Write a quick note or thought.";
      case MemoryType.VOICE: return "Simulated voice-to-text transcription.";
      case MemoryType.IMAGE: return "Upload, paste, or drag an image.";
      case MemoryType.VIDEO_DESC: return "Paste a video link or describe a video.";
      case MemoryType.OCR: return "Type out text you see in the real world.";
      default: return "";
    }
  };

  const setReminderToNow = () => {
      const now = new Date();
      now.setMinutes(0);
      now.setHours(now.getHours() + 1);
      const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setReminderInput(localIso);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
            {isBulkMode ? 'Bulk Import' : 'New Memory'}
        </h2>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
        {[
          { type: MemoryType.TEXT, icon: FileText, label: 'Note' },
          { type: MemoryType.VOICE, icon: Mic, label: 'Voice' },
          { type: MemoryType.IMAGE, icon: ImageIcon, label: 'Photo' },
          { type: MemoryType.VIDEO_DESC, icon: Video, label: 'Video Link' },
          { type: MemoryType.OCR, icon: ScanText, label: 'OCR' },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => resetFormState(item.type)}
            className={`flex items-center space-x-2 px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors
              ${activeType === item.type && !isFeedbackMode && !isBulkMode
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border-b-2 border-brand-500' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
        
        <button
            onClick={toggleFeedbackMode}
            className={`flex items-center space-x-2 px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors border-l border-slate-100 dark:border-slate-700
              ${isFeedbackMode 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-500' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
        >
            <Star className={`w-4 h-4 ${isFeedbackMode ? 'fill-current' : ''}`} />
            <span>Feedback</span>
        </button>

        {onBulkSave && (
            <button
                onClick={activateBulkMode}
                className={`flex items-center space-x-2 px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors border-l border-slate-100 dark:border-slate-700
                ${isBulkMode 
                    ? 'bg-cortex-50 dark:bg-cortex-900/20 text-cortex-600 dark:text-cortex-400 border-b-2 border-cortex-500' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
                <FolderUp className="w-4 h-4" />
                <span>Bulk Import</span>
            </button>
        )}
      </div>

      {/* BULK MODE UI */}
      {isBulkMode ? (
        <div className="p-8 space-y-6">
            <div className="bg-cortex-50 dark:bg-cortex-900/20 p-4 rounded-lg text-sm text-cortex-700 dark:text-cortex-300 mb-4 border border-cortex-100 dark:border-cortex-800">
                {getTypeDescription()}
            </div>

            <div 
                onClick={() => bulkInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 text-center hover:border-cortex-400 dark:hover:border-cortex-400 transition-all cursor-pointer bg-slate-50 dark:bg-slate-900/50"
            >
                {/* Use spread with any cast to support non-standard attributes */}
                <input 
                    type="file" 
                    ref={bulkInputRef} 
                    className="hidden" 
                    accept="image/*"
                    multiple
                    {...({ webkitdirectory: "", directory: "" } as any)}
                    onChange={handleBulkSelect}
                />
                
                {bulkFiles.length === 0 ? (
                    <div className="space-y-3">
                        <div className="w-16 h-16 bg-cortex-100 dark:bg-cortex-900/40 text-cortex-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <FolderUp className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Select Folder or Images</h3>
                        <p className="text-sm text-slate-500">Click to upload screenshots to analyze</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                            <FileImage className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{bulkFiles.length} Images Found</h3>
                        <div className="flex flex-wrap justify-center gap-1">
                            {bulkFiles.slice(0, 5).map((f, i) => (
                                <span key={i} className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-slate-500">{f.name}</span>
                            ))}
                            {bulkFiles.length > 5 && <span className="text-[10px] text-slate-400 pt-1">...and {bulkFiles.length - 5} more</span>}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-4 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={bulkFiles.length === 0}
                    className="px-8 py-2.5 rounded-xl bg-cortex-600 text-white font-medium hover:bg-cortex-700 transition-all shadow-lg shadow-cortex-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Import & Analyze All
                </button>
            </div>
        </div>
      ) : (
        /* STANDARD FORM */
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className={`p-4 rounded-lg text-sm flex justify-between items-center transition-colors ${isFeedbackMode ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' : 'bg-slate-50 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400'}`}>
            <span>{getTypeDescription()}</span>
            {(activeType === MemoryType.IMAGE || activeType === MemoryType.VIDEO_DESC || activeType === MemoryType.OCR) && (
                <span className="text-xs bg-cortex-100 text-cortex-600 px-2 py-1 rounded-md border border-cortex-200">
                    AI Analysis Available
                </span>
            )}
            </div>

            {activeType === MemoryType.IMAGE && (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-brand-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageSelect}
                />
                {selectedImage ? (
                <div className="relative">
                    <img 
                    src={URL.createObjectURL(selectedImage)} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded-lg shadow-sm"
                    />
                    <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setReminderInput(''); setHasAutoAnalyzed(false); setSuggestedLinkIds([]); }}
                    className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-black/70"
                    >
                    <X className="w-4 h-4" />
                    </button>
                </div>
                ) : (
                <div className="space-y-2">
                    <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 text-brand-500 rounded-full flex items-center justify-center mx-auto">
                    <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Click to upload or paste image</p>
                    <p className="text-xs text-slate-400">JPG, PNG, GIF up to 5MB</p>
                </div>
                )}
            </div>
            )}

            {/* Analysis Button */}
            {(content || selectedImage) && !isAnalyzing && (
                <button 
                type="button"
                onClick={handleAnalyzeClick}
                className="w-full py-2 bg-gradient-to-r from-cortex-500 to-cortex-600 text-white rounded-xl text-sm font-medium flex items-center justify-center hover:from-cortex-600 hover:to-cortex-700 shadow-md shadow-cortex-500/20 transition-all"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {selectedImage 
                        ? (hasAutoAnalyzed ? "Re-Analyze Image" : "Analyze Image & Extract Tags")
                        : (activeType === MemoryType.VIDEO_DESC && content.includes('http') ? "Analyze Video Link" : "Analyze Content with Cortex")
                    }
                </button>
            )}
            
            {isAnalyzing && (
                <div className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-sm font-medium flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {selectedImage ? "Processing Visuals..." : (activeType === MemoryType.VIDEO_DESC ? "Browsing Link..." : "Cortex is analyzing...")}
                </div>
            )}

            <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {activeType === MemoryType.IMAGE ? 'Caption / Analysis' : 'Content'}
            </label>
            <div className="relative">
                <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                    isFeedbackMode ? "The food was great, but parking was a nightmare. Next time bring cash for valet." :
                    activeType === MemoryType.VOICE ? "Tap microphone to speak..." : 
                    (activeType === MemoryType.VIDEO_DESC ? "Paste video URL or describe video..." : "What's on your mind?")
                }
                className="w-full min-h-[120px] p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none transition-shadow"
                />
                {activeType === MemoryType.VOICE && (
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute bottom-4 right-4 p-3 rounded-full transition-all duration-300 shadow-lg
                    ${isListening 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-brand-500 text-white hover:bg-brand-600 hover:scale-105'}`}
                >
                    {isListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                </button>
                )}
            </div>
            </div>

            <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tags</label>
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-brand-500/50">
                {tags.map(tag => (
                <span key={tag} className="flex items-center bg-white dark:bg-slate-800 px-2 py-1 rounded-md text-sm text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-slate-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                    </button>
                </span>
                ))}
                <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag & press Enter..."
                className="flex-1 bg-transparent min-w-[120px] outline-none text-sm p-1 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />
            </div>
            </div>

            {/* Reminder Section */}
            <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                        Reminder
                    </label>
                    {!reminderInput && (
                        <button 
                            type="button"
                            onClick={setReminderToNow}
                            className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Set Reminder
                        </button>
                    )}
                </div>

                {reminderInput && (
                    <div className="flex items-center space-x-2 animate-fade-in">
                        <div className="relative flex-1">
                            <input 
                                type="datetime-local"
                                value={reminderInput}
                                onChange={(e) => setReminderInput(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <button 
                            type="button"
                            onClick={() => { setReminderInput(''); setSuggestedLinkIds([]); }}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                            title="Remove reminder"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
                
                {/* PROACTIVE LINKING SUGGESTIONS */}
                {isCheckingLinks && (
                     <div className="flex items-center space-x-2 text-xs text-cortex-500 animate-pulse">
                         <Sparkles className="w-3 h-3" />
                         <span>Cortex is looking for related context...</span>
                     </div>
                )}

                {suggestedLinkIds.length > 0 && (
                    <div className="mt-3 p-3 bg-cortex-50 dark:bg-cortex-900/20 rounded-xl border border-cortex-100 dark:border-cortex-800 animate-fade-in">
                        <div className="flex items-center mb-2 text-cortex-700 dark:text-cortex-300 text-xs font-bold uppercase">
                            <LinkIcon className="w-3 h-3 mr-1.5" />
                            Linked Context
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            Cortex found existing memories that relate to this event. Link them?
                        </p>
                        <div className="space-y-2">
                            {suggestedLinkIds.map(id => {
                                const mem = memories.find(m => m.id === id);
                                if (!mem) return null;
                                const isSelected = confirmedLinkIds.includes(id);
                                return (
                                    <div 
                                        key={id}
                                        onClick={() => toggleLinkSelection(id)}
                                        className={`flex items-start p-2 rounded-lg cursor-pointer border transition-all
                                            ${isSelected 
                                                ? 'bg-white dark:bg-slate-800 border-cortex-300 dark:border-cortex-700 shadow-sm' 
                                                : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        <div className={`mr-2 mt-0.5 ${isSelected ? 'text-cortex-600' : 'text-slate-300'}`}>
                                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-medium truncate ${isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                                                {mem.content}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(mem.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {reminderInput 
                        ? "Cortex will flag this memory at the selected time." 
                        : "Set a reminder to get notified about this memory later."}
                </p>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
            <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={!content && !selectedImage}
                className="px-8 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/30 transition-all shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
                <Plus className="w-5 h-5 mr-2" />
                Save Memory
            </button>
            </div>
        </form>
      )}
    </div>
  );
};

export default AddMemoryForm;
