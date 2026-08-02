'use client'

import { useState } from 'react'
import type { Profile, Role } from '@/lib/types'
import { ROLE_OPTIONS, formatDate } from '@/components/team/helpers'

type MembersTableProps = {
  members: Profile[]
  loaded: boolean
  currentUserId: string
  onChangeRole: (id: string, role: Role) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

export const MembersTable = ({
  members,
  loaded,
  currentUserId,
  onChangeRole,
  onRemove,
}: MembersTableProps) => (
  <div className="overflow-x-auto border border-border bg-surface">
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border">
          <HeaderCell>Email</HeaderCell>
          <HeaderCell>Name</HeaderCell>
          <HeaderCell>Role</HeaderCell>
          <HeaderCell>Joined</HeaderCell>
          <HeaderCell>Actions</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {!loaded && <MessageRow>Loading members…</MessageRow>}
        {loaded && members.length === 0 && <MessageRow>No members yet.</MessageRow>}
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSelf={member.id === currentUserId}
            onChangeRole={onChangeRole}
            onRemove={onRemove}
          />
        ))}
      </tbody>
    </table>
  </div>
)

type MemberRowProps = {
  member: Profile
  isSelf: boolean
  onChangeRole: (id: string, role: Role) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

const MemberRow = ({ member, isSelf, onChangeRole, onRemove }: MemberRowProps) => (
  <tr className="border-b border-border last:border-b-0">
    <td className="px-4 py-3">
      <span className="text-foreground">{member.email}</span>
      {isSelf && <YouBadge />}
    </td>
    <td className="px-4 py-3 text-muted">{member.display_name ?? '—'}</td>
    <td className="px-4 py-3">
      <RoleSelect
        value={member.role}
        disabled={isSelf}
        onChange={(role) => onChangeRole(member.id, role)}
      />
    </td>
    <td className="px-4 py-3 text-muted">{formatDate(member.created_at)}</td>
    <td className="px-4 py-3">
      {!isSelf && <RemoveMemberButton onConfirm={() => onRemove(member.id)} />}
    </td>
  </tr>
)

const YouBadge = () => (
  <span className="ml-2 border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-faint">
    you
  </span>
)

type RoleSelectProps = {
  value: Role
  disabled: boolean
  onChange: (role: Role) => void
}

const RoleSelect = ({ value, disabled, onChange }: RoleSelectProps) => (
  <select
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value as Role)}
    className="border border-border bg-surface-2 px-2 py-1 text-xs text-foreground focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
  >
    {ROLE_OPTIONS.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
)

const RemoveMemberButton = ({ onConfirm }: { onConfirm: () => Promise<void> }) => {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const confirmRemoval = async () => {
    setBusy(true)
    await onConfirm()
    setBusy(false)
    setConfirming(false)
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs uppercase tracking-wider text-danger hover:underline"
      >
        Remove
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2 text-xs uppercase tracking-wider">
      <span className="text-muted">Remove?</span>
      <button
        type="button"
        disabled={busy}
        onClick={confirmRemoval}
        className="text-danger hover:underline disabled:opacity-50"
      >
        {busy ? 'Removing…' : 'Confirm'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirming(false)}
        className="text-muted hover:underline disabled:opacity-50"
      >
        Cancel
      </button>
    </span>
  )
}

const HeaderCell = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-faint">
    {children}
  </th>
)

const MessageRow = ({ children }: { children: React.ReactNode }) => (
  <tr>
    <td colSpan={5} className="px-4 py-6 text-sm text-muted">
      {children}
    </td>
  </tr>
)
