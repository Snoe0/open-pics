'use client'

import { useState, type FormEvent } from 'react'
import type { Role } from '@/lib/types'
import { ROLE_OPTIONS } from '@/components/team/helpers'

export type InviteResult = { error?: string; note?: string | null }

type InviteFormProps = {
  onInvite: (email: string, role: Role) => Promise<InviteResult>
  onClose: () => void
}

export const InviteForm = ({ onInvite, onClose }: InviteFormProps) => {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNote(null)
    const result = await onInvite(email.trim(), role)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setEmail('')
    if (result.note) setNote(result.note)
    else onClose()
  }

  return (
    <form onSubmit={submitInvite} className="border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-64 flex-1 flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-faint">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-border-strong focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-faint">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-border-strong focus:outline-none"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="bg-accent px-4 py-2 text-xs font-medium uppercase tracking-wider text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send invite'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {note && <p className="mt-3 text-sm text-warning">{note}</p>}
    </form>
  )
}
