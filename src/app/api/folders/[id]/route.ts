import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { canWrite } from '@/lib/types'

type RouteContext = { params: Promise<{ id: string }> }

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })
const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 })
const serverError = (message: string) => NextResponse.json({ error: message }, { status: 500 })

type FolderPatch = { name?: string; parent_id?: string | null }

const parsePatchBody = async (req: Request, id: string): Promise<FolderPatch | null> => {
  try {
    const body = await req.json()
    const patch: FolderPatch = {}
    if ('name' in body) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) return null
      patch.name = name.slice(0, 120)
    }
    if ('parentId' in body) {
      const parentId = typeof body.parentId === 'string' ? body.parentId : null
      if (parentId === id) return null // a folder cannot be its own parent
      patch.parent_id = parentId
    }
    return Object.keys(patch).length > 0 ? patch : null
  } catch {
    return null
  }
}

export const PATCH = async (req: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return unauthorized()
  if (!canWrite(profile.role)) return forbidden()

  const { id } = await params
  const patch = await parsePatchBody(req, id)
  if (!patch) return badRequest('Provide a non-empty name and/or a valid parentId')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('folders')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) return serverError(error.message)

  return NextResponse.json({ folder: data })
}

export const DELETE = async (_req: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return unauthorized()
  if (!canWrite(profile.role)) return forbidden()

  const { id } = await params
  const supabase = await createClient()
  // Child folders cascade; assets inside become unfiled (ON DELETE SET NULL).
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) return serverError(error.message)

  return NextResponse.json({ ok: true })
}
