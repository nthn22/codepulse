import { useState, useCallback, useRef } from 'react'

// useStream manages the full lifecycle of a streaming code review request.
// It handles: starting the request, reading SSE chunks, updating the UI in real-time,
// tracking when the review is saved, and stopping early if the user cancels.
//
// SSE (Server-Sent Events) is a protocol where the server sends a stream of
// "data: <payload>\n\n" messages over a single HTTP connection. We read them
// manually here using the Fetch API's ReadableStream instead of EventSource,
// because EventSource doesn't support POST requests or custom headers.
export default function useStream() {
  const [response, setResponse] = useState('')      // accumulated review text so far
  const [isStreaming, setIsStreaming] = useState(false)
  const [saved, setSaved] = useState(false)          // true once server confirms it saved the review
  const [error, setError] = useState(null)
  const abortRef = useRef(null) // holds the AbortController so stopStream() can cancel the request

  const startStream = useCallback(async (code, language) => {
    // Reset all state before starting a new review
    setResponse('')
    setError(null)
    setSaved(false)
    setIsStreaming(true)

    // AbortController lets us cancel the fetch mid-stream (e.g. user clicks Stop).
    // We store it in a ref (not state) because we don't want changing it to trigger a re-render.
    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
        signal: abortController.signal, // fetch will throw an AbortError if abort() is called
      })

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

      // res.body is a ReadableStream — we read it chunk by chunk.
      const reader = res.body.getReader()
      const decoder = new TextDecoder() // converts binary chunks (Uint8Array) to strings
      let buffer = '' // accumulates partial SSE messages between reads

      while (true) {
        const { done, value } = await reader.read()
        if (done) break // server closed the connection

        // Decode the binary chunk. { stream: true } tells the decoder not to flush
        // its internal state — important for multi-byte characters that might be
        // split across two chunks.
        buffer += decoder.decode(value, { stream: true })

        // SSE messages are separated by "\n\n". Split on that to get individual messages.
        // The last element might be an incomplete message, so we keep it in the buffer.
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // keep the leftover partial message for next iteration

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue // skip non-data lines (comments, empty)
          const jsonStr = line.slice(6) // strip the "data: " prefix

          try {
            const data = JSON.parse(jsonStr)

            if (data.type === 'chunk') {
              // Append this chunk to the response using the functional form of setState
              // so we always append to the latest value, not a stale closure copy.
              setResponse(prev => prev + data.content)
            } else if (data.type === 'done') {
              // Server finished streaming and (if logged in) saved the review to the DB
              setSaved(true)
            } else if (data.type === 'error') {
              setError(data.content)
            }
          } catch {
            // Skip any malformed JSON chunks — don't crash the whole stream
          }
        }
      }
    } catch (err) {
      // AbortError is thrown when the user clicks Stop — that's intentional, not an error
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to connect to server')
      }
    } finally {
      // Always reset streaming state when done, whether it succeeded, failed, or was cancelled
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [])

  // Cancels the in-progress stream. The fetch's AbortSignal fires,
  // the try/catch above catches the AbortError and ignores it,
  // and finally() cleans up isStreaming.
  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }, [])

  return { response, isStreaming, saved, error, startStream, stopStream }
}
