import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import {
  Delete02Icon,
  FileExportIcon,
  MoreHorizontalIcon,
  Pdf01Icon,
  PencilEdit02Icon,
  StarIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useUpdateChat } from '@/hooks/use-chat-history'
import { chatToMarkdown, exportFileName } from '@/lib/chat-export'
import { cn, downloadFile } from '@/lib/utils'
import { markdownToPdf } from '@/services/tools'
import {
  chatMessagesAtom,
  renamedChatTitleAtom,
  toBeDeletedChatAtom
} from '@/stores/chat'
import type { Chat } from '@/types/db'

/**
 * The `▾` beside the title (spec 2026-10-08 §4): rename, favourite, export
 * as Markdown or PDF, delete — the sidebar row's actions, for the chat on
 * screen. `chat` is undefined until the history list has the chat (its first
 * reply still streaming): the menu waits.
 */
export function ChatMenu({ chat }: { chat: Chat | undefined }) {
  const { t } = useTranslation(['common', 'chat'])
  const messages = useAtomValue(chatMessagesAtom)
  const setRenamedChatTitle = useSetAtom(renamedChatTitleAtom)
  const setToBeDeletedChat = useSetAtom(toBeDeletedChatAtom)
  const { mutate: updateChat } = useUpdateChat()

  if (!chat) return null

  const markdown = () =>
    chatToMarkdown(chat.title, messages, {
      you: t('chat:export.you'),
      assistant: t('chat:export.assistant'),
      references: t('chat:deepResearchCard.referencesHeading'),
      pictures: (count) => t('chat:export.pictures', { count }),
      tool: (name) => t('chat:export.tool', { name })
    })
  const exportMarkdown = () =>
    downloadFile(
      new Blob([markdown()], { type: 'text/markdown;charset=utf-8' }),
      `${exportFileName(chat.title)}.md`
    )
  const exportPdf = async () => {
    try {
      downloadFile(
        await markdownToPdf(markdown()),
        `${exportFileName(chat.title)}.pdf`
      )
    } catch (error) {
      sileo.error({
        title: t('chat:header.exportFailed'),
        description: error instanceof Error ? error.message : undefined
      })
    }
  }
  const empty = messages.length === 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="no-drag text-muted-foreground hover:text-foreground"
            aria-label={t('chat:header.menu')}
            data-testid={TEST_IDS.chat.header.menu}
          />
        }
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-lg" align="end">
        <DropdownMenuItem
          onClick={() =>
            setRenamedChatTitle({ id: chat.id, title: chat.title, open: true })
          }
        >
          <HugeiconsIcon
            icon={PencilEdit02Icon}
            className="text-muted-foreground"
          />
          <span>{t('chat:sidebar.history.rename')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateChat({ id: chat.id, favorite: !chat.favorite })}
        >
          <HugeiconsIcon
            icon={StarIcon}
            className={cn(
              'text-muted-foreground',
              chat.favorite && 'fill-yellow-500 text-yellow-500'
            )}
          />
          <span>
            {chat.favorite
              ? t('chat:sidebar.history.unfavorite')
              : t('chat:sidebar.history.favoriteAction')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={empty} onClick={exportMarkdown}>
          <HugeiconsIcon
            icon={FileExportIcon}
            className="text-muted-foreground"
          />
          <span>{t('chat:header.exportMarkdown')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={empty} onClick={() => void exportPdf()}>
          <HugeiconsIcon icon={Pdf01Icon} className="text-muted-foreground" />
          <span>{t('chat:header.exportPdf')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setToBeDeletedChat(chat)}
        >
          <HugeiconsIcon icon={Delete02Icon} />
          <span>{t('action.delete')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
