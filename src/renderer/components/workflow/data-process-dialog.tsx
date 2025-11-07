import { Dialog, DialogContent } from '@/components/ui/dialog'
import { isDataFlowDialogVisibleAtom } from '@/stores/workflow'
import { useAtom } from 'jotai'
import { ReactNode } from 'react'
import { Card } from '../ui/card'

export function DataFlowDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useAtom(isDataFlowDialogVisibleAtom)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] min-h-[90vh] max-w-[90vw] min-w-[90vw] p-0 [&>button]:hidden">
        <div className="relative">
          <div className="flex h-full">
            <section className="no-scrollbar flex-1 overflow-y-scroll p-4">
              <header className="mb-2 font-medium">Input</header>
              <div className="h-full" />
            </section>
            <section className="w-90" />
            <section className="no-scrollbar flex-1 overflow-y-scroll p-4">
              <header className="mb-2 font-medium">Output</header>
              <div className="h-full" />
            </section>
          </div>

          <Card className="no-scrollbar absolute -top-6 right-0 left-0 m-auto h-[calc(100%+3rem)] w-90 overflow-y-scroll p-4">
            {children}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
