export type ErrorReport = {
  message: string
  stack?: string | null
  source: 'client' | 'server'
  context?: string | null
}

const GITHUB_API = 'https://api.github.com'

const githubHeaders = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
})

const topStackFrame = (stack?: string | null) =>
  stack?.split('\n').find((line) => line.trim().startsWith('at '))?.trim() ?? ''

// Web Crypto (not node:crypto) — this module is also bundled for the Edge runtime.
const fingerprintOf = async (report: ErrorReport) => {
  const input = `${report.source}:${report.message}:${topStackFrame(report.stack)}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24)
}

// Fingerprints already filed this server lifetime — avoids re-hitting the
// GitHub API for every occurrence of a noisy error.
const knownFingerprints = new Set<string>()

const issueAlreadyExists = async (repo: string, fingerprint: string) => {
  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/issues?labels=auto-error&state=open&per_page=100`,
    { headers: githubHeaders() }
  )
  if (!res.ok) return false
  const issues: { body?: string | null }[] = await res.json()
  return issues.some((issue) => issue.body?.includes(fingerprint))
}

const issueBodyFor = (report: ErrorReport, fingerprint: string) =>
  [
    `**Auto-filed by Vault error tracking.**`,
    ``,
    `| | |`,
    `|---|---|`,
    `| Source | ${report.source} |`,
    `| Context | ${report.context ?? '—'} |`,
    `| Fingerprint | \`${fingerprint}\` |`,
    ``,
    `### Message`,
    '```',
    report.message.slice(0, 2000),
    '```',
    ...(report.stack ? ['', '### Stack trace', '```', report.stack.slice(0, 8000), '```'] : []),
  ].join('\n')

const fileIssue = async (repo: string, report: ErrorReport, fingerprint: string) => {
  await fetch(`${GITHUB_API}/repos/${repo}/issues`, {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({
      title: `[auto-error] ${report.message.slice(0, 120)}`,
      body: issueBodyFor(report, fingerprint),
      labels: ['auto-error'],
    }),
  })
}

/** File a GitHub issue for this error unless one is already open (deduped by
 *  fingerprint). GitHub Issues are the sole error tracker — no local storage. */
export const trackError = async (report: ErrorReport) => {
  const repo = process.env.GITHUB_REPO
  if (!process.env.GITHUB_TOKEN || !repo) return

  const fingerprint = await fingerprintOf(report)
  if (knownFingerprints.has(fingerprint)) return
  knownFingerprints.add(fingerprint)

  if (await issueAlreadyExists(repo, fingerprint)) return
  await fileIssue(repo, report, fingerprint)
}

/** Fire-and-forget variant that can never throw — safe inside error paths. */
export const trackErrorSafely = (report: ErrorReport) => {
  trackError(report).catch(() => {})
}
