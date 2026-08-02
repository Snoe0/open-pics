import type { Asset } from '@/lib/types'
import { isAudio, isPdf, isVideo } from '@/lib/types'

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = -1
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

/** Short uppercase-friendly label for a card / metadata row: IMAGE, VIDEO, AUDIO, PDF, FILE. */
export const assetTypeLabel = (mime: string): string => {
  if (mime.startsWith('image/')) return 'image'
  if (isVideo(mime)) return 'video'
  if (isAudio(mime)) return 'audio'
  if (isPdf(mime)) return 'pdf'
  return 'file'
}

/** File extension for placeholder tiles, e.g. "PSD"; falls back to "FILE". */
export const fileExtension = (asset: Asset): string => {
  const match = /\.([a-zA-Z0-9]{1,5})$/.exec(asset.filename)
  return (match ? match[1] : 'file').toUpperCase()
}

export const isImageMime = (mime: string): boolean => mime.startsWith('image/')
