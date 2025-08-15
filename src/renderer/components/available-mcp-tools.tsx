import { Hammer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { McpTools } from '@shared/types/ai'
import { useMemo } from 'react'
import useSWR from 'swr'
import { Separator } from './ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

export function AvailableMcpTools() {
  const { data } = useSWR<{ tools: McpTools[] }>('/api/chat/mcp')

  const len = useMemo(
    () =>
      data?.tools?.reduce(
        (acc, val) => acc + Object.values(val.tools).length,
        0
      ) ?? 0,
    [data?.tools]
  )
  if (!data || len === 0) return null
  return (
    <>
      <Separator orientation="vertical" className="!h-6" />
      <Dialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" className="h-6">
                  <Hammer /> {len}
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{len} MCP tools available</p>
              <TooltipArrow className="TooltipArrow" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Available MCP tools</DialogTitle>
            <DialogDescription>
              Exodus can use tools provided by specialized servers using Model
              Context Protocol.{' '}
              <a
                href="https://modelcontextprotocol.io/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                Learn more about MCP
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[500px] flex-col gap-4 overflow-y-scroll">
            {data.tools?.map(({ mcpServerName, tools }) => (
              <div key={mcpServerName} className="flex flex-col gap-4">
                {Object.keys(tools).map((toolName) => (
                  <div key={toolName} className="flex flex-col gap-0.5">
                    <p className="text-xs font-semibold">{toolName}</p>
                    <p className="text-sm text-zinc-400">
                      {tools[toolName].description ||
                        `There is no description for ${toolName}.`}
                    </p>
                    <i className="text-xs text-zinc-500">
                      From {mcpServerName}
                    </i>
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
