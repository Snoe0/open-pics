import type { Instrumentation } from 'next'

/** Next.js server-error hook — logs every uncaught server-side error. */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request
) => {
  const { trackErrorSafely } = await import('@/lib/errors')
  const error = err instanceof Error ? err : new Error(String(err))
  trackErrorSafely({
    message: error.message,
    stack: error.stack ?? null,
    context: `${request.method} ${request.path}`,
    source: 'server',
  })
}
