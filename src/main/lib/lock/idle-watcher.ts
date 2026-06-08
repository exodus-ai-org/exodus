import { readConfig } from './lock-config'
import type { LockManager } from './lock-manager'

const TICK_MS = 15_000

export class IdleWatcher {
  private lastActivity: number
  private timer: NodeJS.Timeout | null = null

  constructor(
    private manager: LockManager,
    private now: () => number = Date.now
  ) {
    this.lastActivity = now()
  }

  recordActivity(): void {
    this.lastActivity = this.now()
  }

  tick(): void {
    if (this.manager.isLocked()) return
    const { idleTimeoutMs } = readConfig()
    if (idleTimeoutMs <= 0) return
    if (this.now() - this.lastActivity >= idleTimeoutMs) {
      this.manager.lock('idle')
    }
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}
