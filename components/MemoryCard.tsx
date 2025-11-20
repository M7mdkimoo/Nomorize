
import React from 'react';
import { Memory, MemoryType } from '../types';
import { FileText, Mic, Image as ImageIcon, Video, ScanText, Tag, Trash2, Bell, Sparkles, Clock, Star, Link as LinkIcon, CheckCircle2, Circle, Loader2, Pin } from 'lucide-react';

interface MemoryCardProps {
  memory: Memory;
  highlight?: boolean;
  onDelete: () => void;
  onSummarize: () => void;
  onEditReminder: () => void;
  onTogglePin: () => void;
  // Linking Props
  linkedMemories?: Memory[];
  isLinkingMode?: boolean;
  isLinkingSource?: boolean;
  onLinkStart?: () => void;
  onLinkComplete?: () => void;
  // Multi-select Props
  selected?: boolean;
  onToggleSelect?: () => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ 
    memory, highlight, onDelete, onSummarize, onEditReminder, onTogglePin,
    linkedMemories, isLinkingMode, isLinkingSource, onLinkStart, onLinkComplete,
    selected, onToggleSelect
}) => {
  const date = new Date(memory.timestamp);
  
  const reminderDate = memory.reminderTimestamp ? new Date(memory.reminderTimestamp) : null;
  const isFeedback = memory.tags.includes('feedback');

  const getIcon = () => {
    switch (memory.type) {
      case MemoryType.TEXT: return <FileText className="w-5 h-5 text-blue-500" />;
      case MemoryType.VOICE: return <Mic className="w-5 h-5 text-red-500" />;
      case MemoryType.IMAGE: return <ImageIcon className="w-5 h-5 text-purple-500" />;
      case MemoryType.VIDEO_DESC: return <Video className="w-5 h-5 text-pink-500" />;
      case MemoryType.OCR: return <ScanText className="w-5 h-5 text-emerald-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  // Handle Linking Click
  const handleCardClick = () => {
      if (isLinkingMode && !isLinkingSource && onLinkComplete) {
          onLinkComplete();
      } else if (onToggleSelect) {
          onToggleSelect();
      }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-4 transition-all duration-300 group relative cursor-pointer overflow-hidden
        ${highlight 
          ? 'border-brand-400 ring-2 ring-brand-200 dark:ring-brand-900 transform scale-[1.02]' 
          : selected 
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10 ring-1 ring-brand-500'
            : isFeedback 
                ? 'border-amber-200 dark:border-amber-900/50 hover:shadow-md' 
                : memory.isPinned 
                    ? 'border-brand-200 dark:border-brand-800 bg-brand-50/30 dark:bg-brand-900/5' 
                    : 'border-slate-200 dark:border-slate-700 hover:shadow-md'
        }
        ${isLinkingMode && !isLinkingSource 
            ? 'hover:ring-4 hover:ring-green-400 hover:border-green-500 cursor-alias' 
            : ''}
        ${isLinkingSource ? 'ring-2 ring-cortex-500 opacity-100 z-10' : ''}
      `}
    >
      {/* Analyzing Overlay */}
      {memory.isAnalyzing && (
          <div className="absolute top-0 right-0 p-2">
               <span className="flex items-center space-x-1 bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                   <Loader2 className="w-3 h-3 animate-spin" />
                   <span>ANALYZING</span>
               </span>
          </div>
      )}

      {/* Pinned Indicator */}
      {memory.isPinned && (
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-brand-500 border-r-transparent pointer-events-none z-10 opacity-50"></div>
      )}

      {/* Linking Mode Overlay Hint */}
      {isLinkingMode && !isLinkingSource && (
          <div className="absolute inset-0 bg-green-50/10 dark:bg-green-900/10 z-10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl flex items-center transform scale-105 transition-transform">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Link Here
              </span>
          </div>
      )}

      <div className="flex items-start justify-between mb-3 relative z-20">
        <div className="flex items-center space-x-3">
          {/* Selection Checkbox (visible on hover or if selected) */}
          <div className={`transition-all duration-200 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} -ml-1`}>
             {selected 
                ? <CheckCircle2 className="w-5 h-5 text-brand-600 fill-brand-100" />
                : <Circle className="w-5 h-5 text-slate-300 hover:text-brand-400" />
             }
          </div>

          <div className={`p-2 rounded-lg ${isFeedback ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-700'}`}>
            {isFeedback ? <Star className="w-5 h-5 text-amber-500 fill-current" /> : getIcon()}
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center">
              {memory.type.replace('_', ' ')}
              {isFeedback && <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 rounded">Review</span>}
              {memory.isPinned && <span className="ml-2 text-[10px] bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 px-1.5 rounded flex items-center"><Pin className="w-3 h-3 mr-1 fill-current" /> Pinned</span>}
            </span>
            <p className="text-xs text-slate-400">
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
             
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin();
                }}
                className={`p-2 rounded-lg transition-colors ${memory.isPinned ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}
                title={memory.isPinned ? "Unpin memory" : "Pin memory to top"}
            >
                <Pin className={`w-4 h-4 ${memory.isPinned ? 'fill-current' : ''}`} />
            </button>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if(onLinkStart) onLinkStart();
                }}
                className={`p-2 rounded-lg transition-colors ${isLinkingSource ? 'bg-cortex-100 text-cortex-600 animate-pulse' : 'text-slate-400 hover:text-cortex-600 hover:bg-cortex-50 dark:hover:bg-cortex-900/20'}`}
                title="Link to another memory"
            >
                <LinkIcon className="w-4 h-4" />
            </button>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEditReminder();
                }}
                className={`p-2 rounded-lg transition-colors ${memory.reminderTimestamp ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}
                title={memory.reminderTimestamp ? "Edit reminder" : "Set reminder"}
            >
                <Clock className="w-4 h-4" />
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onSummarize();
                }}
                className="p-2 text-slate-400 hover:text-cortex-600 hover:bg-cortex-50 dark:hover:bg-cortex-900/20 rounded-lg transition-colors"
                title="Ask Cortex to summarize this"
            >
                <Sparkles className="w-4 h-4" />
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                aria-label="Delete memory"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      {/* Reminder Indicator */}
      {reminderDate && (
          <div className="mb-3 flex items-center space-x-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 px-3 py-2 rounded-lg text-xs font-medium">
              <Bell className="w-3.5 h-3.5" />
              <span>Reminder: {reminderDate.toLocaleDateString()} {reminderDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
      )}

      {memory.imageUrl && (
        <div className="mb-3 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 relative">
          <img src={memory.imageUrl} alt="Memory attachment" className={`w-full h-48 object-cover transition-opacity duration-500 ${memory.isAnalyzing ? 'opacity-50 grayscale' : 'opacity-100'}`} />
          {memory.isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center shadow-lg">
                      <Sparkles className="w-4 h-4 text-cortex-500 animate-pulse mr-2" />
                      <span className="text-xs font-bold text-cortex-600 dark:text-cortex-400">Cortex Analyzing...</span>
                  </div>
              </div>
          )}
        </div>
      )}

      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${memory.isAnalyzing ? 'text-slate-400 italic' : 'text-slate-700 dark:text-slate-200'}`}>
        {memory.content}
      </p>

      {/* Tags & Linked Memories */}
      <div className="mt-4 flex flex-wrap gap-2">
          {memory.tags.map(tag => (
            <span key={tag} className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium 
                ${tag === 'feedback' 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
              <Tag className="w-3 h-3 mr-1 opacity-50" />
              {tag}
            </span>
          ))}
      </div>

      {linkedMemories && linkedMemories.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10px] uppercase text-slate-400 font-bold mb-1.5">Linked Memories</p>
              <div className="flex flex-col gap-1.5">
                  {linkedMemories.map(lm => (
                      <div key={lm.id} className="flex items-center text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                          <LinkIcon className="w-3 h-3 mr-1.5 text-cortex-400" />
                          <span className="truncate">{lm.content}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default MemoryCard;