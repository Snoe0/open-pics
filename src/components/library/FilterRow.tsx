'use client'

import type { AssetType } from '@/lib/api'
import { useLibrary } from '@/components/library/LibraryProvider'
import { TagFilterDropdown } from '@/components/library/TagFilterDropdown'
import { PALETTE } from '@/components/library/palette'

const TYPE_OPTIONS: { label: string; value: AssetType | null }[] = [
  { label: 'All', value: null },
  { label: 'Images', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Other', value: 'other' },
]

const TypeChips = () => {
  const { typeFilter, setTypeFilter } = useLibrary()
  return (
    <div className="flex items-center">
      {TYPE_OPTIONS.map((option) => {
        const active = typeFilter === option.value
        return (
          <button
            key={option.label}
            onClick={() => setTypeFilter(option.value)}
            className={`border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors -ml-px first:ml-0 ${
              active
                ? 'relative z-10 border-accent text-accent'
                : 'border-border text-faint hover:border-border-strong hover:text-muted'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

const ColorSwatches = () => {
  const { colorFilters, toggleColorFilter } = useLibrary()
  return (
    <div className="flex items-center gap-1.5">
      {PALETTE.map((color) => {
        const active = colorFilters.includes(color.name)
        return (
          <button
            key={color.name}
            title={color.name}
            onClick={() => toggleColorFilter(color.name)}
            className={`h-4 w-4 border transition-transform ${
              active
                ? 'scale-125 border-transparent outline outline-1 outline-offset-1 outline-accent'
                : 'border-border-strong hover:scale-110'
            }`}
            style={{ backgroundColor: color.hex }}
          />
        )
      })}
    </div>
  )
}

const ClearFiltersButton = () => {
  const { hasActiveFilters, clearFilters } = useLibrary()
  if (!hasActiveFilters) return null
  return (
    <button
      onClick={clearFilters}
      className="text-[11px] uppercase tracking-wider text-faint underline-offset-2 transition-colors hover:text-danger"
    >
      Clear
    </button>
  )
}

export const FilterRow = () => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
    <TypeChips />
    <TagFilterDropdown />
    <ColorSwatches />
    <div className="flex-1" />
    <ClearFiltersButton />
  </div>
)
