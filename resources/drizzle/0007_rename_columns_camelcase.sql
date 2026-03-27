ALTER TABLE "setting" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE "setting" RENAME COLUMN "updated_at" TO "updatedAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "updated_at" TO "updatedAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "last_used_at" TO "lastUsedAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "is_active" TO "isActive";--> statement-breakpoint
ALTER TABLE IF EXISTS "session_summary" RENAME COLUMN "session_id" TO "sessionId";--> statement-breakpoint
ALTER TABLE IF EXISTS "session_summary" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE IF EXISTS "session_summary" RENAME COLUMN "updated_at" TO "updatedAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "memory_usage_log" RENAME COLUMN "memory_id" TO "memoryId";--> statement-breakpoint
ALTER TABLE IF EXISTS "memory_usage_log" RENAME COLUMN "session_id" TO "sessionId";--> statement-breakpoint
ALTER TABLE IF EXISTS "memory_usage_log" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "chat_id" TO "chatId";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "token_count" TO "tokenCount";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "descendant_count" TO "descendantCount";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "earliest_at" TO "earliestAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "latest_at" TO "latestAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary_messages" RENAME COLUMN "summary_id" TO "summaryId";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary_messages" RENAME COLUMN "message_id" TO "messageId";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary_parents" RENAME COLUMN "child_id" TO "childId";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_summary_parents" RENAME COLUMN "parent_id" TO "parentId";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_context_items" RENAME COLUMN "chat_id" TO "chatId";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_context_items" RENAME COLUMN "token_count" TO "tokenCount";--> statement-breakpoint
ALTER TABLE IF EXISTS "lcm_context_items" RENAME COLUMN "ref_id" TO "refId";
