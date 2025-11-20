
import React, { useState, useRef } from 'react';
import { AppSettings, Memory } from '../types';
import { Save, X, Shield, BrainCircuit, Database, Trash2, Download, Key, User, Clock, Upload, Volume2, VolumeX, MessageSquare } from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  memories: Memory[]; // Need actual data for export
  onSave: (settings: AppSettings) => void;
  onCancel: () => void;
  onClearMemories: () => void;
  onImportMemories: (memories: Memory[]) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, memories, onSave, onCancel, onClearMemories, onImportMemories }) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [showKey, setShowKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    if (memories.length === 0) {
        alert("No memories to export.");
        return;
    }
    const dataStr = JSON.stringify({
        version: "1.0",
        timestamp: Date.now(),
        memories: memories
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nomorize_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.memories && Array.isArray(json.memories)) {
                  if(confirm(`Found ${json.memories.length} memories. Import them? Current session data will be preserved.`)) {
                      onImportMemories(json.memories);
                      alert("Import successful!");
                  }
              } else {
                  alert("Invalid backup file format.");
              }
          } catch (error) {
              console.error("Import failed", error);
              alert("Failed to parse JSON file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
          <SettingsIcon className="w-7 h-7 mr-3 text-slate-400" />
          App Settings
        </h2>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Profile & AI Section */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center mb-4 text-brand-600 dark:text-brand-400">
            <BrainCircuit className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">AI & Persona</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
                <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                    type="text" 
                    value={formData.userName}
                    onChange={(e) => handleChange('userName', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="How should Cortex call you?"
                    />
                </div>
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custom API Key</label>
                <div className="relative">
                    <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                    type={showKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Paste your Google Gemini API Key"
                    />
                    <button 
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-brand-500"
                    >
                    {showKey ? 'HIDE' : 'SHOW'}
                    </button>
                </div>
                </div>
            </div>

            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">AI Model</label>
                    <select 
                        value={formData.aiModel}
                        onChange={(e) => handleChange('aiModel', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest)</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro (Reasoning/Thinking)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {formData.aiModel === 'gemini-3-pro-preview' 
                            ? 'Advanced reasoning enabled. Slower but smarter.' 
                            : 'Optimized for speed and quick tasks.'}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cortex Tone</label>
                    <div className="relative">
                        <MessageSquare className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select 
                            value={formData.aiTone}
                            onChange={(e) => handleChange('aiTone', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                            <option value="friendly">Friendly & Casual</option>
                            <option value="professional">Professional & Formal</option>
                            <option value="concise">Concise & Direct</option>
                            <option value="enthusiastic">Enthusiastic & Motivational</option>
                            <option value="explanatory">Explanatory & Detailed</option>
                        </select>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Privacy & Automation */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex items-center mb-4 text-indigo-600 dark:text-indigo-400">
            <Shield className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">Privacy & Automation</h3>
          </div>
          
          <div className="space-y-6">
             {/* Auto Delete Toggle */}
             <div className="flex items-center justify-between">
                <div>
                   <label className="font-medium text-slate-800 dark:text-white">Auto-Delete Media</label>
                   <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                     Automatically remove photos/videos from memory after a set period. Text analysis and tags will be preserved.
                   </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.autoDeleteMedia}
                    onChange={(e) => handleChange('autoDeleteMedia', e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                </label>
             </div>

             {/* Retention Slider */}
             {formData.autoDeleteMedia && (
               <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 animate-fade-in">
                  <div className="flex justify-between mb-2">
                     <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center">
                       <Clock className="w-4 h-4 mr-2" /> Retention Period
                     </span>
                     <span className="text-sm font-bold text-brand-600">{formData.mediaRetentionDays} {formData.mediaRetentionDays === 1 ? 'Day' : 'Days'}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="60" 
                    step="1" 
                    value={formData.mediaRetentionDays}
                    onChange={(e) => handleChange('mediaRetentionDays', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-brand-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>1 Day</span>
                    <span>30 Days</span>
                    <span>60 Days</span>
                  </div>
               </div>
             )}

             <hr className="border-slate-200 dark:border-slate-700" />

             {/* Sound Toggle */}
             <div className="flex items-center justify-between">
                <div className="flex items-center">
                   {formData.enableSound ? <Volume2 className="w-5 h-5 mr-3 text-slate-600 dark:text-slate-400" /> : <VolumeX className="w-5 h-5 mr-3 text-slate-400" />}
                   <div>
                        <label className="font-medium text-slate-800 dark:text-white">Sound Effects</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Play notification sounds for reminders and briefings.
                        </p>
                   </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.enableSound}
                    onChange={(e) => handleChange('enableSound', e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                </label>
             </div>
          </div>
        </div>

        {/* Data & Storage */}
        <div className="p-6">
          <div className="flex items-center mb-4 text-slate-600 dark:text-slate-400">
            <Database className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">Data Management</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Active Memories</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{memories.length}</p>
                <p className="text-xs text-slate-400 mt-1">Stored in temporary session RAM</p>
             </div>
             
             <div className="flex flex-col gap-2">
                <button 
                   onClick={handleExport}
                   className="flex-1 flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors group"
                >
                   <Download className="w-4 h-4 mr-2 group-hover:text-brand-600" />
                   Export Backup (JSON)
                </button>

                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                />
                <button 
                   onClick={handleImportClick}
                   className="flex-1 flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors group"
                >
                   <Upload className="w-4 h-4 mr-2 group-hover:text-brand-600" />
                   Import Backup
                </button>
                
                <button 
                   onClick={onClearMemories}
                   className="flex-1 flex items-center justify-center px-4 py-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors mt-2"
                >
                   <Trash2 className="w-4 h-4 mr-2" />
                   Wipe All Data
                </button>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900/50">
           <button 
             onClick={onCancel}
             className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
           >
             Cancel
           </button>
           <button 
             onClick={() => onSave(formData)}
             className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/30 flex items-center"
           >
             <Save className="w-4 h-4 mr-2" />
             Save Settings
           </button>
        </div>
      </div>
    </div>
  );
};

const SettingsIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export default SettingsScreen;
