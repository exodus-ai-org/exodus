'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDownIcon, ChevronUpIcon, LoaderIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'

interface MessageReasoningProps {
  isLoading: boolean
  reasoning: string
}

export function MessageReasoning({
  isLoading,
  reasoning
}: MessageReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '1rem',
      marginBottom: '0.5rem'
    }
  }

  return (
    <section className="mb-4 flex flex-col">
      {isLoading ? (
        <div className="flex flex-row items-center gap-2">
          <div className="font-medium">Reasoning</div>
          <LoaderIcon size={16} className="animate-spin" />
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2">
          <div className="font-medium">Reasoned for a few seconds</div>
          <Button
            variant="ghost"
            onClick={() => {
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            data-testid="message-reasoning"
            key="content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="flex flex-col gap-4 border-l pl-4 text-zinc-600 dark:text-zinc-400"
          >
            <p className="text-sm whitespace-break-spaces">{reasoning}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
