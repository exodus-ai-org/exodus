ALTER TABLE "chat" DROP CONSTRAINT "chat_projectId_project_id_fk";
--> statement-breakpoint
DROP INDEX "chat_project_idx";--> statement-breakpoint
ALTER TABLE "chat" DROP COLUMN "projectId";--> statement-breakpoint
ALTER TABLE "chat" DROP COLUMN "useProjectInstructions";--> statement-breakpoint
DROP TABLE "project";
