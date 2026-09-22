// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_MARKDOWN_ENGINE,
  MARKDOWN_ENGINE_STORAGE_KEY,
  getMarkdownEngine,
  setMarkdownEngine,
  useMarkdownEngine
} from '@/lib/markdown-engine'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

beforeEach(() => window.localStorage.clear())

describe('markdown engine preference', () => {
  it('defaults to the built-in engine and ignores junk in storage', () => {
    expect(getMarkdownEngine()).toBe(DEFAULT_MARKDOWN_ENGINE)
    window.localStorage.setItem(MARKDOWN_ENGINE_STORAGE_KEY, 'marked')
    expect(getMarkdownEngine()).toBe('exodus')
  })

  it('persists a choice and re-renders subscribers in the same window', async () => {
    const seen: string[] = []
    function Probe() {
      seen.push(useMarkdownEngine())
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
    expect(seen.at(-1)).toBe('exodus')

    await act(async () => setMarkdownEngine('streamdown'))
    expect(seen.at(-1)).toBe('streamdown')
    expect(window.localStorage.getItem(MARKDOWN_ENGINE_STORAGE_KEY)).toBe(
      'streamdown'
    )
  })
})
