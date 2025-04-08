import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { showArtifactSheetAtom } from '@/stores/chat'
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider
} from '@codesandbox/sandpack-react'
import { useAtom } from 'jotai'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { dependencies } from './essential-deps'
import { exampleCode } from './example-code'
import { importFiles } from './import-files'

export function CodePreview() {
  const [showArtifactSheet, setShowArtifactSheet] = useAtom(
    showArtifactSheetAtom
  )
  return (
    <Sheet open={showArtifactSheet} onOpenChange={setShowArtifactSheet}>
      <SheetContent side="right" className="w-[800px] min-w-[800px] p-4">
        <SheetHeader>
          <SheetTitle>Artifact</SheetTitle>
        </SheetHeader>
        <section className="flex-1">
          {/* <header className="flex items-center justify-between"></header> */}

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
              <Tabs defaultValue="code" className="h-full w-[800px]">
                <TabsList>
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="code">
                  <SandpackCodeEditor className="overscroll-y-scroll h-[calc(100vh-9.4rem)]" />
                </TabsContent>
                <TabsContent value="preview">
                  <SandpackPreview
                    showNavigator={false}
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    showRestartButton={false}
                    showOpenNewtab={false}
                    className="overscroll-y-scroll h-[calc(100vh-9.4rem)]"
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
