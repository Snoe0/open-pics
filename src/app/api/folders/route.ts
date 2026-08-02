import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { canWrite } from '@/lib/types'

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })
const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 })
const serverError = (message: string) => NextResponse.json({ error: message }, { status: 500 })

export const GET = async () => {
  const profile = await getCurrentProfile()
  if (!profile) return unauthorized()

  const supabase = await createClient()
  const { data, error } = await supabase.from('folders').select('*').order('name')
  if (error) return serverError(error.message)

  return NextResponse.json({ folders: data })
}

type CreateFolderBody = { name: string; parentId: string | null }

const parseCreateBody = async (req: Request): Promise<CreateFolderBody | null> => {
  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return null
    const parentId = typeof body.parentId === 'string' ? body.parentId : null
    return { name: name.slice(0, 120), parentId }
  } catch {
    return null
  }
}

export const POST = async (req: Request) => {
  const profile = await getCurrentProfile()
  if (!profile) return unauthorized()
  if (!canWrite(profile.role)) return forbidden()

  const body = await parseCreateBody(req)
  if (!body) return badRequest('A non-empty folder name is required')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('folders')
    .insert({ name: body.name, parent_id: body.parentId, created_by: profile.id })
    .select('*')
    .single()
  if (error) return serverError(error.message)

  return NextResponse.json({ folder: data })
}
