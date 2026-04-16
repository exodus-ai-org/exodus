ALTER TABLE "settings" ADD COLUMN "autoBackup" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "lastBackupAt" timestamp;