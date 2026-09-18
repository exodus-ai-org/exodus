import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const common = JSON.parse(
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
      'common.json'
    ),
    'utf8'
  )
)

describe('common.json (Phase 2 additions)', () => {
  it('has the action verbs used by the Phase 2 common-namespace extraction', () => {
    expect(common.action).toMatchObject({
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      close: 'Close',
      retry: 'Retry',
      confirm: 'Confirm',
      edit: 'Edit',
      add: 'Add',
      create: 'Create',
      saving: 'Saving…'
    })
  })
  it('still has the state keys from Phase 1', () => {
    expect(common.state).toMatchObject({ loading: 'Loading…', local: 'Local' })
  })
  it('has the state.runOnLocal / state.you keys (added alongside NavFooter/Profile fixes)', () => {
    expect(common.state).toMatchObject({
      runOnLocal: 'Run on local',
      you: 'You'
    })
  })
  it('has the nav.settings key (added alongside the NavFooter dropdown redesign)', () => {
    expect(common.nav).toMatchObject({ settings: 'Settings' })
  })
  it('has the Phase 5 action.copy / state.copied keys (markdown code-block copy button)', () => {
    expect(common.action.copy).toBe('Copy')
    expect(common.state.copied).toBe('Copied')
  })
  it('has the Phase 5 uploader.* keys (the unused Uploader component)', () => {
    expect(common.uploader).toMatchObject({
      dragDrop: 'Drag & drop files here',
      hint: 'Or click to browse (max 2 files, up to 5MB each)'
    })
  })
  it('has the Phase 5 clipboard.* keys (useClipboard hook)', () => {
    expect(common.clipboard).toMatchObject({
      failedTitle: 'Failed to copy',
      genericError: 'Please try again!'
    })
  })
})
