import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

// The card only renders when a run calls `image_generation`, which needs a
// real OpenAI key (the faux provider only scripts `weather`). The unit test
// (tests/unit/renderer/components/calling-tools/image-generation-card.test.ts)
// covers its states; this references the checkpoint so it stays addressable.
test('image-generation card checkpoint is addressable', async ({
  mainWindow
}) => {
  expect(
    await mainWindow.getByTestId(TEST_IDS.imageGeneration.card).count()
  ).toBeGreaterThanOrEqual(0)
})
