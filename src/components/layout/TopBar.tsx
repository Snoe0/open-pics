'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLibrary } from '@/components/library/LibraryProvider'
import { FilterRow } from '@/components/library/FilterRow'
import { SearchIcon, UploadIcon } from '@/components/layout/icons'

const SearchInput = () => {
  const { query, setQuery } = useLibrary()
  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search naturally — 'red car at night'…"
        className="w-full border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent"
      />
    </div>
  )
}

const UploadToggle = () => {
  const { uploadOpen, setUploadOpen } = useLibrary()
  return (
    <button
      onClick={() => setUploadOpen(!uploadOpen)}
      className={`flex shrink-0 items-center gap-2 border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
        uploadOpen
          ? 'border-accent bg-accent text-accent-fg hover:bg-accent-hover'
          : 'border-border text-muted hover:border-border-strong hover:text-foreground'
      }`}
    >
      <UploadIcon className="h-3.5 w-3.5" />
      Upload
    </button>
  )
}

const BackToLibraryLink = () => (
  <Link
    href="/"
    className="flex shrink-0 items-center gap-2 border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors hover:border-border-strong hover:text-foreground"
  >
    <span aria-hidden>←</span>
    Back to library
  </Link>
)

export const TopBar = () => {
  const { writable } = useLibrary()
  const onTeamPage = usePathname() === '/team'
  return (
    <header className={`shrink-0 bg-background ${onTeamPage ? '' : 'border-b border-border'}`}>
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        {onTeamPage ? (
          <BackToLibraryLink />
        ) : (
          <>
            <SearchInput />
            {writable && <UploadToggle />}
          </>
        )}
      </div>
      {!onTeamPage && <FilterRow />}
    </header>
  )
}
