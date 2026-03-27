CREATE TYPE "public"."agent_memory_source" AS ENUM('conversation', 'task', 'system');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."jobStatus" AS ENUM('streaming', 'archived', 'failed', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."memory_source" AS ENUM('explicit', 'implicit', 'system');--> statement-breakpoint
CREATE TYPE "public"."memory_type" AS ENUM('preference', 'goal', 'environment', 'skill', 'project', 'constraint');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled', 'waiting_for_user');--> statement-breakpoint
CREATE TABLE "agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"departmentId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"systemPrompt" text DEFAULT '',
	"toolAllowList" jsonb DEFAULT '[]'::jsonb,
	"skillSlugs" jsonb DEFAULT '[]'::jsonb,
	"mcpServerNames" jsonb DEFAULT '[]'::jsonb,
	"model" text,
	"provider" text,
	"position" jsonb,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agentId" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"source" "agent_memory_source" DEFAULT 'task' NOT NULL,
	"confidence" real DEFAULT 0.8,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"favorite" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "deep_research" (
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
CREATE TABLE "deep_research_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deepResearchId" uuid NOT NULL,
	"message" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"icon" text DEFAULT 'building-2',
	"skillSlugs" jsonb DEFAULT '[]'::jsonb,
	"mcpServerNames" jsonb DEFAULT '[]'::jsonb,
	"position" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embedding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resourceId" uuid,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lcm_context_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"token_count" integer
);
--> statement-breakpoint
CREATE TABLE "lcm_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"token_count" integer NOT NULL,
	"descendant_count" integer DEFAULT 0 NOT NULL,
	"earliest_at" timestamp NOT NULL,
	"latest_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lcm_summary_messages" (
	"summary_id" text NOT NULL,
	"message_id" uuid NOT NULL,
	CONSTRAINT "lcm_summary_messages_summary_id_message_id_pk" PRIMARY KEY("summary_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "lcm_summary_parents" (
	"child_id" text NOT NULL,
	"parent_id" text NOT NULL,
	CONSTRAINT "lcm_summary_parents_child_id_parent_id_pk" PRIMARY KEY("child_id","parent_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_server" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"command" text NOT NULL,
	"args" jsonb DEFAULT '[]'::jsonb,
	"env" jsonb,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "memory_type" NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"confidence" real DEFAULT 0.8,
	"source" "memory_source" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "memory_usage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid,
	"session_id" uuid,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"content" jsonb NOT NULL,
	"usage" jsonb,
	"api" varchar,
	"provider" varchar,
	"model" varchar,
	"stopReason" varchar,
	"errorMessage" varchar,
	"toolCallId" varchar,
	"toolName" varchar,
	"details" jsonb,
	"isError" boolean,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_summary" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"id" text PRIMARY KEY NOT NULL,
	"providerConfig" jsonb,
	"providers" jsonb,
	"mcpServers" text DEFAULT '',
	"tools" jsonb,
	"audio" jsonb,
	"assistantAvatar" text DEFAULT '',
	"googleCloud" jsonb,
	"webSearch" jsonb,
	"image" jsonb,
	"deepResearch" jsonb,
	"s3" jsonb,
	"autoUpdate" boolean DEFAULT true,
	"memoryLayer" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parentTaskId" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '',
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"assignedDepartmentId" uuid,
	"assignedAgentId" uuid,
	"input" jsonb,
	"output" jsonb,
	"maxRetries" real DEFAULT 1,
	"retryCount" real DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taskId" uuid NOT NULL,
	"agentId" uuid NOT NULL,
	"status" "execution_status" DEFAULT 'running' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"error" text,
	"tokenUsage" jsonb
);
--> statement-breakpoint
CREATE TABLE "task_execution_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"executionId" uuid NOT NULL,
	"eventType" text NOT NULL,
	"payload" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"chatId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"isUpvoted" boolean NOT NULL,
	CONSTRAINT "vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);
--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_departmentId_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deep_research_message" ADD CONSTRAINT "deep_research_message_deepResearchId_deep_research_id_fk" FOREIGN KEY ("deepResearchId") REFERENCES "public"."deep_research"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embedding" ADD CONSTRAINT "embedding_resourceId_resource_id_fk" FOREIGN KEY ("resourceId") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_context_items" ADD CONSTRAINT "lcm_context_items_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary" ADD CONSTRAINT "lcm_summary_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary_messages" ADD CONSTRAINT "lcm_summary_messages_summary_id_lcm_summary_id_fk" FOREIGN KEY ("summary_id") REFERENCES "public"."lcm_summary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary_messages" ADD CONSTRAINT "lcm_summary_messages_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary_parents" ADD CONSTRAINT "lcm_summary_parents_child_id_lcm_summary_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."lcm_summary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary_parents" ADD CONSTRAINT "lcm_summary_parents_parent_id_lcm_summary_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lcm_summary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignedDepartmentId_department_id_fk" FOREIGN KEY ("assignedDepartmentId") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignedAgentId_agent_id_fk" FOREIGN KEY ("assignedAgentId") REFERENCES "public"."agent"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_execution" ADD CONSTRAINT "task_execution_taskId_task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_execution" ADD CONSTRAINT "task_execution_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_execution_event" ADD CONSTRAINT "task_execution_event_executionId_task_execution_id_fk" FOREIGN KEY ("executionId") REFERENCES "public"."task_execution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_messageId_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "lcm_context_chat_idx" ON "lcm_context_items" USING btree ("chat_id","ordinal");--> statement-breakpoint
CREATE INDEX "message_search_index" ON "message" USING gin (to_tsvector('simple', "content"));