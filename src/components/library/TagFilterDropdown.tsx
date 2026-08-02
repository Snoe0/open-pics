'use client'

import { useEffect, useState } from 'react'
import type { Tag } from '@/lib/types'
import { getTags } from '@/lib/api'
import { useLibrary } from '@/components/library/LibraryProvider'
import { ChevronIcon } from '@/components/layout/icons'

const TagOption = ({
  tag,
  active,
  onToggle,
}: {
  tag: Tag
  active: boolean
  onToggle: () => void
}) => (
  <button
    onClick={onToggle}
    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
      active ? 'bg-surface-3 text-foreground' : 'text-muted hover:bg-surface-2 hover:text-foreground'
    }`}
  >
    <span
      className={`h-2.5 w-2.5 shrink-0 border ${
        active ? 'border-accent bg-accent' : 'border-border-strong'
      }`}
    />
    <span className="min-w-0 flex-1 truncate">{tag.name}</span>
    {tag.kind === 'ai' && <span className="shrink-0 text-[10px] text-faint">✦</span>}
  </button>
)

export const TagFilterDropdown = () => {
  const { tagFilters, toggleTagFilter } = useLibrary()
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getTags()
      .then((all) => {
        if (!cancelled) setTags(all.filter((tag) => tag.kind !== 'color'))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-1.5 border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors ${
          tagFilters.length > 0
            ? 'border-accent text-accent'
            : 'border-border text-faint hover:border-border-strong hover:text-muted'
        }`}
      >
        Tags
        {tagFilters.length > 0 && <span>({tagFilters.length})</span>}
        <ChevronIcon className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-56 overflow-y-auto border border-border-strong bg-surface py-1 shadow-xl">
            {tags.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-faint">No tags yet</p>
            ) : (
              tags.map((tag) => (
                <TagOption
                  key={tag.id}
                  tag={tag}
                  active={tagFilters.includes(tag.name)}
                  onToggle={() => toggleTagFilter(tag.name)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
