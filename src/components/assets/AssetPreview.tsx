'use client'

import type { AssetWithTags } from '@/lib/types'
import { isAudio, isPdf, isVideo } from '@/lib/types'
import { fileExtension, isImageMime } from '@/components/assets/assetDisplay'

const PlaceholderTile = ({ asset }: { asset: AssetWithTags }) => (
  <div className="flex h-48 items-center justify-center bg-surface-2">
    <span className="text-2xl font-semibold uppercase tracking-widest text-faint">
      {fileExtension(asset)}
    </span>
  </div>
)

export const AssetPreview = ({ asset }: { asset: AssetWithTags }) => {
  const url = asset.preview_url ?? asset.thumb_url

  if (isImageMime(asset.mime_type) && url)
    return (
      <div className="flex max-h-80 items-center justify-center overflow-hidden bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL */}
        <img src={url} alt={asset.filename} className="max-h-80 w-full object-contain" />
      </div>
    )

  if (isVideo(asset.mime_type) && asset.preview_url)
    return <video controls src={asset.preview_url} className="max-h-80 w-full bg-black" />

  if (isAudio(asset.mime_type) && asset.preview_url)
    return (
      <div className="bg-surface-2 p-4">
        <audio controls src={asset.preview_url} className="w-full" />
      </div>
    )

  if (isPdf(asset.mime_type) && asset.preview_url)
    return (
      <iframe src={asset.preview_url} title={asset.filename} className="h-80 w-full bg-white" />
    )

  return <PlaceholderTile asset={asset} />
}
