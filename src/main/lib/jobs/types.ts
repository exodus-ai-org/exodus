export type QueueName =
  | 'index-message'
  | 'lcm-post-turn'
  | 'memory-consolidate'
  | 'kb-sync'
  | 'discover-refresh'

export const QUEUE_NAMES: QueueName[] = [
  'index-message',
  'lcm-post-turn',
  'memory-consolidate',
  'kb-sync',
  'discover-refresh'
]

export interface JobMessage {
  msgId: number
  readCt: number
  message: unknown
}

export type KbSyncPayload =
  | { op: 'upsert'; docId: string }
  | { op: 'delete'; lightragDocId: string }
