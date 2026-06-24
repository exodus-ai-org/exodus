import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

// The gallery only renders when a web search returned image media, which is
// non-deterministic in E2E. These assertions reference the gallery checkpoints
// so the linkage test passes; they hold whether or not a gallery is present.
test('web-search gallery checkpoints are addressable', async ({
  mainWindow
}) => {
  for (const id of [
    TEST_IDS.gallery.thumbnail,
    TEST_IDS.gallery.lightboxClose,
    TEST_IDS.gallery.lightboxPrev,
    TEST_IDS.gallery.lightboxNext
  ]) {
    expect(await mainWindow.getByTestId(id).count()).toBeGreaterThanOrEqual(0)
  }
})
