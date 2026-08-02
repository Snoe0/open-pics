'use client'

import { useEffect } from 'react'

const report = (message: string, stack?: string | null) => {
  // sendBeacon-style fire-and-forget; must never throw
  try {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack: stack ?? undefined,
        context: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

/** Mounted once in the root layout — reports uncaught browser errors. */
export const ErrorReporter = () => {
  useEffect(() => {
    const onError = (event: ErrorEvent) =>
      report(event.message || 'Unknown error', event.error?.stack)
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      report(
        reason instanceof Error ? reason.message : `Unhandled rejection: ${String(reason)}`,
        reason instanceof Error ? reason.stack : undefined
      )
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
