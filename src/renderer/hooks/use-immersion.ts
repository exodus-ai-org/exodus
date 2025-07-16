import { useSidebar } from '@/components/ui/sidebar'
import { immersionContentAtom, isImmersionVisibleAtom } from '@/stores/chat'
import { useAtom } from 'jotai'

export function useImmersion() {
  const { open, toggleSidebar } = useSidebar()
  const [show, setShow] = useAtom(isImmersionVisibleAtom)
  const [immersionContent, setImmersionContent] = useAtom(immersionContentAtom)

  const openImmersion = (content: string) => {
    if (open) {
      toggleSidebar()
    }

    setImmersionContent(content)
    setShow(true)
  }

  const closeImmersion = () => {
    if (!open) {
      toggleSidebar()
    }

    setShow(false)
    setImmersionContent('')
  }

  return {
    show,
    immersionContent,
    openImmersion,
    closeImmersion
  }
}
