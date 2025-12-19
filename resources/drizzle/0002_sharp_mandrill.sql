ALTER TABLE "Setting" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Setting" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Setting" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "Setting" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;