import { AdvancedTools as AdvancedToolsType } from '@shared/types/ai'
import { produce } from 'immer'
import { useAtom } from 'jotai'
import { GlobeIcon, LightbulbIcon, TelescopeIcon } from 'lucide-react'
import { useCallback } from 'react'

import { cn } from '@/lib/utils'
import { advancedToolsAtom } from '@/stores/chat'

import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

const advancedToolsList = [
  {
    key: AdvancedToolsType.WebSearch,
    icon: <GlobeIcon data-icon />,
    desc: AdvancedToolsType.WebSearch
  },
  {
    key: AdvancedToolsType.Reasoning,
    icon: <LightbulbIcon data-icon />,
    desc: AdvancedToolsType.Reasoning
  },
  {
    key: AdvancedToolsType.DeepResearch,
    icon: <TelescopeIcon data-icon />,
    desc: AdvancedToolsType.DeepResearch
  }
]

export function AdvancedTools() {
  const [advancedTools, setAdvancedTools] = useAtom(advancedToolsAtom)

  const handleAdvancedTools = useCallback(
    (advancedToolName: AdvancedToolsType) => {
      setAdvancedTools(
        produce((draft) => {
          const idx = draft.indexOf(advancedToolName)

          if (idx === -1) {
            draft.push(advancedToolName)

            if (advancedToolName === AdvancedToolsType.DeepResearch) {
              const reasoningIdx = draft.indexOf(AdvancedToolsType.Reasoning)
              if (reasoningIdx > -1) draft.splice(reasoningIdx, 1)
              const webSearchIdx = draft.indexOf(AdvancedToolsType.WebSearch)
              if (webSearchIdx > -1) draft.splice(webSearchIdx, 1)
            }

            if (
              advancedToolName === AdvancedToolsType.Reasoning ||
              advancedToolName === AdvancedToolsType.WebSearch
            ) {
              const deepResearchIdx = draft.indexOf(
                AdvancedToolsType.DeepResearch
              )
              if (deepResearchIdx > -1) draft.splice(deepResearchIdx, 1)
            }
          } else {
            draft.splice(idx, 1)
          }
        })
      )
    },
    [setAdvancedTools]
  )

  return (
    <TooltipProvider>
      {advancedToolsList.map(({ key, icon, desc }) => (
        <Tooltip key={key}>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-muted-foreground hover:text-foreground size-6 rounded-full bg-transparent transition-colors',
                {
                  ['text-[#0285ff] hover:text-[#0285ff] dark:text-[#48aaff] hover:dark:text-[#48aaff]']:
                    advancedTools.includes(key)
                }
              )}
              onClick={() => handleAdvancedTools(key)}
            >
              {icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{desc}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </TooltipProvider>
  )
}
