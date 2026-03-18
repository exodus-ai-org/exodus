import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { HammerIcon } from 'lucide-react'
import { useMemo } from 'react'
import useSWR from 'swr'

interface McpToolInfo {
  name: string
  description: string
}

interface McpToolsGroup {
  mcpServerName: string
  tools: McpToolInfo[]
}

export function AvailableMcpTools() {
  const { data } = useSWR<{ tools: McpToolsGroup[] }>('/api/mcp/tools')
  const count = useMemo(
    () => data?.tools?.reduce((acc, g) => acc + g.tools.length, 0) ?? 0,
    [data?.tools]
  )

  if (count === 0) return null

  return (
    <>
      <Separator orientation="vertical" className="h-6!" />
      <Dialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <DialogTrigger
                  render={
                    <Button variant="ghost" className="h-6">
                      <HammerIcon /> {count}
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>
              <p>{count} MCP tools available</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Available MCP Tools</DialogTitle>
            <DialogDescription>
              Tools provided by active MCP servers. Manage servers in{' '}
              <strong>Settings &gt; MCP Servers</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-125 flex-col gap-4 overflow-y-auto">
            {data?.tools?.map(({ mcpServerName, tools }) => (
              <div key={mcpServerName} className="flex flex-col gap-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {mcpServerName}
                </p>
                {tools.map((tool) => (
                  <div key={tool.name} className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {tool.description || `No description for ${tool.name}.`}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
