'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TrackedError } from '@/lib/errors'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const StatusBadge = ({ status }: { status: TrackedError['status'] }) => {
  const styles = {
    open: 'text-warning border-warning/40',
    issue_filed: 'text-accent border-accent/40',
    resolved: 'text-success border-success/40',
  }[status]
  const label = { open: 'Open', issue_filed: 'Issue filed', resolved: 'Resolved' }[status]
  return (
    <span className={`border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}>
      {label}
    </span>
  )
}

const ErrorRow = ({
  row,
  repo,
  onSetStatus,
}: {
  row: TrackedError
  repo: string | null
  onSetStatus: (id: string, status: 'open' | 'resolved') => void
}) => {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-faint">
          {row.source}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{row.message}</span>
        <span className="shrink-0 text-[12px] text-muted">×{row.count}</span>
        <span className="hidden w-28 shrink-0 text-right text-[12px] text-faint sm:block">
          {formatDate(row.last_seen)}
        </span>
        <StatusBadge status={row.status} />
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-border bg-surface-2 px-4 py-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted">
            <span>Context: {row.context ?? '—'}</span>
            <span>First seen: {formatDate(row.first_seen)}</span>
            <span className="font-mono text-faint">{row.fingerprint}</span>
          </div>
          {row.stack && (
            <pre className="max-h-56 overflow-auto border border-border bg-background p-3 text-[11px] leading-relaxed text-muted">
              {row.stack}
            </pre>
          )}
          <div className="flex items-center gap-3">
            {row.github_issue_number !== null && repo && (
              <a
                href={`https://github.com/${repo}/issues/${row.github_issue_number}`}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-accent hover:text-accent-hover"
              >
                Issue #{row.github_issue_number} ↗
              </a>
            )}
            {row.status !== 'resolved' ? (
              <button
                onClick={() => onSetStatus(row.id, 'resolved')}
                className="border border-border px-2 py-1 text-[12px] text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                Mark resolved
              </button>
            ) : (
              <button
                onClick={() => onSetStatus(row.id, 'open')}
                className="border border-border px-2 py-1 text-[12px] text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const ErrorsManager = () => {
  const [rows, setRows] = useState<TrackedError[]>([])
  const [repo, setRepo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/errors')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load errors')
      const data = await res.json()
      setRows(data.errors)
      setRepo(data.repo)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load errors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const setStatus = async (id: string, status: 'open' | 'resolved') => {
    await fetch(`/api/errors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {})
    refetch()
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-8">
      <h1 className="text-lg font-semibold uppercase tracking-[0.2em]">Errors</h1>
      <p className="mt-1 text-[13px] text-muted">
        Uncaught errors are logged here, deduplicated, and auto-filed as GitHub issues for the
        cloud fix workflow. Fix PRs await your review before deployment.
      </p>

      {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}

      <div className="mt-6 border border-border bg-surface">
        {loading ? (
          <p className="px-4 py-6 text-[13px] text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-muted">No errors logged. Quiet skies.</p>
        ) : (
          rows.map((row) => (
            <ErrorRow key={row.id} row={row} repo={repo} onSetStatus={setStatus} />
          ))
        )}
      </div>
    </div>
  )
}
