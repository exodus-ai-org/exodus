import { useImmersion } from '@/hooks/use-immersion'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { RichTextEditor } from '../rich-text-editor'
import { Button } from '../ui/button'

export function Immersion() {
  const { closeImmersion } = useImmersion()
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="dark:border-border z-10 h-screen w-full border-l border-gray-100 shadow-[0_0_18px_rgba(0,0,0,0.075)]"
    >
      <div className="draggable flex h-[3.5rem] items-center justify-between px-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-ring no-draggable h-7 w-7"
          onClick={closeImmersion}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-[calc(100dvh-7.5rem)] justify-center overflow-y-scroll p-4 pt-20">
        <RichTextEditor />
      </div>
    </motion.div>
  )
}
