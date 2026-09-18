import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'

export function useClipboard() {
  const { t } = useTranslation('common')
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
        title: t('clipboard.failedTitle'),
        description:
          error instanceof Error ? error.message : t('clipboard.genericError')
      })
    }
  }

  return { copied, handleCopy }
}
