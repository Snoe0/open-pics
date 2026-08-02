const ROLE_DESCRIPTIONS = [
  { role: 'Admin', description: 'Full control + team management' },
  { role: 'Editor', description: 'Upload, tag, edit' },
  { role: 'Viewer', description: 'Browse, search, download' },
]

export const RoleLegend = () => (
  <div className="border border-border bg-surface p-4">
    <dl className="flex flex-col gap-2 text-sm">
      {ROLE_DESCRIPTIONS.map(({ role, description }) => (
        <div key={role} className="flex items-baseline gap-3">
          <dt className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wider text-faint">
            {role}
          </dt>
          <dd className="text-muted">{description}</dd>
        </div>
      ))}
    </dl>
  </div>
)
