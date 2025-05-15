ALTER TABLE "public"."DeepResearch" ALTER COLUMN "jobStatus" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."jobStatus";--> statement-breakpoint
CREATE TYPE "public"."jobStatus" AS ENUM('streaming', 'archived', 'failed', 'terminated');--> statement-breakpoint
ALTER TABLE "public"."DeepResearch" ALTER COLUMN "jobStatus" SET DATA TYPE "public"."jobStatus" USING "jobStatus"::"public"."jobStatus";