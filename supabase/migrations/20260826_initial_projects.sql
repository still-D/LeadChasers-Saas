create extension if not exists pgcrypto;

create table if not exists public.cooperatives (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references public.cooperatives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (cooperative_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references public.cooperatives(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  code text not null,
  title text not null check (char_length(title) between 3 and 120),
  production_type text not null check (production_type in ('event', 'corporate', 'livestream', 'postproduction', 'drone', 'studio')),
  status text not null default 'planning' check (status in ('planning', 'preproduction', 'production', 'postproduction', 'delivery', 'archived')),
  event_date date not null,
  location text,
  budget_quoted numeric(12,2) not null default 0 check (budget_quoted >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cooperative_id, code)
);

create index if not exists projects_cooperative_event_date_idx on public.projects (cooperative_id, event_date);

create or replace function public.is_cooperative_member(target_cooperative_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where cooperative_id = target_cooperative_id and user_id = auth.uid());
$$;

alter table public.cooperatives enable row level security;
alter table public.members enable row level security;
alter table public.projects enable row level security;

create policy "members view their cooperative" on public.cooperatives for select using (public.is_cooperative_member(id));
create policy "members view membership" on public.members for select using (public.is_cooperative_member(cooperative_id));
create policy "members view projects" on public.projects for select using (public.is_cooperative_member(cooperative_id));
create policy "members create projects" on public.projects for insert with check (public.is_cooperative_member(cooperative_id) and created_by = auth.uid());

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger projects_set_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
