import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/types'

/** Admin: update an error's status (resolve / reopen). */
export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  if (!['open', 'resolved'].includes(body.status)) {
    return NextResponse.json({ error: 'status must be open or resolved' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('errors')
    .update({ status: body.status })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ error_row: data })
}
