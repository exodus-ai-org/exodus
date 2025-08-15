CREATE TYPE "public"."jobStatus" AS ENUM('streaming', 'archived', 'failed', 'terminated');--> statement-breakpoint
CREATE TABLE "Chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"favorite" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "DeepResearch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"toolCallId" text NOT NULL,
	"title" text,
	"jobStatus" "jobStatus" NOT NULL,
	"finalReport" text,
	"webSources" json,
	"startTime" timestamp DEFAULT now() NOT NULL,
	"endTime" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "DeepResearchMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deepResearchId" uuid NOT NULL,
	"message" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Embedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resourceId" uuid,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"providerConfig" jsonb,
	"providers" jsonb,
	"mcpServers" text DEFAULT '',
	"audio" jsonb,
	"fileUploadEndpoint" text DEFAULT '',
	"assistantAvatar" text DEFAULT '',
	"googleCloud" jsonb,
	"webSearch" jsonb,
	"image" jsonb,
	"deepResearch" jsonb
);
--> statement-breakpoint
CREATE TABLE "Vote" (
	"chatId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"isUpvoted" boolean NOT NULL,
	CONSTRAINT "Vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);
--> statement-breakpoint
ALTER TABLE "DeepResearchMessage" ADD CONSTRAINT "DeepResearchMessage_deepResearchId_DeepResearch_id_fk" FOREIGN KEY ("deepResearchId") REFERENCES "public"."DeepResearch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_resourceId_Resource_id_fk" FOREIGN KEY ("resourceId") REFERENCES "public"."Resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "Embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "message_search_index" ON "Message" USING gin (to_tsvector('simple', "parts"));