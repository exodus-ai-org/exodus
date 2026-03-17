DROP TABLE IF EXISTS "embedding" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "resource" CASCADE;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "isShadow" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN IF NOT EXISTS "shadowOfAgentId" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "cronExpression" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "lastRunAt" timestamp;
