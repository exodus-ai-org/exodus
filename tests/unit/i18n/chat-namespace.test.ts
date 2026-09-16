import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const chat = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'src',
      'shared',
      'i18n',
      'locales',
      'en',
      'chat.json'
    ),
    'utf8'
  )
)

describe('chat namespace (en)', () => {
  it('keeps the pre-existing imageGeneration keys untouched', () => {
    expect(chat.imageGeneration.status.queued).toBe('Waiting to generate')
    expect(chat.imageGeneration.retry).toBe('Try again')
  })

  it('has the composer keys', () => {
    expect(chat.composer.placeholder).toBe('Ask anything')
    expect(chat.composer.pleaseWaitTitle).toBe('Please wait')
    expect(chat.composer.pleaseWaitDescription).toBe(
      'The model is still generating a response.'
    )
    expect(chat.composer.stop).toBe('Stop')
    expect(chat.composer.send).toBe('Send')
  })

  it('has the composerTools + MCP dialog keys, with a Trans-compatible description', () => {
    expect(chat.composerTools.attachFiles).toBe('Attach files')
    expect(chat.composerTools.mcpTools).toBe('MCP tools')
    expect(chat.composerTools.mcpDialog.title).toBe('Available MCP Tools')
    expect(chat.composerTools.mcpDialog.description).toBe(
      'Tools provided by active MCP servers. Manage servers in <1>Settings > MCP Servers</1>.'
    )
    expect(chat.composerTools.mcpDialog.noDescription).toBe(
      'No description for {{name}}.'
    )
  })

  it('has the advancedTools label', () => {
    expect(chat.advancedTools.deepResearch).toBe('Deep research')
  })

  it('has the messageList keys', () => {
    expect(chat.messageList.greetingTitle).toBe('Hello there!')
    expect(chat.messageList.greetingSubtitle).toBe(
      'How can I assist you today?'
    )
    expect(chat.messageList.attachmentAlt).toBe('attachment')
    expect(chat.messageList.scrollToBottom).toBe('Scroll to bottom')
  })

  it('has the toolPreview keys, including CLDR plural pairs', () => {
    expect(chat.toolPreview.mapItineraryDayCount_one).toBe('{{count}} day')
    expect(chat.toolPreview.mapItineraryDayCount_other).toBe('{{count}} days')
    expect(chat.toolPreview.mapItineraryStopCount_one).toBe('{{count}} stop')
    expect(chat.toolPreview.mapItineraryStopCount_other).toBe('{{count}} stops')
    expect(chat.toolPreview.mapItinerarySummary).toBe('{{days}}, {{stops}}')
    expect(chat.toolPreview.toolFailed).toBe('{{tool}} failed')
    expect(chat.toolPreview.webSearchResultCount_one).toBe('{{count}} result')
    expect(chat.toolPreview.webSearchResultCount_other).toBe(
      '{{count}} results'
    )
  })

  it('has the toolFailedToast title', () => {
    expect(chat.toolFailedToast.title).toBe('Tool failed: {{tool}}')
  })

  it('has the messageAction keys', () => {
    expect(chat.messageAction.copy).toBe('Copy')
    expect(chat.messageAction.regenerate).toBe('Regenerate')
    expect(chat.messageAction.sources).toBe('Sources')
  })

  it('has the thinkingTimeline keys, including CLDR plural pairs', () => {
    expect(chat.thinkingTimeline.thinking).toBe('Thinking…')
    expect(chat.thinkingTimeline.working).toBe('Working…')
    expect(chat.thinkingTimeline.thought).toBe('Thought')
    expect(chat.thinkingTimeline.worked).toBe('Worked')
    expect(chat.thinkingTimeline.done).toBe('Done')
    expect(chat.thinkingTimeline.thoughtFor).toBe('{{verb}} for {{duration}}')
    expect(chat.thinkingTimeline.durationSeconds_one).toBe('{{count}} second')
    expect(chat.thinkingTimeline.durationSeconds_other).toBe(
      '{{count}} seconds'
    )
    expect(chat.thinkingTimeline.durationMinutes).toBe('{{minutes}}m')
    expect(chat.thinkingTimeline.durationMinutesSeconds).toBe(
      '{{minutes}}m {{seconds}}s'
    )
    expect(chat.thinkingTimeline.searchResultCount_one).toBe(
      '{{count}} search result'
    )
    expect(chat.thinkingTimeline.searchResultCount_other).toBe(
      '{{count}} search results'
    )
  })

  it('has the toc fallback label', () => {
    expect(chat.toc.fallbackLabel).toBe('Message')
  })

  it('has the toast keys', () => {
    expect(chat.toast.chatUpdated).toBe('Chat updated')
    expect(chat.toast.chatDeleted).toBe('Chat deleted')
  })

  it('has the lcm keys, including a CLDR plural pair', () => {
    expect(chat.lcm.compacting).toBe('Compacting conversation history…')
    expect(chat.lcm.compactedSummary_one).toBe(
      'Compacted {{count}} message · saved ~{{tokens}} tokens'
    )
    expect(chat.lcm.compactedSummary_other).toBe(
      'Compacted {{count}} messages · saved ~{{tokens}} tokens'
    )
    expect(chat.lcm.compactionFailed).toBe(
      'Compaction failed (will retry next turn)'
    )
  })

  it('has the upload keys', () => {
    expect(chat.upload.failedTitle).toBe('Upload failed')
    expect(chat.upload.failedDescription).toBe('Failed to upload files.')
  })
})

describe('chat namespace CLDR plurals resolve via the real i18next instance', () => {
  it('picks the singular/plural form correctly for count=1 vs count>1', async () => {
    const { i18n, i18nReady } = await import('@/lib/i18n')
    await i18nReady
    expect(i18n.t('chat:toolPreview.mapItineraryDayCount', { count: 1 })).toBe(
      '1 day'
    )
    expect(i18n.t('chat:toolPreview.mapItineraryDayCount', { count: 3 })).toBe(
      '3 days'
    )
    expect(
      i18n.t('chat:thinkingTimeline.searchResultCount', { count: 1 })
    ).toBe('1 search result')
    expect(
      i18n.t('chat:thinkingTimeline.searchResultCount', { count: 5 })
    ).toBe('5 search results')
    expect(
      i18n.t('chat:lcm.compactedSummary', { count: 1, tokens: '2.3k' })
    ).toBe('Compacted 1 message · saved ~2.3k tokens')
    expect(
      i18n.t('chat:lcm.compactedSummary', { count: 4, tokens: '2.3k' })
    ).toBe('Compacted 4 messages · saved ~2.3k tokens')
  })
})
