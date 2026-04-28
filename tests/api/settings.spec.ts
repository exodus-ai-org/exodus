/**
 * API integration tests for /api/settings
 */
import { apiTest as test, expect } from '../fixtures/api-client'

test.describe('Settings API', () => {
  test('GET /api/settings returns current settings', async ({ api }) => {
    const { status, data } = await api.getSettings()
    expect(status).toBe(200)
    expect(data).toHaveProperty('id', 'global')
  })

  test('POST /api/settings updates provider config', async ({ api }) => {
    const { status } = await api.updateSettings({
      providerConfig: {
        provider: 'openai',
        chatModel: 'gpt-4.1-mini',
        reasoningModel: 'o4-mini'
      }
    })
    expect(status).toBe(200)

    // Verify persistence
    const { data } = await api.getSettings()
    const config = data.providerConfig as Record<string, string>
    expect(config.provider).toBe('openai')
    expect(config.chatModel).toBe('gpt-4.1-mini')
  })

  test('POST /api/settings writes API keys', async ({ api }) => {
    const { status } = await api.updateSettings({
      providers: {
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.CLAUDE_API_KEY
      }
    })
    expect(status).toBe(200)

    const { data } = await api.getSettings()
    const providers = data.providers as Record<string, string>
    expect(providers.openaiApiKey).toBe(process.env.OPENAI_API_KEY)
    expect(providers.anthropicApiKey).toBe(process.env.CLAUDE_API_KEY)
  })

  test('POST /api/settings updates personality', async ({ api }) => {
    await api.updateSettings({
      personality: {
        nickname: 'Tester',
        baseStyle: 'professional',
        warm: 'more',
        enthusiastic: 'default',
        headersAndLists: 'default',
        emoji: 'less'
      }
    })

    const { data } = await api.getSettings()
    const personality = data.personality as Record<string, string>
    expect(personality.nickname).toBe('Tester')
    expect(personality.baseStyle).toBe('professional')
  })

  test('POST /api/settings updates deep research config', async ({ api }) => {
    await api.updateSettings({
      deepResearch: { breadth: 5, depth: 2 }
    })

    const { data } = await api.getSettings()
    const dr = data.deepResearch as Record<string, number>
    expect(dr.breadth).toBe(5)
    expect(dr.depth).toBe(2)
  })

  test('POST /api/settings updates memory layer config', async ({ api }) => {
    await api.updateSettings({
      memoryLayer: {
        autoWrite: false,
        lcmEnabled: true,
        contextWindowPercent: 80,
        freshTailSize: 32
      }
    })

    const { data } = await api.getSettings()
    const ml = data.memoryLayer as Record<string, unknown>
    expect(ml.autoWrite).toBe(false)
    expect(ml.contextWindowPercent).toBe(80)

    // Restore default
    await api.updateSettings({
      memoryLayer: { autoWrite: true, lcmEnabled: true }
    })
  })

  test('POST /api/settings updates web search config', async ({ api }) => {
    await api.updateSettings({
      webSearch: {
        braveApiKey: process.env.BRAVE_API_KEY,
        maxResults: 10,
        recencyFilter: 'week'
      }
    })

    const { data } = await api.getSettings()
    const ws = data.webSearch as Record<string, unknown>
    expect(ws.braveApiKey).toBe(process.env.BRAVE_API_KEY)
    expect(ws.maxResults).toBe(10)
  })

  test('POST /api/settings updates color tone', async ({ api }) => {
    await api.updateSettings({ colorTone: 'violet' })
    const { data } = await api.getSettings()
    expect(data.colorTone).toBe('violet')

    // Restore
    await api.updateSettings({ colorTone: 'neutral' })
  })
})
