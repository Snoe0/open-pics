'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLibrary } from '@/components/library/LibraryProvider'

const roleBadgeClasses: Record<string, string> = {
  admin: 'border-accent text-accent',
  editor: 'border-border-strong text-muted',
  viewer: 'border-border-strong text-faint',
}

export const UserBlock = () => {
  const { profile } = useLibrary()
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)
    await createClient().auth.signOut()
    location.href = '/login'
  }

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[12px] text-muted" title={profile.email}>
          {profile.email}
        </span>
        <span
          className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
            roleBadgeClasses[profile.role] ?? roleBadgeClasses.viewer
          }`}
        >
          {profile.role}
        </span>
      </div>
      <button
        onClick={signOut}
        disabled={signingOut}
        className="mt-2 w-full border border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}
