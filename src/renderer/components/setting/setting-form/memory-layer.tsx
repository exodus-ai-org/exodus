import { Alert, AlertDescription } from '@/components/ui/alert'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { AlertCircleIcon } from 'lucide-react'

export function MemoryLayer({ form }: { form: UseFormReturnType }) {
  console.log(form)
  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">xxx</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3"></div>
    </>
  )
}
