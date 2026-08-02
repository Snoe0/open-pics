'use client'

import { useState } from 'react'
import type { Invite } from '@/lib/types'
import { formatDate } from '@/components/team/helpers'

type PendingInvitesProps = {
  invites: Invite[]
  loaded: boolean
  onRevoke: (id: string) => Promise<void>
}

export const PendingInvites = ({ invites, loaded, onRevoke }: PendingInvitesProps) => {
  if (loaded && invites.length === 0) {
    return <p className="text-sm text-muted">No pending invites.</p>
  }

  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <HeaderCell>Email</HeaderCell>
            <HeaderCell>Role</HeaderCell>
            <HeaderCell>Invited</HeaderCell>
            <HeaderCell>Actions</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {!loaded && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-sm text-muted">
                Loading invites…
              </td>
            </tr>
          )}
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} onRevoke={onRevoke} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

type InviteRowProps = { invite: Invite; onRevoke: (id: string) => Promise<void> }

const InviteRow = ({ invite, onRevoke }: InviteRowProps) => {
  const [busy, setBusy] = useState(false)

  const revoke = async () => {
    setBusy(true)
    await onRevoke(invite.id)
    setBusy(false)
  }

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3 text-foreground">{invite.email}</td>
      <td className="px-4 py-3 text-muted">{invite.role}</td>
      <td className="px-4 py-3 text-muted">{formatDate(invite.created_at)}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={busy}
          onClick={revoke}
          className="text-xs uppercase tracking-wider text-danger hover:underline disabled:opacity-50"
        >
          {busy ? 'Revoking…' : 'Revoke'}
        </button>
      </td>
    </tr>
  )
}

const HeaderCell = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-faint">
    {children}
  </th>
)
