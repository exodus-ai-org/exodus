import { Alert, AlertDescription } from '@/components/ui/alert'
import { subscribeSucceedToRestartServer } from '@/lib/ipc'
import { isMcpServerChangedAtom } from '@/stores/settings'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { motion } from 'framer-motion'
import { useAtom } from 'jotai'
import { AlertCircle, Loader } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'

const MonacoEditor = lazy(() => import('@/components/code-editor'))

export function MCP({ form }: { form: UseFormReturnType }) {
  const [isMcpServerChanged, setIsMcpServerChanged] = useAtom(
    isMcpServerChangedAtom
  )
  const [loading, setLoading] = useState(false)
  const restartServer = () => {
    setLoading(true)
    restartServer()
  }

  useEffect(() => {
    return () =>
      subscribeSucceedToRestartServer(() => {
        setLoading(false)
        setIsMcpServerChanged(false)
        toast.success(
          'The new MCP servers are live! Enjoy chatting with MCP! ( ๑ ˃̵ᴗ˂̵)و ♡'
        )
        window.location.reload()
      })
  }, [setIsMcpServerChanged])

  return (
    <>
      {isMcpServerChanged && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="block">
            We&apos;ve detected an update to your MCP servers&apos;
            configuration. To apply these changes, please click{' '}
            <span
              className="hover:text-primary font-bold underline"
              onClick={restartServer}
            >
              RESTART
            </span>{' '}
            to launch your servers now, or restart the application manually.
          </AlertDescription>
        </Alert>
      )}

      <Suspense fallback={null}>
        <MonacoEditor
          props={{ control: form.control, name: 'mcpServers' }}
          className="-mx-4 !w-[calc(100%+2rem)]"
        />
      </Suspense>

      {loading && (
        <div className="bg-background absolute top-0 left-0 z-100 flex h-full w-full flex-col items-center justify-center gap-4">
          <Loader size={24} strokeWidth={2.5} className="animate-spin" />
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            initial="hidden"
            animate="visible"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2em'
            }}
          >
            {'Restarting...'.split('').map((char, index) => (
              <motion.span
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0
                  }
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>
        </div>
      )}
    </>
  )
}
