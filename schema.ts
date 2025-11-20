import { pgTable, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const memories = pgTable('memories', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // TEXT, VOICE, IMAGE, VIDEO_DESC, OCR
  content: text('content').notNull(),
  timestamp: text('timestamp').notNull(), // Stored as string in existing DB
  tags: text('tags').array().default([]), // text array in existing DB
  imageUrl: text('image_url'),
  reminderTimestamp: text('reminder_timestamp'), // Stored as string
  linkedMemoryIds: text('linked_memory_ids').array().default([]), // text array
  isAnalyzing: boolean('is_analyzing').default(false),
  isPinned: boolean('is_pinned').default(false),
});

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  sender: text('sender').notNull(), // 'user' or 'cortex'
  text: text('text').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  relatedMemoryIds: jsonb('related_memory_ids').$type<string[]>().default([]),
});

export const settings = pgTable('app_settings', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userName: text('user_name').notNull(),
  apiKey: text('api_key').notNull(),
  aiModel: text('ai_model').notNull(),
  aiTone: text('ai_tone').notNull(), // 'friendly' | 'professional' | 'concise' | 'enthusiastic' | 'explanatory'
  autoDeleteMedia: boolean('auto_delete_media').default(false),
  mediaRetentionDays: integer('media_retention_days').default(30),
  enableReminders: boolean('enable_reminders').default(true),
  enableSound: boolean('enable_sound').default(true),
  enableBackgroundAnalysis: boolean('enable_background_analysis').default(true),
  theme: text('theme').default('system'), // 'system' | 'light' | 'dark'
});

// Export types
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;