'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Invite, Profile, Role } from '@/lib/types'
import { readApiError } from '@/components/team/helpers'
import { InviteForm, type InviteResult } from '@/components/team/InviteForm'
import { MembersTable } from '@/components/team/MembersTable'
import { PendingInvites } from '@/components/team/PendingInvites'
import { RoleLegend } from '@/components/team/RoleLegend'

type TeamManagerProps = { currentUserId: string }

export const TeamManager = ({ currentUserId }: TeamManagerProps) => {
  const [members, setMembers] = useState<Profile[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetchTeam = useCallback(async () => {
    const res = await fetch('/api/team/invites')
    if (!res.ok) {
      setError(await readApiError(res))
      return
    }
    const data = await res.json()
    setMembers(data.members)
    setInvites(data.invites)
    setLoaded(true)
  }, [])

  useEffect(() => {
    void refetchTeam()
  }, [refetchTeam])

  const inviteMember = async (email: string, role: Role): Promise<InviteResult> => {
    const res = await fetch('/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    if (!res.ok) return { error: await readApiError(res) }
    const data = await res.json()
    await refetchTeam()
    return { note: data.emailSent ? null : data.note }
  }

  const changeMemberRole = async (id: string, role: Role) => {
    setError(null)
    const res = await fetch(`/api/team/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) setError(await readApiError(res))
    await refetchTeam()
  }

  const removeMember = async (id: string) => {
    setError(null)
    const res = await fetch(`/api/team/members/${id}`, { method: 'DELETE' })
    if (!res.ok) setError(await readApiError(res))
    await refetchTeam()
  }

  const revokeInvite = async (id: string) => {
    setError(null)
    const res = await fetch(`/api/team/invites/${id}`, { method: 'DELETE' })
    if (!res.ok) setError(await readApiError(res))
    await refetchTeam()
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <TeamHeader
        showInviteForm={showInviteForm}
        onToggleInviteForm={() => setShowInviteForm((open) => !open)}
      />
      {showInviteForm && (
        <div className="mt-6">
          <InviteForm onInvite={inviteMember} onClose={() => setShowInviteForm(false)} />
        </div>
      )}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <section className="mt-8">
        <SectionLabel>Members</SectionLabel>
        <MembersTable
          members={members}
          loaded={loaded}
          currentUserId={currentUserId}
          onChangeRole={changeMemberRole}
          onRemove={removeMember}
        />
      </section>
      <section className="mt-10">
        <SectionLabel>Pending invites</SectionLabel>
        <PendingInvites invites={invites} loaded={loaded} onRevoke={revokeInvite} />
      </section>
      <section className="mt-10">
        <SectionLabel>Roles</SectionLabel>
        <RoleLegend />
      </section>
    </div>
  )
}

type TeamHeaderProps = { showInviteForm: boolean; onToggleInviteForm: () => void }

const TeamHeader = ({ showInviteForm, onToggleInviteForm }: TeamHeaderProps) => (
  <div className="flex items-end justify-between border-b border-border pb-6">
    <div>
      <h1 className="text-lg font-semibold uppercase tracking-wider">Team</h1>
      <p className="mt-1 text-sm text-muted">
        Manage members, roles, and pending invitations.
      </p>
    </div>
    <button
      type="button"
      onClick={onToggleInviteForm}
      className="bg-accent px-4 py-2 text-xs font-medium uppercase tracking-wider text-accent-fg hover:bg-accent-hover"
    >
      {showInviteForm ? 'Close' : 'Invite member'}
    </button>
  </div>
)

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-faint">
    {children}
  </h2>
)
