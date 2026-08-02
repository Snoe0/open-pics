import { NextResponse } from 'next/server'
import { trackError } from '@/lib/errors'

/** Capture endpoint for browser-side errors — files them as GitHub issues.
 *  Unauthenticated by design (errors can happen on the login page too);
 *  payloads are truncated and deduped by fingerprint before filing. */
export const POST = async (request: Request) => {
  let body: { message?: string; stack?: string; context?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  try {
    await trackError({
      message: body.message,
      stack: typeof body.stack === 'string' ? body.stack : null,
      context: typeof body.context === 'string' ? body.context : null,
      source: 'client',
    })
  } catch {
    // never let error tracking cause more errors
  }
  return NextResponse.json({ ok: true })
}
