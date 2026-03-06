ALTER TABLE "Setting" ALTER COLUMN "mcpServers" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Setting" ALTER COLUMN "assistantAvatar" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Setting" ADD COLUMN "s3" jsonb;--> statement-breakpoint
ALTER TABLE "Setting" DROP COLUMN "fileUploadEndpoint";