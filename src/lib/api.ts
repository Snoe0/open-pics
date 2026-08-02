import type { AssetWithTags, Folder, Tag, TagKind } from '@/lib/types'

/** Type filter values accepted by GET /api/search. */
export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'other'

export type AssetSearchFilters = {
  q?: string
  tags?: string[]
  colors?: string[]
  type?: AssetType
  /** 'root' = unfiled only, a folder id, or undefined/null = all assets. */
  folderId?: string | null
  limit?: number
}

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof body.error === 'string' ? body.error : `Request failed (${res.status})`
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

const requestWithBody = <T>(url: string, method: string, body: unknown): Promise<T> =>
  requestJson<T>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

// ── Assets ──────────────────────────────────────────────────────────────────

const buildSearchQuery = (filters: AssetSearchFilters): string => {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.tags?.length) params.set('tags', filters.tags.join(','))
  if (filters.colors?.length) params.set('colors', filters.colors.join(','))
  if (filters.type) params.set('type', filters.type)
  if (filters.folderId) params.set('folderId', filters.folderId)
  if (filters.limit) params.set('limit', String(filters.limit))
  return params.toString()
}

export const searchAssets = async (filters: AssetSearchFilters): Promise<AssetWithTags[]> => {
  const query = buildSearchQuery(filters)
  const data = await requestJson<{ assets: AssetWithTags[] }>(
    query ? `/api/search?${query}` : '/api/search'
  )
  return data.assets
}

export const getAsset = async (id: string): Promise<AssetWithTags> => {
  const data = await requestJson<{ asset: AssetWithTags }>(`/api/assets/${id}`)
  return data.asset
}

export type AssetPatch = {
  filename?: string
  folder_id?: string | null
  description?: string
}

export const patchAsset = async (id: string, patch: AssetPatch): Promise<AssetWithTags> => {
  const data = await requestWithBody<{ asset: AssetWithTags }>(`/api/assets/${id}`, 'PATCH', patch)
  return data.asset
}

export const deleteAsset = (id: string): Promise<{ ok: true }> =>
  requestJson<{ ok: true }>(`/api/assets/${id}`, { method: 'DELETE' })

export const assetDownloadUrl = (id: string): string => `/api/assets/${id}/download`

export const autoTagAsset = (assetId: string): Promise<{ tags: Tag[]; description: string }> =>
  requestWithBody(`/api/ai/tag`, 'POST', { assetId })

// ── Tags ────────────────────────────────────────────────────────────────────

export const getTags = async (kind?: TagKind): Promise<Tag[]> => {
  const url = kind ? `/api/tags?kind=${kind}` : '/api/tags'
  const data = await requestJson<{ tags: Tag[] }>(url)
  return data.tags
}

export const assignTag = async (assetId: string, name: string, kind?: TagKind): Promise<Tag> => {
  const data = await requestWithBody<{ tag: Tag }>('/api/tags/assign', 'POST', {
    assetId,
    name,
    ...(kind ? { kind } : {}),
  })
  return data.tag
}

export const removeTag = (assetId: string, tagId: string): Promise<{ ok: true }> =>
  requestWithBody('/api/tags/assign', 'DELETE', { assetId, tagId })

// ── Folders ─────────────────────────────────────────────────────────────────

export const getFolders = async (): Promise<Folder[]> => {
  const data = await requestJson<{ folders: Folder[] }>('/api/folders')
  return data.folders
}

export const createFolder = async (name: string, parentId: string | null): Promise<Folder> => {
  const data = await requestWithBody<{ folder: Folder }>('/api/folders', 'POST', {
    name,
    parentId,
  })
  return data.folder
}

export const renameFolder = async (id: string, name: string): Promise<Folder> => {
  const data = await requestWithBody<{ folder: Folder }>(`/api/folders/${id}`, 'PATCH', { name })
  return data.folder
}

export const moveFolder = async (id: string, parentId: string | null): Promise<Folder> => {
  const data = await requestWithBody<{ folder: Folder }>(`/api/folders/${id}`, 'PATCH', {
    parentId,
  })
  return data.folder
}

export const deleteFolder = (id: string): Promise<{ ok: true }> =>
  requestJson<{ ok: true }>(`/api/folders/${id}`, { method: 'DELETE' })
