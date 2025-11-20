import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List, Bot, Moon, Sun, Settings as SettingsIcon, BrainCircuit, Search, Calendar } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import MemoryCard from './components/MemoryCard';
import AddMemoryForm from './components/AddMemoryForm';
import CalendarView from './components/CalendarView';
import CortexChat from './components/CortexChat';
import SettingsScreen from './components/SettingsScreen';
import { Memory, MemoryType, AppScreen, ViewMode, AppSettings } from './types';
import { memoryService, settingsService } from './services/databaseService';

function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCortexOpen, setIsCortexOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AppSettings>({
    userName: '',
    apiKey: '',
    aiModel: 'gemini-2.5-flash',
    aiTone: 'friendly',
    autoDeleteMedia: false,
    mediaRetentionDays: 30,
    enableReminders: true,
    enableSound: true,
    enableBackgroundAnalysis: true,
    theme: 'system'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedMemories = await memoryService.getMemories();
        setMemories(loadedMemories);

        const loadedSettings = await settingsService.getSettings();
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSaveMemory = async (type: MemoryType, content: string, tags: string[], imageFile?: File, reminderTime?: number) => {
    const newMemory: Memory = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: Date.now(),
      tags,
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
      reminderTimestamp: reminderTime
    };

    try {
      await memoryService.createMemory(newMemory);
      setMemories([newMemory, ...memories]);
      setCurrentScreen('home');
    } catch (error) {
      console.error('Failed to save memory:', error);
      setMemories([newMemory, ...memories]);
      setCurrentScreen('home');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      await settingsService.updateSettings(newSettings);
      setSettings(newSettings);
      setCurrentScreen('home');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSettings(newSettings);
      setCurrentScreen('home');
    }
  };

  // Filter memories based on search query
  const filteredMemories = memories.filter(memory => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      memory.content.toLowerCase().includes(query) ||
      memory.tags.some(tag => tag.toLowerCase().includes(query)) ||
      memory.type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden pb-24 bg-slate-50 dark:bg-slate-900">
      <SignedIn>
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div
              className="flex items-center space-x-2 cursor-pointer flex-shrink-0"
              onClick={() => setCurrentScreen('home')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 hidden sm:inline-block">
                Nomorize
              </span>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4 flex-1 justify-end">
              {currentScreen === 'home' && (
                <>
                  <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
                    <button
                      onClick={() => setViewMode('timeline')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                      title="Timeline View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('calendar')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}
                      title="Calendar View"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search memories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent w-64"
                    />
                  </div>
                </>
              )}

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors hidden sm:flex"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setCurrentScreen('settings')}
                className={`p-2 rounded-full transition-colors ${currentScreen === 'settings' ? 'bg-slate-100 dark:bg-slate-800 text-brand-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>

              <UserButton />

              <button
                onClick={() => setIsCortexOpen(!isCortexOpen)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all ${isCortexOpen ? 'bg-cortex-100 text-cortex-600 dark:bg-cortex-900/30 dark:text-cortex-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="AI Assistant"
              >
                <Bot className="w-5 h-5" />
                <span className="hidden md:inline font-medium">Cortex</span>
              </button>
            </div>
          </div>
        </header>
      </SignedIn>

      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-brand-500/20">
              <BrainCircuit className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Welcome to Nomorize</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Your personal memory assistant. Sign in to start capturing and organizing your thoughts.
            </p>
            <SignInButton mode="modal">
              <button className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-brand-500/30 hover:scale-105 transition-all">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 md:py-10">
        {currentScreen === 'home' && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  Your Memories
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {memories.length === 0 ? 'No memories yet. Start by adding one.' : `${filteredMemories.length}${searchQuery ? ` of ${memories.length}` : ''} entries${searchQuery ? ' found' : ' collected'}.`}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <button
                  onClick={() => setCurrentScreen('add')}
                  className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-brand-500/30 hover:scale-105 transition-all flex items-center justify-center whitespace-nowrap"
                >
                  <Plus className="w-5 h-5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add Memory</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
            </div>

            {memories.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <BrainCircuit className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Empty Session</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Start by adding your first memory.
                </p>
                <button
                  onClick={() => setCurrentScreen('add')}
                  className="mt-6 text-brand-600 dark:text-brand-400 font-medium hover:underline"
                >
                  Create your first memory &rarr;
                </button>
              </div>
            ) : viewMode === 'calendar' ? (
              <CalendarView
                memories={filteredMemories}
                onSelectMemory={(id) => {
                  // Could implement navigation to memory detail or highlight
                  console.log('Selected memory:', id);
                }}
              />
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6 max-w-3xl mx-auto'}>
                {filteredMemories.map(memory => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onDelete={() => {
                      setMemories(memories.filter(m => m.id !== memory.id));
                    }}
                    onSummarize={() => {}}
                    onEditReminder={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {currentScreen === 'add' && (
          <div className="animate-fade-in-up">
            <button
              onClick={() => setCurrentScreen('home')}
              className="mb-6 text-sm text-slate-500 hover:text-brand-600 flex items-center"
            >
              &larr; Back to Timeline
            </button>
            <AddMemoryForm
              memories={filteredMemories}
              onSave={handleSaveMemory}
              onCancel={() => setCurrentScreen('home')}
              apiKey={settings.apiKey}
            />
          </div>
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            settings={settings}
            memories={filteredMemories}
            onSave={handleSaveSettings}
            onCancel={() => setCurrentScreen('home')}
            onClearMemories={() => setMemories([])}
            onImportMemories={(imported) => setMemories([...imported, ...memories])}
          />
        )}
      </main>

      {currentScreen === 'home' && !isCortexOpen && (
        <button
          onClick={() => setCurrentScreen('add')}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-brand-600 text-white rounded-full shadow-xl shadow-brand-500/40 flex items-center justify-center z-20 hover:scale-110 transition-transform"
          title="Add new memory"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      <CortexChat
        isOpen={isCortexOpen}
        onClose={() => setIsCortexOpen(false)}
        memories={filteredMemories}
        onHighlightMemories={() => {}}
        apiKey={settings.apiKey}
        userName={settings.userName}
      />
      </SignedIn>
    </div>
  );
}

export default App;