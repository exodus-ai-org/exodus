DROP INDEX "chat_search_index";--> statement-breakpoint
DROP INDEX "message_search_index";--> statement-breakpoint
CREATE INDEX "message_search_index" ON "Message" USING gin (to_tsvector('simple', "parts"));