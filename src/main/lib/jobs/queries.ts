import { sql } from 'drizzle-orm'

import { db } from '../db/db'
import type { JobMessage, QueueName } from './types'

export async function enqueueJob(
  queueName: QueueName,
  payload: unknown
): Promise<void> {
  await db.execute(
    sql`SELECT * FROM pgmq.send(${queueName}, ${JSON.stringify(payload)}::jsonb)`
  )
}

interface PgmqReadRow {
  msg_id: number
  read_ct: number
  message: unknown
}

export async function readBatch(
  queueName: QueueName,
  vt: number,
  qty: number
): Promise<JobMessage[]> {
  const result = await db.execute(
    sql`SELECT msg_id, read_ct, message FROM pgmq.read(${queueName}, ${vt}, ${qty})`
  )
  const rows = (result as unknown as { rows: PgmqReadRow[] }).rows ?? []
  return rows.map((row) => ({
    msgId: Number(row.msg_id),
    readCt: Number(row.read_ct),
    message: row.message
  }))
}

export async function archiveMessage(
  queueName: QueueName,
  msgId: number
): Promise<void> {
  await db.execute(sql`SELECT pgmq.archive(${queueName}, ${msgId})`)
}
