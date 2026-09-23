CREATE TABLE "paired_device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tokenHash" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp,
	CONSTRAINT "paired_device_tokenHash_unique" UNIQUE("tokenHash")
);
