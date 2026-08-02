'use client'

import { useState } from 'react'
import Link from 'next/link'
import { isAdmin } from '@/lib/types'
import { createFolder } from '@/lib/api'
import { useLibrary, useSelectFolder } from '@/components/library/LibraryProvider'
import { FolderTree } from '@/components/layout/FolderTree'
import { UserBlock } from '@/components/layout/UserBlock'
import { PlusIcon, UsersIcon } from '@/components/layout/icons'

const SectionLabel = ({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) => (
  <div className="mb-1 mt-5 flex items-center justify-between px-4 first:mt-0">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
      {children}
    </span>
    {action}
  </div>
)

const NavItem = ({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-2 px-4 py-1.5 text-left text-[13px] transition-colors ${
      active
        ? 'bg-surface-2 text-foreground shadow-[inset_2px_0_0_var(--accent)]'
        : 'text-muted hover:bg-surface-2 hover:text-foreground'
    }`}
  >
    {label}
  </button>
)

const Wordmark = () => (
  <Link href="/" className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
    <span className="block h-2.5 w-2.5 bg-accent" aria-hidden />
    <span className="text-sm font-semibold uppercase tracking-[0.3em] text-foreground">Vault</span>
  </Link>
)

const NewFolderRow = ({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string) => void
  onCancel: () => void
}) => {
  const [name, setName] = useState('')
  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) onCreate(trimmed)
    else onCancel()
  }
  return (
    <div className="px-4 py-1">
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={submit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
          if (event.key === 'Escape') onCancel()
        }}
        placeholder="Folder name…"
        className="w-full border border-border-strong bg-surface-2 px-2 py-1 text-[13px] text-foreground outline-none placeholder:text-faint focus:border-accent"
      />
    </div>
  )
}

const AdminLinks = () => (
  <div className="border-t border-border">
    <Link
      href="/team"
      className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <UsersIcon className="h-3.5 w-3.5" />
      Team
    </Link>
  </div>
)

export const Sidebar = () => {
  const { profile, writable, selection, refreshFolders } = useLibrary()
  const selectFolder = useSelectFolder()
  const [creatingRoot, setCreatingRoot] = useState(false)

  const createRootFolder = async (name: string) => {
    setCreatingRoot(false)
    try {
      await createFolder(name, null)
      await refreshFolders()
    } catch {
      // folder list is unchanged on failure
    }
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border bg-surface">
      <Wordmark />

      <nav className="min-h-0 flex-1 overflow-y-auto py-4">
        <SectionLabel>Library</SectionLabel>
        <NavItem label="All assets" active={selection === null} onClick={() => selectFolder(null)} />
        <NavItem
          label="Unfiled"
          active={selection === 'root'}
          onClick={() => selectFolder('root')}
        />

        <SectionLabel
          action={
            writable ? (
              <button
                onClick={() => setCreatingRoot(true)}
                title="New folder"
                className="p-0.5 text-faint transition-colors hover:text-foreground"
              >
                <PlusIcon className="h-3 w-3" />
              </button>
            ) : undefined
          }
        >
          Folders
        </SectionLabel>
        {creatingRoot && (
          <NewFolderRow onCreate={createRootFolder} onCancel={() => setCreatingRoot(false)} />
        )}
        <FolderTree />
      </nav>

      {isAdmin(profile.role) && <AdminLinks />}
      <UserBlock />
    </aside>
  )
}
