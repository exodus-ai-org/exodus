CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"instructions" text DEFAULT '',
	"structuredInstructions" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "projectId" uuid;
--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "useProjectInstructions" boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "chat_project_idx" ON "chat" USING btree ("projectId");
