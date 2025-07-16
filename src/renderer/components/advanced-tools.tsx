import { cn } from '@/lib/utils'
import { advancedToolsAtom } from '@/stores/chat'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { AdvancedTools as AdvancedToolsType } from '@shared/types/ai'
import { produce } from 'immer'
import { useAtom } from 'jotai'
import { Globe, Lightbulb, Palette, Telescope } from 'lucide-react'
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
    icon: <Globe />,
    desc: AdvancedToolsType.WebSearch
  },
  {
    key: AdvancedToolsType.Reasoning,
    icon: <Lightbulb />,
    desc: AdvancedToolsType.Reasoning
  },
  {
    key: AdvancedToolsType.DeepResearch,
    icon: <Telescope />,
    desc: AdvancedToolsType.DeepResearch
  },
  {
    key: AdvancedToolsType.Immersion,
    icon: <Palette />,
    desc: AdvancedToolsType.Immersion
  }
]

export function AdvancedTools() {
  const [advancedTools, setAdvancedTools] = useAtom(advancedToolsAtom)

  const handleAdvancedTools = (advancedToolName: AdvancedToolsType) => {
    setAdvancedTools(
      produce(advancedTools, (draft) => {
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
  }

  return (
    <>
      {advancedToolsList.map(({ key, icon, desc }) => (
        <TooltipProvider key={key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'text-ring hover:text-ring h-9 w-9 cursor-pointer rounded-full border',
                  {
                    ['bg-accent text-[#0285ff] hover:text-[#0285ff] dark:text-[#48aaff] hover:dark:text-[#48aaff]']:
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
              <TooltipArrow className="TooltipArrow" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </>
  )
}
