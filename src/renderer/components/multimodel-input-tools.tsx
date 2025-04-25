import { cn } from '@/lib/utils'
import { advancedToolsAtom } from '@/stores/chat'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { AdvancedTools } from '@shared/types/ai'
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
    key: AdvancedTools.WebSearch,
    icon: <Globe />,
    desc: AdvancedTools.WebSearch
  },
  {
    key: AdvancedTools.Reasoning,
    icon: <Lightbulb />,
    desc: AdvancedTools.Reasoning
  },
  {
    key: AdvancedTools.DeepResearch,
    icon: <Telescope />,
    desc: AdvancedTools.DeepResearch
  },
  {
    key: AdvancedTools.Artifacts,
    icon: <Palette />,
    desc: AdvancedTools.Artifacts
  }
]

export function MultiModelInputTools() {
  const [advancedTools, setAdvancedTools] = useAtom(advancedToolsAtom)

  const handleAdvancedTools = (advancedToolName: AdvancedTools) => {
    setAdvancedTools(
      produce(advancedTools, (draft) => {
        const idx = draft.findIndex((item) => item === advancedToolName)

        if (idx === -1) {
          draft.push(advancedToolName)
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
