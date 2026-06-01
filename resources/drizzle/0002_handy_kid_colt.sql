ALTER TABLE "task" DROP CONSTRAINT "task_assignedAgentId_agent_id_fk";
--> statement-breakpoint
ALTER TABLE "task_execution" DROP CONSTRAINT "task_execution_agentId_agent_id_fk";
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignedAgentId_agent_id_fk" FOREIGN KEY ("assignedAgentId") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_execution" ADD CONSTRAINT "task_execution_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;