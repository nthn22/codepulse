import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import useStream from '../hooks/useStream'

function makeStream(events) {
  // events: array of SSE strings like 'data: {"type":"chunk","content":"hello"}\n\n'
  const encoded = events.map((e) => new TextEncoder().encode(e))
  let i = 0
  return {
    getReader: () => ({
      read: vi.fn(async () => {
        if (i < encoded.length) return { done: false, value: encoded[i++] }
        return { done: true, value: undefined }
      }),
    }),
  }
}

function mockFetch(body, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, body })
}

afterEach(() => vi.restoreAllMocks())

describe('useStream', () => {
  it('accumulates chunks into response', async () => {
    mockFetch(makeStream([
      'data: {"type":"chunk","content":"Hello"}\n\n',
      'data: {"type":"chunk","content":", world"}\n\n',
      'data: {"type":"done"}\n\n',
    ]))

    const { result } = renderHook(() => useStream())

    await act(async () => {
      await result.current.startStream('const x = 1', 'javascript')
    })

    expect(result.current.response).toBe('Hello, world')
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets saved to true when done event is received', async () => {
    mockFetch(makeStream([
      'data: {"type":"chunk","content":"review"}\n\n',
      'data: {"type":"done"}\n\n',
    ]))

    const { result } = renderHook(() => useStream())

    await act(async () => {
      await result.current.startStream('code', 'python')
    })

    expect(result.current.saved).toBe(true)
  })

  it('sets error when server returns error event', async () => {
    mockFetch(makeStream([
      'data: {"type":"error","content":"API key missing"}\n\n',
    ]))

    const { result } = renderHook(() => useStream())

    await act(async () => {
      await result.current.startStream('code', 'javascript')
    })

    expect(result.current.error).toBe('API key missing')
    expect(result.current.response).toBe('')
  })

  it('sets error when fetch response is not ok', async () => {
    mockFetch(null, false)

    const { result } = renderHook(() => useStream())

    await act(async () => {
      await result.current.startStream('code', 'javascript')
    })

    expect(result.current.error).toMatch(/server error/i)
    expect(result.current.isStreaming).toBe(false)
  })

  it('resets state on each new startStream call', async () => {
    mockFetch(makeStream([
      'data: {"type":"chunk","content":"first"}\n\n',
      'data: {"type":"done"}\n\n',
    ]))

    const { result } = renderHook(() => useStream())

    await act(async () => {
      await result.current.startStream('code', 'javascript')
    })
    expect(result.current.response).toBe('first')

    mockFetch(makeStream([
      'data: {"type":"chunk","content":"second"}\n\n',
      'data: {"type":"done"}\n\n',
    ]))

    await act(async () => {
      await result.current.startStream('code2', 'python')
    })
    expect(result.current.response).toBe('second')
    expect(result.current.saved).toBe(true)
  })
})
