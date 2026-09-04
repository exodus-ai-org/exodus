export type QueueName = 'index-message' | 'lcm-post-turn' | 'memory-consolidate'

export const QUEUE_NAMES: QueueName[] = [
  'index-message',
  'lcm-post-turn',
  'memory-consolidate'
]

export interface JobMessage {
  msgId: number
  readCt: number
  message: unknown
}
