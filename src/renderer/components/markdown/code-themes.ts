import type { CSSProperties } from 'react'

/**
 * Code colours after Xcode's Default themes — pink keywords, as the owner
 * asked for (2026-10-06) — as highlight.js style objects for the Markdown
 * code block. Neither sets a background or a base colour: the block's panel
 * (`.markdown pre`) owns the one background, and plain text is the chat's.
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
  'hljs-section': { fontWeight: 600 }
}

/** Xcode › Default (Light). */
export const xcodeLight: CodeTheme = {
  ...base,
  'hljs-comment': { color: '#5D6C79' },
  'hljs-quote': { color: '#5D6C79' },
  'hljs-doctag': { color: '#5D6C79', fontWeight: 600 },
  'hljs-keyword': { color: '#9B2393' },
  'hljs-literal': { color: '#9B2393' },
  'hljs-tag': { color: '#9B2393' },
  'hljs-name': { color: '#9B2393' },
  'hljs-selector-tag': { color: '#9B2393' },
  'hljs-string': { color: '#C41A16' },
  'hljs-regexp': { color: '#C41A16' },
  'hljs-char': { color: '#C41A16' },
  'hljs-number': { color: '#1C00CF' },
  'hljs-symbol': { color: '#1C00CF' },
  'hljs-type': { color: '#0B4F79' },
  class_: { color: '#0B4F79' },
  'hljs-built_in': { color: '#3900A0' },
  'hljs-title': { color: '#326D74' },
  function_: { color: '#326D74' },
  'hljs-selector-class': { color: '#326D74' },
  'hljs-selector-id': { color: '#326D74' },
  'hljs-meta': { color: '#643820' },
  'hljs-attr': { color: '#815F03' },
  'hljs-attribute': { color: '#815F03' },
  'hljs-variable': { color: '#0F68A0' },
  'hljs-template-variable': { color: '#0F68A0' },
  'hljs-property': { color: '#0F68A0' },
  'hljs-params': { color: '#0F68A0' },
  'hljs-link': { color: '#0E0EFF', textDecoration: 'underline' },
  'hljs-bullet': { color: '#9B2393' },
  'hljs-addition': { color: '#326D74', background: 'rgb(50 109 116 / 0.12)' },
  'hljs-deletion': { color: '#C41A16', background: 'rgb(196 26 22 / 0.12)' }
}

/** Xcode › Default (Dark). */
export const xcodeDark: CodeTheme = {
  ...base,
  'hljs-comment': { color: '#6C7986' },
  'hljs-quote': { color: '#6C7986' },
  'hljs-doctag': { color: '#6C7986', fontWeight: 600 },
  'hljs-keyword': { color: '#FC5FA3' },
  'hljs-literal': { color: '#FC5FA3' },
  'hljs-tag': { color: '#FC5FA3' },
  'hljs-name': { color: '#FC5FA3' },
  'hljs-selector-tag': { color: '#FC5FA3' },
  'hljs-string': { color: '#FC6A5D' },
  'hljs-regexp': { color: '#FC6A5D' },
  'hljs-char': { color: '#FC6A5D' },
  'hljs-number': { color: '#D0BF69' },
  'hljs-symbol': { color: '#D0BF69' },
  'hljs-type': { color: '#5DD8FF' },
  class_: { color: '#5DD8FF' },
  'hljs-built_in': { color: '#A167E6' },
  'hljs-title': { color: '#67B7A4' },
  function_: { color: '#67B7A4' },
  'hljs-selector-class': { color: '#67B7A4' },
  'hljs-selector-id': { color: '#67B7A4' },
  'hljs-meta': { color: '#FD8F3F' },
  'hljs-attr': { color: '#BF8555' },
  'hljs-attribute': { color: '#BF8555' },
  'hljs-variable': { color: '#41A1C0' },
  'hljs-template-variable': { color: '#41A1C0' },
  'hljs-property': { color: '#41A1C0' },
  'hljs-params': { color: '#41A1C0' },
  'hljs-link': { color: '#5482FF', textDecoration: 'underline' },
  'hljs-bullet': { color: '#FC5FA3' },
  'hljs-addition': { color: '#67B7A4', background: 'rgb(103 183 164 / 0.15)' },
  'hljs-deletion': { color: '#FC6A5D', background: 'rgb(252 106 93 / 0.15)' }
}
