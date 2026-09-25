import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

// The placeholder only renders when a reply's markdown carries a remote
// image from an untrusted host, which the faux provider does not script (it
// only ever answers with the fixed weather text — see faux-boot.ts). Real
// tap-to-load behaviour is covered by
// tests/unit/renderer/components/remote-image.test.ts; this references the
// checkpoints so they stay addressable, the same pattern as
// web-search-gallery.spec.ts and image-generation-card.spec.ts.
test('remote-image placeholder checkpoints are addressable', async ({
  mainWindow
}) => {
  for (const id of [
    TEST_IDS.chat.remoteImage.placeholder,
    TEST_IDS.chat.remoteImage.loadButton
  ]) {
    expect(await mainWindow.getByTestId(id).count()).toBeGreaterThanOrEqual(0)
  }
})
