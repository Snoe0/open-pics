'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Folder, Profile } from '@/lib/types'
import { canWrite } from '@/lib/types'
import type { AssetType } from '@/lib/api'
import { getFolders } from '@/lib/api'

/** null = all assets, 'root' = unfiled only, anything else = a folder id. */
export type FolderSelection = string | null

export type LibraryContextValue = {
  profile: Profile
  writable: boolean
  folders: Folder[]
  refreshFolders: () => Promise<void>
  selection: FolderSelection
  setSelection: (selection: FolderSelection) => void
  query: string
  setQuery: (query: string) => void
  typeFilter: AssetType | null
  setTypeFilter: (type: AssetType | null) => void
  tagFilters: string[]
  toggleTagFilter: (name: string) => void
  colorFilters: string[]
  toggleColorFilter: (name: string) => void
  hasActiveFilters: boolean
  clearFilters: () => void
  uploadOpen: boolean
  setUploadOpen: (open: boolean) => void
  selectedAssetId: string | null
  setSelectedAssetId: (id: string | null) => void
  refreshToken: number
  refreshAssets: () => void
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

export const useLibrary = (): LibraryContextValue => {
  const value = useContext(LibraryContext)
  if (!value) throw new Error('useLibrary must be used inside <LibraryProvider>')
  return value
}

const toggleInList = (list: string[], item: string): string[] =>
  list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]

export const LibraryProvider = ({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) => {
  const [folders, setFolders] = useState<Folder[]>([])
  const [selection, setSelection] = useState<FolderSelection>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | null>(null)
  const [tagFilters, setTagFilters] = useState<string[]>([])
  const [colorFilters, setColorFilters] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const refreshFolders = useCallback(
    () =>
      getFolders()
        .then(setFolders)
        .catch(() => {
          // sidebar keeps its previous folder list on a failed refresh
        }),
    []
  )

  useEffect(() => {
    void refreshFolders()
  }, [refreshFolders])

  const toggleTagFilter = useCallback(
    (name: string) => setTagFilters((current) => toggleInList(current, name)),
    []
  )
  const toggleColorFilter = useCallback(
    (name: string) => setColorFilters((current) => toggleInList(current, name)),
    []
  )
  const clearFilters = useCallback(() => {
    setTypeFilter(null)
    setTagFilters([])
    setColorFilters([])
    setQuery('')
  }, [])
  const refreshAssets = useCallback(() => setRefreshToken((token) => token + 1), [])

  const hasActiveFilters =
    typeFilter !== null || tagFilters.length > 0 || colorFilters.length > 0 || query.length > 0

  const value = useMemo<LibraryContextValue>(
    () => ({
      profile,
      writable: canWrite(profile.role),
      folders,
      refreshFolders,
      selection,
      setSelection,
      query,
      setQuery,
      typeFilter,
      setTypeFilter,
      tagFilters,
      toggleTagFilter,
      colorFilters,
      toggleColorFilter,
      hasActiveFilters,
      clearFilters,
      uploadOpen,
      setUploadOpen,
      selectedAssetId,
      setSelectedAssetId,
      refreshToken,
      refreshAssets,
    }),
    [
      profile,
      folders,
      refreshFolders,
      selection,
      query,
      typeFilter,
      tagFilters,
      toggleTagFilter,
      colorFilters,
      toggleColorFilter,
      hasActiveFilters,
      clearFilters,
      uploadOpen,
      selectedAssetId,
      refreshToken,
      refreshAssets,
    ]
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
