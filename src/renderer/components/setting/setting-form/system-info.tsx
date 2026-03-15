import { FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { version } from '../../../../../package.json'

export function SystemInfo() {
  const { versions } = window.electron.process
  const { os } = window.api

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between py-2">
        <FieldLabel>Version</FieldLabel>
        <span className="text-ring text-sm">v{version}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FieldLabel>Electron</FieldLabel>
        <span className="text-ring text-sm">v{versions.electron}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FieldLabel>Chromium</FieldLabel>
        <span className="text-ring text-sm">v{versions.chrome}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FieldLabel>Node.js</FieldLabel>
        <span className="text-ring text-sm">v{versions.node}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FieldLabel>V8</FieldLabel>
        <span className="text-ring text-sm">v{versions.v8}</span>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-2">
        <FieldLabel>OS</FieldLabel>
        <span className="text-ring text-sm">{os}</span>
      </div>
    </div>
  )
}
