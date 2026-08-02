import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { presignedDownloadUrl } from '@/lib/thumbnails'

type RouteContext = { params: Promise<{ id: string }> }

export const GET = async (_req: Request, { params }: RouteContext) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const asset = await fetchAssetForDownload(id)
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = await presignedDownloadUrl(asset.s3_key, asset.filename)
  return NextResponse.redirect(url, 302)
}

const fetchAssetForDownload = async (
  id: string
): Promise<{ s3_key: string; filename: string } | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assets')
    .select('s3_key, filename')
    .eq('id', id)
    .maybeSingle()
  return data
}
