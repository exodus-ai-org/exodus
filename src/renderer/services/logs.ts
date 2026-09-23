import { fetcher } from '@exodus/shared/utils/http'

export interface LogRecord {
  timestamp: string
  severityNumber: number
  severityText: string
  body: string
  scope: { name: string }
  attributes?: Record<string, unknown>
  resource?: Record<string, unknown>
  traceId?: string
  originTraceId?: string
}

export interface LogsResponse {
  entries: LogRecord[]
  total: number
  page: number
}

export interface DatesResponse {
  dates: string[]
}

export interface ScopesResponse {
  scopes: string[]
}

/** `paramsString` is a `URLSearchParams` string (date, page, filters). */
export const getLogs = (paramsString: string) =>
  fetcher<LogsResponse>(`/api/v1/logs?${paramsString}`)

export const getLogDates = () => fetcher<DatesResponse>('/api/v1/logs/dates')

export const getLogScopes = (date: string) =>
  fetcher<ScopesResponse>(
    `/api/v1/logs/scopes?date=${encodeURIComponent(date)}`
  )

export const clearLogs = () =>
  fetcher<{ ok: true }>('/api/v1/logs', { method: 'DELETE' })
