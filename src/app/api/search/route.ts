import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { searchAssets, type AssetTypeFilter, type SearchParams } from '@/lib/search'

const TYPE_FILTERS: AssetTypeFilter[] = ['image', 'video', 'audio', 'pdf', 'other']

export const GET = async (request: Request) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  try {
    const assets = await searchAssets(supabase, readSearchParams(request))
    return NextResponse.json({ assets })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const readSearchParams = (request: Request): SearchParams => {
  const params = new URL(request.url).searchParams
  return {
    q: params.get('q')?.trim() || undefined,
    tags: readList(params.get('tags')),
    colors: readList(params.get('colors')),
    type: readTypeFilter(params.get('type')),
    folderId: params.get('folderId') || undefined,
    limit: readLimit(params.get('limit')),
  }
}

const readList = (value: string | null): string[] | undefined => {
  const items = (value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return items.length > 0 ? items : undefined
}

const readTypeFilter = (value: string | null): AssetTypeFilter | undefined =>
  TYPE_FILTERS.includes(value as AssetTypeFilter) ? (value as AssetTypeFilter) : undefined

const readLimit = (value: string | null): number | undefined => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}
