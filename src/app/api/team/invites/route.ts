import { NextResponse } from 'next/server'
import {
  createAdminClient,
  createClient,
  getCurrentProfile,
} from '@/lib/supabase/server'
import { isAdmin, type Invite, type Profile, type Role } from '@/lib/types'

const VALID_ROLES: Role[] = ['admin', 'editor', 'viewer']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type InviteBody = { email: string; role: Role }

export const GET = async () => {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const [members, invites] = await Promise.all([fetchMembers(), fetchPendingInvites()])
  return NextResponse.json({ members, invites })
}

export const POST = async (request: Request) => {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const body = await parseInviteBody(request)
  if (!body) {
    return NextResponse.json({ error: 'A valid email and role are required' }, { status: 400 })
  }

  const conflict = await findExistingRecipient(body.email)
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })

  const invite = await insertInviteRow(body, admin.profile.id)
  if (!invite) {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  const emailSent = await sendInviteEmail(body.email, request)
  if (!emailSent) {
    return NextResponse.json({
      invite,
      emailSent: false,
      note: 'Invite saved but the email could not be sent. They can simply sign up with this address and will receive the assigned role.',
    })
  }
  return NextResponse.json({ invite, emailSent: true })
}

const requireAdmin = async (): Promise<
  { ok: true; profile: Profile } | { ok: false; response: NextResponse }
> => {
  const profile = await getCurrentProfile()
  if (!profile) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!isAdmin(profile.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true, profile }
}

const fetchMembers = async (): Promise<Profile[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  return (data ?? []) as Profile[]
}

const fetchPendingInvites = async (): Promise<Invite[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invites')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return (data ?? []) as Invite[]
}

const parseInviteBody = async (request: Request): Promise<InviteBody | null> => {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const role = body.role as Role
    if (!EMAIL_PATTERN.test(email) || !VALID_ROLES.includes(role)) return null
    return { email, role }
  } catch {
    return null
  }
}

/** Returns a conflict message if the email already belongs to a member or a pending invite. */
const findExistingRecipient = async (email: string): Promise<string | null> => {
  const supabase = await createClient()
  const [{ data: profile }, { data: invite }] = await Promise.all([
    supabase.from('profiles').select('id').ilike('email', email).maybeSingle(),
    supabase
      .from('invites')
      .select('id')
      .ilike('email', email)
      .eq('status', 'pending')
      .maybeSingle(),
  ])
  if (profile) return 'A member with this email already exists'
  if (invite) return 'A pending invite for this email already exists'
  return null
}

const insertInviteRow = async (
  body: InviteBody,
  invitedBy: string
): Promise<Invite | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invites')
    .insert({ email: body.email, role: body.role, invited_by: invitedBy })
    .select('*')
    .single()
  return data as Invite | null
}

const sendInviteEmail = async (email: string, request: Request): Promise<boolean> => {
  try {
    const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/callback`,
    })
    return !error
  } catch {
    return false
  }
}
