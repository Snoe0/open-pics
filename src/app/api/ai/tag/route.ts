import { NextResponse } from 'next/server'
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server'
import { canWrite, type Asset } from '@/lib/types'
import { isTaggableImage, tagImageAsset } from '@/lib/ai-tagging'

export const POST = async (request: Request) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canWrite(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const assetId = await readAssetId(request)
  if (!assetId) return NextResponse.json({ error: 'assetId is required' }, { status: 400 })

  const asset = await loadAsset(assetId)
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  if (!isTaggableImage(asset.mime_type))
    return NextResponse.json({ error: 'AI tagging only supports image assets' }, { status: 422 })

  try {
    const { tags, description } = await tagImageAsset(asset)
    return NextResponse.json({ tags, description })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI tagging failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

const readAssetId = async (request: Request): Promise<string | null> => {
  try {
    const body = await request.json()
    return typeof body?.assetId === 'string' && body.assetId ? body.assetId : null
  } catch {
    return null
  }
}

const loadAsset = async (assetId: string): Promise<Asset | null> => {
  const admin = createAdminClient()
  const { data } = await admin.from('assets').select('*').eq('id', assetId).single()
  return (data as Asset | null) ?? null
}
