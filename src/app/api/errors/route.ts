import { NextResponse } from 'next/server'
import { trackError } from '@/lib/errors'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/types'

/** Capture endpoint for browser-side errors. Unauthenticated by design —
 *  errors can happen on the login page too. Payloads are truncated server-side. */
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

/** Admin listing for the /errors page. */
export const GET = async () => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('errors')
    .select('*')
    .order('last_seen', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ errors: data, repo: process.env.GITHUB_REPO ?? null })
}
