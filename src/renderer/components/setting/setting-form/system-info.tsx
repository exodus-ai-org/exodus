import { FormLabel } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { version } from '../../../../../package.json'

export function SystemInfo() {
  const { versions } = window.electron.process
  const { os } = window.api

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between py-2">
        <FormLabel>Version</FormLabel>
        <span className="text-ring text-sm">v{version}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FormLabel>Electron</FormLabel>
        <span className="text-ring text-sm">v{versions.electron}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FormLabel>Chromium</FormLabel>
        <span className="text-ring text-sm">v{versions.chrome}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FormLabel>Node.js</FormLabel>
        <span className="text-ring text-sm">v{versions.node}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FormLabel>V8</FormLabel>
        <span className="text-ring text-sm">v{versions.v8}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FormLabel>OS</FormLabel>
        <span className="text-ring text-sm">{os}</span>
      </div>
    </div>
  )
}
