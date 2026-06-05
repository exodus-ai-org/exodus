CREATE TABLE "philharmonic_session_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversationId" uuid NOT NULL,
	"content" text NOT NULL,
	"coversThroughMessageId" uuid,
	"tokenCount" integer NOT NULL,
	"messageCount" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "philharmonic_session_summary_conversationId_unique" UNIQUE("conversationId")
);
--> statement-breakpoint
ALTER TABLE "philharmonic_session_summary" ADD CONSTRAINT "philharmonic_session_summary_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "philharmonic_session_summary" ADD CONSTRAINT "philharmonic_session_summary_coversThroughMessageId_conversation_message_id_fk" FOREIGN KEY ("coversThroughMessageId") REFERENCES "public"."conversation_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ph_session_summary_conv_idx" ON "philharmonic_session_summary" USING btree ("conversationId");