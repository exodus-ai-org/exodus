/**
 * API integration tests: Project CRUD and chat-project linking.
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectOpenAiProvider } from '../helpers/settings-inject'
import {
  getError,
  getLastAssistantUpdate,
  extractAssistantText
} from '../helpers/wait-for-stream'

test.describe('Project API', () => {
  let cleanup: TestCleanup

  test.beforeAll(async () => {
    await injectOpenAiProvider(new ApiClient())
  })

  test.beforeEach(async ({ api }) => {
    cleanup = new TestCleanup(api)
  })

  test.afterEach(async () => {
    await cleanup.run()
  })

  test('CRUD lifecycle: create, read, update, delete', async ({ api }) => {
    const { status, data: project } = await api.createProject({
      name: 'E2E Test Project',
      description: 'Created by automated tests'
    })
    expect(status).toBe(200)
    const projectId = project.id as string
    cleanup.trackProject(projectId)

    const { data: projects } = await api.getProjects()
    const found = projects.find((p) => p.id === projectId)
    expect(found).toBeTruthy()
    expect(found!.name).toBe('E2E Test Project')

    await api.put(`/api/project/${projectId}`, {
      name: 'Updated Project',
      description: 'Updated by tests'
    })

    const { data: updatedList } = await api.getProjects()
    const updated = updatedList.find((p) => p.id === projectId)
    expect(updated!.name).toBe('Updated Project')

    const { status: delStatus } = await api.deleteProject(projectId)
    expect(delStatus).toBe(200)

    const { data: afterDelete } = await api.getProjects()
    expect(afterDelete.find((p) => p.id === projectId)).toBeFalsy()
  })

  test('project instructions are injected into chat context', async ({
    api
  }) => {
    const { data: project } = await api.createProject({
      name: 'Instructions Test',
      instructions:
        'Always respond in exactly three words, no matter what the user asks.'
    })
    const projectId = project.id as string
    cleanup.trackProject(projectId)

    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'What is the meaning of life?',
      projectId
    })

    const error = getError(events)
    expect(error).toBeNull()

    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant)
    // With the 3-word instruction, response should be short
    const wordCount = text.trim().split(/\s+/).length
    expect(wordCount).toBeLessThanOrEqual(10)
  })

  test('structured instructions influence response style', async ({ api }) => {
    const { data: project } = await api.createProject({
      name: 'Structured Instructions Test',
      structuredInstructions: {
        role: 'a pirate captain',
        tone: 'humorous and playful',
        responseFormat: 'always start your response with "Arrr!"'
      }
    })
    const projectId = project.id as string
    cleanup.trackProject(projectId)

    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'Greet me.',
      projectId
    })

    const error = getError(events)
    expect(error).toBeNull()

    // The LLM should adopt a pirate-like persona
    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant).toLowerCase()
    // Check for pirate-ish language (arrr, ahoy, matey, etc.)
    const hasPirateVibes =
      text.includes('arrr') ||
      text.includes('ahoy') ||
      text.includes('matey') ||
      text.includes('pirate') ||
      text.includes('captain')
    expect(hasPirateVibes).toBe(true)
  })
})
