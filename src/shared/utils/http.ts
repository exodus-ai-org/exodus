import { BASE_URL } from '@shared/constants/systems'

type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'

type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer'

interface HttpFetchOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: Record<string, unknown> | FormData | Blob | ArrayBuffer | string
  query?: Record<string, string | number | boolean>
  timeout?: number // in milliseconds
  responseType?: ResponseType // expected response type
}

function isPlainObject(value: object): value is Record<string, object> {
  return (
    Object.prototype.toString.call(value) === '[object Object]' &&
    (value.constructor === Object || value.constructor == null)
  )
}

/**
 * Anthropic-style error response shape:
 * { type: "error", error: { code: "ERROR_CODE", message: "..." } }
 */
interface ErrorResponseBody {
  type: 'error'
  error: {
    code: string
    message: string
  }
}

function isErrorResponse(data: unknown): data is ErrorResponseBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as ErrorResponseBody).type === 'error' &&
    'error' in data &&
    typeof (data as ErrorResponseBody).error?.message === 'string'
  )
}

export class HttpError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.code = code
  }
}

export async function fetcher<T>(
  url: string,
  options: HttpFetchOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body = null,
    query = null,
    timeout = 0,
    responseType = 'json'
  } = options

  // Build query string if query parameters are provided
  let requestUrl = BASE_URL + url
  if (query && typeof query === 'object') {
    const queryString = new URLSearchParams(
      Object.entries(query).map(([key, value]) => [key, String(value)])
    ).toString()
    if (queryString) {
      requestUrl += (url.includes('?') ? '&' : '?') + queryString
    }
  }

  // Clone headers to avoid mutating input
  const fetchHeaders: Record<string, string> = { ...headers }

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: fetchHeaders
  }

  // Handle body for methods that support it
  if (
    body &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method!)
  ) {
    // Detect if body is FormData
    const isFormData =
      typeof FormData !== 'undefined' && body instanceof FormData

    if (isFormData) {
      fetchOptions.body = body
      // Remove Content-Type header if set, let browser handle it
      if (fetchHeaders['Content-Type']) delete fetchHeaders['Content-Type']
      if (fetchHeaders['content-type']) delete fetchHeaders['content-type']
    } else if (
      typeof body === 'object' &&
      body !== null &&
      isPlainObject(body as object)
    ) {
      if (!fetchHeaders['Content-Type'] && !fetchHeaders['content-type']) {
        fetchHeaders['Content-Type'] = 'application/json;charset=UTF-8'
      }
      fetchOptions.body = JSON.stringify(body)
    } else {
      // For other types (Blob, ArrayBuffer, string, etc.), send as is
      fetchOptions.body = body as BodyInit
      // Content-Type should be set by caller if needed
    }
  }

  // Handle timeout with AbortController if timeout > 0
  let controller: AbortController | undefined
  let timeoutId: number | undefined
  if (timeout > 0) {
    controller = new AbortController()
    fetchOptions.signal = controller.signal
    timeoutId = window.setTimeout(() => controller!.abort(), timeout)
  }

  try {
    const response = await fetch(requestUrl, fetchOptions)
    if (timeoutId !== undefined) clearTimeout(timeoutId)

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || ''

      // Try to parse Anthropic-style error JSON
      if (contentType.includes('application/json')) {
        const data = await response.json()
        if (isErrorResponse(data)) {
          throw new HttpError(
            response.status,
            data.error.code,
            data.error.message
          )
        }
        // Fallback for non-standard JSON errors
        throw new HttpError(
          response.status,
          'UNKNOWN_ERROR',
          data.message || JSON.stringify(data)
        )
      }

      // Plain text fallback
      const text = await response.text()
      throw new HttpError(
        response.status,
        'UNKNOWN_ERROR',
        text || `HTTP error! status: ${response.status}`
      )
    }

    switch (responseType) {
      case 'json':
        return (await response.json()) as T
      case 'text':
        return (await response.text()) as unknown as T
      case 'blob':
        return (await response.blob()) as unknown as T
      case 'arrayBuffer':
        return (await response.arrayBuffer()) as unknown as T
      default:
        return (await response.json()) as T
    }
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(408, 'TIMEOUT', 'Request timed out')
    }
    throw error
  }
}
