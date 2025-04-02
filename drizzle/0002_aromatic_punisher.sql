ALTER TABLE "Setting" ADD COLUMN "speechToTextModel" varchar DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "Setting" ADD COLUMN "textToSpeechModel" varchar DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "Setting" ADD COLUMN "textToSpeechVoice" varchar DEFAULT '' NOT NULL;