ALTER TABLE "memory_usage_log" ADD COLUMN "runId" uuid;--> statement-breakpoint
ALTER TABLE "memory_usage_log" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "memory_usage_log" ADD COLUMN "section" text;