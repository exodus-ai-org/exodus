CREATE TYPE "public"."MemorySource" AS ENUM('explicit', 'implicit', 'system');--> statement-breakpoint
CREATE TYPE "public"."MemoryType" AS ENUM('preference', 'goal', 'environment', 'skill', 'project', 'constraint');--> statement-breakpoint
CREATE TABLE "Memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "MemoryType" NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"confidence" real DEFAULT 0.8,
	"source" "MemorySource" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "Setting" ALTER COLUMN "mcpServers" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "Setting" ALTER COLUMN "assistantAvatar" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "Setting" DROP COLUMN "mem0";