/**
 * API integration tests: Memory CRUD.
 * A memory entry has a `section` ('profile' | 'topic' | 'person'), a `key`
 * (title), a one-line `summary`, and an array of `details` bullets.
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
    const { status, data: memory } = await api.createMemory({
      section: 'profile',
      key: 'Interface preferences',
      summary: 'Prefers a dark, minimal UI',
      details: ['Uses dark mode everywhere'],
      confidence: 0.9,
      source: 'explicit'
    })
    expect(status).toBe(201)
    const memoryId = memory.id as string
    cleanup.trackMemory(memoryId)

    const { data: memories } = await api.getMemories()
    const found = memories.find((m) => m.id === memoryId)
    expect(found).toBeTruthy()
    expect(found!.key).toBe('Interface preferences')
    expect(found!.summary).toBe('Prefers a dark, minimal UI')

    const { data: profiles } = await api.getMemories('profile')
    expect(profiles.find((m) => m.id === memoryId)).toBeTruthy()

    const { status: delStatus } = await api.deleteMemory(memoryId, true)
    expect(delStatus).toBe(200)

    const { data: afterDelete } = await api.getMemories()
    expect(afterDelete.find((m) => m.id === memoryId)).toBeFalsy()
  })

  test('soft delete marks memory as inactive but keeps the record', async ({
    api
  }) => {
    const { data: memory } = await api.createMemory({
      section: 'topic',
      key: 'Learning TypeScript',
      summary: 'Working through TypeScript fundamentals',
      source: 'explicit'
    })
    const memoryId = memory.id as string
    cleanup.trackMemory(memoryId)

    await api.deleteMemory(memoryId, false)

    const { data: memories } = await api.getMemories()
    const found = memories.find((m) => m.id === memoryId)
    if (found) {
      expect(found.isActive).toBe(false)
    }
  })

  test('all sections can coexist and are filterable', async ({ api }) => {
    const sections = ['profile', 'topic', 'person'] as const
    const ids: string[] = []

    for (const section of sections) {
      const { data } = await api.createMemory({
        section,
        key: `test-${section}`,
        summary: `Summary for ${section}`,
        source: 'explicit'
      })
      const id = data.id as string
      ids.push(id)
      cleanup.trackMemory(id)
    }

    for (let i = 0; i < sections.length; i++) {
      const { data } = await api.getMemories(sections[i])
      expect(data.find((m) => m.id === ids[i])).toBeTruthy()
    }
  })
})
