DROP INDEX "message_search_index";--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "searchText" text;--> statement-breakpoint
UPDATE "message"
SET "searchText" = CASE
  WHEN jsonb_typeof("content") = 'array' THEN (
    SELECT NULLIF(string_agg(elem->>'text', E'\n'), '')
    FROM jsonb_array_elements("content") AS elem
    WHERE elem->>'type' = 'text' AND COALESCE(elem->>'text', '') <> ''
  )
  WHEN jsonb_typeof("content") = 'string' THEN NULLIF("content"#>>'{}', '')
  ELSE NULL
END
WHERE "role" IN ('user', 'assistant');--> statement-breakpoint
CREATE INDEX "message_search_index" ON "message" USING gin (to_tsvector('simple', "searchText"));