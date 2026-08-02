export type Role = 'admin' | 'editor' | 'viewer'

export type TagKind = 'manual' | 'ai' | 'color'

export type Profile = {
  id: string
  email: string
  display_name: string | null
  role: Role
  created_at: string
}

export type Invite = {
  id: string
  email: string
  role: Role
  invited_by: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
}

export type Folder = {
  id: string
  name: string
  parent_id: string | null
  created_by: string
  created_at: string
}

export type Asset = {
  id: string
  folder_id: string | null
  filename: string
  s3_key: string
  thumb_s3_key: string | null
  mime_type: string
  size: number
  width: number | null
  height: number | null
  content_hash: string
  phash: string | null
  description: string | null
  ai_tagged: boolean
  uploaded_by: string
  created_at: string
}

export type Tag = {
  id: string
  name: string
  kind: TagKind
}

export type AssetWithTags = Asset & {
  tags: Tag[]
  thumb_url: string | null
  preview_url: string | null
}

export const canWrite = (role: Role) => role === 'admin' || role === 'editor'
export const isAdmin = (role: Role) => role === 'admin'

export const PREVIEWABLE_IMAGE = /^image\/(jpeg|png|gif|webp|svg\+xml|avif|bmp)$/
export const isVideo = (mime: string) => mime.startsWith('video/')
export const isAudio = (mime: string) => mime.startsWith('audio/')
export const isPdf = (mime: string) => mime === 'application/pdf'
