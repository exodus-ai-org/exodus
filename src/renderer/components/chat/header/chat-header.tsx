import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SidebarRightIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { useAtom, useAtomValue } from 'jotai'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useChatHistory } from '@/hooks/use-chat-history'
import { useRouteHistory } from '@/hooks/use-route-history'
import { chatPanelItems, hasPanelItems } from '@/lib/chat-panel-items'
import { cn } from '@/lib/utils'
import { chatMessagesAtom, chatPanelAtom } from '@/stores/chat'
import { chatStatusAtom } from '@/stores/input'

import { ChatMenu } from './chat-menu'
import { ModelChip } from './model-chip'
import { PhoneDot } from './phone-dot'

/**
 * The chat header (spec 2026-10-08 §2), after the sidebar trigger: `←` `→`
 * over the app's own page history on the left; on a chat page the title, a
 * dot while a reply is on its way, the model chip and the `▾` menu in the
 * middle; the phone dot and the panel toggle on the right. The header is the
 * window's drag region, so every control here is `no-drag`.
 */
export function ChatHeader() {
  const { t } = useTranslation('chat')
  const { id } = useParams<{ id: string }>()
  const { canGoBack, canGoForward, goBack, goForward } = useRouteHistory()

  return (
    <TooltipProvider>
      <div className="flex min-w-0 flex-1 items-center gap-0.5 self-stretch">
        <HeaderButton
          label={t('header.back')}
          icon={ArrowLeft01Icon}
          disabled={!canGoBack}
          onClick={goBack}
          testId={TEST_IDS.chat.header.back}
        />
        <HeaderButton
          label={t('header.forward')}
          icon={ArrowRight01Icon}
          disabled={!canGoForward}
          onClick={goForward}
          testId={TEST_IDS.chat.header.forward}
        />
        <div className="flex min-w-0 flex-1 items-center justify-center px-2">
          {id && <TitleGroup id={id} />}
        </div>
        <PhoneDot />
        {id && <PanelToggle />}
      </div>
    </TooltipProvider>
  )
}

function HeaderButton({
  label,
  icon,
  disabled,
  pressed,
  onClick,
  testId
}: {
  label: string
  icon: IconSvgElement
  disabled?: boolean
  pressed?: boolean
  onClick: () => void
  testId: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'no-drag text-muted-foreground hover:text-foreground',
              pressed && 'bg-accent text-foreground'
            )}
            aria-label={label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
            data-testid={testId}
          />
        }
      >
        <HugeiconsIcon icon={icon} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** The title (the list's, live: the title stream invalidates the list), a dot while replying, the chip, the menu. */
function TitleGroup({ id }: { id: string }) {
  const { t } = useTranslation('chat')
  const { data: history } = useChatHistory()
  const chat = history?.find((c) => c.id === id)
  const title = chat?.title ?? t('sidebar.newChat')
  const status = useAtomValue(chatStatusAtom)
  const replying = status === 'submitted' || status === 'streaming'

  return (
    <div className="no-drag flex max-w-lg min-w-0 items-center gap-2">
      <h1
        className="truncate text-sm font-medium"
        title={title}
        data-testid={TEST_IDS.chat.header.title}
      >
        {title}
      </h1>
      {replying && (
        <span
          className="bg-primary-ink size-1.5 shrink-0 rounded-full"
          role="status"
          aria-label={t('header.streaming')}
          data-streaming=""
        />
      )}
      <ModelChip />
      <ChatMenu chat={chat} />
    </div>
  )
}

/** Opens the panel on its last section; a dot when it has anything to show. */
function PanelToggle() {
  const { t } = useTranslation('chat')
  const [panel, setPanel] = useAtom(chatPanelAtom)
  const messages = useAtomValue(chatMessagesAtom)
  const hasItems = useMemo(
    () => hasPanelItems(chatPanelItems(messages)),
    [messages]
  )
  return (
    <div className="relative">
      <HeaderButton
        label={t('header.panel')}
        icon={SidebarRightIcon}
        pressed={panel.open}
        onClick={() =>
          setPanel({ ...panel, open: !panel.open, runId: undefined })
        }
        testId={TEST_IDS.chat.header.panelToggle}
      />
      {hasItems && (
        <span
          className="bg-primary-ink pointer-events-none absolute top-1 right-1 size-1.5 rounded-full"
          data-has-items=""
        />
      )}
    </div>
  )
}
