import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { buildImageDerivatives } from '@/lib/thumbnails'
import { canWrite, type Asset, type Profile } from '@/lib/types'

type CompleteBody = {
  s3Key: string
  filename: string
  mimeType: string
  size: number
  contentHash: string
  folderId: string | null
}

export const POST = async (req: Request) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canWrite(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await parseCompleteBody(req)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const derivatives = await buildImageDerivatives(body.s3Key, body.mimeType)
  const { asset, error } = await insertAssetRow(body, derivatives, profile)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ asset })
}

const parseCompleteBody = async (req: Request): Promise<CompleteBody | null> => {
  try {
    const body = await req.json()
    const valid =
      typeof body.s3Key === 'string' &&
      body.s3Key.length > 0 &&
      typeof body.filename === 'string' &&
      body.filename.length > 0 &&
      typeof body.mimeType === 'string' &&
      typeof body.size === 'number' &&
      typeof body.contentHash === 'string' &&
      body.contentHash.length > 0
    return valid ? (body as CompleteBody) : null
  } catch {
    return null
  }
}

const insertAssetRow = async (
  body: CompleteBody,
  derivatives: Awaited<ReturnType<typeof buildImageDerivatives>>,
  profile: Profile
): Promise<{ asset: Asset | null; error: string | null }> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .insert({
      folder_id: body.folderId ?? null,
      filename: body.filename,
      s3_key: body.s3Key,
      thumb_s3_key: derivatives.thumbS3Key,
      mime_type: body.mimeType,
      size: body.size,
      width: derivatives.width,
      height: derivatives.height,
      content_hash: body.contentHash,
      phash: derivatives.phash,
      uploaded_by: profile.id,
    })
    .select('*')
    .single()
  return { asset: (data as Asset | null) ?? null, error: error?.message ?? null }
}
