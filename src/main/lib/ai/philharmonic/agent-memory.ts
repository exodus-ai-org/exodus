import { createAgentMemory } from '../../db/philharmonic-queries'

/**
 * Persist a compact "what I did" memory after an employee finishes a task.
 *
 * The memory row is scoped to the Group (`conversationId`) the work happened
 * in — see P1-4 spec. The employee LLM's next call inside this Group will
 * see it; other Groups won't.
 */
export async function rememberTaskOutcome(
  agentId: string,
  conversationId: string,
  instructions: string,
  output: string
): Promise<void> {
  await createAgentMemory({
    agentId,
    conversationId,
    key: `task:${instructions.slice(0, 60)}`,
    value: {
      instructions: instructions.slice(0, 200),
      outcome: output.slice(0, 500)
    },
    source: 'task',
    confidence: 0.7
  })
}
