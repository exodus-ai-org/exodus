import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { showArtifactSheetAtom } from '@/stores/chat'
import { useAtom } from 'jotai'

export function CodePreview() {
  const [showArtifactSheet, setShowArtifactSheet] = useAtom(
    showArtifactSheetAtom
  )
  return (
    <Sheet open={showArtifactSheet} onOpenChange={setShowArtifactSheet}>
      <SheetContent side="right" className="w-[800px] min-w-[800px] p-4">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <section className="flex-1">
          {/* <header className="flex items-center justify-between"></header> */}
          <Tabs defaultValue="code" className="h-full w-[800px]">
            <TabsList>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="code">CODE</TabsContent>
            <TabsContent value="preview">PREVEW</TabsContent>
          </Tabs>
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
