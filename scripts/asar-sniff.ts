import path from 'path'
import { cwd } from 'process'

import { extractAll } from '@electron/asar'

function extractAsarFile() {
  extractAll(
    path.join(
      cwd(),
      'dist',
      'mac-arm64',
      'Exodus.app',
      'Contents',
      'Resources',
      'app.asar'
    ),
    path.join(cwd(), 'asar')
  )
}

extractAsarFile()
