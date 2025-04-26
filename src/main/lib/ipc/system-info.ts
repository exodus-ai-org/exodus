import { SystemInfo } from '@shared/types/system-info'
import os from 'os'
import { version } from '../../../../package.json'

export function getSystemInfo(): SystemInfo {
  return {
    Version: `v${version}`,
    Electron: `v${process.versions.electron}`,
    Chromium: `v${process.versions.chrome}`,
    'Node.js': `v${process.versions.node}`,
    V8: `v${process.versions.v8}`,
    OS: `${os.type()} ${os.arch()} v${os.release()}`
  }
}
