import { Loader2Icon, UploadIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export interface InstallLocalButtonProps {
  uploading: boolean
  onClick: () => void
}

export function InstallLocalButton({
  uploading,
  onClick
}: InstallLocalButtonProps) {
  return (
    <Button variant="outline" size="sm" disabled={uploading} onClick={onClick}>
      {uploading ? (
        <Loader2Icon data-icon className="mr-1.5 size-3.5 animate-spin" />
      ) : (
        <UploadIcon data-icon className="mr-1.5 size-3.5" />
      )}
      Install Local
    </Button>
  )
}
