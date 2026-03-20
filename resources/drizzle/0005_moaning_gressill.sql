ALTER TABLE "mcp_server" ALTER COLUMN "command" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "mcp_server" ALTER COLUMN "command" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "transportType" varchar DEFAULT 'stdio' NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "headers" jsonb;