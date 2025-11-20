import { Memory, MemoryType, ChatMessage, AppSettings } from '../types';

// API base URL
const API_BASE = 'http://localhost:3001/api';

// Helper function to make API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

// Convert database memory to frontend memory
function dbMemoryToMemory(dbMemory: any): Memory {
  return {
    id: dbMemory.id,
    type: dbMemory.type as MemoryType,
    content: dbMemory.content,
    timestamp: parseInt(dbMemory.timestamp),
    tags: dbMemory.tags || [],
    imageUrl: dbMemory.image_url,
    reminderTimestamp: dbMemory.reminder_timestamp ? parseInt(dbMemory.reminder_timestamp) : undefined,
    linkedMemoryIds: dbMemory.linked_memory_ids || [],
    isAnalyzing: dbMemory.is_analyzing || false,
    isPinned: dbMemory.is_pinned || false,
  };
}

// Convert frontend memory to database memory
function memoryToDbMemory(memory: Memory): any {
  return {
    id: memory.id,
    type: memory.type,
    content: memory.content,
    timestamp: memory.timestamp.toString(),
    tags: memory.tags,
    image_url: memory.imageUrl,
    reminder_timestamp: memory.reminderTimestamp?.toString(),
    linked_memory_ids: memory.linkedMemoryIds,
    is_analyzing: memory.isAnalyzing,
    is_pinned: memory.isPinned,
  };
}

// Convert database chat message to frontend chat message
function dbChatMessageToChatMessage(dbMessage: any): ChatMessage {
  return {
    id: dbMessage.id,
    sender: dbMessage.sender,
    text: dbMessage.text,
    timestamp: parseInt(dbMessage.timestamp),
    relatedMemoryIds: dbMessage.related_memory_ids || [],
  };
}

// Convert frontend chat message to database chat message
function chatMessageToDbChatMessage(message: ChatMessage): any {
  return {
    id: message.id,
    sender: message.sender,
    text: message.text,
    timestamp: message.timestamp.toString(),
    related_memory_ids: message.relatedMemoryIds,
  };
}

// Initialize database (no-op for API)
async function initDatabase() {
  console.log('Using API for data storage');
}

// Memory operations
export const memoryService = {
  async getMemories(limit: number = 50, offset: number = 0, type?: MemoryType, tags?: string[], pinnedOnly: boolean = false): Promise<Memory[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (type) params.append('type', type);
      if (tags && tags.length > 0) params.append('tags', tags.join(','));
      if (pinnedOnly) params.append('pinnedOnly', 'true');

      const dbMemories = await apiCall<any[]>(`/memories?${params}`);
      return dbMemories.map(dbMemoryToMemory);
    } catch (error) {
      console.error('Error fetching memories:', error);
      throw error;
    }
  },

  async createMemory(memory: Omit<Memory, 'timestamp'>): Promise<Memory> {
    try {
      const newMemory: Memory = {
        ...memory,
        timestamp: Date.now()
      };

      const dbMemory = await apiCall<any>('/memories', {
        method: 'POST',
        body: JSON.stringify(memoryToDbMemory(newMemory)),
      });

      return dbMemoryToMemory(dbMemory);
    } catch (error) {
      console.error('Error creating memory:', error);
      throw error;
    }
  },

  async updateMemory(id: string, updates: Partial<Omit<Memory, 'id' | 'timestamp'>>): Promise<Memory | null> {
    try {
      const dbUpdates: any = { ...updates };
      if (updates.reminderTimestamp !== undefined) {
        dbUpdates.reminder_timestamp = updates.reminderTimestamp?.toString();
      }

      const dbMemory = await apiCall<any>(`/memories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dbUpdates),
      });

      return dbMemoryToMemory(dbMemory);
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  },

  async deleteMemory(id: string): Promise<boolean> {
    try {
      await apiCall(`/memories/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }
};

// Chat operations
export const chatService = {
  async getChatMessages(limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const dbMessages = await apiCall<any[]>(`/chat-messages?${params}`);
      return dbMessages.map(dbChatMessageToChatMessage);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  },

  async createChatMessage(message: Omit<ChatMessage, 'timestamp'>): Promise<ChatMessage> {
    try {
      const newMessage: ChatMessage = {
        ...message,
        timestamp: Date.now()
      };

      const dbMessage = await apiCall<any>('/chat-messages', {
        method: 'POST',
        body: JSON.stringify(chatMessageToDbChatMessage(newMessage)),
      });

      return dbChatMessageToChatMessage(dbMessage);
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  }
};

// Settings operations
export const settingsService = {
  async getSettings(): Promise<AppSettings | null> {
    try {
      const dbSettings = await apiCall<any>('/settings');
      return dbSettings ? {
        userName: dbSettings.user_name,
        apiKey: dbSettings.api_key,
        aiModel: dbSettings.ai_model,
        aiTone: dbSettings.ai_tone as AppSettings['aiTone'],
        autoDeleteMedia: dbSettings.auto_delete_media,
        mediaRetentionDays: dbSettings.media_retention_days,
        enableReminders: dbSettings.enable_reminders,
        enableSound: dbSettings.enable_sound,
        enableBackgroundAnalysis: dbSettings.enable_background_analysis,
        theme: dbSettings.theme as AppSettings['theme'],
      } : null;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  },

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    try {
      const dbSettings = {
        user_name: settings.userName,
        api_key: settings.apiKey,
        ai_model: settings.aiModel,
        ai_tone: settings.aiTone,
        auto_delete_media: settings.autoDeleteMedia,
        media_retention_days: settings.mediaRetentionDays,
        enable_reminders: settings.enableReminders,
        enable_sound: settings.enableSound,
        enable_background_analysis: settings.enableBackgroundAnalysis,
        theme: settings.theme,
      };

      const result = await apiCall<any>('/settings', {
        method: 'PUT',
        body: JSON.stringify(dbSettings),
      });

      return {
        userName: result.user_name,
        apiKey: result.api_key,
        aiModel: result.ai_model,
        aiTone: result.ai_tone,
        autoDeleteMedia: result.auto_delete_media,
        mediaRetentionDays: result.media_retention_days,
        enableReminders: result.enable_reminders,
        enableSound: result.enable_sound,
        enableBackgroundAnalysis: result.enable_background_analysis,
        theme: result.theme,
      };
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
};

// Initialize database on module load
initDatabase();