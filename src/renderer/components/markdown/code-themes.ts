import type { CSSProperties } from 'react'

/**
 * Xcode's Default (Light) and Default (Dark) themes, copied from Xcode.app's
 * own `FontAndColorThemes/*.xccolortheme` (2026-10-06), as highlight.js style
 * objects for the Markdown code block. highlight.js cannot tell a project
 * symbol from a system one, so: a declared class or function takes Xcode's
 * declaration colours, a built-in type the system colour, a plain title or
 * variable the project colour. Neither theme sets a background or a base
 * colour — the block's panel (`.markdown pre`) owns the one background, and
 * plain text is the chat's.
 */
type CodeTheme = Record<string, CSSProperties>

const base: CodeTheme = {
  hljs: {
    display: 'block',
    overflowX: 'auto',
    background: 'transparent',
    color: 'inherit'
  },
  'hljs-emphasis': { fontStyle: 'italic' },
  'hljs-strong': { fontWeight: 600 },
  'hljs-section': { fontWeight: 600 },
  'hljs-formula': { fontStyle: 'italic' },
  'hljs-subst': { color: 'inherit' }
}

function theme(c: {
  keyword: string
  string: string
  number: string
  comment: string
  docKeyword: string
  declarationType: string
  declarationOther: string
  typeSystem: string
  classProject: string
  functionProject: string
  variableProject: string
  preprocessor: string
  attribute: string
  url: string
  markupCode: string
  addition: string
  deletion: string
}): CodeTheme {
  return {
    ...base,
    'hljs-keyword': { color: c.keyword },
    'hljs-literal': { color: c.keyword },
    'hljs-tag': { color: c.keyword },
    'hljs-name': { color: c.keyword },
    'hljs-selector-tag': { color: c.keyword },
    'hljs-bullet': { color: c.keyword },
    'hljs-string': { color: c.string },
    'hljs-regexp': { color: c.string },
    'hljs-char': { color: c.string },
    'hljs-code': { color: c.markupCode },
    'hljs-number': { color: c.number },
    'hljs-symbol': { color: c.number },
    'hljs-comment': { color: c.comment },
    'hljs-quote': { color: c.comment },
    'hljs-doctag': { color: c.docKeyword, fontWeight: 600 },
    class_: { color: c.declarationType },
    function_: { color: c.declarationOther },
    'hljs-type': { color: c.typeSystem },
    'hljs-built_in': { color: c.typeSystem },
    'hljs-title': { color: c.functionProject },
    'hljs-selector-class': { color: c.classProject },
    'hljs-selector-id': { color: c.classProject },
    'hljs-variable': { color: c.variableProject },
    'hljs-template-variable': { color: c.variableProject },
    'hljs-property': { color: c.variableProject },
    'hljs-params': { color: c.variableProject },
    'hljs-meta': { color: c.preprocessor },
    'hljs-attr': { color: c.attribute },
    'hljs-attribute': { color: c.attribute },
    'hljs-link': { color: c.url, textDecoration: 'underline' },
    'hljs-addition': { background: c.addition },
    'hljs-deletion': { background: c.deletion }
  }
}

/** Xcode › Default (Light). */
export const xcodeLight = theme({
  keyword: '#9B2393',
  string: '#C41A16',
  number: '#1C00CF',
  comment: '#5D6C79',
  docKeyword: '#4A5560',
  declarationType: '#0B4F79',
  declarationOther: '#0F68A0',
  typeSystem: '#3900A0',
  classProject: '#1C464A',
  functionProject: '#326D74',
  variableProject: '#326D74',
  preprocessor: '#643820',
  attribute: '#815F03',
  url: '#0E0EFF',
  markupCode: '#AA0D91',
  addition: 'rgb(50 109 116 / 0.14)',
  deletion: 'rgb(196 26 22 / 0.12)'
})

/** Xcode › Default (Dark). */
export const xcodeDark = theme({
  keyword: '#FC5FA3',
  string: '#FC6A5D',
  number: '#D0BF69',
  comment: '#6C7986',
  docKeyword: '#92A1B1',
  declarationType: '#5DD8FF',
  declarationOther: '#41A1C0',
  typeSystem: '#D0A8FF',
  classProject: '#9EF1DD',
  functionProject: '#67B7A4',
  variableProject: '#67B7A4',
  preprocessor: '#FD8F3F',
  attribute: '#BF8555',
  url: '#5482FF',
  markupCode: '#AA0D91',
  addition: 'rgb(103 183 164 / 0.18)',
  deletion: 'rgb(252 106 93 / 0.18)'
})
