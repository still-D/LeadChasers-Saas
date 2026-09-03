begin;

-- PostgreSQL combines permissive RLS policies with OR. Remove every policy
-- superseded by 20260902230000 so none can silently broaden the new RBAC rules.
drop policy if exists "members view their cooperative" on public.cooperatives;

drop policy if exists "members view membership" on public.members;
drop policy if exists "members view own cooperative" on public.members;
drop policy if exists "members no client insert" on public.members;
drop policy if exists "members no client update" on public.members;
drop policy if exists "members no client delete" on public.members;

drop policy if exists "members view projects" on public.projects;
drop policy if exists "members create projects" on public.projects;
drop policy if exists "members update projects" on public.projects;
drop policy if exists "members delete projects" on public.projects;

drop policy if exists "members view project briefs" on public.project_briefs;
drop policy if exists "members create project briefs" on public.project_briefs;
drop policy if exists "members delete own project briefs" on public.project_briefs;

drop policy if exists "departments read authenticated" on public.departments;
drop policy if exists "roles read authenticated" on public.roles;
drop policy if exists "permissions read authenticated" on public.permissions;
drop policy if exists "role_permissions read authenticated" on public.role_permissions;
drop policy if exists "user_permission_overrides view own" on public.user_permission_overrides;
drop policy if exists "user_permission_overrides no client mutate" on public.user_permission_overrides;
drop policy if exists "audit_logs view own actor" on public.audit_logs;
drop policy if exists "audit_logs no client mutate" on public.audit_logs;

-- A sub-administrator must not be able to lock out the protected founder by
-- disabling or repurposing the role/department referenced by the founder row.
create or replace function public.protect_founder_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.members m
      where m.is_founder is true and m.role_id = old.id
    ) then
      raise exception 'The founder role cannot be deleted';
    end if;
    return old;
  end if;

  if exists (
    select 1 from public.members m
    where m.is_founder is true and m.role_id = old.id
  ) and (new.slug is distinct from old.slug or new.active is not true) then
    raise exception 'The founder role cannot be renamed or disabled';
  end if;
  return new;
end;
$$;

create or replace function public.protect_founder_department()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.members m
      where m.is_founder is true and m.department_id = old.id
    ) then
      raise exception 'The founder department cannot be deleted';
    end if;
    return old;
  end if;

  if exists (
    select 1 from public.members m
    where m.is_founder is true and m.department_id = old.id
  ) and new.active is not true then
    raise exception 'The founder department cannot be disabled';
  end if;
  return new;
end;
$$;

drop trigger if exists roles_protect_founder on public.roles;
create trigger roles_protect_founder
  before update or delete on public.roles
  for each row execute function public.protect_founder_role();

drop trigger if exists departments_protect_founder on public.departments;
create trigger departments_protect_founder
  before update or delete on public.departments
  for each row execute function public.protect_founder_department();

revoke all on function public.protect_founder_role() from public, anon, authenticated;
revoke all on function public.protect_founder_department() from public, anon, authenticated;

-- Preserve the founder's department binding as well as the identity, role,
-- cooperative, and active status protected by the preceding migration.
create or replace function public.protect_founder_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_email text;
  selected_role_slug text;
  selected_department_active boolean;
begin
  if tg_op = 'DELETE' then
    if old.is_founder then
      raise exception 'The founder membership cannot be deleted';
    end if;
    return old;
  end if;

  select lower(u.email) into auth_email from auth.users u where u.id = new.user_id;
  select r.slug into selected_role_slug from public.roles r where r.id = new.role_id;
  select d.active into selected_department_active from public.departments d where d.id = new.department_id;

  if selected_role_slug = 'ceo' and new.is_founder is not true then
    raise exception 'The CEO role is reserved for the founder';
  end if;

  if new.is_founder and (
    auth_email is distinct from 'elhamdanisaad@leadchasers.ma'
    or lower(coalesce(new.email, '')) is distinct from 'elhamdanisaad@leadchasers.ma'
    or selected_role_slug is distinct from 'ceo'
    or selected_department_active is not true
    or new.status is distinct from 'active'
  ) then
    raise exception 'The founder identity and active access are protected';
  end if;

  if tg_op = 'UPDATE' and old.is_founder and (
    new.is_founder is not true
    or new.user_id is distinct from old.user_id
    or new.cooperative_id is distinct from old.cooperative_id
    or new.role_id is distinct from old.role_id
    or new.department_id is distinct from old.department_id
    or new.status is distinct from 'active'
  ) then
    raise exception 'The founder access binding cannot be changed';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_founder_membership() from public, anon, authenticated;

commit;
