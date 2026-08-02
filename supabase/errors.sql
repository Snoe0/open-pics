-- Error tracking — run in the Supabase SQL editor (after schema.sql).

create table if not exists public.errors (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  message text not null,
  stack text,
  source text not null check (source in ('client', 'server')),
  context text, -- url or route where it happened
  count int not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'issue_filed', 'resolved')),
  github_issue_number int
);

alter table public.errors enable row level security;

-- Admins read/manage from the UI; inserts happen server-side via the service role.
create policy "errors admin all" on public.errors for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
