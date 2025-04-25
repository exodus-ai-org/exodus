import { BuildInfo, SystemInfo } from '@shared/types/system-info'
import { app } from 'electron'
import { readFileSync } from 'fs'
import os from 'os'
import path from 'path'

export function getSystemInfo(): SystemInfo {
  const versionPath = path.join(app.getAppPath(), 'build.json')

  let versionData = {} as BuildInfo
  try {
    versionData = JSON.parse(readFileSync(versionPath, 'utf-8'))
  } catch {
    // Just ignore...
  }

  return {
    ...versionData,
    Electron: process.versions.electron,
    Chromium: process.versions.chrome,
    'Node.js': process.versions.node,
    V8: process.versions.v8,
    OS: `${os.type()} ${os.arch()} ${os.release()}`
  }
}
