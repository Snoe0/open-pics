'use client'

import { useState } from 'react'
import type { AssetWithTags, Tag } from '@/lib/types'
import { assignTag, autoTagAsset, removeTag } from '@/lib/api'
import { isImageMime } from '@/components/assets/assetDisplay'
import { colorHex } from '@/components/library/palette'
import { SpinnerIcon, XIcon } from '@/components/layout/icons'

const TagChip = ({
  tag,
  writable,
  onRemove,
}: {
  tag: Tag
  writable: boolean
  onRemove: () => void
}) => (
  <span className="flex items-center gap-1.5 border border-border bg-surface-2 px-2 py-0.5 text-[12px] text-foreground">
    {tag.kind === 'color' && (
      <span
        className="h-2.5 w-2.5 shrink-0 border border-border-strong"
        style={{ backgroundColor: colorHex(tag.name) }}
      />
    )}
    {tag.kind === 'ai' && <span className="text-[10px] text-faint" title="AI tag">✦</span>}
    {tag.name}
    {writable && (
      <button
        onClick={onRemove}
        title="Remove tag"
        className="ml-0.5 text-faint transition-colors hover:text-danger"
      >
        <XIcon className="h-2.5 w-2.5" />
      </button>
    )}
  </span>
)

const AddTagInput = ({ onAdd }: { onAdd: (name: string) => Promise<void> }) => {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onAdd(trimmed)
      setName('')
    } catch {
      // keep the typed value so the user can retry
    } finally {
      setBusy(false)
    }
  }

  return (
    <input
      value={name}
      onChange={(event) => setName(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') void submit()
      }}
      disabled={busy}
      placeholder="Add tag…"
      className="w-full border border-border bg-surface-2 px-2 py-1.5 text-[12px] text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent disabled:opacity-50"
    />
  )
}

export const TagEditor = ({
  asset,
  writable,
  onChanged,
}: {
  asset: AssetWithTags
  writable: boolean
  onChanged: () => void
}) => {
  const [autoTagging, setAutoTagging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canAutoTag = isImageMime(asset.mime_type)

  const runMutation = async (mutate: () => Promise<unknown>) => {
    setError(null)
    try {
      await mutate()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      throw err
    }
  }

  const runAutoTag = async () => {
    setAutoTagging(true)
    try {
      await runMutation(() => autoTagAsset(asset.id))
    } catch {
      // error already surfaced
    } finally {
      setAutoTagging(false)
    }
  }

  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-faint">Tags</h3>
      <div className="flex flex-wrap gap-1.5">
        {asset.tags.length === 0 && <p className="text-[12px] text-faint">No tags</p>}
        {asset.tags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            writable={writable}
            onRemove={() =>
              void runMutation(() => removeTag(asset.id, tag.id)).catch(() => {})
            }
          />
        ))}
      </div>

      {writable && (
        <div className="mt-3 space-y-2">
          <AddTagInput onAdd={(name) => runMutation(() => assignTag(asset.id, name))} />
          <button
            onClick={runAutoTag}
            disabled={!canAutoTag || autoTagging}
            title={canAutoTag ? 'Auto-tag with AI' : 'Auto-tagging works on images only'}
            className="flex w-full items-center justify-center gap-2 border border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {autoTagging ? <SpinnerIcon className="h-3 w-3" /> : <span aria-hidden>✦</span>}
            {autoTagging ? 'Tagging…' : 'Auto-tag'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
    </section>
  )
}
