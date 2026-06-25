import { existsSync, rmSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

const LOCK_DAT = join(homedir(), '.exodus', 'lock.dat')
const LOCK_CFG = join(homedir(), '.exodus', 'lock-config.json')

function cleanLockFiles() {
  if (existsSync(LOCK_DAT)) rmSync(LOCK_DAT)
  if (existsSync(LOCK_CFG)) rmSync(LOCK_CFG)
}
test.beforeAll(cleanLockFiles)
test.afterAll(cleanLockFiles)

test('lock settings expose enrollment + config checkpoints', async ({
  mainWindow
}) => {
  // Navigate to Settings → General (Lock & Privacy lives there). Adjust the
  // opener if the app uses a different control; the assertions below are the
  // contract that matters.
  await mainWindow
    .getByRole('button', { name: /settings/i })
    .first()
    .click()
  await mainWindow.getByText('General', { exact: true }).first().click()

  await mainWindow.getByTestId(TEST_IDS.lock.enablePinInput).fill('246802')
  await mainWindow.getByTestId(TEST_IDS.lock.confirmPinInput).fill('246802')

  await expect(mainWindow.getByTestId(TEST_IDS.lock.idleSelect)).toBeVisible()
  await expect(mainWindow.getByTestId(TEST_IDS.lock.removeButton)).toBeVisible()
  await mainWindow.getByTestId(TEST_IDS.lock.removeButton).click()
  await expect(
    mainWindow.getByTestId(TEST_IDS.lock.removePinInput)
  ).toBeVisible()
})
