-- P1-4: agent_memory now requires a conversationId. The user confirmed the
-- project has no production data to preserve, so we TRUNCATE the table before
-- adding the NOT NULL column. Drop is safe because every existing row was
-- ambiguous about which Group it belonged to anyway.
TRUNCATE TABLE "agent_memory";--> statement-breakpoint
ALTER TABLE "agent_memory" ADD COLUMN "conversationId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;
