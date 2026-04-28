/**
 * HTTP client fixture for API integration tests.
 * Talks directly to the Hono server at localhost:60223.
 *
 * The Hono server returns data directly (no { code, data } wrapper).
 * DELETE endpoints return plain text, not JSON.
 */
import { test as base } from '@playwright/test'

const BASE_URL = 'http://localhost:60223'

// Bypass system proxy for localhost requests
process.env.no_proxy = (process.env.no_proxy || '') + ',localhost,127.0.0.1'

export class ApiClient {
  constructor(private baseUrl = BASE_URL) {}

  // ── Generic helpers ────────────────────────────────────────────────────

  async get<T = unknown>(path: string): Promise<{ status: number; data: T }> {
    const res = await fetch(`${this.baseUrl}${path}`)
    const data = (await res.json()) as T
    return { status: res.status, data }
  }

  async post<T = unknown>(
    path: string,
    body: unknown
  ): Promise<{ status: number; data: T }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const text = await res.text()
    let data: T
    try {
      data = JSON.parse(text) as T
    } catch {
      data = text as unknown as T
    }
    return { status: res.status, data }
  }

  async put<T = unknown>(
    path: string,
    body: unknown
  ): Promise<{ status: number; data: T }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const text = await res.text()
    let data: T
    try {
      data = JSON.parse(text) as T
    } catch {
      data = text as unknown as T
    }
    return { status: res.status, data }
  }

  async delete(path: string): Promise<{ status: number; data: string }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE'
    })
    const text = await res.text()
    return { status: res.status, data: text }
  }

  // ── Settings ───────────────────────────────────────────────────────────

  async getSettings() {
    return this.get<Record<string, unknown>>('/api/settings')
  }

  async updateSettings(payload: Record<string, unknown>) {
    return this.post<Record<string, unknown>>('/api/settings', {
      id: 'global',
      ...payload
    })
  }

  // ── Chat (SSE) ─────────────────────────────────────────────────────────

  /**
   * Send a chat message and consume the full SSE stream.
   * Returns collected events parsed from `data: {...}` lines.
   */
  async sendChatMessage(opts: {
    chatId: string
    text: string
    advancedTools?: string[]
    projectId?: string
    signal?: AbortSignal
  }) {
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: opts.text
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: opts.chatId,
        messages: [userMessage],
        advancedTools: opts.advancedTools ?? [],
        projectId: opts.projectId
      }),
      signal: opts.signal
    })

    return this.consumeSseStream(res)
  }

  /**
   * Send a raw chat request with pre-built messages array.
   * Useful for multi-turn tests where you need full control.
   */
  async sendChatRaw(opts: {
    chatId: string
    messages: Array<{ id: string; role: string; content: unknown }>
    advancedTools?: string[]
    projectId?: string
  }) {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: opts.chatId,
        messages: opts.messages,
        advancedTools: opts.advancedTools ?? [],
        projectId: opts.projectId
      })
    })
    return this.consumeSseStream(res)
  }

  /**
   * Parse an SSE response into an array of typed events.
   */
  async consumeSseStream(res: Response) {
    const events: Array<{
      type: string
      message?: Record<string, unknown>
      messages?: Array<Record<string, unknown>>
      title?: string
      error?: string
    }> = []

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()! // keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            events.push(JSON.parse(line.slice(6)))
          } catch {
            // skip malformed lines
          }
        }
      }
    }

    return events
  }

  // ── History ────────────────────────────────────────────────────────────

  async getHistory(projectId?: string) {
    const qs = projectId ? `?projectId=${projectId}` : ''
    return this.get<Array<Record<string, unknown>>>(`/api/history${qs}`)
  }

  async getChatMessages(chatId: string) {
    return this.get<Array<Record<string, unknown>>>(`/api/chat/${chatId}`)
  }

  async deleteChat(chatId: string) {
    return this.delete(`/api/chat/${chatId}`)
  }

  // ── Memory ─────────────────────────────────────────────────────────────

  async getMemories(type?: string) {
    const qs = type ? `?type=${type}` : ''
    return this.get<Array<Record<string, unknown>>>(`/api/memory${qs}`)
  }

  async createMemory(payload: Record<string, unknown>) {
    return this.post<Record<string, unknown>>('/api/memory', payload)
  }

  async deleteMemory(id: string, hard = true) {
    return this.delete(`/api/memory/${id}?hard=${hard}`)
  }

  // ── Project ────────────────────────────────────────────────────────────

  async getProjects() {
    return this.get<Array<Record<string, unknown>>>('/api/project')
  }

  async createProject(payload: Record<string, unknown>) {
    return this.post<Record<string, unknown>>('/api/project', payload)
  }

  async deleteProject(id: string) {
    return this.delete(`/api/project/${id}`)
  }

  // ── Deep Research ──────────────────────────────────────────────────────

  async startDeepResearch(deepResearchId: string, query: string) {
    return this.post<Record<string, unknown>>('/api/deep-research', {
      deepResearchId,
      query
    })
  }

  async getDeepResearchResult(id: string) {
    return this.get<Record<string, unknown>>(`/api/deep-research/result/${id}`)
  }

  // ── Search ─────────────────────────────────────────────────────────────

  async searchMessages(query: string) {
    return this.get<Array<Record<string, unknown>>>(
      `/api/chat/search?query=${encodeURIComponent(query)}`
    )
  }
}

export type ApiClientFixture = { api: ApiClient }

export const apiTest = base.extend<ApiClientFixture>({
  // eslint-disable-next-line no-empty-pattern
  api: async ({}, use) => {
    await use(new ApiClient())
  }
})

/** Fetch that bypasses proxy — use for direct calls outside ApiClient */
export function rawFetch(url: string, init?: RequestInit) {
  return fetch(url, init)
}

export { expect } from '@playwright/test'
