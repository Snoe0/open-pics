-- S3 File Tagging — database schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).

create extension if not exists vector;

-- ── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

-- ── Invites ─────────────────────────────────────────────────────────────────
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);
create unique index if not exists invites_pending_email on public.invites (lower(email)) where status = 'pending';

-- ── Folders ─────────────────────────────────────────────────────────────────
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Assets ──────────────────────────────────────────────────────────────────
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.folders (id) on delete set null,
  filename text not null,
  s3_key text not null unique,
  thumb_s3_key text,
  mime_type text not null,
  size bigint not null,
  width int,
  height int,
  content_hash text not null,
  phash text,
  description text,
  ai_tagged boolean not null default false,
  embedding vector(1536),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists assets_content_hash on public.assets (content_hash);
create index if not exists assets_folder on public.assets (folder_id);

-- ── Tags ────────────────────────────────────────────────────────────────────
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'manual' check (kind in ('manual', 'ai', 'color')),
  unique (name, kind)
);

create table if not exists public.asset_tags (
  asset_id uuid not null references public.assets (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (asset_id, tag_id)
);

-- ── New-user handling ───────────────────────────────────────────────────────
-- First user ever becomes admin; invited users get their invited role;
-- anyone else defaults to viewer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  assigned_role text := 'viewer';
  inv record;
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
  else
    select * into inv from public.invites
      where lower(email) = lower(new.email) and status = 'pending'
      limit 1;
    if found then
      assigned_role := inv.role;
      update public.invites set status = 'accepted' where id = inv.id;
    end if;
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), assigned_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Role helper ─────────────────────────────────────────────────────────────
create or replace function public.current_user_role()
returns text
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.folders enable row level security;
alter table public.assets enable row level security;
alter table public.tags enable row level security;
alter table public.asset_tags enable row level security;

-- Everyone signed in can read profiles; users edit their own name; admins edit roles.
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.current_user_role());
create policy "profiles admin update" on public.profiles for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "profiles admin delete" on public.profiles for delete to authenticated
  using (public.current_user_role() = 'admin');

-- Invites: admin only.
create policy "invites admin all" on public.invites for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- Folders/assets/tags: all signed-in users read; admin/editor write.
create policy "folders read" on public.folders for select to authenticated using (true);
create policy "folders write" on public.folders for all to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "assets read" on public.assets for select to authenticated using (true);
create policy "assets write" on public.assets for all to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "tags read" on public.tags for select to authenticated using (true);
create policy "tags write" on public.tags for all to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "asset_tags read" on public.asset_tags for select to authenticated using (true);
create policy "asset_tags write" on public.asset_tags for all to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

-- ── Natural-language search ─────────────────────────────────────────────────
create index if not exists assets_embedding_idx on public.assets
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_assets(
  query_embedding vector(1536),
  match_count int default 40,
  min_similarity float default 0.15
)
returns table (id uuid, similarity float)
language sql stable
as $$
  select a.id, 1 - (a.embedding <=> query_embedding) as similarity
  from public.assets a
  where a.embedding is not null
    and 1 - (a.embedding <=> query_embedding) >= min_similarity
  order by a.embedding <=> query_embedding
  limit match_count;
$$;
