export interface SystemInfo extends Partial<BuildInfo> {
  Electron: string
  Chromium: string
  'Node.js': string
  V8: string
  OS: string
}

export interface BuildInfo {
  Version: string
  Commit: string
  Date: string
  ElectronBuildId: string
}
