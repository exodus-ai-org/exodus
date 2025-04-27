import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle
} from '@/components/ui/sheet'
import { useArtifact } from '@/hooks/use-artifact'
import { cn } from '@/lib/utils'
import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack
} from '@codesandbox/sandpack-react'
import {
  AppWindowMac,
  ChevronsRight,
  Code,
  Download,
  GitFork
} from 'lucide-react'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useTheme } from '../theme-provider'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { dependencies } from './essential-deps'
import { exampleCode } from './example-code'
import { importFiles } from './import-files'

enum TabType {
  Preview,
  Code
}

function CodePreviewActions({
  tabType,
  setTabType
}: {
  tabType: TabType
  setTabType: Dispatch<SetStateAction<TabType>>
}) {
  const { sandpack } = useSandpack()
  const { closeArtifact } = useArtifact()

  useEffect(() => {
    if (tabType === TabType.Preview) {
      console.log('xxx')
      sandpack.runSandpack()
    }

    // ⚠️ DO NOT ADD `sandpack` to the dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabType])

  return (
    <>
      <div className="flex items-center gap-2">
        <SheetClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-ring h-7 w-7 cursor-pointer"
            onClick={closeArtifact}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </SheetClose>

        <Button
          variant="ghost"
          className={cn('text-ring h-7 cursor-pointer', {
            ['bg-accent text-accent-foreground dark:bg-accent/50']:
              tabType === TabType.Preview
          })}
          onClick={() => {
            setTabType(TabType.Preview)
          }}
        >
          <AppWindowMac className="h-4 w-4" />
          Preview
        </Button>
        <Button
          variant="ghost"
          className={cn('text-ring h-7 cursor-pointer', {
            ['bg-accent text-accent-foreground dark:bg-accent/50']:
              tabType === TabType.Code
          })}
          onClick={() => setTabType(TabType.Code)}
        >
          <Code className="h-4 w-4" />
          Code
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" className="text-ring h-7 w-7 cursor-pointer">
          <GitFork className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="text-ring h-7 w-7 cursor-pointer">
          <Download className="h-4 w-4" />
        </Button>
        <Select>
          <SelectTrigger className="h-7 w-fit">
            <SelectValue placeholder="V1" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="v1">
                <p>Version 1</p>
                <p>8 days ago</p>
              </SelectItem>
              <SelectItem value="v1">Banana</SelectItem>
              <SelectItem value="blueberry">Blueberry</SelectItem>
              <SelectItem value="grapes">Grapes</SelectItem>
              <SelectItem value="pineapple">Pineapple</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

export function CodePreview() {
  const { show: isArtifactVisible } = useArtifact()
  const [tabType, setTabType] = useState(TabType.Code)
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
        className="my-14 mr-4 box-content flex h-[calc(100dvh-4.5rem)] max-w-[calc(100vw-26rem)] min-w-[calc(100vw-26rem)] gap-0 rounded-lg border-1 p-0 shadow-none [&>button:last-of-type]:hidden"
        aria-describedby={undefined}
      >
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
          <SheetTitle className="flex items-center justify-between border-b px-2 py-2.5">
            <CodePreviewActions tabType={tabType} setTabType={setTabType} />
          </SheetTitle>

          <SandpackLayout className="!rounded-none !rounded-br-lg !rounded-bl-lg !border-none">
            {tabType === TabType.Code && (
              <>
                <SandpackFileExplorer className="!bg-primary-foreground !h-[calc(100vh-7.5625rem)]" />
                <SandpackCodeEditor
                  showRunButton={false}
                  showTabs={false}
                  className="!h-[calc(100vh-7.5625rem)]"
                />
              </>
            )}
            {tabType === TabType.Preview && (
              <SandpackPreview
                showNavigator
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                showRestartButton={false}
                showOpenNewtab={false}
                className="!h-[calc(100vh-7.5625rem)]"
              />
            )}
          </SandpackLayout>
        </SandpackProvider>
      </SheetContent>
    </Sheet>
  )
}
