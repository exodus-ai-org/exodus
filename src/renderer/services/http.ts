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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any
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
    } else if (isPlainObject(body)) {
      if (!fetchHeaders['Content-Type'] && !fetchHeaders['content-type']) {
        fetchHeaders['Content-Type'] = 'application/json;charset=UTF-8'
      }
      fetchOptions.body = JSON.stringify(body)
    } else {
      // For other types (Blob, ArrayBuffer, etc.), send as is
      fetchOptions.body = body
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
      let errorMessage = `HTTP error! status: ${response.status}`
      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      if (isJson) {
        const errorData = await response.json()
        errorMessage = errorData.message || JSON.stringify(errorData)
      } else {
        const text = await response.text()
        if (text) errorMessage = text
      }
      throw new Error(errorMessage)
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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  }
}
