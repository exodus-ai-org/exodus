/**
 * Test cleanup utilities.
 * Delete test-created chats and memories after each test.
 */
import { ApiClient } from '../fixtures/api-client'

export class TestCleanup {
  private chatIds: string[] = []
  private memoryIds: string[] = []

  constructor(private api: ApiClient) {}

  trackChat(id: string) {
    this.chatIds.push(id)
  }
  trackMemory(id: string) {
    this.memoryIds.push(id)
  }

  async run() {
    const settle = (ps: Promise<unknown>[]) => Promise.allSettled(ps)

    await settle(this.chatIds.map((id) => this.api.deleteChat(id)))
    await settle(this.memoryIds.map((id) => this.api.deleteMemory(id, true)))

    this.chatIds = []
    this.memoryIds = []
  }
}
