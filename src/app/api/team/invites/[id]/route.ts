import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/types'

type RouteContext = { params: Promise<{ id: string }> }

export const DELETE = async (_request: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from('invites')
    .update({ status: 'revoked' })
    .eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
