import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { isFullTextSearchVisibleAtom } from '@/stores/chat'
import { UIMessage } from 'ai'
import { useAtom } from 'jotai'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import useSWR from 'swr'

export function SearchDialog() {
  const [isFullTextSearchVisible, setIsFullTextSearchVisible] = useAtom(
    isFullTextSearchVisibleAtom
  )
  const [query, setQuery] = useState('')
  const debouncedValue = useDebouncedValue(query)

  const handleInputChange = (value: string) => {
    setQuery(value)
  }

  const { data } = useSWR<Array<UIMessage & { title: string; chatId: string }>>(
    query ? `/api/chat/search?query=${debouncedValue}` : null,
    {
      fallbackData: []
    }
  )

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
              <Search size={20} />
              <input
                placeholder="Search Chat..."
                autoFocus
                onChange={(e) => handleInputChange(e.target.value)}
                className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm font-normal outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </DialogTitle>
          <DialogDescription aria-describedby={undefined} />
        </DialogHeader>

        <ol className="flex flex-col gap-2 p-2 pt-0">
          {!data || data.length === 0 ? (
            <div className="text-ring flex h-40 items-center justify-center">
              No contents
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
                  <div className="hover:bg-accent relative flex flex-col rounded-lg px-4 py-3 transition-all duration-300 hover:transition-all hover:duration-300">
                    <p className="text-primary truncate text-sm">
                      {item.title}
                    </p>
                    <p className="text-ring line-clamp-2 pt-1 text-xs">
                      {
                        item.parts
                          .filter((item) => item.type === 'text')
                          .find((item) => item.text !== '')?.text
                      }
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
