import { useAtom } from 'jotai'
import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useChatSearch } from '@/hooks/use-chat-search'
import { isFullTextSearchVisibleAtom } from '@/stores/chat'

export function SearchDialog() {
  const { t } = useTranslation('chat')
  const [isFullTextSearchVisible, setIsFullTextSearchVisible] = useAtom(
    isFullTextSearchVisibleAtom
  )
  const [query, setQuery] = useState('')
  const { data } = useChatSearch(query)

  const handleInputChange = (value: string) => {
    setQuery(value)
  }

  return (
    <Dialog
      open={isFullTextSearchVisible}
      onOpenChange={(oepn) => {
        setIsFullTextSearchVisible(oepn)
        setQuery('')
      }}
    >
      <DialogContent className="gap-0 p-0 md:max-w-[680px] md:min-w-[680px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2 border-b px-3 py-1">
              <SearchIcon size={20} />
              <input
                placeholder={t('sidebar.search.placeholder')}
                aria-label={t('sidebar.search.ariaLabel')}
                autoFocus
                onChange={(e) => handleInputChange(e.target.value)}
                className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm font-normal outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </DialogTitle>
          <DialogDescription aria-describedby={undefined} />
        </DialogHeader>

        <ol className="flex flex-col gap-2 p-2 pt-0">
          {data.length === 0 ? (
            <div className="text-ring flex h-40 items-center justify-center">
              {t('sidebar.search.noContents')}
            </div>
          ) : (
            data.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/chat/${item.chatId}`}
                  onClick={() => {
                    setIsFullTextSearchVisible(false)
                    setQuery('')
                  }}
                >
                  <div className="hover:bg-accent relative flex flex-col rounded-lg px-4 py-3 transition-colors">
                    <p className="text-primary truncate text-sm">
                      {item.title}
                    </p>
                    <p className="text-ring line-clamp-2 pt-1 text-xs">
                      {(() => {
                        const content = item.content
                        if (typeof content === 'string') return content
                        if (Array.isArray(content)) {
                          const textBlock = content.find(
                            (c): c is { type: 'text'; text: string } =>
                              c.type === 'text' && c.text !== ''
                          )
                          return textBlock ? textBlock.text : ''
                        }
                        return ''
                      })()}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
