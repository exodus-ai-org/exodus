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
      className="h-screen w-[calc(100vw-26rem)] border-l"
    >
      <div className="flex items-center justify-between border-b px-2 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="text-ring h-7 w-7 cursor-pointer"
          onClick={closeImmersion}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-[calc(100dvh-3.125rem)] justify-center overflow-y-scroll pt-20">
        <RichTextEditor />
      </div>
    </motion.div>
  )
}
