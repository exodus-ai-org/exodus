import { useState } from 'react'
import { sileo } from 'sileo'

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
      sileo.error({
        title: 'Failed to copy',
        description:
          error instanceof Error ? error.message : 'Please try again!'
      })
    }
  }

  return { copied, handleCopy }
}
