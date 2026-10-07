// @vitest-environment happy-dom
// What the header's panel lists, derived from the chat's messages: the
// user's pictures and what the tools made (newest first), every tool called
// with its count, and the sources found, grouped by the run's question.
import type { ChatMessage } from '@exodus/shared/types/chat'
import { describe, expect, it } from 'vitest'

import {
  chatFiles,
  chatPanelItems,
  chatSources,
  chatTools,
  hasPanelItems,
  PANEL_FILES_CAP,
  questionsByRun
} from '@/lib/chat-panel-items'

const user = (id: string, text: string, images = 0): ChatMessage =>
  ({
    id,
    runId: id,
    role: 'user',
    content: [
      { type: 'text', text },
      ...Array.from({ length: images }, (_, i) => ({
        type: 'image',
        data: `data:image/png;base64,${id}${i}`,
        mimeType: 'image/png'
      }))
    ],
    timestamp: 1
  }) as unknown as ChatMessage

const result = (
  runId: string,
  toolName: string,
  details: unknown,
  over: Record<string, unknown> = {}
): ChatMessage =>
  ({
    id: `${runId}-${toolName}-${Math.random()}`,
    runId,
    role: 'toolResult',
    toolCallId: `${runId}-${toolName}`,
    toolName,
    content: [{ type: 'text', text: 'ok' }],
    details,
    isError: false,
    timestamp: 2,
    ...over
  }) as unknown as ChatMessage

const source = (rank: number, link: string) => ({
  rank,
  link,
  title: link,
  content: '',
  snippet: ''
})

const messages: ChatMessage[] = [
  user('r1', 'Make me a page', 2),
  result('r1', 'create_artifact', {
    type: 'artifact',
    title: 'Landing page',
    code: '<h1/>',
    artifactId: 'a1'
  }),
  result('r1', 'write_file', { path: '/ws/c/notes.md' }),
  user('r2', 'Search it'),
  result('r2', 'web_search', [
    source(1, 'https://a.example/'),
    source(2, 'https://b.example/')
  ]),
  result('r2', 'web_search', [source(3, 'https://c.example/')]),
  result('r2', 'write_file', { path: '/ws/c/notes.md' }),
  result('r2', 'edit_file', { path: '/ws/c/other.txt' }),
  user('r3', 'Draw it'),
  result('r3', 'image_generation', {
    images: [{ mediaId: 'm1.png', chatId: 'c', mimeType: 'image/png' }]
  }),
  result('r3', 'terminal', { stdout: '' }),
  result('r3', 'web_search', [source(1, 'https://d.example/')])
]

describe('chatFiles', () => {
  it('lists the pictures sent and what the tools made, newest first, one row per written path', () => {
    expect(chatFiles(messages)).toEqual([
      {
        kind: 'generated-image',
        runId: 'r3',
        src: expect.stringContaining('/api/v1/media/c/m1.png'),
        index: 1
      },
      {
        kind: 'workspace-file',
        runId: 'r2',
        path: '/ws/c/other.txt',
        name: 'other.txt'
      },
      {
        kind: 'workspace-file',
        runId: 'r2',
        path: '/ws/c/notes.md',
        name: 'notes.md'
      },
      {
        kind: 'artifact',
        runId: 'r1',
        toolCallId: 'r1-create_artifact',
        title: 'Landing page'
      },
      {
        kind: 'user-image',
        runId: 'r1',
        src: 'data:image/png;base64,r11',
        index: 2
      },
      {
        kind: 'user-image',
        runId: 'r1',
        src: 'data:image/png;base64,r10',
        index: 1
      }
    ])
  })

  it('ignores what is malformed or failed', () => {
    const odd: ChatMessage[] = [
      user('r1', 'q'),
      result('r1', 'write_file', { nope: true }),
      result('r1', 'write_file', 'a string'),
      result('r1', 'create_artifact', { type: 'artifact' }),
      result('r1', 'image_generation', { images: 'none' }),
      result('r1', 'image_generation', { images: [{ mediaId: 'x.png' }] }),
      result('r1', 'write_file', { path: '/ws/c/f.txt' }, { isError: true }),
      {
        id: 'u2',
        runId: 'u2',
        role: 'user',
        content: 'plain',
        timestamp: 1
      } as ChatMessage
    ]
    expect(chatFiles(odd)).toEqual([])
  })

  it('keeps the newest 200 rows', () => {
    const many = Array.from({ length: 210 }, (_, i) =>
      result(`r${i}`, 'write_file', { path: `/ws/c/${i}.txt` })
    )
    const files = chatFiles(many)
    expect(files).toHaveLength(PANEL_FILES_CAP)
    expect(files[0]).toMatchObject({ runId: 'r209' })
  })
})

describe('chatTools', () => {
  it('counts every tool called, most used first, with the run of its latest call', () => {
    expect(chatTools(messages)).toEqual([
      { name: 'web_search', count: 3, lastRunId: 'r3' },
      { name: 'write_file', count: 2, lastRunId: 'r2' },
      { name: 'create_artifact', count: 1, lastRunId: 'r1' },
      { name: 'edit_file', count: 1, lastRunId: 'r2' },
      { name: 'image_generation', count: 1, lastRunId: 'r3' },
      { name: 'terminal', count: 1, lastRunId: 'r3' }
    ])
  })
})

describe('chatSources', () => {
  it("groups the results by run under the run's question, newest run first", () => {
    const groups = chatSources(messages)
    expect(
      groups.map((g) => [g.runId, g.question, g.results.map((r) => r.link)])
    ).toEqual([
      ['r3', 'Draw it', ['https://d.example/']],
      [
        'r2',
        'Search it',
        ['https://a.example/', 'https://b.example/', 'https://c.example/']
      ]
    ])
  })

  it('leaves out a search that failed or answered with something else', () => {
    expect(
      chatSources([
        user('r1', 'q'),
        result('r1', 'web_search', { error: 'x' }),
        result('r1', 'web_search', [source(1, 'https://a.example/')], {
          isError: true
        })
      ])
    ).toEqual([])
  })
})

describe('questionsByRun and the whole', () => {
  it('names each run by its question, one line, 120 characters at most', () => {
    const long = user('r9', `a ${'b'.repeat(200)}\n\nc`)
    const questions = questionsByRun([...messages, long])
    expect(questions.get('r1')).toBe('Make me a page')
    expect(questions.get('r9')).toHaveLength(120)
    expect(questions.get('r9')).not.toContain('\n')
  })

  it('says whether there is anything to show', () => {
    expect(hasPanelItems(chatPanelItems(messages))).toBe(true)
    expect(hasPanelItems(chatPanelItems([user('r1', 'hi')]))).toBe(false)
    expect(hasPanelItems(chatPanelItems([]))).toBe(false)
  })
})
