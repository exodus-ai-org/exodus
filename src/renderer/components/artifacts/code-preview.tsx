import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useArtifact } from '@/hooks/use-artifact'
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider
} from '@codesandbox/sandpack-react'
import { X } from 'lucide-react'
import { useTheme } from '../theme-provider'
import { dependencies } from './essential-deps'
import { exampleCode } from './example-code'
import { importFiles } from './import-files'

export function CodePreview() {
  const { show: isArtifactVisible, closeArtifact } = useArtifact()
  const { actualTheme } = useTheme()

  return (
    <Sheet
      open={isArtifactVisible}
      onOpenChange={() => {
        // Do nothing:
        // Ensure the sheet remains open when a click occurs outside its boundaries.
      }}
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
              onClick={closeArtifact}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>

          <p>New Document</p>
        </SheetTitle>

        <section className="flex-1">
          <SandpackProvider
            theme={actualTheme}
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
