'use client'

import { useCallback, useRef, useState, type DragEvent } from 'react'

type ItemStatus = 'hashing' | 'uploading' | 'processing' | 'done' | 'duplicate' | 'skipped' | 'error'

type UploadItem = {
  id: string
  file: File
  status: ItemStatus
  contentHash: string | null
  duplicateOf: string | null
  error: string | null
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  hashing: 'Hashing',
  uploading: 'Uploading',
  processing: 'Processing',
  done: 'Done',
  duplicate: 'Duplicate',
  skipped: 'Skipped',
  error: 'Error',
}

const STATUS_CLASS: Record<ItemStatus, string> = {
  hashing: 'text-muted',
  uploading: 'text-accent',
  processing: 'text-accent',
  done: 'text-success',
  duplicate: 'text-warning',
  skipped: 'text-faint',
  error: 'text-danger',
}

export const UploadDropzone = ({
  folderId,
  onUploaded,
}: {
  folderId: string | null
  onUploaded: () => void
}) => {
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const uploadAndComplete = useCallback(
    async (item: UploadItem, contentHash: string, s3Key: string, uploadUrl: string) => {
      updateItem(item.id, { status: 'uploading' })
      await putFileToS3(item.file, uploadUrl)

      updateItem(item.id, { status: 'processing' })
      const asset = await completeUpload(item.file, contentHash, s3Key, folderId)

      requestAiTagging(asset.id)
      updateItem(item.id, { status: 'done' })
      onUploaded()
    },
    [folderId, onUploaded, updateItem]
  )

  const processFile = useCallback(
    async (item: UploadItem, force: boolean) => {
      try {
        updateItem(item.id, { status: 'hashing', duplicateOf: null, error: null })
        const contentHash = item.contentHash ?? (await sha256Hex(item.file))
        updateItem(item.id, { contentHash })

        const prepared = await prepareUpload(item.file, contentHash, folderId, force)
        if ('duplicate' in prepared) {
          updateItem(item.id, { status: 'duplicate', duplicateOf: prepared.duplicate.filename })
          return
        }

        await uploadAndComplete(item, contentHash, prepared.s3Key, prepared.uploadUrl)
      } catch (err) {
        updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' })
      }
    },
    [folderId, updateItem, uploadAndComplete]
  )

  const acceptFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const newItems = Array.from(files).map(toUploadItem)
      setItems((prev) => [...prev, ...newItems])
      newItems.forEach((item) => processFile(item, false))
    },
    [processFile]
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragActive(false)
      acceptFiles(e.dataTransfer.files)
    },
    [acceptFiles]
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-6 py-10 transition-colors ${
          dragActive
            ? 'border-accent bg-surface-2'
            : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2'
        }`}
      >
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
          Drop files here
        </span>
        <span className="text-xs text-faint">or click to browse — multiple files supported</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            acceptFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border border border-border bg-surface">
          {items.map((item) => (
            <UploadRow
              key={item.id}
              item={item}
              onForceUpload={() => processFile(item, true)}
              onSkip={() => updateItem(item.id, { status: 'skipped' })}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

const UploadRow = ({
  item,
  onForceUpload,
  onSkip,
}: {
  item: UploadItem
  onForceUpload: () => void
  onSkip: () => void
}) => (
  <li className="flex flex-col gap-1.5 px-3 py-2">
    <div className="flex items-center gap-3">
      <span className="min-w-0 flex-1 truncate text-xs text-foreground" title={item.file.name}>
        {item.file.name}
      </span>
      <span className="shrink-0 text-[10px] text-faint">{formatBytes(item.file.size)}</span>
      <span
        className={`shrink-0 text-[10px] font-medium uppercase tracking-wider ${STATUS_CLASS[item.status]}`}
      >
        {STATUS_LABEL[item.status]}
      </span>
    </div>

    {item.status === 'duplicate' && (
      <div className="flex items-center gap-3 border border-border bg-surface-2 px-2.5 py-1.5">
        <span className="min-w-0 flex-1 truncate text-[11px] text-warning">
          Duplicate of {item.duplicateOf}
        </span>
        <button
          type="button"
          onClick={onForceUpload}
          className="shrink-0 border border-border-strong bg-surface-3 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Upload anyway
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted transition-colors hover:text-foreground"
        >
          Skip
        </button>
      </div>
    )}

    {item.status === 'error' && item.error && (
      <span className="truncate text-[11px] text-danger" title={item.error}>
        {item.error}
      </span>
    )}
  </li>
)

// ── Upload pipeline helpers ──────────────────────────────────────────────────

const toUploadItem = (file: File): UploadItem => ({
  id: crypto.randomUUID(),
  file,
  status: 'hashing',
  contentHash: null,
  duplicateOf: null,
  error: null,
})

const fileMimeType = (file: File): string => file.type || 'application/octet-stream'

const sha256Hex = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

type PrepareResult =
  | { s3Key: string; uploadUrl: string }
  | { duplicate: { assetId: string; filename: string } }

const prepareUpload = async (
  file: File,
  contentHash: string,
  folderId: string | null,
  force: boolean
): Promise<PrepareResult> => {
  const res = await fetch('/api/upload/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: fileMimeType(file),
      size: file.size,
      contentHash,
      folderId,
      force,
    }),
  })
  if (!res.ok) throw new Error(await readApiError(res, 'Prepare failed'))
  return res.json()
}

const putFileToS3 = async (file: File, uploadUrl: string) => {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': fileMimeType(file) },
    body: file,
  })
  if (!res.ok) throw new Error(`S3 upload failed (${res.status})`)
}

const completeUpload = async (
  file: File,
  contentHash: string,
  s3Key: string,
  folderId: string | null
): Promise<{ id: string }> => {
  const res = await fetch('/api/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      s3Key,
      filename: file.name,
      mimeType: fileMimeType(file),
      size: file.size,
      contentHash,
      folderId,
    }),
  })
  if (!res.ok) throw new Error(await readApiError(res, 'Processing failed'))
  const { asset } = await res.json()
  return asset
}

const requestAiTagging = (assetId: string) => {
  fetch('/api/ai/tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId }),
  }).catch(() => {})
}

const readApiError = async (res: Response, fallback: string): Promise<string> => {
  try {
    const body = await res.json()
    return typeof body.error === 'string' ? body.error : fallback
  } catch {
    return fallback
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
