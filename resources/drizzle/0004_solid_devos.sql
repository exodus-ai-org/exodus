DROP TABLE "embedding" CASCADE;--> statement-breakpoint
DROP TABLE "resource" CASCADE;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "isShadow" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "shadowOfAgentId" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "cronExpression" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "lastRunAt" timestamp;