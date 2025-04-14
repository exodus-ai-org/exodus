import { useSidebar } from '@/components/ui/sidebar'
import { isArtifactVisibleAtom } from '@/stores/chat'
import { useAtom } from 'jotai'

export function useArtifact() {
  const { open, toggleSidebar } = useSidebar()
  const [show, setShow] = useAtom(isArtifactVisibleAtom)

  const openArtifact = () => {
    if (open) {
      toggleSidebar()
    }

    setShow(true)
  }

  const closeArtifact = () => {
    if (!open) {
      toggleSidebar()
    }

    setShow(false)
  }

  return {
    show,
    openArtifact,
    closeArtifact
  }
}
