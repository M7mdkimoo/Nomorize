
export enum MemoryType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  IMAGE = 'IMAGE',
  VIDEO_DESC = 'VIDEO_DESC',
  OCR = 'OCR'
}

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: number;
  tags: string[];
  imageUrl?: string; // For local object URLs
  reminderTimestamp?: number; // For AI-detected upcoming events
  linkedMemoryIds?: string[];
  isAnalyzing?: boolean;
  isPinned?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'cortex';
  text: string;
  timestamp: number;
  relatedMemoryIds?: string[]; // IDs of memories Cortex found relevant
}

export interface AppSettings {
  userName: string;
  apiKey: string;
  aiModel: string;
  aiTone: 'friendly' | 'professional' | 'concise' | 'enthusiastic' | 'explanatory';
  autoDeleteMedia: boolean;
  mediaRetentionDays: number;
  enableReminders: boolean;
  enableSound: boolean;
  enableBackgroundAnalysis: boolean;
  theme: 'system' | 'light' | 'dark';
}

export type ViewMode = 'timeline' | 'grid' | 'calendar';
export type AppScreen = 'home' | 'add' | 'settings';

// Web Speech API Type Definitions
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}
