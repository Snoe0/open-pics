'use client'

import { useMemo, useState } from 'react'
import type { Folder } from '@/lib/types'
import { createFolder, deleteFolder, renameFolder } from '@/lib/api'
import { useLibrary, useSelectFolder } from '@/components/library/LibraryProvider'
import {
  CheckIcon,
  ChevronIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from '@/components/layout/icons'

type ChildrenByParent = Map<string | null, Folder[]>

const groupByParent = (folders: Folder[]): ChildrenByParent => {
  const map: ChildrenByParent = new Map()
  for (const folder of folders) {
    const siblings = map.get(folder.parent_id) ?? []
    siblings.push(folder)
    map.set(folder.parent_id, siblings)
  }
  return map
}

const InlineNameInput = ({
  initial,
  placeholder,
  onSubmit,
  onCancel,
}: {
  initial?: string
  placeholder: string
  onSubmit: (name: string) => void
  onCancel: () => void
}) => {
  const [name, setName] = useState(initial ?? '')
  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) onSubmit(trimmed)
    else onCancel()
  }
  return (
    <input
      autoFocus
      value={name}
      onChange={(event) => setName(event.target.value)}
      onBlur={submit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') submit()
        if (event.key === 'Escape') onCancel()
      }}
      placeholder={placeholder}
      className="w-full border border-border-strong bg-surface-2 px-1.5 py-0.5 text-[13px] text-foreground outline-none placeholder:text-faint focus:border-accent"
    />
  )
}

const HoverAction = ({
  title,
  danger,
  onClick,
  children,
}: {
  title: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    title={title}
    onClick={(event) => {
      event.stopPropagation()
      onClick()
    }}
    className={`p-0.5 transition-colors ${
      danger ? 'text-faint hover:text-danger' : 'text-faint hover:text-foreground'
    }`}
  >
    {children}
  </button>
)

const DeleteConfirmRow = ({
  depth,
  onConfirm,
  onCancel,
}: {
  depth: number
  onConfirm: () => void
  onCancel: () => void
}) => (
  <div
    className="flex items-center gap-2 py-1 pr-2 text-[12px] text-danger"
    style={{ paddingLeft: `${16 + depth * 14}px` }}
  >
    <span className="uppercase tracking-wider">Delete?</span>
    <button onClick={onConfirm} title="Confirm delete" className="p-0.5 hover:text-foreground">
      <CheckIcon className="h-3 w-3" />
    </button>
    <button onClick={onCancel} title="Cancel" className="p-0.5 text-faint hover:text-foreground">
      <XIcon className="h-3 w-3" />
    </button>
  </div>
)

type NodeMode = 'view' | 'rename' | 'newChild' | 'confirmDelete'

const FolderNode = ({
  folder,
  depth,
  childrenByParent,
}: {
  folder: Folder
  depth: number
  childrenByParent: ChildrenByParent
}) => {
  const { writable, selection, setSelection, refreshFolders } = useLibrary()
  const selectFolder = useSelectFolder()
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<NodeMode>('view')

  const children = childrenByParent.get(folder.id) ?? []
  const active = selection === folder.id

  const runAndRefresh = async (action: () => Promise<unknown>) => {
    setMode('view')
    try {
      await action()
      await refreshFolders()
    } catch {
      // tree stays as-is on failure
    }
  }

  const confirmDelete = () =>
    runAndRefresh(async () => {
      await deleteFolder(folder.id)
      if (active) setSelection(null)
    })

  if (mode === 'confirmDelete')
    return (
      <DeleteConfirmRow depth={depth} onConfirm={confirmDelete} onCancel={() => setMode('view')} />
    )

  return (
    <div>
      {mode === 'rename' ? (
        <div className="py-0.5 pr-2" style={{ paddingLeft: `${16 + depth * 14}px` }}>
          <InlineNameInput
            initial={folder.name}
            placeholder="Folder name…"
            onSubmit={(name) => runAndRefresh(() => renameFolder(folder.id, name))}
            onCancel={() => setMode('view')}
          />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => selectFolder(folder.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') selectFolder(folder.id)
          }}
          className={`group flex w-full cursor-pointer items-center gap-1 py-1 pr-2 text-left text-[13px] transition-colors ${
            active
              ? 'bg-surface-2 text-foreground shadow-[inset_2px_0_0_var(--accent)]'
              : 'text-muted hover:bg-surface-2 hover:text-foreground'
          }`}
          style={{ paddingLeft: `${4 + depth * 14}px` }}
        >
          <button
            title={expanded ? 'Collapse' : 'Expand'}
            onClick={(event) => {
              event.stopPropagation()
              setExpanded((open) => !open)
            }}
            className={`shrink-0 p-0.5 text-faint transition-colors hover:text-foreground ${
              children.length === 0 ? 'invisible' : ''
            }`}
          >
            <ChevronIcon
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
          <FolderIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          {writable && (
            <span className="hidden shrink-0 items-center group-hover:flex">
              <HoverAction title="New subfolder" onClick={() => setMode('newChild')}>
                <PlusIcon className="h-3 w-3" />
              </HoverAction>
              <HoverAction title="Rename" onClick={() => setMode('rename')}>
                <PencilIcon className="h-3 w-3" />
              </HoverAction>
              <HoverAction title="Delete" danger onClick={() => setMode('confirmDelete')}>
                <TrashIcon className="h-3 w-3" />
              </HoverAction>
            </span>
          )}
        </div>
      )}

      {mode === 'newChild' && (
        <div className="py-0.5 pr-2" style={{ paddingLeft: `${16 + (depth + 1) * 14}px` }}>
          <InlineNameInput
            placeholder="Subfolder name…"
            onSubmit={(name) =>
              runAndRefresh(async () => {
                await createFolder(name, folder.id)
                setExpanded(true)
              })
            }
            onCancel={() => setMode('view')}
          />
        </div>
      )}

      {expanded &&
        children.map((child) => (
          <FolderNode
            key={child.id}
            folder={child}
            depth={depth + 1}
            childrenByParent={childrenByParent}
          />
        ))}
    </div>
  )
}

export const FolderTree = () => {
  const { folders } = useLibrary()
  const childrenByParent = useMemo(() => groupByParent(folders), [folders])
  const roots = childrenByParent.get(null) ?? []

  if (roots.length === 0)
    return <p className="px-4 py-1 text-[12px] text-faint">No folders yet</p>

  return (
    <div>
      {roots.map((folder) => (
        <FolderNode key={folder.id} folder={folder} depth={0} childrenByParent={childrenByParent} />
      ))}
    </div>
  )
}
