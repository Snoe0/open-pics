import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { deleteObject, presignedGetUrl } from '@/lib/s3'
import { canWrite, type Asset, type AssetWithTags, type Tag } from '@/lib/types'

type RouteContext = { params: Promise<{ id: string }> }

type AssetRowWithTags = Asset & { asset_tags: { tag: Tag | null }[] }

export const GET = async (_req: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const row = await fetchAssetWithTags(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ asset: await attachPresignedUrls(row) })
}

export const PATCH = async (req: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canWrite(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const updates = await parseAssetUpdates(req)
  if (!updates) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const { asset, error } = await applyAssetUpdates(id, updates)
  if (error) return NextResponse.json({ error }, { status: 500 })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ asset })
}

export const DELETE = async (_req: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canWrite(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const asset = await fetchAssetKeys(id)
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteStorageObjects(asset)
  const error = await deleteAssetRow(id)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// ── GET helpers ──────────────────────────────────────────────────────────────

const fetchAssetWithTags = async (id: string): Promise<AssetRowWithTags | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assets')
    .select('*, asset_tags(tag:tags(*))')
    .eq('id', id)
    .maybeSingle()
  return data as AssetRowWithTags | null
}

const attachPresignedUrls = async (row: AssetRowWithTags): Promise<AssetWithTags> => {
  const { asset_tags, ...asset } = row
  const tags = asset_tags.map((link) => link.tag).filter((tag): tag is Tag => tag !== null)
  const [thumb_url, preview_url] = await Promise.all([
    asset.thumb_s3_key ? presignedGetUrl(asset.thumb_s3_key) : Promise.resolve(null),
    presignedGetUrl(asset.s3_key),
  ])
  return { ...asset, tags, thumb_url, preview_url }
}

// ── PATCH helpers ────────────────────────────────────────────────────────────

type AssetUpdates = Partial<Pick<Asset, 'filename' | 'folder_id' | 'description'>>

const parseAssetUpdates = async (req: Request): Promise<AssetUpdates | null> => {
  try {
    const body = await req.json()
    const updates: AssetUpdates = {}
    if (typeof body.filename === 'string' && body.filename.length > 0) updates.filename = body.filename
    if ('folder_id' in body) updates.folder_id = body.folder_id ?? null
    if ('description' in body) updates.description = body.description ?? null
    return Object.keys(updates).length > 0 ? updates : null
  } catch {
    return null
  }
}

const applyAssetUpdates = async (
  id: string,
  updates: AssetUpdates
): Promise<{ asset: Asset | null; error: string | null }> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  return { asset: (data as Asset | null) ?? null, error: error?.message ?? null }
}

// ── DELETE helpers ───────────────────────────────────────────────────────────

const fetchAssetKeys = async (
  id: string
): Promise<Pick<Asset, 's3_key' | 'thumb_s3_key'> | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assets')
    .select('s3_key, thumb_s3_key')
    .eq('id', id)
    .maybeSingle()
  return data
}

const deleteStorageObjects = async (asset: Pick<Asset, 's3_key' | 'thumb_s3_key'>) => {
  const deletions = [deleteObject(asset.s3_key)]
  if (asset.thumb_s3_key) deletions.push(deleteObject(asset.thumb_s3_key))
  await Promise.allSettled(deletions)
}

const deleteAssetRow = async (id: string): Promise<string | null> => {
  const supabase = await createClient()
  const { error } = await supabase.from('assets').delete().eq('id', id)
  return error?.message ?? null
}
