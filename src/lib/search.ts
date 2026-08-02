import type { SupabaseClient } from '@supabase/supabase-js'
import { presignedGetUrl } from '@/lib/s3'
import { embedText } from '@/lib/openai'
import type { Asset, AssetWithTags, Tag } from '@/lib/types'

export type AssetTypeFilter = 'image' | 'video' | 'audio' | 'pdf' | 'other'

export type SearchParams = {
  q?: string
  tags?: string[]
  colors?: string[]
  type?: AssetTypeFilter
  folderId?: string
  limit?: number
}

const CANDIDATE_LIMIT = 1000
const SEMANTIC_MATCH_COUNT = 200
const SEMANTIC_MIN_SIMILARITY = 0.15

type CandidateAsset = Asset & { tags: Tag[] }

export const searchAssets = async (
  supabase: SupabaseClient,
  params: SearchParams
): Promise<AssetWithTags[]> => {
  const candidates = await fetchCandidateAssets(supabase, params)
  const filtered = filterByTagsAndColors(candidates, params.tags ?? [], params.colors ?? [])
  const ordered = params.q ? await rankByQuery(supabase, filtered, params.q) : filtered
  const limited = ordered.slice(0, params.limit ?? 60)
  return attachUrls(limited)
}

// ── Candidate fetch (folder + type filters, tags joined) ─────────────────────

const fetchCandidateAssets = async (
  supabase: SupabaseClient,
  params: SearchParams
): Promise<CandidateAsset[]> => {
  let query = supabase
    .from('assets')
    .select(
      'id, folder_id, filename, s3_key, thumb_s3_key, mime_type, size, width, height, content_hash, phash, description, ai_tagged, uploaded_by, created_at, asset_tags(tag:tags(id, name, kind))'
    )
    .order('created_at', { ascending: false })
    .limit(CANDIDATE_LIMIT)

  query = applyFolderFilter(query, params.folderId)
  query = applyTypeFilter(query, params.type)

  const { data, error } = await query
  if (error) throw new Error(`Asset query failed: ${error.message}`)
  return (data ?? []).map(normalizeCandidateRow)
}

const applyFolderFilter = <Q extends { is: any; eq: any }>(query: Q, folderId?: string): Q => {
  if (!folderId) return query
  if (folderId === 'root') return query.is('folder_id', null)
  return query.eq('folder_id', folderId)
}

const applyTypeFilter = <Q extends { like: any; eq: any; not: any; neq: any }>(
  query: Q,
  type?: AssetTypeFilter
): Q => {
  if (type === 'image') return query.like('mime_type', 'image/%')
  if (type === 'video') return query.like('mime_type', 'video/%')
  if (type === 'audio') return query.like('mime_type', 'audio/%')
  if (type === 'pdf') return query.eq('mime_type', 'application/pdf')
  if (type === 'other')
    return query
      .not('mime_type', 'like', 'image/%')
      .not('mime_type', 'like', 'video/%')
      .not('mime_type', 'like', 'audio/%')
      .neq('mime_type', 'application/pdf')
  return query
}

const normalizeCandidateRow = (row: Record<string, unknown>): CandidateAsset => {
  const joins = (row.asset_tags ?? []) as Array<{ tag: Tag | null }>
  const { asset_tags: _joins, ...asset } = row
  return { ...(asset as Asset), tags: joins.map((j) => j.tag).filter((t): t is Tag => t !== null) }
}

// ── Tag / color filters (asset must carry ALL listed names) ──────────────────

const filterByTagsAndColors = (
  assets: CandidateAsset[],
  tagNames: string[],
  colorNames: string[]
): CandidateAsset[] => {
  const wantedTags = tagNames.map((n) => n.toLowerCase())
  const wantedColors = colorNames.map((n) => n.toLowerCase())
  return assets.filter(
    (asset) =>
      wantedTags.every((name) => hasNonColorTag(asset, name)) &&
      wantedColors.every((name) => hasColorTag(asset, name))
  )
}

const hasNonColorTag = (asset: CandidateAsset, name: string) =>
  asset.tags.some((t) => t.kind !== 'color' && t.name.toLowerCase() === name)

const hasColorTag = (asset: CandidateAsset, name: string) =>
  asset.tags.some((t) => t.kind === 'color' && t.name.toLowerCase() === name)

// ── Query ranking (semantic hits first, then keyword hits by recency) ────────

const rankByQuery = async (
  supabase: SupabaseClient,
  assets: CandidateAsset[],
  q: string
): Promise<CandidateAsset[]> => {
  const similarity = await fetchSemanticSimilarity(supabase, q)
  const semanticHits = assets
    .filter((a) => similarity.has(a.id))
    .sort((a, b) => similarity.get(b.id)! - similarity.get(a.id)!)
  const keywordHits = assets.filter((a) => !similarity.has(a.id) && matchesKeyword(a, q))
  return [...semanticHits, ...keywordHits]
}

const fetchSemanticSimilarity = async (
  supabase: SupabaseClient,
  q: string
): Promise<Map<string, number>> => {
  try {
    const queryEmbedding = await embedText(q)
    const { data, error } = await supabase.rpc('match_assets', {
      query_embedding: queryEmbedding,
      match_count: SEMANTIC_MATCH_COUNT,
      min_similarity: SEMANTIC_MIN_SIMILARITY,
    })
    if (error) return new Map()
    const rows = (data ?? []) as Array<{ id: string; similarity: number }>
    return new Map(rows.map((r) => [r.id, r.similarity]))
  } catch {
    return new Map() // embedding unavailable — keyword matching still works
  }
}

const matchesKeyword = (asset: CandidateAsset, q: string) => {
  const needle = q.toLowerCase()
  return (
    asset.filename.toLowerCase().includes(needle) ||
    (asset.description ?? '').toLowerCase().includes(needle)
  )
}

// ── Presigned thumbnails ─────────────────────────────────────────────────────

const attachUrls = (assets: CandidateAsset[]): Promise<AssetWithTags[]> =>
  Promise.all(
    assets.map(async (asset) => ({
      ...asset,
      thumb_url: asset.thumb_s3_key ? await presignedGetUrl(asset.thumb_s3_key) : null,
      preview_url: null,
    }))
  )
