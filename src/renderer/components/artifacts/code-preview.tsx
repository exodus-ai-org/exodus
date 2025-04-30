import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle
} from '@/components/ui/sheet'
import { useArtifact } from '@/hooks/use-artifact'
import { useClipboard } from '@/hooks/use-clipboard'
import { cn } from '@/lib/utils'
import {
  Navigator,
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useActiveCode,
  useSandpack
} from '@codesandbox/sandpack-react'
import { DialogTitle } from '@radix-ui/react-dialog'
import {
  AppWindowMac,
  Check,
  ChevronsRight,
  Code,
  Copy,
  Download,
  GitFork,
  Maximize,
  MousePointerClick
} from 'lucide-react'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useTheme } from '../theme-provider'
import { Dialog, DialogContent } from '../ui/dialog'
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
              <SelectItem value="v1">Version 1</SelectItem>
              <SelectItem value="v2">Version 2</SelectItem>
              <SelectItem value="v3">Version 3</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

function CodeEditor() {
  const {
    sandpack: { activeFile }
  } = useSandpack()
  const { code } = useActiveCode()
  const { copied, handleCopy } = useClipboard()
  return (
    <>
      <SandpackFileExplorer className="!bg-primary-foreground !h-[calc(100vh-7.5625rem)]" />
      <div className="bg-background absolute top-0 right-0 z-10 flex items-center gap-4 py-1 pl-2 dark:bg-[#151515]">
        <span className="text-ring font-semibold">
          {activeFile.replace(/^\//, '')}
        </span>
        <div className="flex items-center gap-1 pr-2">
          <Button
            variant="ghost"
            className="text-ring h-7 w-7 cursor-pointer"
            onClick={() => {
              if (copied !== code) {
                handleCopy(code)
              }
            }}
          >
            {copied === code ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" className="text-ring h-7 w-7 cursor-pointer">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <SandpackCodeEditor
        showLineNumbers
        showRunButton={false}
        showTabs={false}
        showInlineErrors
        className="!h-[calc(100vh-7.5625rem)]"
      />
    </>
  )
}

export function CodePreview() {
  const [isExpanded, setIsExpanded] = useState(false)
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
            ...importFiles
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

          <SandpackLayout className="relative !rounded-none !rounded-br-lg !rounded-bl-lg !border-none">
            {tabType === TabType.Code && <CodeEditor />}
            {tabType === TabType.Preview && (
              <div className="flex w-full flex-col">
                <div className="flex">
                  <Navigator clientId={''} className="flex-1" />
                  <div className="bg-background flex items-center gap-1 border-b border-[#efefef] pr-2 dark:border-[#252525] dark:bg-[#151515]">
                    <Button
                      variant="ghost"
                      className="text-ring h-7 w-7 cursor-pointer"
                    >
                      <MousePointerClick className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-ring h-7 w-7 cursor-pointer"
                      onClick={() => setIsExpanded(true)}
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-ring h-7 w-7 cursor-pointer"
                    >
                      <GitFork className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <SandpackPreview
                  showNavigator={false}
                  showOpenInCodeSandbox={false}
                  showRefreshButton={false}
                  showRestartButton={false}
                  showOpenNewtab={false}
                  className="!h-[calc(100vh-10.0625rem)]"
                />

                <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                  <DialogTitle />
                  <DialogContent
                    className="h-11/12 max-w-11/12 min-w-11/12 border-none p-0 [&_.sp-navigator]:rounded-tl-lg [&_.sp-navigator]:rounded-tr-lg [&_.sp-preview]:rounded-lg [&_.sp-preview]:rounded-tr-lg [&_.sp-preview-container]:rounded-br-lg [&_.sp-preview-container]:rounded-bl-lg [&_.sp-preview-container]:bg-transparent [&>button:last-of-type]:top-3 [&>button:last-of-type]:cursor-pointer"
                    aria-describedby={undefined}
                  >
                    <SandpackPreview
                      showNavigator={true}
                      showOpenInCodeSandbox={false}
                      showRefreshButton={false}
                      showRestartButton={false}
                      showOpenNewtab={false}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </SandpackLayout>
        </SandpackProvider>
      </SheetContent>
    </Sheet>
  )
}
