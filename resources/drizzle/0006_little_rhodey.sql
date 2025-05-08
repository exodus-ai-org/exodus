CREATE TABLE "DeepResearch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isDone" boolean NOT NULL,
	"finalReport" text NOT NULL,
	"startTime" timestamp DEFAULT now() NOT NULL,
	"endTime" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DeepResearchMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deepResearchId" uuid NOT NULL,
	"message" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DeepResearchMessage" ADD CONSTRAINT "DeepResearchMessage_deepResearchId_DeepResearch_id_fk" FOREIGN KEY ("deepResearchId") REFERENCES "public"."DeepResearch"("id") ON DELETE no action ON UPDATE no action;