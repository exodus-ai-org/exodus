import { asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from './db'
import {
  agent,
  agentMemory,
  department,
  mcpServer,
  task,
  taskExecution,
  taskExecutionEvent,
  type Task
} from './schema'

// ─── Department CRUD ────────────────────────────────────────────────────────

export async function getAllDepartments() {
  return db.select().from(department).orderBy(asc(department.createdAt))
}

export async function getDepartmentById(id: string) {
  const [result] = await db
    .select()
    .from(department)
    .where(eq(department.id, id))
  return result
}

export async function createDepartment(data: typeof department.$inferInsert) {
  const [result] = await db.insert(department).values(data).returning()
  return result
}

export async function updateDepartment(
  id: string,
  data: Partial<typeof department.$inferInsert>
) {
  const [result] = await db
    .update(department)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(department.id, id))
    .returning()
  return result
}

export async function deleteDepartment(id: string) {
  return db.delete(department).where(eq(department.id, id))
}

// ─── Agent CRUD ─────────────────────────────────────────────────────────────

export async function getAllAgents() {
  return db.select().from(agent).orderBy(asc(agent.createdAt))
}

export async function getAgentsByDepartmentId(departmentId: string) {
  return db
    .select()
    .from(agent)
    .where(eq(agent.departmentId, departmentId))
    .orderBy(asc(agent.createdAt))
}

export async function getAgentById(id: string) {
  const [result] = await db.select().from(agent).where(eq(agent.id, id))
  return result
}

export async function createAgent(data: typeof agent.$inferInsert) {
  const [result] = await db.insert(agent).values(data).returning()
  return result
}

export async function updateAgent(
  id: string,
  data: Partial<typeof agent.$inferInsert>
) {
  const [result] = await db
    .update(agent)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(agent.id, id))
    .returning()
  return result
}

export async function deleteAgent(id: string) {
  return db.delete(agent).where(eq(agent.id, id))
}

// ─── Agent Memory ───────────────────────────────────────────────────────────

export async function getAgentMemories(agentId: string) {
  return db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.agentId, agentId))
    .orderBy(desc(agentMemory.createdAt))
}

export async function createAgentMemory(data: typeof agentMemory.$inferInsert) {
  const [result] = await db.insert(agentMemory).values(data).returning()
  return result
}

// ─── Task CRUD ──────────────────────────────────────────────────────────────

export async function getAllTasks() {
  return db.select().from(task).orderBy(desc(task.createdAt))
}

export async function getTaskById(id: string) {
  const [result] = await db.select().from(task).where(eq(task.id, id))
  return result
}

export async function getTasksByStatus(statuses: string[]) {
  return db
    .select()
    .from(task)
    .where(inArray(task.status, statuses as Task['status'][]))
    .orderBy(desc(task.createdAt))
}

export async function createTask(data: typeof task.$inferInsert) {
  const [result] = await db.insert(task).values(data).returning()
  return result
}

export async function updateTask(
  id: string,
  data: Partial<typeof task.$inferInsert>
) {
  const [result] = await db
    .update(task)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(task.id, id))
    .returning()
  return result
}

// ─── Task Execution ─────────────────────────────────────────────────────────

export async function createTaskExecution(
  data: typeof taskExecution.$inferInsert
) {
  const [result] = await db.insert(taskExecution).values(data).returning()
  return result
}

export async function updateTaskExecution(
  id: string,
  data: Partial<typeof taskExecution.$inferInsert>
) {
  const [result] = await db
    .update(taskExecution)
    .set(data)
    .where(eq(taskExecution.id, id))
    .returning()
  return result
}

export async function getExecutionsByTaskId(taskId: string) {
  return db
    .select()
    .from(taskExecution)
    .where(eq(taskExecution.taskId, taskId))
    .orderBy(desc(taskExecution.startedAt))
}

// ─── Task Execution Events ──────────────────────────────────────────────────

export async function createTaskExecutionEvent(
  data: typeof taskExecutionEvent.$inferInsert
) {
  const [result] = await db.insert(taskExecutionEvent).values(data).returning()
  return result
}

export async function getEventsByExecutionId(executionId: string) {
  return db
    .select()
    .from(taskExecutionEvent)
    .where(eq(taskExecutionEvent.executionId, executionId))
    .orderBy(asc(taskExecutionEvent.createdAt))
}

// ─── Batch Position Updates ─────────────────────────────────────────────────

export async function batchUpdatePositions(
  updates: Array<{
    type: 'department' | 'agent'
    id: string
    position: { x: number; y: number }
  }>
) {
  await Promise.all(
    updates.map((u) => {
      const table = u.type === 'department' ? department : agent
      return db
        .update(table)
        .set({ position: u.position, updatedAt: new Date() })
        .where(eq(table.id, u.id))
    })
  )
}

// ─── MCP Server Registry ────────────────────────────────────────────────────

export async function getAllMcpServers() {
  return db.select().from(mcpServer).orderBy(asc(mcpServer.createdAt))
}

export async function getMcpServerById(id: string) {
  const [result] = await db.select().from(mcpServer).where(eq(mcpServer.id, id))
  return result
}

export async function getMcpServersByNames(names: string[]) {
  return db.select().from(mcpServer).where(inArray(mcpServer.name, names))
}

export async function createMcpServer(data: typeof mcpServer.$inferInsert) {
  const [result] = await db.insert(mcpServer).values(data).returning()
  return result
}

export async function updateMcpServer(
  id: string,
  data: Partial<typeof mcpServer.$inferInsert>
) {
  const [result] = await db
    .update(mcpServer)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(mcpServer.id, id))
    .returning()
  return result
}

export async function deleteMcpServer(id: string) {
  return db.delete(mcpServer).where(eq(mcpServer.id, id))
}
