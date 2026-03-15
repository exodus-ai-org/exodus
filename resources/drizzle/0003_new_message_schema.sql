-- Drop dependent tables first
DROP TABLE IF EXISTS "Vote";--> statement-breakpoint
DROP TABLE IF EXISTS "Message";--> statement-breakpoint

-- Recreate Message with pi-ai native fields
CREATE TABLE "Message" (
	"id" UUID NOT NULL DEFAULT gen_random_uuid(),
	"chatId" UUID NOT NULL,
	"role" VARCHAR NOT NULL,
	"content" JSONB NOT NULL,
	"usage" JSONB,
	"api" VARCHAR,
	"provider" VARCHAR,
	"model" VARCHAR,
	"stopReason" VARCHAR,
	"toolCallId" VARCHAR,
	"toolName" VARCHAR,
	"isError" BOOLEAN,
	"createdAt" TIMESTAMP NOT NULL DEFAULT now(),
	CONSTRAINT "Message_pkey" PRIMARY KEY("id"),
	CONSTRAINT "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);--> statement-breakpoint

CREATE INDEX "message_search_index" ON "Message" USING GIN (to_tsvector('simple', "content"));--> statement-breakpoint

-- Recreate Vote table
CREATE TABLE "Vote" (
	"chatId" UUID NOT NULL,
	"messageId" UUID NOT NULL,
	"isUpvoted" BOOLEAN NOT NULL,
	CONSTRAINT "Vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId"),
	CONSTRAINT "Vote_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
	CONSTRAINT "Vote_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
