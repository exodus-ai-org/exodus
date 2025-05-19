CREATE TYPE "public"."jobStatus" AS ENUM('submitted', 'streaming', 'archived', 'error');--> statement-breakpoint
ALTER TABLE "DeepResearch" ALTER COLUMN "finalReport" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "DeepResearch" ALTER COLUMN "endTime" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "DeepResearch" ADD COLUMN "toolCallId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "DeepResearch" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "DeepResearch" ADD COLUMN "status" "jobStatus" NOT NULL;--> statement-breakpoint
ALTER TABLE "DeepResearch" DROP COLUMN "isDone";