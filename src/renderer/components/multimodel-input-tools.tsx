import { useArtifact } from '@/hooks/use-artifact'
import { Ellipsis, Globe, Lightbulb, Palette } from 'lucide-react'
import { useParams } from 'react-router'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu'

export function MultiModelInputTools() {
  const { id } = useParams()
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
        <DropdownMenuItem onClick={openArtifact} disabled={!id}>
          <Palette /> Artifacts
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
