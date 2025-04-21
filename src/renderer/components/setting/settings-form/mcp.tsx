import { CodeEditor } from '@/components/code-editor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { UseFormReturnType } from '../settings-form'

export function MCP({ form }: { form: UseFormReturnType }) {
  return (
    <>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="block">
          We&apos;ve detected an update to your MCP servers&apos; configuration.
          To apply these changes, please click{' '}
          <span className="hover:text-primary cursor-pointer font-bold underline">
            RESTART
          </span>{' '}
          to launch your servers now, or restart the application manually.
        </AlertDescription>
      </Alert>
      <CodeEditor
        props={{ control: form.control, name: 'mcpServers' }}
        className="-mx-4 !w-[calc(100%+2rem)]"
      />
    </>
  )
}
