export type QueueName =
  | 'index-message'
  | 'lcm-post-turn'
  | 'memory-write-judge'
  | 'session-summary'

export const QUEUE_NAMES: QueueName[] = [
  'index-message',
  'lcm-post-turn',
  'memory-write-judge',
  'session-summary'
]

export interface JobMessage {
  msgId: number
  readCt: number
  message: unknown
}
