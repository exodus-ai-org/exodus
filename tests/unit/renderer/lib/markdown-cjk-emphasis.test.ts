import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import { describe, expect, it } from 'vitest'

// CommonMark's flanking rule: a `**` that follows a letter and comes before
// punctuation does not open, so `而是**"引号"**` showed its asterisks. In
// Chinese and Japanese, where no space separates words, a model writes bold
// around quoted or punctuated text all the time.
import {
  rehypePluginsStable,
  remarkPluginsStable
} from '@/lib/markdown-plugins'

const render = (text: string) =>
  renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        remarkPlugins: remarkPluginsStable,
        rehypePlugins: rehypePluginsStable
      },
      text
    )
  )

describe('bold beside CJK text and punctuation', () => {
  it('bolds a quotation that follows a CJK letter', () => {
    expect(render('而是**"卖与不卖都没有依据"**——赢家')).toBe(
      '<p>而是<strong>&quot;卖与不卖都没有依据&quot;</strong>——赢家</p>'
    )
    expect(render('而是**“卖与不卖都没有依据”**——赢家')).toBe(
      '<p>而是<strong>“卖与不卖都没有依据”</strong>——赢家</p>'
    )
  })

  it('bolds a quotation in CJK brackets', () => {
    expect(render('这是**「重点」**的说法')).toBe(
      '<p>这是<strong>「重点」</strong>的说法</p>'
    )
  })

  it('bolds text that ends in CJK punctuation, or is followed by it', () => {
    expect(render('**粗体**。后面')).toBe('<p><strong>粗体</strong>。后面</p>')
    expect(render('前面**粗体。**后面')).toBe(
      '<p>前面<strong>粗体。</strong>后面</p>'
    )
  })

  it('bolds inside a CJK sentence', () => {
    expect(render('中文**粗体**中文')).toBe(
      '<p>中文<strong>粗体</strong>中文</p>'
    )
    expect(render('中文*斜体*中文')).toBe('<p>中文<em>斜体</em>中文</p>')
  })

  it('bolds inside a link text', () => {
    expect(render('[而是**"引号"**的](https://example.com)')).toBe(
      '<p><a href="https://example.com">而是<strong>&quot;引号&quot;</strong>的</a></p>'
    )
  })

  it('keeps the stricter rule for underscores', () => {
    expect(render('中文_下划线_中文')).toBe('<p>中文_下划线_中文</p>')
    expect(render('snake_case_name and _it_')).toBe(
      '<p>snake_case_name and <em>it</em></p>'
    )
  })

  it('leaves English emphasis as it was', () => {
    expect(render('some **bold** and *italic* text')).toBe(
      '<p>some <strong>bold</strong> and <em>italic</em> text</p>'
    )
    expect(render('a**"quoted"**b')).toBe('<p>a**&quot;quoted&quot;**b</p>')
    expect(render('2 * 3 * 4')).toBe('<p>2 * 3 * 4</p>')
  })

  it('leaves asterisks in code as they are', () => {
    expect(render('用 `**"x"**` 表示')).toBe(
      '<p>用 <code>**&quot;x&quot;**</code> 表示</p>'
    )
    expect(render('```\n而是**"引号"**\n```')).toBe(
      '<pre><code>而是**&quot;引号&quot;**\n</code></pre>'
    )
  })
})
