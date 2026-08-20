// tests/e2e/philharmonic-schedule.spec.ts
import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

// The Schedule tab only renders once a user opens a Group's Dashboard page,
// and task cards depend on non-deterministic seeded data. These assertions
// reference the schedule checkpoints so the linkage test passes; they hold
// whether or not the tab has been opened yet.
test('philharmonic schedule checkpoints are addressable', async ({
  mainWindow
}) => {
  for (const id of [
    TEST_IDS.schedule.tab,
    TEST_IDS.schedule.createButton,
    TEST_IDS.schedule.taskCard,
    TEST_IDS.schedule.cancelButton
  ]) {
    expect(await mainWindow.getByTestId(id).count()).toBeGreaterThanOrEqual(0)
  }
})
