-- Slice 2: strengthen project authorization and query performance.

-- Index to speed up listings scoped to a user/creator.
create index if not exists projects_created_by_idx on public.projects (created_by);

-- Additional index for cooperative + status queries (future dashboard filters).
create index if not exists projects_cooperative_status_idx on public.projects (cooperative_id, status);

-- Helper: is the current user an admin of the project's cooperative?
create or replace function public.is_cooperative_admin(target_cooperative_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where cooperative_id = target_cooperative_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- Update/delete policies: members can only mutate projects within their cooperative.
-- In the cooperative model, any member may contribute; only admins or the creator may delete.
create policy "members update projects" on public.projects
  for update using (public.is_cooperative_member(cooperative_id))
  with check (public.is_cooperative_member(cooperative_id));

create policy "members delete projects" on public.projects
  for delete using (
    public.is_cooperative_member(cooperative_id)
    and (created_by = auth.uid() or public.is_cooperative_admin(cooperative_id))
  );
