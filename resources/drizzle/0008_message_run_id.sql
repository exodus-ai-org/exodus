ALTER TABLE "message" ADD COLUMN "runId" uuid;--> statement-breakpoint
-- Backfill: a user row opens a run; every later row in the chat joins it
-- until the next user row. Ties on createdAt put the user row first. A row
-- with no user row before it (a chat imported mid-run) is a run of its own.
UPDATE "message" m SET "runId" = COALESCE((
  SELECT u."id" FROM "message" u
  WHERE u."chatId" = m."chatId" AND u."role" = 'user'
    AND (u."createdAt" < m."createdAt"
      OR (u."createdAt" = m."createdAt" AND (u."id" = m."id" OR m."role" <> 'user')))
  ORDER BY u."createdAt" DESC LIMIT 1
), m."id")
WHERE m."runId" IS NULL;--> statement-breakpoint
ALTER TABLE "message" ALTER COLUMN "runId" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "message_chat_run_idx" ON "message" USING btree ("chatId","runId");
