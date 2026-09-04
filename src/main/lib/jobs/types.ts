export type QueueName =
  | 'index-message'
  | 'lcm-post-turn'
  | 'memory-consolidate'
  | 'kb-sync'

export const QUEUE_NAMES: QueueName[] = [
  'index-message',
  'lcm-post-turn',
  'memory-consolidate',
  'kb-sync'
]

export interface JobMessage {
  msgId: number
  readCt: number
  message: unknown
}

export type KbSyncPayload =
  | { op: 'upsert'; docId: string }
  | { op: 'delete'; lightragDocId: string }
