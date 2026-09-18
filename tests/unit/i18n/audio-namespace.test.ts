import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const audio = JSON.parse(
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
      'audio.json'
    ),
    'utf8'
  )
)

describe('audio namespace (en)', () => {
  it('has the player keys', () => {
    expect(audio.player).toMatchObject({
      stop: 'Stop',
      readAloud: 'Read aloud'
    })
  })

  it('has the recorder keys', () => {
    expect(audio.recorder).toMatchObject({
      stopRecording: 'Stop recording',
      dictate: 'Dictate'
    })
    expect(audio.recorder.toast).toMatchObject({
      micErrorTitle: 'Microphone error',
      micErrorFallback: 'Could not access the microphone.'
    })
  })

  it('has the hook toast keys, generic fallback shared across both errors', () => {
    expect(audio.hook.toast).toMatchObject({
      audioErrorTitle: 'Audio error',
      transcriptionFailedTitle: 'Transcription failed',
      genericErrorFallback: 'An error occurred, please try again!'
    })
  })
})
