-- Phase 1: Rename snake_case columns to camelCase across all tables

-- setting table
ALTER TABLE "setting" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "setting" RENAME COLUMN "updated_at" TO "updatedAt";

-- memory table
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "updated_at" TO "updatedAt";
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "last_used_at" TO "lastUsedAt";
ALTER TABLE IF EXISTS "memory" RENAME COLUMN "is_active" TO "isActive";

-- session_summary table
ALTER TABLE IF EXISTS "session_summary" RENAME COLUMN "session_id" TO "sessionId";
ALTER TABLE IF EXISTS "session_summary" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE IF EXISTS "session_summary" RENAME COLUMN "updated_at" TO "updatedAt";

-- memory_usage_log table
ALTER TABLE IF EXISTS "memory_usage_log" RENAME COLUMN "memory_id" TO "memoryId";
ALTER TABLE IF EXISTS "memory_usage_log" RENAME COLUMN "session_id" TO "sessionId";
ALTER TABLE IF EXISTS "memory_usage_log" RENAME COLUMN "created_at" TO "createdAt";

-- lcm_summary table
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "chat_id" TO "chatId";
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "token_count" TO "tokenCount";
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "descendant_count" TO "descendantCount";
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "earliest_at" TO "earliestAt";
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "latest_at" TO "latestAt";
ALTER TABLE IF EXISTS "lcm_summary" RENAME COLUMN "created_at" TO "createdAt";

-- lcm_summary_messages table
ALTER TABLE IF EXISTS "lcm_summary_messages" RENAME COLUMN "summary_id" TO "summaryId";
ALTER TABLE IF EXISTS "lcm_summary_messages" RENAME COLUMN "message_id" TO "messageId";

-- lcm_summary_parents table
ALTER TABLE IF EXISTS "lcm_summary_parents" RENAME COLUMN "child_id" TO "childId";
ALTER TABLE IF EXISTS "lcm_summary_parents" RENAME COLUMN "parent_id" TO "parentId";

-- lcm_context_items table
ALTER TABLE IF EXISTS "lcm_context_items" RENAME COLUMN "chat_id" TO "chatId";
ALTER TABLE IF EXISTS "lcm_context_items" RENAME COLUMN "token_count" TO "tokenCount";
ALTER TABLE IF EXISTS "lcm_context_items" RENAME COLUMN "ref_id" TO "refId";
