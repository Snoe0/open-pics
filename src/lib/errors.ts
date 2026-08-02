import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

export type ErrorReport = {
  message: string
  stack?: string | null
  source: 'client' | 'server'
  context?: string | null
}

export type TrackedError = {
  id: string
  fingerprint: string
  message: string
  stack: string | null
  source: 'client' | 'server'
  context: string | null
  count: number
  first_seen: string
  last_seen: string
  status: 'open' | 'issue_filed' | 'resolved'
  github_issue_number: number | null
}

const topStackFrame = (stack?: string | null) =>
  stack?.split('\n').find((line) => line.trim().startsWith('at '))?.trim() ?? ''

const fingerprintOf = (report: ErrorReport) =>
  createHash('sha256')
    .update(`${report.source}:${report.message}:${topStackFrame(report.stack)}`)
    .digest('hex')
    .slice(0, 24)

const upsertError = async (report: ErrorReport, fingerprint: string) => {
  const db = createAdminClient()
  const { data: existing } = await db
    .from('errors')
    .select('*')
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  if (existing) {
    const { data } = await db
      .from('errors')
      .update({ count: existing.count + 1, last_seen: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    return (data ?? existing) as TrackedError
  }

  const { data, error } = await db
    .from('errors')
    .insert({
      fingerprint,
      message: report.message.slice(0, 2000),
      stack: report.stack?.slice(0, 8000) ?? null,
      source: report.source,
      context: report.context?.slice(0, 500) ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as TrackedError
}

const issueBodyFor = (row: TrackedError) =>
  [
    `**Auto-filed by Vault error tracking.**`,
    ``,
    `| | |`,
    `|---|---|`,
    `| Source | ${row.source} |`,
    `| Context | ${row.context ?? '—'} |`,
    `| First seen | ${row.first_seen} |`,
    `| Occurrences | ${row.count} |`,
    `| Fingerprint | \`${row.fingerprint}\` |`,
    ``,
    `### Message`,
    '```',
    row.message,
    '```',
    ...(row.stack ? ['', '### Stack trace', '```', row.stack, '```'] : []),
  ].join('\n')

const fileGithubIssue = async (row: TrackedError): Promise<number | null> => {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token || !repo) return null

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[auto-error] ${row.message.slice(0, 120)}`,
      body: issueBodyFor(row),
      labels: ['auto-error'],
    }),
  })
  if (!res.ok) return null
  const issue = await res.json()
  return issue.number ?? null
}

const markIssueFiled = async (id: string, issueNumber: number) => {
  const db = createAdminClient()
  await db
    .from('errors')
    .update({ status: 'issue_filed', github_issue_number: issueNumber })
    .eq('id', id)
}

/** Log an error (deduped by fingerprint); files a GitHub issue for new ones. */
export const trackError = async (report: ErrorReport) => {
  const row = await upsertError(report, fingerprintOf(report))
  if (row.status === 'open' && row.github_issue_number === null) {
    const issueNumber = await fileGithubIssue(row)
    if (issueNumber !== null) await markIssueFiled(row.id, issueNumber)
  }
  return row
}

/** Fire-and-forget variant that can never throw — safe inside error paths. */
export const trackErrorSafely = (report: ErrorReport) => {
  trackError(report).catch(() => {})
}
