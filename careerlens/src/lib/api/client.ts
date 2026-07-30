import type { ApiResponse } from './contract'

/**
 * The browser's single door to the API.
 *
 * Every `fetch` in the app went through the same five steps by hand: build the
 * request, `await response.json()`, check three separate truthiness conditions,
 * pick a fallback message, and hope the server sent JSON at all. That last
 * assumption is the one that bit: when a platform gateway times a function out it
 * returns an HTML error page, `response.json()` throws, and the user saw a
 * network-error message for what was actually a timeout.
 *
 * This helper handles all of it once and hands callers a discriminated union.
 */

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId?: string
  readonly retryAfter?: number

  constructor(params: {
    message: string
    code: string
    status: number
    requestId?: string
    retryAfter?: number
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.code = params.code
    this.status = params.status
    this.requestId = params.requestId
    this.retryAfter = params.retryAfter
  }
}

const NETWORK_MESSAGE = 'We could not reach the server. Please check your connection and try again.'
const UNEXPECTED_MESSAGE = 'Something went wrong. Please try again.'

async function readEnvelope<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>
  } catch {
    // Non-JSON body — an infrastructure error page rather than our API.
    throw new ApiError({
      message: response.status >= 500
        ? 'The server took too long to respond. Please try again.'
        : UNEXPECTED_MESSAGE,
      code: 'UPSTREAM_ERROR',
      status: response.status,
    })
  }
}

interface RequestOptions {
  signal?: AbortSignal
}

/**
 * POSTs JSON and returns the unwrapped `data`.
 *
 * @throws {ApiError} carrying the server's user-safe message, ready to render.
 */
export async function postJson<TResponse>(
  path: string,
  body: unknown,
  options: RequestOptions = {}
): Promise<TResponse> {
  let response: Response

  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError({ message: NETWORK_MESSAGE, code: 'NETWORK_ERROR', status: 0 })
  }

  const envelope = await readEnvelope<TResponse>(response)

  if (!envelope.success) {
    throw new ApiError({
      message: envelope.message,
      code: envelope.error,
      status: response.status,
      requestId: envelope.requestId,
      retryAfter: envelope.retryAfter,
    })
  }

  return envelope.data
}

/** POSTs multipart form data. Used only by the CV upload zone. */
export async function postFormData<TResponse>(
  path: string,
  formData: FormData,
  options: RequestOptions = {}
): Promise<TResponse> {
  let response: Response

  try {
    // No Content-Type header: the browser must set the multipart boundary itself.
    response = await fetch(path, { method: 'POST', body: formData, signal: options.signal })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError({ message: NETWORK_MESSAGE, code: 'NETWORK_ERROR', status: 0 })
  }

  const envelope = await readEnvelope<TResponse>(response)

  if (!envelope.success) {
    throw new ApiError({
      message: envelope.message,
      code: envelope.error,
      status: response.status,
      requestId: envelope.requestId,
    })
  }

  return envelope.data
}

/** Extracts a renderable message from anything thrown by the helpers above. */
export function toDisplayMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'That request was cancelled.'
  }
  return UNEXPECTED_MESSAGE
}
