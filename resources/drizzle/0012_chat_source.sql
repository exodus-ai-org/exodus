CREATE TABLE "chat_source" (
	"chatId" uuid NOT NULL,
	"rank" integer NOT NULL,
	"toolCallId" varchar NOT NULL,
	"runId" uuid NOT NULL,
	"toolName" varchar NOT NULL,
	"link" text NOT NULL,
	"title" text NOT NULL,
	"siteName" text,
	"hostname" text,
	"favicon" text,
	"snippet" text,
	"thumbnail" text,
	"age" text,
	"content" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "chat_source_chatId_toolCallId_rank_pk" PRIMARY KEY("chatId","toolCallId","rank")
);
--> statement-breakpoint
ALTER TABLE "chat_source" ADD CONSTRAINT "chat_source_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_source_chat_rank_idx" ON "chat_source" USING btree ("chatId","rank");