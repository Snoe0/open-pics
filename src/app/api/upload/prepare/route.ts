import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import { presignedPutUrl } from '@/lib/s3'
import { canWrite } from '@/lib/types'

type PrepareBody = {
  filename: string
  mimeType: string
  size: number
  contentHash: string
  folderId: string | null
  force?: boolean
}

export const POST = async (req: Request) => {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canWrite(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await parsePrepareBody(req)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const duplicate = await findDuplicateByHash(body.contentHash)
  if (duplicate && body.force !== true) return NextResponse.json({ duplicate })

  return NextResponse.json(await createUploadTarget(body))
}

const parsePrepareBody = async (req: Request): Promise<PrepareBody | null> => {
  try {
    const body = await req.json()
    const valid =
      typeof body.filename === 'string' &&
      body.filename.length > 0 &&
      typeof body.mimeType === 'string' &&
      typeof body.size === 'number' &&
      typeof body.contentHash === 'string' &&
      body.contentHash.length > 0
    return valid ? (body as PrepareBody) : null
  } catch {
    return null
  }
}

const findDuplicateByHash = async (
  contentHash: string
): Promise<{ assetId: string; filename: string } | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assets')
    .select('id, filename')
    .eq('content_hash', contentHash)
    .limit(1)
    .maybeSingle()
  return data ? { assetId: data.id, filename: data.filename } : null
}

const createUploadTarget = async (body: PrepareBody) => {
  const s3Key = `assets/${randomUUID()}/${sanitizeFilename(body.filename)}`
  const uploadUrl = await presignedPutUrl(s3Key, body.mimeType)
  return { s3Key, uploadUrl }
}

const sanitizeFilename = (filename: string): string => {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '_')
  return cleaned.slice(0, 200) || 'file'
}
