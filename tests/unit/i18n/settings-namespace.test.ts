import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const settings = JSON.parse(
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
      'settings.json'
    ),
    'utf8'
  )
)

describe('settings namespace (en)', () => {
  it('keeps the pre-existing general.language keys untouched', () => {
    expect(settings.general.language.label).toBe('Language')
    expect(settings.general.language.description).toBe(
      "The language Exodus's interface is shown in."
    )
    expect(settings.general.language.auto).toBe('Auto (detect from system)')
  })

  it('has the general.theme / runOnStartup / menuBar keys', () => {
    expect(settings.general.theme.label).toBe('Theme')
    expect(settings.general.theme.description).toBe(
      'Choose light, dark, or match your system preference'
    )
    expect(settings.general.theme.system).toBe('System')
    expect(settings.general.theme.light).toBe('Light')
    expect(settings.general.theme.dark).toBe('Dark')
    expect(settings.general.runOnStartup.label).toBe('Run on startup')
    expect(settings.general.runOnStartup.description).toBe(
      'Automatically start Exodus when you log in'
    )
    expect(settings.general.menuBar.label).toBe('Menu bar')
    expect(settings.general.menuBar.description).toBe(
      'Show Exodus in the menu bar'
    )
  })

  it('has a nav title key for every SettingsLabel tab', () => {
    expect(settings.nav.profile.title).toBe('Profile')
    expect(settings.nav.general.title).toBe('General')
    expect(settings.nav.personality.title).toBe('Personality')
    expect(settings.nav.aiProviders.title).toBe('AI Providers')
    expect(settings.nav.amazonS3.title).toBe('AWS S3')
    expect(settings.nav.mcpServers.title).toBe('MCP Servers')
    expect(settings.nav.skillsMarket.title).toBe('Skills Market')
    expect(settings.nav.fullTextSearch.title).toBe('Full Text Search')
    expect(settings.nav.knowledgeBase.title).toBe('Knowledge Base')
    expect(settings.nav.builtinTools.title).toBe('Built-in Tools')
    expect(settings.nav.memory.title).toBe('Memory')
    expect(settings.nav.discover.title).toBe('Discover')
    expect(settings.nav.voice.title).toBe('Voice')
    expect(settings.nav.deepResearch.title).toBe('Deep Research')
    expect(settings.nav.computerUse.title).toBe('Computer Use')
    expect(settings.nav.dataControls.title).toBe('Data Controls')
    expect(settings.nav.logger.title).toBe('Logger')
    expect(settings.nav.keyboardShortcuts.title).toBe('Keyboard Shortcuts')
    expect(settings.nav.about.title).toBe('About Exodus')
  })

  it('has the nav group heading keys', () => {
    expect(settings.nav.group.personal).toBe('Personal')
    expect(settings.nav.group.aiTools).toBe('AI & Tools')
    expect(settings.nav.group.integrations).toBe('Integrations')
    expect(settings.nav.group.storage).toBe('Storage')
    expect(settings.nav.group.developer).toBe('Developer')
  })

  it('has the sidebar chrome keys', () => {
    expect(settings.common.searchPlaceholder).toBe('Search settings…')
    expect(settings.common.backToApp).toBe('Back to app')
  })
})
