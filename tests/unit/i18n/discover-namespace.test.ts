import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const discover = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'packages',
      'shared',
      'src',
      'i18n',
      'locales',
      'en',
      'discover.json'
    ),
    'utf8'
  )
)

describe('discover namespace (en)', () => {
  it('has the alert and enable toggle keys', () => {
    expect(discover.alert).toContain(
      'Discover turns your saved Memory into a personalized news feed'
    )
    expect(discover.enable).toMatchObject({
      label: 'Enable Discover',
      description: 'Show a personalized news feed on the home page.'
    })
  })

  it('has the topicCount and articlesPerTopic keys', () => {
    expect(discover.topicCount.description).toBe(
      'How many memory-derived topics to show. Default 4.'
    )
    expect(discover.articlesPerTopic.description).toBe(
      'How many articles per topic row. Default 3.'
    )
  })

  it('has the feed panel keys', () => {
    expect(discover.heading).toBe('Discover')
    expect(discover.updatedAgo).toBe('updated {{time}}')
    expect(discover.refreshButton).toBe('Refresh')
    expect(discover.toast.refreshFailed).toBe('Failed to refresh')
  })
})

describe('discover namespace braveKeyHint renders correctly via Trans', () => {
  it('braveKeyHint — <button> at index 2, correct position', async () => {
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { I18nextProvider, initReactI18next } = await import('react-i18next')
    const i18next = (await import('i18next')).default
    const { BraveKeyHint } =
      await import('@/components/settings/settings-form/discover')

    const i18n = i18next.createInstance()
    await i18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { discover } },
      ns: ['discover'],
      defaultNS: 'discover',
      interpolation: { escapeValue: false }
    })

    const html = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(BraveKeyHint, { onNavigate: () => {} })
      )
    )
    expect(html).toBe(
      'Discover needs a Brave Search API key. <button type="button" class="text-foreground underline underline-offset-4">Add one under Built-in Tools</button>.'
    )
  })
})
