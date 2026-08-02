import { createAdminClient } from '@/lib/supabase/server'
import { getObjectBuffer } from '@/lib/s3'
import { openai, VISION_MODEL, embedText } from '@/lib/openai'
import type { Asset, Tag, TagKind } from '@/lib/types'

export type VisionResult = {
  tags: string[]
  colors: string[]
  description: string
}

const COLOR_PALETTE = [
  'black', 'white', 'gray', 'red', 'orange', 'yellow',
  'green', 'teal', 'blue', 'purple', 'pink', 'brown',
] as const

const TAGGING_PROMPT = `You are an expert image cataloguer for a digital asset library.
Analyze the image and respond with strict JSON only, in this exact shape:
{
  "tags": ["..."],
  "colors": ["..."],
  "description": "..."
}
Rules:
- "tags": 8 to 15 lowercase tags, each a single word or two words, covering subjects, scene, and style.
- "colors": 2 to 5 dominant color names chosen ONLY from: ${COLOR_PALETTE.join(', ')}.
- "description": one rich sentence describing the image — subjects, setting, mood, and lighting.`

export const isTaggableImage = (mimeType: string) =>
  mimeType.startsWith('image/') && !mimeType.includes('svg')

export const tagImageAsset = async (asset: Asset) => {
  const dataUrl = await loadImageAsDataUrl(asset)
  const vision = await describeImage(dataUrl, asset.filename)
  const tags = await upsertAndLinkTags(asset.id, vision)
  await saveDescriptionAndEmbedding(asset, vision)
  return { tags, description: vision.description }
}

// ── Image loading ────────────────────────────────────────────────────────────

const loadImageAsDataUrl = async (asset: Asset) => {
  const key = asset.thumb_s3_key ?? asset.s3_key
  const buffer = await getObjectBuffer(key)
  const mime = asset.thumb_s3_key ? mimeFromKey(asset.thumb_s3_key) : asset.mime_type
  return `data:${mime};base64,${buffer.toString('base64')}`
}

const mimeFromKey = (key: string) => {
  const ext = key.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'image/jpeg'
}

// ── Vision ───────────────────────────────────────────────────────────────────

const describeImage = async (dataUrl: string, filename: string): Promise<VisionResult> => {
  const res = await openai.chat.completions.create({
    model: VISION_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: TAGGING_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Filename: ${filename}` },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  })
  return parseVisionResponse(res.choices[0]?.message?.content ?? '')
}

const parseVisionResponse = (raw: string): VisionResult => {
  const parsed = JSON.parse(raw) as Partial<VisionResult>
  return {
    tags: normalizeTagNames(parsed.tags),
    colors: normalizeColorNames(parsed.colors),
    description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
  }
}

const normalizeTagNames = (tags: unknown) =>
  dedupe(asStringArray(tags).map(cleanTagName).filter(Boolean)).slice(0, 15)

const normalizeColorNames = (colors: unknown) =>
  dedupe(
    asStringArray(colors)
      .map(cleanTagName)
      .filter((c) => (COLOR_PALETTE as readonly string[]).includes(c))
  ).slice(0, 5)

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

const cleanTagName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 64)

const dedupe = (items: string[]) => [...new Set(items)]

// ── Tag persistence ──────────────────────────────────────────────────────────

const upsertAndLinkTags = async (assetId: string, vision: VisionResult): Promise<Tag[]> => {
  const admin = createAdminClient()
  const aiTags = await upsertTags(admin, vision.tags, 'ai')
  const colorTags = await upsertTags(admin, vision.colors, 'color')
  const allTags = [...aiTags, ...colorTags]
  await linkTagsToAsset(admin, assetId, allTags)
  return allTags
}

const upsertTags = async (
  admin: ReturnType<typeof createAdminClient>,
  names: string[],
  kind: TagKind
): Promise<Tag[]> => {
  if (names.length === 0) return []
  const { data, error } = await admin
    .from('tags')
    .upsert(names.map((name) => ({ name, kind })), { onConflict: 'name,kind' })
    .select('id, name, kind')
  if (error) throw new Error(`Failed to upsert ${kind} tags: ${error.message}`)
  return (data ?? []) as Tag[]
}

const linkTagsToAsset = async (
  admin: ReturnType<typeof createAdminClient>,
  assetId: string,
  tags: Tag[]
) => {
  if (tags.length === 0) return
  const { error } = await admin
    .from('asset_tags')
    .upsert(tags.map((tag) => ({ asset_id: assetId, tag_id: tag.id })), { ignoreDuplicates: true })
  if (error) throw new Error(`Failed to link tags: ${error.message}`)
}

// ── Embedding ────────────────────────────────────────────────────────────────

const saveDescriptionAndEmbedding = async (asset: Asset, vision: VisionResult) => {
  const admin = createAdminClient()
  const embedding = await embedText(buildEmbeddingInput(asset.filename, vision))
  const { error } = await admin
    .from('assets')
    .update({ description: vision.description, embedding, ai_tagged: true })
    .eq('id', asset.id)
  if (error) throw new Error(`Failed to save AI results: ${error.message}`)
}

const buildEmbeddingInput = (filename: string, vision: VisionResult) =>
  `${vision.description}. Tags: ${vision.tags.join(', ')}. Colors: ${vision.colors.join(', ')}. Filename: ${filename}`
