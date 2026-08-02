import { NextResponse } from 'next/server'
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server'
import { isAdmin, type Profile, type Role } from '@/lib/types'

const VALID_ROLES: Role[] = ['admin', 'editor', 'viewer']

type RouteContext = { params: Promise<{ id: string }> }

export const PATCH = async (request: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (id === profile.id) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
  }

  const role = await parseRole(request)
  if (!role) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const updated = await updateMemberRole(id, role)
  if (!updated) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })

  return NextResponse.json({ profile: updated })
}

export const DELETE = async (_request: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (id === profile.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

const parseRole = async (request: Request): Promise<Role | null> => {
  try {
    const body = await request.json()
    return VALID_ROLES.includes(body.role) ? (body.role as Role) : null
  } catch {
    return null
  }
}

const updateMemberRole = async (id: string, role: Role): Promise<Profile | null> => {
  const { data } = await createAdminClient()
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select('*')
    .single()
  return data as Profile | null
}
