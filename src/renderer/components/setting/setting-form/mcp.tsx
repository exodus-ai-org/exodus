import CodeEditor from '@/components/code-editor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import { InfoIcon } from 'lucide-react'

const DEFAULT_MCP_CONFIG = JSON.stringify(
  {
    mcpServers: {
      // "example": { "command": "mcp-server-name", "args": [] }
    }
  },
  null,
  2
)

export function MCP({ form }: { form: UseFormReturnType }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Configure MCP (Model Context Protocol) servers. Changes take effect on
          the next chat session — servers connect lazily on first use.
        </AlertDescription>
      </Alert>

      <div className="border-border overflow-hidden rounded-md border">
        <CodeEditor
          props={{
            control: form.control,
            name: 'mcpServers',
            defaultValue: DEFAULT_MCP_CONFIG
          }}
          className="h-72"
        />
      </div>
    </div>
  )
}
