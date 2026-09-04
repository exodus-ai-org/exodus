import { AdvancedTools as AdvancedToolsType } from '@shared/types/ai'
import { produce } from 'immer'
import { useAtom } from 'jotai'
import {
  HammerIcon,
  LightbulbIcon,
  PaperclipIcon,
  PlusIcon,
  TelescopeIcon,
  XIcon
} from 'lucide-react'
import { ChangeEvent, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'

import Markdown from '@/components/markdown'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useUpload } from '@/hooks/use-upload'
import { cn } from '@/lib/utils'
import { advancedToolsAtom } from '@/stores/chat'

interface McpToolInfo {
  name: string
  description: string
}
interface McpToolsGroup {
  mcpServerName: string
  tools: McpToolInfo[]
}

const TOGGLES = [
  { key: AdvancedToolsType.Reasoning, label: 'Reasoning', icon: LightbulbIcon },
  {
    key: AdvancedToolsType.DeepResearch,
    label: 'Deep research',
    icon: TelescopeIcon
  }
] as const

function useAdvancedToolToggle() {
  const [advancedTools, setAdvancedTools] = useAtom(advancedToolsAtom)

  const toggle = (name: AdvancedToolsType) =>
    setAdvancedTools(
      produce((draft) => {
        const idx = draft.indexOf(name)
        if (idx > -1) {
          draft.splice(idx, 1)
          return
        }
        draft.push(name)
        // Reasoning and Deep Research are mutually exclusive.
        const other =
          name === AdvancedToolsType.DeepResearch
            ? AdvancedToolsType.Reasoning
            : AdvancedToolsType.DeepResearch
        const oi = draft.indexOf(other)
        if (oi > -1) draft.splice(oi, 1)
      })
    )

  return { advancedTools, toggle }
}

/** The composer's `+` button: attachments, reasoning/deep-research, MCP tools. */
export function ComposerToolsButton() {
  const { uploadFile } = useUpload()
  const fileRef = useRef<HTMLInputElement>(null)
  const { advancedTools, toggle } = useAdvancedToolToggle()
  const [mcpOpen, setMcpOpen] = useState(false)

  const { data } = useSWR<{ tools: McpToolsGroup[] }>('/api/mcp/tools')
  const mcpCount = useMemo(
    () => data?.tools?.reduce((acc, g) => acc + g.tools.length, 0) ?? 0,
    [data?.tools]
  )

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    uploadFile([...files], () => {
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onChange={handleFiles}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Add"
          className={cn(
            'text-muted-foreground hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted flex size-8 shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:size-[18px]',
            advancedTools.length > 0 && 'text-[#0285ff] dark:text-[#48aaff]'
          )}
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-52 rounded-xl"
        >
          <DropdownMenuItem
            onClick={() => setTimeout(() => fileRef.current?.click(), 0)}
          >
            <PaperclipIcon />
            Attach files
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {TOGGLES.map(({ key, label, icon: Icon }) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={advancedTools.includes(key)}
              onCheckedChange={() => toggle(key)}
            >
              <Icon />
              {label}
            </DropdownMenuCheckboxItem>
          ))}
          {mcpCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMcpOpen(true)}>
                <HammerIcon />
                MCP tools
                <span className="text-muted-foreground ml-auto text-xs">
                  {mcpCount}
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={mcpOpen} onOpenChange={setMcpOpen}>
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
                    <div className="[&_.markdown]:text-muted-foreground [&_.markdown]:text-xs [&_.markdown]:leading-snug [&_.markdown_li]:leading-normal [&_.markdown_ol]:mb-0.5 [&_.markdown_ul]:mb-0.5">
                      <Markdown
                        src={
                          tool.description || `No description for ${tool.name}.`
                        }
                      />
                    </div>
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

/** Removable pills shown above the textarea for each active advanced tool. */
export function ActiveToolPills() {
  const { advancedTools, toggle } = useAdvancedToolToggle()
  const active = TOGGLES.filter((t) => advancedTools.includes(t.key))
  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 px-1">
      {active.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className="flex items-center gap-1 rounded-full bg-[#0285ff]/10 px-2 py-0.5 text-xs font-medium text-[#0285ff] transition-colors hover:bg-[#0285ff]/16 dark:text-[#48aaff] [&_svg]:size-3.5"
        >
          <Icon />
          {label}
          <XIcon className="opacity-60" />
        </button>
      ))}
    </div>
  )
}
