CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender" text NOT NULL,
	"text" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"related_memory_ids" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"image_url" text,
	"reminder_timestamp" timestamp,
	"linked_memory_ids" jsonb DEFAULT '[]'::jsonb,
	"is_analyzing" boolean DEFAULT false,
	"is_pinned" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_name" text NOT NULL,
	"api_key" text NOT NULL,
	"ai_model" text NOT NULL,
	"ai_tone" text NOT NULL,
	"auto_delete_media" boolean DEFAULT false,
	"media_retention_days" integer DEFAULT 30,
	"enable_reminders" boolean DEFAULT true,
	"enable_sound" boolean DEFAULT true,
	"enable_background_analysis" boolean DEFAULT true,
	"theme" text DEFAULT 'system'
);
