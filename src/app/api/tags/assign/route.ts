import { NextResponse } from 'next/server'
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server'
import { embedText } from '@/lib/openai'
import { canWrite, type Profile, type Tag, type TagKind } from '@/lib/types'

const TAG_KINDS: TagKind[] = ['manual', 'ai', 'color']

type Admin = ReturnType<typeof createAdminClient>

export const POST = async (request: Request) => {
  const denied = await requireWriter()
  if (denied) return denied

  const body = await readJson(request)
  const assetId = asNonEmptyString(body?.assetId)
  const name = asNonEmptyString(body?.name)?.toLowerCase().trim()
  const kind = readKind(body?.kind)
  if (!assetId || !name)
    return NextResponse.json({ error: 'assetId and name are required' }, { status: 400 })

  const admin = createAdminClient()
  try {
    const tag = await upsertTag(admin, name, kind)
    await linkTagToAsset(admin, assetId, tag.id)
    await recomputeAssetEmbedding(admin, assetId) // best effort — never blocks tagging
    return NextResponse.json({ tag })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to assign tag'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const DELETE = async (request: Request) => {
  const denied = await requireWriter()
  if (denied) return denied

  const body = await readJson(request)
  const assetId = asNonEmptyString(body?.assetId)
  const tagId = asNonEmptyString(body?.tagId)
  if (!assetId || !tagId)
    return NextResponse.json({ error: 'assetId and tagId are required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('asset_tags')
    .delete()
    .eq('asset_id', assetId)
    .eq('tag_id', tagId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── Auth ─────────────────────────────────────────────────────────────────────

const requireWriter = async (): Promise<NextResponse | null> => {
  const profile: Profile | null = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canWrite(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

// ── Input parsing ────────────────────────────────────────────────────────────

const readJson = async (request: Request): Promise<Record<string, unknown> | null> => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const readKind = (value: unknown): TagKind =>
  TAG_KINDS.includes(value as TagKind) ? (value as TagKind) : 'manual'

// ── Tag persistence ──────────────────────────────────────────────────────────

const upsertTag = async (admin: Admin, name: string, kind: TagKind): Promise<Tag> => {
  const { data, error } = await admin
    .from('tags')
    .upsert({ name, kind }, { onConflict: 'name,kind' })
    .select('id, name, kind')
    .single()
  if (error || !data) throw new Error(`Failed to upsert tag: ${error?.message ?? 'no row'}`)
  return data as Tag
}

const linkTagToAsset = async (admin: Admin, assetId: string, tagId: string) => {
  const { error } = await admin
    .from('asset_tags')
    .upsert({ asset_id: assetId, tag_id: tagId }, { ignoreDuplicates: true })
  if (error) throw new Error(`Failed to link tag: ${error.message}`)
}

// ── Cheap embedding refresh (description + all tag names + filename) ─────────

const recomputeAssetEmbedding = async (admin: Admin, assetId: string) => {
  try {
    if (!process.env.OPENAI_API_KEY) return
    const input = await buildEmbeddingInput(admin, assetId)
    if (!input) return
    const embedding = await embedText(input)
    await admin.from('assets').update({ embedding }).eq('id', assetId)
  } catch {
    // embedding is a bonus — manual tagging must still succeed
  }
}

const buildEmbeddingInput = async (admin: Admin, assetId: string): Promise<string | null> => {
  const [asset, tagNames] = await Promise.all([
    fetchAssetBasics(admin, assetId),
    fetchAssetTagNames(admin, assetId),
  ])
  if (!asset) return null
  return `${asset.description ?? ''}. Tags: ${tagNames.join(', ')}. Filename: ${asset.filename}`
}

const fetchAssetBasics = async (admin: Admin, assetId: string) => {
  const { data } = await admin
    .from('assets')
    .select('description, filename')
    .eq('id', assetId)
    .single()
  return data as { description: string | null; filename: string } | null
}

const fetchAssetTagNames = async (admin: Admin, assetId: string): Promise<string[]> => {
  const { data } = await admin
    .from('asset_tags')
    .select('tag:tags(name)')
    .eq('asset_id', assetId)
  const rows = (data ?? []) as unknown as Array<{ tag: { name: string } | null }>
  return rows.map((r) => r.tag?.name).filter((n): n is string => Boolean(n))
}
