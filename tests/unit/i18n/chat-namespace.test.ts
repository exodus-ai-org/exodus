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
      'Tools provided by active MCP servers. Manage servers in <strong>Settings > MCP Servers</strong>.'
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

describe('chat namespace composerTools.mcpDialog.description renders correctly via Trans', () => {
  it('keeps "Settings > MCP Servers" and its <strong> styling in the real rendered HTML', async () => {
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { I18nextProvider, Trans } = await import('react-i18next')
    const i18next = (await import('i18next')).default

    const instance = i18next.createInstance()
    await instance.init({
      lng: 'en',
      resources: { en: { chat } },
      ns: ['chat'],
      defaultNS: 'chat',
      interpolation: { escapeValue: false }
    })

    // Mirrors composer-tools.tsx's real JSX exactly, including {' '} as its
    // own child — that's the detail that shifts numbered-placeholder
    // resolution and is why a real render (not just a JSON string check)
    // is the only thing that actually catches this failure class.
    const transEl = createElement(
      Trans,
      { ns: 'chat', i18nKey: 'composerTools.mcpDialog.description' },
      'Tools provided by active MCP servers. Manage servers in',
      ' ',
      createElement('strong', null, 'Settings > MCP Servers'),
      '.'
    )
    const html = renderToStaticMarkup(
      createElement(I18nextProvider, { i18n: instance }, transEl)
    )

    expect(html).toContain('<strong>Settings &gt; MCP Servers</strong>')
    expect(html).toBe(
      'Tools provided by active MCP servers. Manage servers in <strong>Settings &gt; MCP Servers</strong>.'
    )
  })
})

describe('chat namespace (en) — tool-card additions', () => {
  it('has the artifactCard keys', () => {
    expect(chat.artifactCard.cannotOpenTitle).toBe('Cannot open artifact file')
    expect(chat.artifactCard.missingFileDescription).toBe(
      'The saved .tsx file is missing — it may have been moved or deleted.'
    )
    expect(chat.artifactCard.resolveFailedDescription).toBe(
      'Could not resolve the artifact path.'
    )
    expect(chat.artifactCard.revealAriaLabel).toBe(
      'Reveal {{title}} in file manager'
    )
    expect(chat.artifactCard.revealTitle).toBe('Reveal in file manager')
    expect(chat.artifactCard.exitFullscreen).toBe('Exit fullscreen')
    expect(chat.artifactCard.enterFullscreen).toBe('Enter fullscreen')
    expect(chat.artifactCard.exitFullscreenEsc).toBe('Exit fullscreen (Esc)')
    expect(chat.artifactCard.fullscreen).toBe('Fullscreen')
  })

  it('has the computerUseCard keys, including the outcome enum', () => {
    expect(chat.computerUseCard.title).toBe('Computer Use')
    expect(chat.computerUseCard.stopFailedTitle).toBe(
      'Could not stop the session'
    )
    expect(chat.computerUseCard.stopFailedDescription).toBe(
      'The stop request failed — try again.'
    )
    expect(chat.computerUseCard.answerFailedTitle).toBe(
      'Could not send your answer'
    )
    expect(chat.computerUseCard.answerFailedDescription).toBe(
      'The request failed — try again.'
    )
    expect(chat.computerUseCard.error).toBe('error')
    expect(chat.computerUseCard.running).toBe('running…')
    expect(chat.computerUseCard.outcome.success).toBe('success')
    expect(chat.computerUseCard.outcome.failed).toBe('failed')
    expect(chat.computerUseCard.outcome.aborted).toBe('aborted')
    expect(chat.computerUseCard.outcome.abandoned).toBe('abandoned')
    expect(chat.computerUseCard.outcome.stuck).toBe('stuck')
    expect(chat.computerUseCard.stepBadge).toBe('step {{step}}')
    expect(chat.computerUseCard.stepWithAction).toBe(
      'Step {{step}}: {{action}}'
    )
    expect(chat.computerUseCard.stepNoAction).toBe('Step {{step}}: …')
    expect(chat.computerUseCard.targetWindowAlt).toBe(
      'Target window at step {{step}}'
    )
    expect(chat.computerUseCard.replyPlaceholder).toBe(
      'Type a reply, or leave blank when done'
    )
    expect(chat.computerUseCard.doneContinue).toBe('Done — continue')
    expect(chat.computerUseCard.waitingForReply).toBe(
      'Waiting for the session to accept a reply…'
    )
    expect(chat.computerUseCard.stop).toBe('Stop')
    expect(chat.computerUseCard.session).toBe('session: {{sessionId}}')
  })

  it('has the deepResearchCard keys, including a CLDR plural pair', () => {
    expect(chat.deepResearchCard.researching).toBe('Deep Researching...')
    expect(chat.deepResearchCard.completedSummary_one).toBe(
      'Research completed in {{minutes}}m · {{count}} source'
    )
    expect(chat.deepResearchCard.completedSummary_other).toBe(
      'Research completed in {{minutes}}m · {{count}} sources'
    )
    expect(chat.deepResearchCard.exportAriaLabel).toBe('Export as PDF')
    expect(chat.deepResearchCard.downloadPdfTooltip).toBe('Download PDF')
    expect(chat.deepResearchCard.exportFailedTitle).toBe('Export failed')
    expect(chat.deepResearchCard.exportFailedDescription).toBe(
      'Failed to generate PDF report.'
    )
    expect(chat.deepResearchCard.unknownSource).toBe(
      '[{{rank}}] Unknown source'
    )
    expect(chat.deepResearchCard.referencesHeading).toBe('References')
  })

  it('has the drawioCard keys', () => {
    expect(chat.drawioCard.noSource).toBe(
      'Draw.io tool returned no diagram source.'
    )
    expect(chat.drawioCard.iframeTitle).toBe('draw.io diagram')
    expect(chat.drawioCard.openInDrawio).toBe('Open in draw.io')
    expect(chat.drawioCard.loadFailed).toBe('Failed to load draw.io editor')
  })

  it('has the genericToolCard keys', () => {
    expect(chat.genericToolCard.fallbackLabel).toBe('Tool')
    expect(chat.genericToolCard.badge).toBe('tool')
  })

  it('has the mapItineraryCard keys', () => {
    expect(chat.mapItineraryCard.missingApiKey).toBe(
      'Add a Google API Key in Settings → Google Cloud to render the trip map.'
    )
    expect(chat.mapItineraryCard.tabsAriaLabel).toBe('Itinerary days')
    expect(chat.mapItineraryCard.openRouteTitle).toBe(
      'Open route in Google Maps'
    )
    expect(chat.mapItineraryCard.copyMarkdownTitle).toBe('Copy day as markdown')
  })

  it('has the placeDetail keys', () => {
    expect(chat.placeDetail.goToPhotoAriaLabel).toBe('Go to photo {{index}}')
    expect(chat.placeDetail.closeAriaLabel).toBe('Close detail panel')
    expect(chat.placeDetail.open).toBe('Open')
    expect(chat.placeDetail.closed).toBe('Closed')
    expect(chat.placeDetail.tabsAriaLabel).toBe('Place sections')
    expect(chat.placeDetail.tabOverview).toBe('Overview')
    expect(chat.placeDetail.tabReviews).toBe('Reviews')
    expect(chat.placeDetail.tabHours).toBe('Hours')
    expect(chat.placeDetail.notes).toBe('Notes')
    expect(chat.placeDetail.anonymousReviewer).toBe('Anonymous')
    expect(chat.placeDetail.previousAriaLabel).toBe('Previous place')
    expect(chat.placeDetail.nextAriaLabel).toBe('Next place')
    expect(chat.placeDetail.pagination).toBe('{{index}} of {{total}}')
  })

  it('has the terminalCard keys', () => {
    expect(chat.terminalCard.exitCode).toBe('exit {{code}}')
    expect(chat.terminalCard.noOutput).toBe('No output')
  })

  it('has the weatherCard keys', () => {
    expect(chat.weatherCard.today).toBe('Today')
    expect(chat.weatherCard.tomorrow).toBe('Tmr')
    expect(chat.weatherCard.feels).toBe('Feels {{temp}}° · {{observedAt}}')
    expect(chat.weatherCard.humidity).toBe('Humidity')
    expect(chat.weatherCard.precip).toBe('Precip')
    expect(chat.weatherCard.visibility).toBe('Visibility')
    expect(chat.weatherCard.uvIndex).toBe('UV Index')
  })

  it('has the weatherForecast keys', () => {
    expect(chat.weatherForecast.temperatureRange).toBe('🌡️ Temperature range')
    expect(chat.weatherForecast.cold).toBe('❄️ Cold')
    expect(chat.weatherForecast.hot).toBe('🔥 Hot')
    expect(chat.weatherForecast.sunrise).toBe('Sunrise')
    expect(chat.weatherForecast.sunset).toBe('Sunset')
  })
})

describe('chat namespace tool-card CLDR plural resolves via the real i18next instance', () => {
  it('picks the singular/plural form for deepResearchCard.completedSummary', async () => {
    const { i18n, i18nReady } = await import('@/lib/i18n')
    await i18nReady
    expect(
      i18n.t('chat:deepResearchCard.completedSummary', {
        minutes: 4,
        count: 1
      })
    ).toBe('Research completed in 4m · 1 source')
    expect(
      i18n.t('chat:deepResearchCard.completedSummary', {
        minutes: 4,
        count: 7
      })
    ).toBe('Research completed in 4m · 7 sources')
  })
})
