'use client'

import type { AssetWithTags } from '@/lib/types'
import { assetTypeLabel, fileExtension } from '@/components/assets/assetDisplay'

const CardThumb = ({ asset }: { asset: AssetWithTags }) => {
  if (asset.thumb_url)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs, not optimizable
      <img
        src={asset.thumb_url}
        alt={asset.filename}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    )
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-2">
      <span className="text-lg font-semibold uppercase tracking-widest text-faint">
        {fileExtension(asset)}
      </span>
    </div>
  )
}

const AssetCard = ({
  asset,
  selected,
  onSelect,
}: {
  asset: AssetWithTags
  selected: boolean
  onSelect: () => void
}) => (
  <button
    onClick={onSelect}
    className={`group flex flex-col border bg-surface text-left transition-colors ${
      selected ? 'border-accent' : 'border-border hover:border-border-strong'
    }`}
  >
    <div className="aspect-square w-full overflow-hidden">
      <CardThumb asset={asset} />
    </div>
    <div className="flex h-9 shrink-0 items-center gap-2 border-t border-border px-2">
      <span className="min-w-0 flex-1 truncate text-xs text-foreground" title={asset.filename}>
        {asset.filename}
      </span>
      <span className="shrink-0 text-[9px] uppercase tracking-wider text-faint">
        {assetTypeLabel(asset.mime_type)}
      </span>
    </div>
  </button>
)

export const GridSkeleton = () => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
    {Array.from({ length: 12 }, (_, index) => (
      <div key={index} className="animate-pulse border border-border bg-surface">
        <div className="aspect-square w-full bg-surface-2" />
        <div className="flex h-9 items-center border-t border-border px-2">
          <div className="h-2.5 w-2/3 bg-surface-3" />
        </div>
      </div>
    ))}
  </div>
)

export const EmptyState = ({ filtered }: { filtered: boolean }) => (
  <div className="flex flex-col items-center justify-center border border-dashed border-border py-24 text-center">
    <p className="text-sm text-muted">{filtered ? 'No assets match' : 'No assets yet'}</p>
    <p className="mt-1 text-[12px] text-faint">
      {filtered ? 'Try clearing filters or a different search.' : 'Drop files to get started.'}
    </p>
  </div>
)

export const AssetGrid = ({
  assets,
  selectedId,
  onSelect,
}: {
  assets: AssetWithTags[]
  selectedId: string | null
  onSelect: (id: string) => void
}) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
    {assets.map((asset) => (
      <AssetCard
        key={asset.id}
        asset={asset}
        selected={asset.id === selectedId}
        onSelect={() => onSelect(asset.id)}
      />
    ))}
  </div>
)
