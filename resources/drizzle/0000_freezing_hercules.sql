CREATE TYPE "public"."agent_memory_source" AS ENUM('conversation', 'task', 'system');--> statement-breakpoint
CREATE TYPE "public"."conversation_message_role" AS ENUM('user', 'pm', 'employee', 'system');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."jobStatus" AS ENUM('streaming', 'archived', 'failed', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."memory_section" AS ENUM('profile', 'topic', 'person');--> statement-breakpoint
CREATE TYPE "public"."memory_source" AS ENUM('explicit', 'implicit', 'system');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('drafting', 'active', 'completed', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'running', 'done', 'skipped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled', 'waiting_for_user');--> statement-breakpoint
CREATE TABLE "agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"teamId" uuid,
	"avatarSeed" text,
	"avatarStyle" text,
	"systemPrompt" text DEFAULT '',
	"toolAllowList" jsonb DEFAULT '[]'::jsonb,
	"skillSlugs" jsonb DEFAULT '[]'::jsonb,
	"mcpServerNames" jsonb DEFAULT '[]'::jsonb,
	"model" text,
	"provider" text,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agentId" uuid NOT NULL,
	"conversationId" uuid NOT NULL,
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
	"favorite" boolean DEFAULT false,
	"projectId" uuid,
	"useProjectInstructions" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"icon" text,
	"memberAgentIds" jsonb DEFAULT '[]'::jsonb,
	"archived" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversationId" uuid NOT NULL,
	"role" "conversation_message_role" NOT NULL,
	"agentId" uuid,
	"content" text DEFAULT '' NOT NULL,
	"parts" jsonb,
	"taskId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversationId" uuid NOT NULL,
	"summary" text NOT NULL,
	"status" "plan_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"archivedAt" timestamp
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
CREATE TABLE "knowledge_doc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"teamId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lcm_context_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"kind" text NOT NULL,
	"refId" text NOT NULL,
	"tokenCount" integer
);
--> statement-breakpoint
CREATE TABLE "lcm_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"chatId" uuid NOT NULL,
	"kind" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"tokenCount" integer NOT NULL,
	"descendantCount" integer DEFAULT 0 NOT NULL,
	"earliestAt" timestamp NOT NULL,
	"latestAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lcm_summary_messages" (
	"summaryId" text NOT NULL,
	"messageId" uuid NOT NULL,
	CONSTRAINT "lcm_summary_messages_summaryId_messageId_pk" PRIMARY KEY("summaryId","messageId")
);
--> statement-breakpoint
CREATE TABLE "lcm_summary_parents" (
	"childId" text NOT NULL,
	"parentId" text NOT NULL,
	CONSTRAINT "lcm_summary_parents_childId_parentId_pk" PRIMARY KEY("childId","parentId")
);
--> statement-breakpoint
CREATE TABLE "mcp_server" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"transportType" varchar DEFAULT 'stdio' NOT NULL,
	"command" text DEFAULT '',
	"args" jsonb DEFAULT '[]'::jsonb,
	"env" jsonb,
	"url" text,
	"headers" jsonb,
	"extraConfig" jsonb,
	"isActive" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"section" "memory_section" DEFAULT 'topic' NOT NULL,
	"key" text NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.8,
	"source" "memory_source" NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	"lastUsedAt" timestamp,
	"isActive" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "memory_usage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memoryId" uuid,
	"sessionId" uuid,
	"reason" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"content" jsonb NOT NULL,
	"searchText" text,
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
	"durationMs" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "plan_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planId" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"title" text NOT NULL,
	"intent" text,
	"assignedAgentId" uuid,
	"status" "step_status" DEFAULT 'pending' NOT NULL,
	"output" text,
	"note" text,
	"taskId" uuid,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"providerConfig" jsonb,
	"providers" jsonb,
	"mcpServers" text DEFAULT '',
	"tools" jsonb,
	"voice" jsonb,
	"assistantAvatar" text DEFAULT '',
	"googleCloud" jsonb,
	"webSearch" jsonb,
	"search" jsonb,
	"image" jsonb,
	"deepResearch" jsonb,
	"s3" jsonb,
	"autoUpdate" boolean DEFAULT true,
	"runOnStartup" boolean DEFAULT false,
	"menuBar" boolean DEFAULT true,
	"autoBackup" boolean DEFAULT true,
	"lastBackupAt" timestamp,
	"memory" jsonb,
	"personality" jsonb,
	"keyboardShortcuts" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parentTaskId" uuid,
	"conversationId" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '',
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"assignedAgentId" uuid,
	"input" jsonb,
	"output" jsonb,
	"maxRetries" real DEFAULT 1,
	"retryCount" real DEFAULT 0,
	"cronExpression" text,
	"runAt" timestamp,
	"lastRunAt" timestamp,
	"lastRunStatus" varchar,
	"feedbackRating" varchar,
	"feedbackNote" text,
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
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"systemPrompt" text DEFAULT '',
	"icon" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"chatId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"isUpvoted" boolean NOT NULL,
	CONSTRAINT "vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);
--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_plan" ADD CONSTRAINT "conversation_plan_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deep_research_message" ADD CONSTRAINT "deep_research_message_deepResearchId_deep_research_id_fk" FOREIGN KEY ("deepResearchId") REFERENCES "public"."deep_research"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_doc" ADD CONSTRAINT "knowledge_doc_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_context_items" ADD CONSTRAINT "lcm_context_items_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary" ADD CONSTRAINT "lcm_summary_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary_messages" ADD CONSTRAINT "lcm_summary_messages_summaryId_lcm_summary_id_fk" FOREIGN KEY ("summaryId") REFERENCES "public"."lcm_summary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary_messages" ADD CONSTRAINT "lcm_summary_messages_messageId_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary_parents" ADD CONSTRAINT "lcm_summary_parents_childId_lcm_summary_id_fk" FOREIGN KEY ("childId") REFERENCES "public"."lcm_summary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lcm_summary_parents" ADD CONSTRAINT "lcm_summary_parents_parentId_lcm_summary_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."lcm_summary"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "philharmonic_session_summary" ADD CONSTRAINT "philharmonic_session_summary_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "philharmonic_session_summary" ADD CONSTRAINT "philharmonic_session_summary_coversThroughMessageId_conversation_message_id_fk" FOREIGN KEY ("coversThroughMessageId") REFERENCES "public"."conversation_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_step" ADD CONSTRAINT "plan_step_planId_conversation_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."conversation_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_step" ADD CONSTRAINT "plan_step_assignedAgentId_agent_id_fk" FOREIGN KEY ("assignedAgentId") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_step" ADD CONSTRAINT "plan_step_taskId_task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignedAgentId_agent_id_fk" FOREIGN KEY ("assignedAgentId") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_execution" ADD CONSTRAINT "task_execution_taskId_task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_execution" ADD CONSTRAINT "task_execution_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_execution_event" ADD CONSTRAINT "task_execution_event_executionId_task_execution_id_fk" FOREIGN KEY ("executionId") REFERENCES "public"."task_execution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_messageId_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_project_idx" ON "chat" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "conversation_last_message_idx" ON "conversation" USING btree ("lastMessageAt");--> statement-breakpoint
CREATE INDEX "conversation_message_conv_idx" ON "conversation_message" USING btree ("conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "lcm_context_chat_idx" ON "lcm_context_items" USING btree ("chatId","ordinal");--> statement-breakpoint
CREATE INDEX "message_search_index" ON "message" USING gin ("searchText" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ph_session_summary_conv_idx" ON "philharmonic_session_summary" USING btree ("conversationId");