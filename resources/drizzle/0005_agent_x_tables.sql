CREATE TABLE IF NOT EXISTS "McpServer" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT '',
  "command" text NOT NULL,
  "args" jsonb DEFAULT '[]'::jsonb,
  "env" jsonb,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TYPE "agent_memory_source" AS ENUM('conversation', 'task', 'system');--> statement-breakpoint
CREATE TYPE "task_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled', 'waiting_for_user');--> statement-breakpoint
CREATE TYPE "task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "execution_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "Department" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT '',
  "icon" text DEFAULT 'building-2',
  "skillSlugs" jsonb DEFAULT '[]'::jsonb,
  "mcpServerNames" jsonb DEFAULT '[]'::jsonb,
  "position" jsonb,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "Agent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "departmentId" uuid NOT NULL REFERENCES "Department"("id") ON DELETE CASCADE,
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
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "AgentMemory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agentId" uuid NOT NULL REFERENCES "Agent"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "source" "agent_memory_source" NOT NULL DEFAULT 'task',
  "confidence" real DEFAULT 0.8,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "Task" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parentTaskId" uuid,
  "title" text NOT NULL,
  "description" text DEFAULT '',
  "status" "task_status" NOT NULL DEFAULT 'pending',
  "priority" "task_priority" NOT NULL DEFAULT 'medium',
  "assignedDepartmentId" uuid REFERENCES "Department"("id"),
  "assignedAgentId" uuid REFERENCES "Agent"("id"),
  "input" jsonb,
  "output" jsonb,
  "maxRetries" real DEFAULT 1,
  "retryCount" real DEFAULT 0,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "completedAt" timestamp
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "TaskExecution" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "taskId" uuid NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "agentId" uuid NOT NULL REFERENCES "Agent"("id"),
  "status" "execution_status" NOT NULL DEFAULT 'running',
  "startedAt" timestamp DEFAULT now() NOT NULL,
  "completedAt" timestamp,
  "error" text,
  "tokenUsage" jsonb
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "TaskExecutionEvent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "executionId" uuid NOT NULL REFERENCES "TaskExecution"("id") ON DELETE CASCADE,
  "eventType" text NOT NULL,
  "payload" jsonb,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
