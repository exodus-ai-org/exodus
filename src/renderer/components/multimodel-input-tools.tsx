import { useArtifact } from '@/hooks/use-artifact'
import { Ellipsis, Globe, Lightbulb, Palette } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu'

export function MultiModelInputTools() {
  const { openArtifact } = useArtifact()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 w-9 cursor-pointer rounded-full border"
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem>
          <Globe /> Search
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Lightbulb /> Reason
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openArtifact}>
          <Palette /> Artifact
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
