'use client'

import type { Profile } from '@/lib/types'
import { LibraryProvider } from '@/components/library/LibraryProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export const AppShell = ({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) => (
  <LibraryProvider profile={profile}>
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  </LibraryProvider>
)
