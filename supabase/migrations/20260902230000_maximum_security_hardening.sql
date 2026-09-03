-- LeadChasers OS defense-in-depth hardening.
-- Keeps authorization helpers outside the exposed Data API schema, applies
-- least-privilege grants, protects the unique founder identity, and provides
-- an atomic server-only abuse limiter for authentication workflows.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_active_cooperative_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.cooperative_id
  from public.members m
  join public.roles r on r.id = m.role_id
  join public.departments d on d.id = m.department_id
  join auth.users u on u.id = m.user_id
  where m.user_id = (select auth.uid())
    and m.status = 'active'
    and r.active is true
    and d.active is true
    and lower(coalesce(u.email, '')) ~ '^[^@]+@leadchasers[.]ma$'
  limit 1;
$$;

create or replace function private.has_employee_permission(permission_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    join public.roles r on r.id = m.role_id and r.active is true
    join public.departments d on d.id = m.department_id and d.active is true
    join auth.users u on u.id = m.user_id
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and lower(coalesce(u.email, '')) ~ '^[^@]+@leadchasers[.]ma$'
      and (
        m.is_founder is true
        or (
          not exists (
            select 1
            from public.user_permission_overrides deny_override
            join public.permissions deny_permission on deny_permission.id = deny_override.permission_id
            where deny_override.user_id = m.user_id
              and deny_override.effect = 'deny'
              and deny_permission.slug = permission_slug
          )
          and (
            r.slug = 'ceo'
            or exists (
              select 1
              from public.user_permission_overrides allow_override
              join public.permissions allow_permission on allow_permission.id = allow_override.permission_id
              where allow_override.user_id = m.user_id
                and allow_override.effect = 'allow'
                and allow_permission.slug = permission_slug
            )
            or exists (
              select 1
              from public.role_permissions rp
              join public.permissions p on p.id = rp.permission_id
              where rp.role_id = m.role_id and p.slug = permission_slug
            )
          )
        )
      )
  );
$$;

revoke all on function private.current_active_cooperative_id() from public, anon, authenticated;
revoke all on function private.has_employee_permission(text) from public, anon, authenticated;
grant execute on function private.current_active_cooperative_id() to authenticated;
grant execute on function private.has_employee_permission(text) to authenticated;

-- Replace all operational policies so they call helpers that are not exposed
-- as /rest/v1/rpc endpoints.
drop policy if exists "active employees view cooperative" on public.cooperatives;
drop policy if exists "employees view cooperative members" on public.members;
drop policy if exists "employees view reference departments" on public.departments;
drop policy if exists "employees view reference roles" on public.roles;
drop policy if exists "employees view reference permissions" on public.permissions;
drop policy if exists "employees view reference role permissions" on public.role_permissions;
drop policy if exists "authorized employees view projects" on public.projects;
drop policy if exists "authorized employees create projects" on public.projects;
drop policy if exists "authorized employees update projects" on public.projects;
drop policy if exists "authorized employees delete projects" on public.projects;
drop policy if exists "authorized employees view briefs" on public.project_briefs;
drop policy if exists "authorized employees create briefs" on public.project_briefs;
drop policy if exists "authorized employees delete briefs" on public.project_briefs;
drop policy if exists "authorized employees view clients" on public.clients;
drop policy if exists "authorized employees create clients" on public.clients;
drop policy if exists "authorized employees update clients" on public.clients;
drop policy if exists "authorized employees delete clients" on public.clients;
drop policy if exists "authorized employees view phases" on public.production_phases;
drop policy if exists "authorized employees manage phases" on public.production_phases;
drop policy if exists "authorized employees view pricing" on public.service_catalog;
drop policy if exists "authorized employees manage pricing" on public.service_catalog;
drop policy if exists "authorized employees view quotes" on public.quotes;
drop policy if exists "authorized employees create quotes" on public.quotes;
drop policy if exists "authorized employees update quotes" on public.quotes;
drop policy if exists "authorized employees view quote items" on public.quote_items;
drop policy if exists "authorized employees manage quote items" on public.quote_items;
drop policy if exists "authorized employees view cooperative audit" on public.audit_logs;

create policy "active employees view cooperative" on public.cooperatives
  for select to authenticated
  using (id = private.current_active_cooperative_id());
create policy "employees view cooperative members" on public.members
  for select to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('members.view'));
create policy "employees view reference departments" on public.departments
  for select to authenticated using (private.current_active_cooperative_id() is not null);
create policy "employees view reference roles" on public.roles
  for select to authenticated using (private.current_active_cooperative_id() is not null);
create policy "employees view reference permissions" on public.permissions
  for select to authenticated using (private.current_active_cooperative_id() is not null);
create policy "employees view reference role permissions" on public.role_permissions
  for select to authenticated using (private.current_active_cooperative_id() is not null);

create policy "authorized employees view projects" on public.projects
  for select to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('projects.view'));
create policy "authorized employees create projects" on public.projects
  for insert to authenticated
  with check (cooperative_id = private.current_active_cooperative_id() and created_by = (select auth.uid()) and private.has_employee_permission('projects.create'));
create policy "authorized employees update projects" on public.projects
  for update to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('projects.edit'))
  with check (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('projects.edit'));
create policy "authorized employees delete projects" on public.projects
  for delete to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('projects.delete'));

create policy "authorized employees view briefs" on public.project_briefs
  for select to authenticated
  using (private.has_employee_permission('documents.view') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = private.current_active_cooperative_id()
  ));
create policy "authorized employees create briefs" on public.project_briefs
  for insert to authenticated
  with check (created_by = (select auth.uid()) and private.has_employee_permission('documents.upload') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = private.current_active_cooperative_id()
  ));
create policy "authorized employees delete briefs" on public.project_briefs
  for delete to authenticated
  using (private.has_employee_permission('documents.delete') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = private.current_active_cooperative_id()
  ));

create policy "authorized employees view clients" on public.clients
  for select to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('clients.view'));
create policy "authorized employees create clients" on public.clients
  for insert to authenticated
  with check (cooperative_id = private.current_active_cooperative_id() and created_by = (select auth.uid()) and private.has_employee_permission('clients.create'));
create policy "authorized employees update clients" on public.clients
  for update to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('clients.edit'))
  with check (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('clients.edit'));
create policy "authorized employees delete clients" on public.clients
  for delete to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('clients.delete'));

create policy "authorized employees view phases" on public.production_phases
  for select to authenticated
  using (private.has_employee_permission('production.view') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = private.current_active_cooperative_id()
  ));
create policy "authorized employees manage phases" on public.production_phases
  for all to authenticated
  using (private.has_employee_permission('production.edit') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = private.current_active_cooperative_id()
  ))
  with check (private.has_employee_permission('production.edit') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = private.current_active_cooperative_id()
  ));

create policy "authorized employees view pricing" on public.service_catalog
  for select to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('pricing.view'));
create policy "authorized employees manage pricing" on public.service_catalog
  for all to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('pricing.manage'))
  with check (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('pricing.manage'));

create policy "authorized employees view quotes" on public.quotes
  for select to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('quotes.view'));
create policy "authorized employees create quotes" on public.quotes
  for insert to authenticated
  with check (cooperative_id = private.current_active_cooperative_id() and created_by = (select auth.uid()) and private.has_employee_permission('quotes.create'));
create policy "authorized employees update quotes" on public.quotes
  for update to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('quotes.edit'))
  with check (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('quotes.edit'));
create policy "authorized employees view quote items" on public.quote_items
  for select to authenticated
  using (private.has_employee_permission('quotes.view') and exists (
    select 1 from public.quotes q where q.id = quote_id and q.cooperative_id = private.current_active_cooperative_id()
  ));
create policy "authorized employees manage quote items" on public.quote_items
  for all to authenticated
  using (private.has_employee_permission('quotes.edit') and exists (
    select 1 from public.quotes q where q.id = quote_id and q.cooperative_id = private.current_active_cooperative_id()
  ))
  with check (private.has_employee_permission('quotes.edit') and exists (
    select 1 from public.quotes q where q.id = quote_id and q.cooperative_id = private.current_active_cooperative_id()
  ));

create policy "authorized employees view cooperative audit" on public.audit_logs
  for select to authenticated
  using (cooperative_id = private.current_active_cooperative_id() and private.has_employee_permission('audit_logs.view'));

-- No signed-out Data API role may access internal company data. Signed-in
-- access receives only the SQL verbs backed by an explicit RLS policy.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

revoke all on all tables in schema public from authenticated;
grant select on public.cooperatives, public.members, public.departments, public.roles,
  public.permissions, public.role_permissions, public.projects, public.project_briefs,
  public.clients, public.production_phases, public.service_catalog, public.quotes,
  public.quote_items, public.audit_logs to authenticated;
grant insert, update, delete on public.projects, public.clients, public.production_phases,
  public.service_catalog, public.quote_items to authenticated;
grant insert, delete on public.project_briefs to authenticated;
grant insert, update on public.quotes to authenticated;

alter table public.cooperatives force row level security;
alter table public.members force row level security;
alter table public.departments force row level security;
alter table public.roles force row level security;
alter table public.permissions force row level security;
alter table public.role_permissions force row level security;
alter table public.user_permission_overrides force row level security;
alter table public.audit_logs force row level security;
alter table public.projects force row level security;
alter table public.project_briefs force row level security;
alter table public.clients force row level security;
alter table public.production_phases force row level security;
alter table public.service_catalog force row level security;
alter table public.quotes force row level security;
alter table public.quote_items force row level security;

-- Trigger functions should have immutable search paths and are never callable
-- through PostgREST.
alter function public.set_updated_at() set search_path = '';
alter function public.generate_member_id() set search_path = '';
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.generate_member_id() from public, anon, authenticated;
revoke all on function public.seed_project_phases() from public, anon, authenticated;
revoke all on function public.seed_leadchasers_rate_card() from public, anon, authenticated;

-- Bind the globally unique founder record to Saad's verified Auth identity and
-- reserve the CEO role exclusively for that protected row.
create unique index if not exists members_single_founder_global_idx
  on public.members ((is_founder)) where is_founder;

create or replace function public.protect_founder_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_email text;
  selected_role_slug text;
begin
  if tg_op = 'DELETE' then
    if old.is_founder then
      raise exception 'The founder membership cannot be deleted';
    end if;
    return old;
  end if;

  select lower(u.email) into auth_email from auth.users u where u.id = new.user_id;
  select r.slug into selected_role_slug from public.roles r where r.id = new.role_id;

  if selected_role_slug = 'ceo' and new.is_founder is not true then
    raise exception 'The CEO role is reserved for the founder';
  end if;

  if new.is_founder and (
    auth_email is distinct from 'elhamdanisaad@leadchasers.ma'
    or lower(coalesce(new.email, '')) is distinct from 'elhamdanisaad@leadchasers.ma'
    or selected_role_slug is distinct from 'ceo'
    or new.status is distinct from 'active'
  ) then
    raise exception 'The founder identity, CEO role, and active status are protected';
  end if;

  if tg_op = 'UPDATE' and old.is_founder and (
    new.is_founder is not true
    or new.user_id is distinct from old.user_id
    or new.cooperative_id is distinct from old.cooperative_id
    or new.role_id is distinct from old.role_id
    or new.status is distinct from 'active'
  ) then
    raise exception 'The founder role and active status are protected';
  end if;

  return new;
end;
$$;

drop trigger if exists members_protect_founder on public.members;
create trigger members_protect_founder
  before insert or update or delete on public.members
  for each row execute function public.protect_founder_membership();
revoke all on function public.protect_founder_membership() from public, anon, authenticated;

-- Remove obsolete exposed helper endpoints after every policy has moved to the
-- private schema.
drop function if exists public.current_active_cooperative_id();
drop function if exists public.has_employee_permission(text);
drop function if exists public.is_cooperative_admin(uuid);
drop function if exists public.is_cooperative_member(uuid);
drop function if exists public.is_project_cooperative_admin(uuid);
drop function if exists public.is_project_cooperative_member(uuid);

-- Central, atomic, server-only abuse limiter. Identifiers are HMAC hashes; raw
-- email addresses and network addresses are never stored.
create table if not exists private.security_rate_limits (
  scope text not null check (char_length(scope) between 3 and 80),
  identifier_hash text not null check (identifier_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default clock_timestamp(),
  attempts integer not null default 0 check (attempts >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (scope, identifier_hash)
);
create index if not exists security_rate_limits_updated_idx
  on private.security_rate_limits (updated_at);
revoke all on table private.security_rate_limits from public, anon, authenticated;

create or replace function public.consume_security_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  current_state private.security_rate_limits%rowtype;
begin
  if char_length(p_scope) not between 3 and 80
    or p_identifier_hash !~ '^[a-f0-9]{64}$'
    or p_max_attempts not between 1 and 1000
    or p_window_seconds not between 1 and 86400
    or p_block_seconds not between 1 and 604800 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into private.security_rate_limits (scope, identifier_hash)
  values (p_scope, p_identifier_hash)
  on conflict (scope, identifier_hash) do nothing;

  select * into current_state
  from private.security_rate_limits
  where scope = p_scope and identifier_hash = p_identifier_hash
  for update;

  if current_state.blocked_until is not null and current_state.blocked_until > v_now then
    return query select false, greatest(1, ceil(extract(epoch from (current_state.blocked_until - v_now)))::integer);
    return;
  end if;

  if current_state.window_started_at <= v_now - make_interval(secs => p_window_seconds) then
    update private.security_rate_limits
    set attempts = 0, window_started_at = v_now, blocked_until = null, updated_at = v_now
    where scope = p_scope and identifier_hash = p_identifier_hash;
    current_state.attempts := 0;
  end if;

  if current_state.attempts >= p_max_attempts then
    update private.security_rate_limits
    set blocked_until = v_now + make_interval(secs => p_block_seconds), updated_at = v_now
    where scope = p_scope and identifier_hash = p_identifier_hash;
    return query select false, p_block_seconds;
    return;
  end if;

  update private.security_rate_limits
  set attempts = attempts + 1, updated_at = v_now
  where scope = p_scope and identifier_hash = p_identifier_hash;
  return query select true, 0;
end;
$$;

create or replace function public.clear_security_rate_limit(p_scope text, p_identifier_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.security_rate_limits
  where scope = p_scope and identifier_hash = p_identifier_hash;
$$;

revoke all on function public.consume_security_rate_limit(text, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.clear_security_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, text, integer, integer, integer) to service_role;
grant execute on function public.clear_security_rate_limit(text, text) to service_role;

commit;
