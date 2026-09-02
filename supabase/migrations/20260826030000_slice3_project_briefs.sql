-- Slice 3: production briefs — core SaaS artifact tied to projects.

create table if not exists public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 200),
  client_name text check (char_length(client_name) between 0 and 120),
  notes text check (char_length(notes) between 0 and 4000),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for the two main access patterns: by project and by creator.
create index if not exists project_briefs_project_id_idx on public.project_briefs (project_id, created_at desc);
create index if not exists project_briefs_created_by_idx on public.project_briefs (created_by);

-- Helper: is the current user a member of the project brief's cooperative?
create or replace function public.is_project_cooperative_member(target_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    join public.members m on m.cooperative_id = p.cooperative_id
    where p.id = target_project_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_cooperative_admin(target_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    join public.members m on m.cooperative_id = p.cooperative_id
    where p.id = target_project_id and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

alter table public.project_briefs enable row level security;

create policy "members view project briefs" on public.project_briefs
  for select using (public.is_project_cooperative_member(project_id));

create policy "members create project briefs" on public.project_briefs
  for insert with check (
    public.is_project_cooperative_member(project_id) and created_by = auth.uid()
  );

create policy "members delete own project briefs" on public.project_briefs
  for delete using (
    created_by = auth.uid() or public.is_project_cooperative_admin(project_id)
  );

create trigger project_briefs_set_updated_at
  before update on public.project_briefs
  for each row execute procedure public.set_updated_at();
