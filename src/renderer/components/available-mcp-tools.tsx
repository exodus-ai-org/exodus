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
import { useMemo } from 'react'
import useSWR from 'swr'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

export function AvailableMcpTools() {
  const { data } = useSWR('/api/chat/mcp', {
    fallbackData: []
  })
  const tools = useMemo(
    () => (data?.tools ? Object.keys(data?.tools) : []),
    [data]
  )

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Hammer /> {tools.length}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tools.length} MCP tools available</p>
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
          {tools?.map((tool) => (
            <div key={tool}>
              <p>{tool}</p>
              <p className="text-zinc-500">
                {data?.tools?.[tool]?.description ||
                  `There is no description for ${tool}.`}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
