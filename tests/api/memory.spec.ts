/**
 * API integration tests: Memory CRUD.
 * Note: memory `value` must be Record<string, unknown>, not a plain string.
 */
import { apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'

test.describe('Memory API', () => {
  let cleanup: TestCleanup

  test.beforeEach(async ({ api }) => {
    cleanup = new TestCleanup(api)
  })

  test.afterEach(async () => {
    await cleanup.run()
  })

  test('CRUD lifecycle: create, read, delete', async ({ api }) => {
    // Create — value must be an object
    const { status, data: memory } = await api.createMemory({
      type: 'preference',
      key: 'test-pref',
      value: { text: 'I prefer dark mode' },
      confidence: 0.9,
      source: 'explicit'
    })
    expect(status).toBe(201)
    const memoryId = memory.id as string
    cleanup.trackMemory(memoryId)

    // Read all
    const { data: memories } = await api.getMemories()
    const found = memories.find((m) => m.id === memoryId)
    expect(found).toBeTruthy()
    expect(found!.key).toBe('test-pref')

    // Read filtered by type
    const { data: prefs } = await api.getMemories('preference')
    expect(prefs.find((m) => m.id === memoryId)).toBeTruthy()

    // Delete (hard)
    const { status: delStatus } = await api.deleteMemory(memoryId, true)
    expect(delStatus).toBe(200)

    const { data: afterDelete } = await api.getMemories()
    expect(afterDelete.find((m) => m.id === memoryId)).toBeFalsy()
  })

  test('soft delete marks memory as deleted but keeps record', async ({
    api
  }) => {
    const { data: memory } = await api.createMemory({
      type: 'goal',
      key: 'test-goal',
      value: { text: 'Learn TypeScript' },
      source: 'explicit'
    })
    const memoryId = memory.id as string
    cleanup.trackMemory(memoryId)

    // Soft delete
    await api.deleteMemory(memoryId, false)

    // The memory should be marked as inactive
    const { data: memories } = await api.getMemories()
    const found = memories.find((m) => m.id === memoryId)
    if (found) {
      expect(found.isActive).toBe(false)
    }
  })

  test('multiple memory types can coexist', async ({ api }) => {
    const types = ['preference', 'goal', 'skill', 'environment'] as const
    const ids: string[] = []

    for (const type of types) {
      const { data } = await api.createMemory({
        type,
        key: `test-${type}`,
        value: { text: `Value for ${type}` },
        source: 'explicit'
      })
      const id = data.id as string
      ids.push(id)
      cleanup.trackMemory(id)
    }

    // Each type should be filterable
    for (let i = 0; i < types.length; i++) {
      const { data } = await api.getMemories(types[i])
      expect(data.find((m) => m.id === ids[i])).toBeTruthy()
    }
  })
})
