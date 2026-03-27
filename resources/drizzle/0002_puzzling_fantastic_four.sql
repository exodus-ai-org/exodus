ALTER TABLE "agent" DROP CONSTRAINT "agent_departmentId_department_id_fk";
--> statement-breakpoint
ALTER TABLE "agent" ALTER COLUMN "departmentId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_departmentId_department_id_fk" FOREIGN KEY ("departmentId") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;