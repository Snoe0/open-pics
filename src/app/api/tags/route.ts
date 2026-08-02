import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import type { TagKind } from '@/lib/types'

const TAG_KINDS: TagKind[] = ['manual', 'ai', 'color']

export const GET = async (request: Request) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  let query = supabase.from('tags').select('id, name, kind').order('name')

  const kind = new URL(request.url).searchParams.get('kind')
  if (TAG_KINDS.includes(kind as TagKind)) query = query.eq('kind', kind)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tags: data ?? [] })
}
