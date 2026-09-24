/** A memory entry's durable classification — set once at creation. */
export type MemorySection = 'profile' | 'topic' | 'person'

/** A memory entry's field values at a point in time, independent of its id —
 *  what `MemoryChange.before` / `.after` and undo compare and restore. */
export interface MemorySnapshot {
  section: MemorySection
  key: string
  summary: string
  details: string[]
  isActive: boolean
}

/** One create/update/delete the instruction engine applied. `before` is
 *  `null` for a create, `after` is `null` for a delete — the shape undo
 *  reverses. */
export interface MemoryChange {
  op: 'create' | 'update' | 'delete'
  id: string
  before: MemorySnapshot | null
  after: MemorySnapshot | null
}

/** `runMemoryInstruction`'s result: `applied` is `changes.length`. */
export interface MemoryInstructionResult {
  applied: number
  changes: MemoryChange[]
}
