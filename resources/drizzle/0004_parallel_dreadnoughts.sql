CREATE TYPE "public"."plan_status" AS ENUM('drafting', 'active', 'completed', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'running', 'done', 'skipped', 'failed');--> statement-breakpoint
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
ALTER TABLE "conversation_plan" ADD CONSTRAINT "conversation_plan_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_step" ADD CONSTRAINT "plan_step_planId_conversation_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."conversation_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_step" ADD CONSTRAINT "plan_step_assignedAgentId_agent_id_fk" FOREIGN KEY ("assignedAgentId") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_step" ADD CONSTRAINT "plan_step_taskId_task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;