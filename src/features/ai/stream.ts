import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { ApiError, apiUrl } from '@/features/projects/api'
import type { AssistantMessage, AssistantRequest, AssistantStreamEvent, ErrorCode } from '@/features/projects/types'

/**
 * Nova's streaming answer: POST /api/assistant/messages/stream (text/event-stream). EventSource cannot POST, so the
 * body is read with fetch + ReadableStream and parsed by the small SSE parser below (unit-tested in stream.test.ts).
 *
 *   const r = await streamAssistant(body, { signal, onEvent: (e) => … })   // seen → route → instant? → delta* → done
 *   if (r === 'unsupported') …                                              // old server: use the JSON endpoint
 */

export interface SseFrame {
  event: string
  data: string
  id?: string
}

/** incremental text/event-stream parser: push() any chunks (split anywhere), end() flushes the last frame */
export function createSseParser(onFrame: (f: SseFrame) => void): { push: (chunk: string) => void; end: () => void } {
  let buf = ''
  let event = ''
  let data: string[] = []
  let id: string | undefined
  const dispatch = () => {
    if (data.length) onFrame({ event: event || 'message', data: data.join('\n'), ...(id !== undefined ? { id } : {}) })
    event = ''
    data = []
  }
  const line = (l: string) => {
    if (l === '') return dispatch()
    if (l.startsWith(':')) return // comment / keep-alive
    const colon = l.indexOf(':')
    const field = colon < 0 ? l : l.slice(0, colon)
    let value = colon < 0 ? '' : l.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
    else if (field === 'id') id = value
  }
  return {
    push(chunk) {
      buf += chunk
      // a lone \r at the very end may be the first half of \r\n: keep it for the next chunk
      for (;;) {
        const m = /\r\n|\r|\n/.exec(buf)
        if (!m) break
        if (m[0] === '\r' && m.index === buf.length - 1) break
        line(buf.slice(0, m.index))
        buf = buf.slice(m.index + m[0].length)
      }
    },
    end() {
      if (buf) line(buf.replace(/\r$/, ''))
      buf = ''
      dispatch()
    },
  }
}

const TYPES = new Set<AssistantStreamEvent['type']>(['seen', 'route', 'instant', 'delta', 'done', 'error', 'action'])

/** one SSE frame → a typed event (the JSON's own `type` wins; the SSE event name fills it in); null = ignore */
export function toStreamEvent(f: SseFrame): AssistantStreamEvent | null {
  let body: unknown
  try {
    body = JSON.parse(f.data)
  } catch {
    // a bare text delta ("data: Salom") is tolerated
    return f.event === 'delta' ? { type: 'delta', text: f.data } : null
  }
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const type = (typeof o.type === 'string' ? o.type : f.event) as AssistantStreamEvent['type']
  if (!TYPES.has(type)) return null
  return { ...o, type } as AssistantStreamEvent
}

export type StreamProgress = Exclude<AssistantStreamEvent, { type: 'done' } | { type: 'error' }>

/**
 * Sends one question and calls onEvent for seen / route / instant / delta. Resolves with the saved messages on `done`,
 * 'unsupported' when the server has no stream endpoint (404 / 405), and throws ApiError on an `error` event, a failed
 * response or a stream that ends without `done`. AbortError passes through (callers check signal.aborted).
 */
export async function streamAssistant(
  body: AssistantRequest,
  opts: { signal?: AbortSignal; onEvent: (e: StreamProgress) => void },
): Promise<{ user: AssistantMessage; reply: AssistantMessage; spoken?: string } | 'unsupported'> {
  let res: Response
  try {
    res = await fetch(apiUrl('/assistant/messages/stream'), {
      method: 'POST',
      // X-Requested-With: the API's CSRF rule for state-changing calls (apps/api Data365.Auth GateRules.CsrfHeader)
      headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', [CSRF_HEADER]: CSRF_VALUE },
      body: JSON.stringify(body),
      signal: opts.signal,
    })
  } catch (e) {
    if (opts.signal?.aborted) throw e
    throw ApiError.network(e)
  }
  if (res.status === 404 || res.status === 405) {
    // only a missing route counts as "old server": a bare 404/405, or the API's catch-all {code:'NOT_FOUND'} for unknown
    // /api routes (no detail, no params); NotFound with a detail (e.g. an unknown slug) is a real answer
    const err = ApiError.fromStatus(res.status, await res.text().catch(() => ''))
    if (err.detail === `HTTP ${res.status}`) return 'unsupported'
    if (err.code === 'NOT_FOUND' && !err.detail && !err.params) return 'unsupported'
    throw err
  }
  if (!res.ok) throw ApiError.fromStatus(res.status, await res.text().catch(() => ''))
  if (!res.body) throw new ApiError(res.status, { code: 'INTERNAL', detail: 'empty stream' })

  const end: { result?: { user: AssistantMessage; reply: AssistantMessage; spoken?: string }; failure?: ApiError } = {}
  const status = res.status
  const parser = createSseParser((f) => {
    if (end.result || end.failure) return
    const e = toStreamEvent(f)
    if (!e) return
    if (e.type === 'done') end.result = { user: e.user, reply: e.reply, ...(e.spoken ? { spoken: e.spoken } : {}) }
    else if (e.type === 'error') end.failure = new ApiError(status, { code: e.code as ErrorCode, params: e.params })
    else opts.onEvent(e)
  })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      parser.push(decoder.decode(value, { stream: true }))
      if (end.result || end.failure) break
    }
    parser.push(decoder.decode())
    parser.end()
  } catch (e) {
    if (opts.signal?.aborted) throw e
    throw ApiError.network(e)
  } finally {
    reader.cancel().catch(() => undefined)
  }
  if (end.failure) throw end.failure
  if (end.result) return end.result
  throw new ApiError(0, { code: 'UNREACHABLE', detail: 'stream ended before done' })
}
