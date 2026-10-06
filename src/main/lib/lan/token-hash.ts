import { createHash } from 'crypto'

/** A device token as stored: 256 random bits need no more than a plain SHA-256. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
