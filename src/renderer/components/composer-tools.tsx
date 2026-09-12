import { TEST_IDS } from '@shared/constants/test-ids'
import type { EffortLevel } from '@shared/schemas/settings-schema'
import { AdvancedTools as AdvancedToolsType } from '@shared/types/ai'
import { produce } from 'immer'
import { useAtom } from 'jotai'
import {
  BrainIcon,
  HammerIcon,
  PaperclipIcon,
  PlusIcon,
  TelescopeIcon,
  XIcon
} from 'lucide-react'
import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useSettings } from '@/hooks/use-settings'
import { useUpload } from '@/hooks/use-upload'
import { cn } from '@/lib/utils'
import { advancedToolsAtom, reasoningEffortAtom } from '@/stores/chat'

interface McpToolInfo {
  name: string
  description: string
}
interface McpToolsGroup {
  mcpServerName: string
  tools: McpToolInfo[]
}

const TOGGLES = [
  {
    key: AdvancedToolsType.DeepResearch,
    label: 'Deep research',
    icon: TelescopeIcon
  }
] as const

const EFFORT_LEVELS: { value: EffortLevel; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'Extra high' },
  { value: 'max', label: 'Max' }
]

function useAdvancedToolToggle() {
  const [advancedTools, setAdvancedTools] = useAtom(advancedToolsAtom)
  const [reasoningEffort, setReasoningEffort] = useAtom(reasoningEffortAtom)

  const toggle = (name: AdvancedToolsType) =>
    setAdvancedTools(
      produce((draft) => {
        const idx = draft.indexOf(name)
        if (idx > -1) {
          draft.splice(idx, 1)
          return
        }
        draft.push(name)
        // Deep Research and reasoning effort are mutually exclusive.
        if (name === AdvancedToolsType.DeepResearch) setReasoningEffort('off')
      })
    )

  const setEffort = (level: EffortLevel) => {
    setReasoningEffort(level)
    // Picking a non-off effort turns off Deep Research, same mutual exclusion
    // as before, just from the other direction.
    if (level !== 'off') {
      setAdvancedTools(
        produce((draft) => {
          const idx = draft.indexOf(AdvancedToolsType.DeepResearch)
          if (idx > -1) draft.splice(idx, 1)
        })
      )
    }
  }

  return { advancedTools, toggle, reasoningEffort, setEffort }
}

/** Levels the currently-selected model actually supports, off first. */
function useAvailableEffortLevels(): typeof EFFORT_LEVELS {
  const { data: settings } = useSettings()
  const supported = settings?.providerConfig?.modelSnapshot?.reasoningLevels
  return useMemo(
    () =>
      supported && supported.length > 0
        ? EFFORT_LEVELS.filter((l) => supported.includes(l.value))
        : [],
    [supported]
  )
}

/** The composer's `+` button: attachments, reasoning effort/deep-research, MCP tools. */
export function ComposerToolsButton() {
  const { t } = useTranslation('common')
  const { uploadFile } = useUpload()
  const fileRef = useRef<HTMLInputElement>(null)
  const { advancedTools, toggle, reasoningEffort, setEffort } =
    useAdvancedToolToggle()
  const availableEffortLevels = useAvailableEffortLevels()
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

  const hasActiveTool = advancedTools.length > 0 || reasoningEffort !== 'off'

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
          aria-label={t('action.add')}
          className={cn(
            'text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted flex size-8 shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:size-[18px]',
            hasActiveTool && 'text-[#0285ff] dark:text-[#48aaff]'
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
          {availableEffortLevels.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                data-testid={TEST_IDS.composer.reasoningEffortItem}
              >
                <BrainIcon />
                Reasoning
                {reasoningEffort !== 'off' && (
                  <span className="text-muted-foreground ml-auto text-xs">
                    {
                      EFFORT_LEVELS.find((l) => l.value === reasoningEffort)
                        ?.label
                    }
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={reasoningEffort}
                  onValueChange={(v) => setEffort(v as EffortLevel)}
                >
                  {availableEffortLevels.map((level) => (
                    <DropdownMenuRadioItem
                      key={level.value}
                      value={level.value}
                      data-testid={`${TEST_IDS.composer.reasoningEffortLevel}-${level.value}`}
                    >
                      {level.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
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
  const { advancedTools, toggle, reasoningEffort, setEffort } =
    useAdvancedToolToggle()
  const active = TOGGLES.filter((t) => advancedTools.includes(t.key))
  const effortLabel =
    reasoningEffort !== 'off'
      ? EFFORT_LEVELS.find((l) => l.value === reasoningEffort)?.label
      : null

  if (active.length === 0 && !effortLabel) return null

  return (
    <div className="flex flex-wrap gap-1 px-1">
      {effortLabel && (
        <button
          type="button"
          onClick={() => setEffort('off')}
          className="flex items-center gap-1 rounded-full bg-[#0285ff]/10 px-2 py-0.5 text-xs font-medium text-[#0285ff] transition-colors hover:bg-[#0285ff]/16 dark:text-[#48aaff] [&_svg]:size-3.5"
        >
          <BrainIcon />
          Reasoning: {effortLabel}
          <XIcon className="opacity-60" />
        </button>
      )}
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
