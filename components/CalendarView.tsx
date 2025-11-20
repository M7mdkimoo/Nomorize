import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Mic, Image as ImageIcon, Video, ScanText, Bell } from 'lucide-react';
import { Memory, MemoryType } from '../types';

interface CalendarViewProps {
  memories: Memory[];
  onSelectMemory: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ memories, onSelectMemory }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
    return { daysInMonth, firstDayOfMonth };
  };

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate);
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getMemoriesForDay = (day: number) => {
    return memories.filter(m => {
      const mDate = new Date(m.timestamp);
      return (
        mDate.getDate() === day &&
        mDate.getMonth() === currentDate.getMonth() &&
        mDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const getIcon = (type: MemoryType) => {
    switch (type) {
      case MemoryType.TEXT: return <FileText className="w-3 h-3" />;
      case MemoryType.VOICE: return <Mic className="w-3 h-3" />;
      case MemoryType.IMAGE: return <ImageIcon className="w-3 h-3" />;
      case MemoryType.VIDEO_DESC: return <Video className="w-3 h-3" />;
      case MemoryType.OCR: return <ScanText className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type: MemoryType) => {
    switch (type) {
      case MemoryType.TEXT: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case MemoryType.VOICE: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case MemoryType.IMAGE: return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case MemoryType.VIDEO_DESC: return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
      case MemoryType.OCR: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Padding for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`padding-${i}`} className="bg-slate-50/50 dark:bg-slate-900/30 min-h-[100px] border-r border-b border-slate-200 dark:border-slate-700" />);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayMemories = getMemoriesForDay(day);
      const isToday = 
        day === new Date().getDate() && 
        currentDate.getMonth() === new Date().getMonth() && 
        currentDate.getFullYear() === new Date().getFullYear();

      days.push(
        <div 
          key={`day-${day}`} 
          className={`min-h-[120px] border-r border-b border-slate-200 dark:border-slate-700 p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isToday ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'bg-white dark:bg-slate-800'}`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300'}`}>
              {day}
            </span>
            {dayMemories.length > 0 && (
               <span className="text-xs text-slate-400 dark:text-slate-500">{dayMemories.length} items</span>
            )}
          </div>

          <div className="space-y-1.5 overflow-hidden">
            {dayMemories.slice(0, 4).map(mem => (
              <button
                key={mem.id}
                onClick={() => onSelectMemory(mem.id)}
                className={`w-full text-left px-2 py-1 rounded text-[10px] font-medium truncate flex items-center space-x-1.5 transition-transform hover:scale-[1.02] ${getTypeColor(mem.type)}`}
              >
                {getIcon(mem.type)}
                <span className="truncate">{mem.content || "Media Content"}</span>
                {mem.reminderTimestamp && <Bell className="w-3 h-3 ml-auto flex-shrink-0 opacity-70" />}
              </button>
            ))}
            {dayMemories.length > 4 && (
              <div className="text-[10px] text-center text-slate-500 dark:text-slate-400 font-medium pt-1">
                + {dayMemories.length - 4} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
      {/* Calendar Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center space-x-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-brand-600 hover:text-brand-700 px-3 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
            Today
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 bg-slate-200 dark:bg-slate-700 gap-px border-b border-l border-slate-200 dark:border-slate-700">
         {renderCalendarDays()}
      </div>
    </div>
  );
};

export default CalendarView;
