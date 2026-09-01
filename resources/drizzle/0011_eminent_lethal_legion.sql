DROP INDEX "message_search_index";--> statement-breakpoint
CREATE INDEX "message_search_index" ON "message" USING gin ("searchText" gin_trgm_ops);