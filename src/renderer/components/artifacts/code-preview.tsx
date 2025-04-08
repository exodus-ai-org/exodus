import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle
} from '@/components/ui/sheet'
import { useSidebar } from '@/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { showArtifactSheetAtom } from '@/stores/chat'
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider
} from '@codesandbox/sandpack-react'
import { useAtom } from 'jotai'
import { X } from 'lucide-react'
import { dependencies } from './essential-deps'
import { exampleCode } from './example-code'
import { importFiles } from './import-files'

export function CodePreview() {
  const [showArtifactSheet, setShowArtifactSheet] = useAtom(
    showArtifactSheetAtom
  )
  const { open: sideBarIsOpen, toggleSidebar } = useSidebar()

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setShowArtifactSheet(open)
    }
  }

  const handleCloseSheet = () => {
    if (!sideBarIsOpen) {
      toggleSidebar()
    }

    setShowArtifactSheet(false)
  }

  return (
    <Sheet
      open={showArtifactSheet}
      onOpenChange={handleOpenChange}
      modal={false}
    >
      <SheetContent
        className="max-w-[calc(100vw-25rem)] min-w-[calc(100vw-25rem)] p-4 [&>button:last-of-type]:hidden"
        aria-describedby={undefined}
      >
        <SheetTitle className="flex items-center gap-2">
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={handleCloseSheet}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>

          <p>New Document</p>
        </SheetTitle>

        <section className="flex-1">
          <SandpackProvider
            theme="auto"
            template="react-ts"
            files={{
              'App.tsx': exampleCode.trim(),
              ...importFiles,
              '/tsconfig.json': {
                code: `{
                      "include": [
                        "./**/*"
                      ],
                      "compilerOptions": {
                        "strict": true,
                        "esModuleInterop": true,
                        "lib": [ "dom", "es2015" ],
                        "jsx": "react-jsx",
                        "baseUrl": "./",
                        "paths": {
                          "@/components/*": ["components/*"],
                          "@/lib/*": ["lib/*"]
                        }
                      }
                    }
                  `
              }
            }}
            options={{
              externalResources: [
                'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'
              ]
            }}
            customSetup={{
              dependencies
            }}
          >
            <SandpackLayout className="bg-background">
              <Tabs defaultValue="code" className="h-full w-full">
                <TabsList>
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="code">
                  <SandpackCodeEditor className="overscroll-y-scroll h-[calc(100vh-8.2rem)]" />
                </TabsContent>
                <TabsContent value="preview">
                  <SandpackPreview
                    showNavigator={false}
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    showRestartButton={false}
                    showOpenNewtab={false}
                    className="overscroll-y-scroll h-[calc(100vh-8.2rem)]"
                  />
                </TabsContent>
              </Tabs>
            </SandpackLayout>
          </SandpackProvider>
        </section>
      </SheetContent>
    </Sheet>
  )
}
