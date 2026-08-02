'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AssetWithTags } from '@/lib/types'
import { searchAssets } from '@/lib/api'
import { UploadDropzone } from '@/components/upload/UploadDropzone'
import { useLibrary } from '@/components/library/LibraryProvider'
import { useDebounced } from '@/components/library/useDebounced'
import { AssetGrid, EmptyState, GridSkeleton } from '@/components/library/AssetGrid'
import { DetailPanel } from '@/components/assets/DetailPanel'

const CountLabel = ({ count }: { count: number }) => (
  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-faint">
    {count} {count === 1 ? 'asset' : 'assets'}
  </p>
)

const UploadPanel = () => {
  const { writable, uploadOpen, selection, refreshAssets } = useLibrary()
  if (!writable || !uploadOpen) return null
  const folderId = selection === null || selection === 'root' ? null : selection
  return (
    <div className="mb-4 border border-border bg-surface p-4">
      <UploadDropzone folderId={folderId} onUploaded={refreshAssets} />
    </div>
  )
}

type SearchResult = { key: string; assets: AssetWithTags[]; error: string | null }

const useAssetResults = () => {
  const { selection, query, typeFilter, tagFilters, colorFilters, refreshToken } = useLibrary()
  const debouncedQuery = useDebounced(query, 350)

  const filters = useMemo(
    () => ({
      q: debouncedQuery || undefined,
      tags: tagFilters,
      colors: colorFilters,
      type: typeFilter ?? undefined,
      folderId: selection,
    }),
    [debouncedQuery, tagFilters, colorFilters, typeFilter, selection]
  )
  const requestKey = `${JSON.stringify(filters)}#${refreshToken}`
  const [result, setResult] = useState<SearchResult | null>(null)

  useEffect(() => {
    let cancelled = false
    searchAssets(filters)
      .then((assets) => {
        if (!cancelled) setResult({ key: requestKey, assets, error: null })
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ key: requestKey, assets: [], error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [filters, requestKey])

  const fresh = result?.key === requestKey
  return {
    assets: fresh ? result.assets : [],
    loading: !fresh,
    error: fresh ? result.error : null,
  }
}

const LibraryPage = () => {
  const { hasActiveFilters, selectedAssetId, setSelectedAssetId, refreshAssets } = useLibrary()
  const { assets, loading, error } = useAssetResults()

  const closePanel = useCallback(() => setSelectedAssetId(null), [setSelectedAssetId])
  const handleDeleted = useCallback(() => {
    setSelectedAssetId(null)
    refreshAssets()
  }, [setSelectedAssetId, refreshAssets])

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <UploadPanel />
        {error && (
          <p className="mb-4 border border-danger px-3 py-2 text-[12px] text-danger">{error}</p>
        )}
        {loading ? (
          <GridSkeleton />
        ) : assets.length === 0 ? (
          <EmptyState filtered={hasActiveFilters} />
        ) : (
          <>
            <CountLabel count={assets.length} />
            <AssetGrid assets={assets} selectedId={selectedAssetId} onSelect={setSelectedAssetId} />
          </>
        )}
      </div>

      {selectedAssetId && (
        <DetailPanel
          assetId={selectedAssetId}
          onClose={closePanel}
          onChanged={refreshAssets}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}

export default LibraryPage
