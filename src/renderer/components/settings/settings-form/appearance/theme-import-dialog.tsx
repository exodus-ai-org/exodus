import type { SchemeColors } from '@exodus/shared/constants/appearance'
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { parseSchemeImport } from '@exodus/shared/utils/appearance'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export function ThemeImportDialog({
  open,
  onOpenChange,
  onImport
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (colors: SchemeColors) => void
}) {
  const { t } = useTranslation('settings')
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)

  const submit = () => {
    const result = parseSchemeImport(text)
    if (!result.ok) {
      setInvalid(true)
      return
    }
    onImport(result.colors)
    setText('')
    setInvalid(false)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setInvalid(false)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('appearance.importDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('appearance.importDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          data-testid={TEST_IDS.appearance.importTextarea}
          value={text}
          rows={6}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder={t('appearance.importDialog.placeholder')}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value)
            setInvalid(false)
          }}
        />
        {invalid && (
          <p className="text-destructive text-xs">
            {t('appearance.importDialog.invalid')}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('appearance.importDialog.cancel')}
          </Button>
          <Button
            data-testid={TEST_IDS.appearance.importConfirm}
            onClick={submit}
            disabled={!text.trim()}
          >
            {t('appearance.importDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
