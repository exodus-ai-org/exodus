import { describe, expect, it } from 'vitest'

import { maskUrlSecrets } from '@/lib/mask-url'

describe('maskUrlSecrets', () => {
  it('leaves a URL without a query string alone', () => {
    expect(maskUrlSecrets('https://mcp.example.com/mcp')).toBe(
      'https://mcp.example.com/mcp'
    )
  })

  it('masks every query value and keeps the parameter names', () => {
    expect(
      maskUrlSecrets('https://mcp.example.com/mcp?apikey=SECRET123&region=us')
    ).toBe('https://mcp.example.com/mcp?apikey=••••&region=••••')
  })

  it('keeps the fragment and masks an empty value too', () => {
    expect(maskUrlSecrets('https://x.dev/a?token=#top')).toBe(
      'https://x.dev/a?token=••••#top'
    )
  })

  it('never leaks the secret into the output', () => {
    expect(maskUrlSecrets('http://h/p?k=abc&k2=def')).not.toMatch(/abc|def/u)
  })
})
