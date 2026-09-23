import { transformSync } from 'esbuild'
import { describe, expect, it } from 'vitest'

const { createArtifact } =
  await import('@main/lib/ai/calling-tools/create-artifact')

const tool = createArtifact('chat-1')
const contract = (
  tool.parameters.properties as { code: { description: string } }
).code.description

/**
 * The `code` parameter's description is the design contract every artifact
 * is generated against. These anchors are the parts that keep an artifact
 * in the app's language (2026-09-23, from the design-engineering rules in
 * CLAUDE.md → Motion): losing one is a regression in what the model ships.
 */
describe('create_artifact design contract', () => {
  it('keeps the theme-token rule first', () => {
    expect(contract.indexOf('THEME ADAPTATION')).toBeLessThan(
      contract.indexOf('AVAILABLE IMPORTS')
    )
  })

  it('names the tone accent and the easing tokens the sandbox provides', () => {
    expect(contract).toContain("`primary` is the user's chosen colour tone")
    expect(contract).toContain('var(--ease-out)')
    expect(contract).toContain('[0.23, 1, 0.32, 1]')
    expect(contract).toContain('[0.77, 0, 0.175, 1]')
  })

  it('carries the motion rules with their numbers', () => {
    for (const anchor of [
      'default to none',
      'repeat: Infinity',
      'Never ease-in',
      'Nothing in an artifact takes longer than 300ms',
      'Only `opacity` and `transform`',
      'opacity: 0, y: 6',
      'never `scale: 0`',
      'grid-template-rows',
      'at most 40ms per item and at most six items',
      'whileTap={{ scale: 0.97 }}',
      'Never `transition-all`',
      'useReducedMotion()'
    ]) {
      expect(contract, anchor).toContain(anchor)
    }
  })

  it('carries the typography, surface and data rules', () => {
    for (const anchor of [
      'tabular-nums',
      'At most three sizes',
      'no emoji anywhere',
      'divide-y',
      'rounded-lg',
      'shadow-xs',
      '8px rhythm',
      'Never pure black or white',
      'type="monotone"',
      'dot={false}',
      'Legible before decorated'
    ]) {
      expect(contract, anchor).toContain(anchor)
    }
  })

  it('bans the tells', () => {
    for (const anchor of [
      'Emoji as icons',
      'particles, confetti',
      'bounce / elastic easing',
      '`rounded-3xl`',
      'glassmorphism / backdrop blur, drop shadows',
      'hero-metric template'
    ]) {
      expect(contract, anchor).toContain(anchor)
    }
  })

  it('ships an example that parses as JSX and obeys its own rules', () => {
    const example = contract.slice(
      contract.indexOf('const React = require'),
      contract.indexOf('module.exports = { default: Performance }') +
        'module.exports = { default: Performance }'.length
    )
    expect(() => transformSync(example, { loader: 'jsx' })).not.toThrow()
    expect(example).toContain('useReducedMotion')
    expect(example).toContain('whileTap={{ scale: 0.97 }}')
    expect(example).toContain('stroke="var(--primary)"')
    expect(example).not.toMatch(/repeat:\s*Infinity/u)
    expect(example).not.toMatch(/#[0-9a-f]{3,6}\b/iu)
    expect(example).not.toMatch(/duration:\s*0\.[4-9]/u)
  })
})
