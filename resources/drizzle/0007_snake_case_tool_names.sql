-- Built-in tool names moved to snake_case (spec 2026-09-22-chat-kernel-design).
-- The rename table is packages/shared/src/constants/tool-names.ts; `grep`,
-- `weather` and `terminal` are unchanged. MCP tool names are left alone.
-- 1. The toolName column on toolResult rows.
UPDATE "message" SET "toolName" =
  CASE "toolName"
    WHEN 'computerUse' THEN 'computer_use'
    WHEN 'deepResearch' THEN 'deep_research'
    WHEN 'createArtifact' THEN 'create_artifact'
    WHEN 'imageGeneration' THEN 'image_generation'
    WHEN 'findFiles' THEN 'find_files'
    WHEN 'editFile' THEN 'edit_file'
    WHEN 'lcmGrep' THEN 'lcm_grep'
    WHEN 'lcmDescribe' THEN 'lcm_describe'
    WHEN 'searchKnowledgeBase' THEN 'search_knowledge_base'
    WHEN 'mapItinerary' THEN 'map_itinerary'
    WHEN 'webSearch' THEN 'web_search'
    WHEN 'lcmExpand' THEN 'lcm_expand'
    WHEN 'listDirectory' THEN 'list_directory'
    WHEN 'readFile' THEN 'read_file'
    WHEN 'webFetch' THEN 'web_fetch'
    WHEN 'writeFile' THEN 'write_file'
    ELSE "toolName" END
WHERE "toolName" IN ('computerUse','deepResearch','createArtifact','imageGeneration','findFiles','editFile','lcmGrep','lcmDescribe','searchKnowledgeBase','mapItinerary','webSearch','lcmExpand','listDirectory','readFile','webFetch','writeFile');
--> statement-breakpoint
-- 2. `name` inside toolCall blocks of assistant content (a jsonb array).
UPDATE "message" m SET "content" = (
  SELECT jsonb_agg(
    CASE WHEN block->>'type' = 'toolCall' THEN
      jsonb_set(block, '{name}', to_jsonb(
        CASE block->>'name'
          WHEN 'computerUse' THEN 'computer_use'
          WHEN 'deepResearch' THEN 'deep_research'
          WHEN 'createArtifact' THEN 'create_artifact'
          WHEN 'imageGeneration' THEN 'image_generation'
          WHEN 'findFiles' THEN 'find_files'
          WHEN 'editFile' THEN 'edit_file'
          WHEN 'lcmGrep' THEN 'lcm_grep'
          WHEN 'lcmDescribe' THEN 'lcm_describe'
          WHEN 'searchKnowledgeBase' THEN 'search_knowledge_base'
          WHEN 'mapItinerary' THEN 'map_itinerary'
          WHEN 'webSearch' THEN 'web_search'
          WHEN 'lcmExpand' THEN 'lcm_expand'
          WHEN 'listDirectory' THEN 'list_directory'
          WHEN 'readFile' THEN 'read_file'
          WHEN 'webFetch' THEN 'web_fetch'
          WHEN 'writeFile' THEN 'write_file'
          ELSE block->>'name' END
      ))
    ELSE block END
    ORDER BY t.ord)
  FROM jsonb_array_elements(m."content") WITH ORDINALITY AS t(block, ord)
)
WHERE m."role" = 'assistant'
  AND jsonb_typeof(m."content") = 'array'
  AND m."content" @> '[{"type":"toolCall"}]';
--> statement-breakpoint
-- 3. Disabled-tool keys in settings.
UPDATE "settings" SET "tools" = jsonb_set("tools", '{disabledTools}', (
  SELECT COALESCE(jsonb_agg(to_jsonb(
    CASE k
      WHEN 'computerUse' THEN 'computer_use'
      WHEN 'deepResearch' THEN 'deep_research'
      WHEN 'createArtifact' THEN 'create_artifact'
      WHEN 'imageGeneration' THEN 'image_generation'
      WHEN 'findFiles' THEN 'find_files'
      WHEN 'editFile' THEN 'edit_file'
      WHEN 'lcmGrep' THEN 'lcm_grep'
      WHEN 'lcmDescribe' THEN 'lcm_describe'
      WHEN 'searchKnowledgeBase' THEN 'search_knowledge_base'
      WHEN 'mapItinerary' THEN 'map_itinerary'
      WHEN 'webSearch' THEN 'web_search'
      WHEN 'lcmExpand' THEN 'lcm_expand'
      WHEN 'listDirectory' THEN 'list_directory'
      WHEN 'readFile' THEN 'read_file'
      WHEN 'webFetch' THEN 'web_fetch'
      WHEN 'writeFile' THEN 'write_file'
      ELSE k END
  ) ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements_text("tools"->'disabledTools') WITH ORDINALITY AS d(k, ord)
))
WHERE "tools" IS NOT NULL AND jsonb_typeof("tools"->'disabledTools') = 'array';
