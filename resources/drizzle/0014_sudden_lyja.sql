ALTER TABLE "embeddings" RENAME TO "Embedding";--> statement-breakpoint
ALTER TABLE "resources" RENAME TO "Resource";--> statement-breakpoint
ALTER TABLE "Embedding" DROP CONSTRAINT "embeddings_resource_id_resources_id_fk";
--> statement-breakpoint
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_resource_id_Resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."Resource"("id") ON DELETE cascade ON UPDATE no action;