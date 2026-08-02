'use client'

import { useEffect } from 'react'

const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) => {
  useEffect(() => {
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message || 'Unhandled render error',
          stack: error.stack,
          context: window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [error])

  return (
    <html lang="en">
      <body style={{ background: '#0a0a0b', color: '#ededf0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ border: '1px solid #27272b', background: '#111113', padding: '2rem', maxWidth: 420 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Something went wrong</h1>
            <p style={{ marginTop: 8, fontSize: 14, color: '#8b8b93' }}>
              The error was logged and reported automatically.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 16,
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

export default GlobalError
