import { BASE_URL } from '@shared/constants/systems'
import { fetcher } from '@shared/utils/http'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FolderOpenIcon,
  Trash2Icon
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { SettingsSection } from '../settings-row'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LogEntry {
  ts: string
  level: string
  surface: string
  message: string
  detail?: object
}

interface LogsResponse {
  entries: LogEntry[]
  total: number
  page: number
}

interface DatesResponse {
  dates: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVELS = ['All', 'debug', 'info', 'warn', 'error'] as const

const SURFACES = [
  'All',
  'chat',
  'database',
  'agent_x',
  'mcp',
  'audio',
  'memory',
  'deep_research',
  'scheduler',
  's3',
  'skills',
  'lcm',
  'tools',
  'app',
  'server',
  'migration'
] as const

const PAGE_SIZE = 100

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: string): string {
  try {
    const d = new Date(ts)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    const ms = String(d.getMilliseconds()).padStart(3, '0')
    return `${h}:${m}:${s}.${ms}`
  } catch {
    return ts
  }
}

function levelColor(level: string) {
  switch (level) {
    case 'debug':
      return 'secondary'
    case 'info':
      return 'default'
    case 'warn':
      return 'outline'
    case 'error':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function levelClassName(level: string) {
  switch (level) {
    case 'info':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'warn':
      return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
    default:
      return ''
  }
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Logger() {
  const [date, setDate] = useState(todayStr)
  const [level, setLevel] = useState('All')
  const [surface, setSurface] = useState('All')
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Debounce keyword
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword)
      setPage(1)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [keyword])

  // Build SWR key
  const params = new URLSearchParams({
    date,
    page: String(page),
    pageSize: String(PAGE_SIZE)
  })
  if (level !== 'All') params.set('level', level)
  if (surface !== 'All') params.set('surface', surface)
  if (debouncedKeyword) params.set('keyword', debouncedKeyword)

  const logsKey = `/api/logs?${params.toString()}`

  const { data: logsData, mutate } = useSWR<LogsResponse>(logsKey)
  const { data: datesData } = useSWR<DatesResponse>('/api/logs/dates')

  const entries = logsData?.entries ?? []
  const total = logsData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const dates = datesData?.dates ?? []
  // Ensure today is always available in the date list
  const dateOptions = dates.includes(todayStr())
    ? dates
    : [todayStr(), ...dates]

  // Actions
  const handleOpenDir = useCallback(() => {
    window.electron.ipcRenderer.invoke('open-logs-dir')
  }, [])

  const handleExport = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/logs/export?date=${date}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs-${date}.jsonl`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Logs exported')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }, [date])

  const handleClearAll = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete all log files?'))
      return
    try {
      await fetcher('/api/logs', { method: 'DELETE' })
      toast.success('All logs cleared')
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear logs')
    }
  }, [mutate])

  return (
    <SettingsSection>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date select */}
        <Select
          value={date}
          onValueChange={(v) => {
            if (v) setDate(v)
            setPage(1)
            setExpandedIndex(null)
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {dateOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Level select */}
        <Select
          value={level}
          onValueChange={(v) => {
            if (v) setLevel(v)
            setPage(1)
            setExpandedIndex(null)
          }}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Surface select */}
        <Select
          value={surface}
          onValueChange={(v) => {
            if (v) setSurface(v)
            setPage(1)
            setExpandedIndex(null)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Surface" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SURFACES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Keyword search */}
        <Input
          className="w-[180px]"
          placeholder="Search keyword..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <Button variant="outline" size="sm" onClick={handleOpenDir}>
          <FolderOpenIcon className="mr-1.5 h-3.5 w-3.5" />
          Open Directory
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <DownloadIcon className="mr-1.5 h-3.5 w-3.5" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={handleClearAll}>
          <Trash2Icon className="mr-1.5 h-3.5 w-3.5" />
          Clear All
        </Button>
      </div>

      {/* Log table */}
      <div className="border-border overflow-hidden rounded-md border">
        {/* Header */}
        <div className="bg-muted/50 flex items-center gap-3 px-3 py-2 text-xs font-medium">
          <span className="w-[90px] shrink-0">Time</span>
          <span className="w-[60px] shrink-0">Level</span>
          <span className="w-[120px] shrink-0">Surface</span>
          <span className="flex-1">Message</span>
        </div>

        {/* Rows */}
        <div className="max-h-[480px] overflow-y-auto">
          {entries.length === 0 && (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No log entries found.
            </div>
          )}
          {entries.map((entry, idx) => (
            <div key={`${entry.ts}-${idx}`}>
              <div
                className="hover:bg-muted/30 flex cursor-pointer items-start gap-3 border-t px-3 py-1.5 text-xs transition-colors"
                onClick={() =>
                  setExpandedIndex(expandedIndex === idx ? null : idx)
                }
              >
                <span className="text-muted-foreground w-[90px] shrink-0 font-mono">
                  {formatTime(entry.ts)}
                </span>
                <span className="w-[60px] shrink-0">
                  <Badge
                    variant={levelColor(entry.level)}
                    className={`text-[10px] ${levelClassName(entry.level)}`}
                  >
                    {entry.level}
                  </Badge>
                </span>
                <span className="w-[120px] shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    {entry.surface}
                  </Badge>
                </span>
                <span className="flex-1 truncate">{entry.message}</span>
              </div>
              {expandedIndex === idx && entry.detail && (
                <div className="bg-muted/20 border-t px-3 py-2">
                  <pre className="text-muted-foreground max-h-[300px] overflow-auto text-xs whitespace-pre-wrap">
                    {JSON.stringify(entry.detail, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} {total === 1 ? 'entry' : 'entries'} total
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => Math.max(1, p - 1))
              setExpandedIndex(null)
            }}
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Prev
          </Button>
          <span className="text-muted-foreground text-xs">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1))
              setExpandedIndex(null)
            }}
          >
            Next
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}
