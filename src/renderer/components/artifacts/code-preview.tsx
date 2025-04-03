import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { showArtifactSheetAtom } from '@/stores/chat'
import { useAtom } from 'jotai'
import { ReactCodeRunner } from './code-runner'
import { expamleCode } from './example-code'

export function CodePreview() {
  const [showArtifactSheet, setShowArtifactSheet] = useAtom(
    showArtifactSheetAtom
  )
  return (
    <Sheet open={showArtifactSheet} onOpenChange={setShowArtifactSheet}>
      <SheetContent side="right" className="w-[800px] min-w-[800px] p-4">
        <SheetHeader>
          <SheetTitle>Canvas</SheetTitle>
        </SheetHeader>
        <section className="flex-1">
          {/* <header className="flex items-center justify-between"></header> */}

          <ReactCodeRunner code={expamleCode} />

          {/* <SandpackProvider template="react-ts">
            <SandpackLayout>
              <Tabs defaultValue="code" className="h-full w-[800px]">
                <TabsList>
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="code">
                  <SandpackCodeEditor className="overscroll-y-scroll h-[calc(100vh-8rem)]" />
                </TabsContent>
                <TabsContent value="preview">
                  <SandpackPreview className="overscroll-y-scroll h-[calc(100vh-8rem)]" />
                </TabsContent>
              </Tabs>
            </SandpackLayout>
          </SandpackProvider> */}
        </section>
        {/* <SheetFooter>
          <SheetClose asChild>
            <Button type="submit">Save changes</Button>
          </SheetClose>
        </SheetFooter> */}
      </SheetContent>
    </Sheet>
  )
}
