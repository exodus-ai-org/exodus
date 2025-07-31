import { useState } from 'react'
import { toast } from 'sonner'

export function useClipboard() {
  const [copied, setCopied] = useState('')

  const handleCopy = async (text: string) => {
    try {
      await window.navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => {
        setCopied('')
      }, 2000)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to copy, please try again!'
      )
    }
  }

  return { copied, handleCopy }
}
