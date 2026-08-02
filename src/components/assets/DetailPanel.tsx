'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AssetWithTags, Folder } from '@/lib/types'
import { assetDownloadUrl, deleteAsset, getAsset, patchAsset } from '@/lib/api'
import { useLibrary } from '@/components/library/LibraryProvider'
import { AssetPreview } from '@/components/assets/AssetPreview'
import { TagEditor } from '@/components/assets/TagEditor'
import { assetTypeLabel, formatBytes, formatDate } from '@/components/assets/assetDisplay'
import { DownloadIcon, SpinnerIcon, XIcon } from '@/components/layout/icons'

type PanelProps = {
  assetId: string
  onClose: () => void
  onChanged: () => void
  onDeleted: () => void
}

const useEscapeKey = (onEscape: () => void) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onEscape])
}

const MetadataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-faint">
      {label}
    </span>
    <span className="min-w-0 truncate text-right text-[12px] text-muted" title={value}>
      {value}
    </span>
  </div>
)

const MetadataSection = ({ asset }: { asset: AssetWithTags }) => (
  <section>
    <MetadataRow label="Type" value={asset.mime_type} />
    <MetadataRow label="Size" value={formatBytes(asset.size)} />
    {asset.width !== null && asset.height !== null && (
      <MetadataRow label="Dimensions" value={`${asset.width} × ${asset.height}`} />
    )}
    <MetadataRow label="Uploaded" value={formatDate(asset.created_at)} />
  </section>
)

const FilenameEditor = ({
  asset,
  writable,
  onRename,
}: {
  asset: AssetWithTags
  writable: boolean
  onRename: (filename: string) => Promise<void>
}) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(asset.filename)

  const submit = async () => {
    const trimmed = value.trim()
    setEditing(false)
    if (!trimmed || trimmed === asset.filename) {
      setValue(asset.filename)
      return
    }
    try {
      await onRename(trimmed)
    } catch {
      setValue(asset.filename)
    }
  }

  if (editing)
    return (
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={submit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void submit()
          if (event.key === 'Escape') {
            event.stopPropagation()
            setValue(asset.filename)
            setEditing(false)
          }
        }}
        className="w-full border border-accent bg-surface-2 px-2 py-1 text-sm text-foreground outline-none"
      />
    )

  return (
    <button
      onClick={() => writable && setEditing(true)}
      title={writable ? 'Click to rename' : asset.filename}
      className={`w-full truncate text-left text-sm font-medium text-foreground ${
        writable ? 'transition-colors hover:text-accent-hover' : 'cursor-default'
      }`}
    >
      {asset.filename}
    </button>
  )
}

const MoveToFolderSelect = ({
  asset,
  folders,
  onMove,
}: {
  asset: AssetWithTags
  folders: Folder[]
  onMove: (folderId: string | null) => Promise<void>
}) => {
  const flattenTree = (parentId: string | null, depth: number): { folder: Folder; depth: number }[] =>
    folders
      .filter((folder) => folder.parent_id === parentId)
      .flatMap((folder) => [{ folder, depth }, ...flattenTree(folder.id, depth + 1)])

  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-faint">
        Folder
      </span>
      <select
        value={asset.folder_id ?? ''}
        onChange={(event) => void onMove(event.target.value || null)}
        className="w-full border border-border bg-surface-2 px-2 py-1.5 text-[12px] text-foreground outline-none transition-colors focus:border-accent"
      >
        <option value="">Unfiled</option>
        {flattenTree(null, 0).map(({ folder, depth }) => (
          <option key={folder.id} value={folder.id}>
            {`${' '.repeat(depth)}${folder.name}`}
          </option>
        ))}
      </select>
    </label>
  )
}

const DeleteControl = ({ onDelete }: { onDelete: () => Promise<void> }) => {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const confirm = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming)
    return (
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[12px] text-danger">Delete this asset?</span>
        <button
          onClick={() => void confirm()}
          disabled={deleting}
          className="border border-danger bg-danger px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    )

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-danger transition-colors hover:border-danger"
    >
      Delete asset
    </button>
  )
}

const PanelLoading = () => (
  <div className="flex flex-1 items-center justify-center">
    <SpinnerIcon className="h-5 w-5 text-faint" />
  </div>
)

export const DetailPanel = ({ assetId, onClose, onChanged, onDeleted }: PanelProps) => {
  const { writable, folders } = useLibrary()
  const [loaded, setLoaded] = useState<{ id: string; asset: AssetWithTags } | null>(null)
  const [loadError, setLoadError] = useState<{ id: string; message: string } | null>(null)

  useEscapeKey(onClose)

  const loadAsset = useCallback(
    () =>
      getAsset(assetId)
        .then((fetched) => {
          setLoaded({ id: assetId, asset: fetched })
          setLoadError(null)
        })
        .catch((err: unknown) => {
          setLoadError({
            id: assetId,
            message: err instanceof Error ? err.message : 'Failed to load asset',
          })
        }),
    [assetId]
  )

  useEffect(() => {
    void loadAsset()
  }, [loadAsset])

  // Keyed by id so a stale asset never shows while a newly selected one loads.
  const asset = loaded?.id === assetId ? loaded.asset : null
  const error = loadError?.id === assetId ? loadError.message : null

  const applyPatch = async (patch: Parameters<typeof patchAsset>[1]) => {
    await patchAsset(assetId, patch)
    await loadAsset()
    onChanged()
  }

  const removeAsset = async () => {
    await deleteAsset(assetId)
    onDeleted()
  }

  const refreshAfterTagChange = () => {
    void loadAsset()
    onChanged()
  }

  return (
    <div className="flex w-[400px] max-w-full shrink-0 flex-col overflow-hidden border-l border-border bg-surface">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
          {asset ? assetTypeLabel(asset.mime_type) : 'Asset'} details
        </span>
        <button
          onClick={onClose}
          title="Close (Esc)"
          className="p-1 text-faint transition-colors hover:text-foreground"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && <p className="px-4 py-3 text-[12px] text-danger">{error}</p>}
      {!asset && !error && <PanelLoading />}

      {asset && (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <AssetPreview asset={asset} />
          <FilenameEditor
            key={`${asset.id}:${asset.filename}`}
            asset={asset}
            writable={writable}
            onRename={(filename) => applyPatch({ filename })}
          />
          <MetadataSection asset={asset} />
          {asset.description && (
            <section>
              <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                Description
              </h3>
              <p className="text-[12px] leading-relaxed text-muted">{asset.description}</p>
            </section>
          )}
          <TagEditor asset={asset} writable={writable} onChanged={refreshAfterTagChange} />

          <section className="space-y-3 border-t border-border pt-4">
            <button
              onClick={() => window.open(assetDownloadUrl(asset.id), '_blank')}
              className="flex w-full items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download
            </button>
            {writable && (
              <>
                <MoveToFolderSelect
                  asset={asset}
                  folders={folders}
                  onMove={(folderId) => applyPatch({ folder_id: folderId })}
                />
                <DeleteControl onDelete={removeAsset} />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
