-- Slice 5: Cooperative member management, departments, roles, permissions, and RBAC.

-- Departments

-- We use `if not exists` defensively because this migration may be re-applied during local resets.
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Roles

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9_-]+$'),
  description text,
  active boolean not null default true,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Permissions

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  description text,
  resource text not null check (char_length(resource) between 2 and 60),
  action text not null check (char_length(action) between 2 and 60),
  created_at timestamptz not null default now()
);

-- Role permissions (many-to-many)

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

-- User permission overrides (per-member overrides, attached to auth user)

create table if not exists public.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_id)
);

-- Audit logs

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 120),
  resource_type text not null check (char_length(resource_type) between 2 and 60),
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Member profile extension

alter table public.members
  add column if not exists member_id text unique,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists occupation text,
  add column if not exists cooperative_position text,
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists role_id uuid references public.roles(id) on delete restrict,
  add column if not exists status text default 'active' check (status in ('invited', 'active', 'suspended', 'deactivated')),
  add column if not exists updated_at timestamptz not null default now();

-- Sequence for member IDs.
create sequence if not exists public.member_id_seq start with 1 increment by 1;

-- Helper to generate member IDs.
create or replace function public.generate_member_id()
returns trigger language plpgsql as $$
begin
  if new.member_id is null or new.member_id = '' then
    new.member_id := 'LC-' || lpad(nextval('public.member_id_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger members_set_member_id
  before insert on public.members
  for each row execute function public.generate_member_id();

-- Seed departments.

insert into public.departments (name, description, active)
values
  ('Management', 'Direction et gestion stratégique de la coopérative.', true),
  ('Finance', 'Comptabilité, budgets et reporting financier.', true),
  ('Operations', 'Coordination opérationnelle et planification.', true),
  ('Production', 'Tournage, captation et réalisation sur le terrain.', true),
  ('Post-Production', 'Montage, étalonnage, mixage et livrables.', true),
  ('Communication', 'Communication interne et externe, marketing.', true),
  ('Technology', 'Systèmes d''information, infrastructure et support.', true),
  ('Administration', 'Ressources humaines, juridique et administration.', true)
on conflict (name) do update set
  description = excluded.description,
  active = excluded.active,
  updated_at = now();

-- Seed roles.

insert into public.roles (name, slug, description, active, is_system_role)
values
  ('CEO / Super Administrator', 'ceo', 'Contrôle total du système.', true, true),
  ('Chief Financial Officer', 'cfo', 'Responsable financier et comptable.', true, true),
  ('Chief Coordinator Officer', 'cco', 'Responsable des opérations et de la coordination.', true, true),
  ('Production Manager', 'production_manager', 'Responsable production et tournage.', true, false),
  ('Post-Production Manager', 'post_production_manager', 'Responsable post-production et livrables.', true, false),
  ('Communication Manager', 'communication_manager', 'Responsable communication et marketing.', true, false),
  ('Technical / IT Manager', 'technical_manager', 'Responsable technique et infrastructure.', true, false),
  ('Project Manager', 'project_manager', 'Responsable de projets et de missions.', true, false),
  ('Staff / Contributor', 'staff', 'Contributeur général.', true, false),
  ('External Collaborator', 'external', 'Collaborateur externe à accès restreint.', true, false)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  active = excluded.active,
  is_system_role = excluded.is_system_role,
  updated_at = now();

-- Seed permissions.

insert into public.permissions (name, slug, description, resource, action)
values
  -- Members
  ('Voir les membres', 'members.view', 'Consulter la liste et le profil des membres.', 'members', 'view'),
  ('Créer un membre', 'members.create', 'Créer un nouveau compte membre.', 'members', 'create'),
  ('Modifier un membre', 'members.edit', 'Modifier le profil et le rôle d''un membre.', 'members', 'edit'),
  ('Supprimer un membre', 'members.delete', 'Supprimer définitivement un compte membre.', 'members', 'delete'),
  ('Suspendre un membre', 'members.suspend', 'Suspendre ou réactiver un membre.', 'members', 'suspend'),
  ('Gérer les rôles des membres', 'members.manage_roles', 'Attribuer ou modifier les rôles des membres.', 'members', 'manage_roles'),
  -- Finance
  ('Voir la finance', 'finance.view', 'Consulter les données financières.', 'finance', 'view'),
  ('Créer une entrée financière', 'finance.create', 'Créer une transaction ou un budget.', 'finance', 'create'),
  ('Modifier la finance', 'finance.edit', 'Modifier une entrée financière.', 'finance', 'edit'),
  ('Supprimer la finance', 'finance.delete', 'Supprimer une entrée financière.', 'finance', 'delete'),
  ('Approuver la finance', 'finance.approve', 'Approuver une transaction ou un budget.', 'finance', 'approve'),
  ('Exporter la finance', 'finance.export', 'Exporter les données financières.', 'finance', 'export'),
  -- Projects
  ('Voir les projets', 'projects.view', 'Consulter les projets.', 'projects', 'view'),
  ('Créer un projet', 'projects.create', 'Créer un nouveau projet.', 'projects', 'create'),
  ('Modifier un projet', 'projects.edit', 'Modifier un projet existant.', 'projects', 'edit'),
  ('Supprimer un projet', 'projects.delete', 'Supprimer un projet.', 'projects', 'delete'),
  ('Assigner un projet', 'projects.assign', 'Assigner des membres à un projet.', 'projects', 'assign'),
  ('Approuver un projet', 'projects.approve', 'Approuver un projet.', 'projects', 'approve'),
  -- Tasks
  ('Voir les tâches', 'tasks.view', 'Consulter les tâches.', 'tasks', 'view'),
  ('Créer une tâche', 'tasks.create', 'Créer une tâche.', 'tasks', 'create'),
  ('Modifier une tâche', 'tasks.edit', 'Modifier une tâche.', 'tasks', 'edit'),
  ('Supprimer une tâche', 'tasks.delete', 'Supprimer une tâche.', 'tasks', 'delete'),
  ('Assigner une tâche', 'tasks.assign', 'Assigner une tâche à un membre.', 'tasks', 'assign'),
  ('Terminer une tâche', 'tasks.complete', 'Marquer une tâche comme terminée.', 'tasks', 'complete'),
  -- Production
  ('Voir la production', 'production.view', 'Consulter la planification de production.', 'production', 'view'),
  ('Créer une production', 'production.create', 'Créer une fiche de production.', 'production', 'create'),
  ('Modifier une production', 'production.edit', 'Modifier une fiche de production.', 'production', 'edit'),
  ('Supprimer une production', 'production.delete', 'Supprimer une fiche de production.', 'production', 'delete'),
  ('Assigner une production', 'production.assign', 'Assigner une production à des membres.', 'production', 'assign'),
  -- Documents
  ('Voir les documents', 'documents.view', 'Consulter les documents.', 'documents', 'view'),
  ('Téléverser un document', 'documents.upload', 'Téléverser un document.', 'documents', 'upload'),
  ('Modifier un document', 'documents.edit', 'Modifier un document.', 'documents', 'edit'),
  ('Supprimer un document', 'documents.delete', 'Supprimer un document.', 'documents', 'delete'),
  ('Télécharger un document', 'documents.download', 'Télécharger un document.', 'documents', 'download'),
  -- Reports
  ('Voir les rapports', 'reports.view', 'Consulter les rapports.', 'reports', 'view'),
  ('Créer un rapport', 'reports.create', 'Créer un rapport.', 'reports', 'create'),
  ('Exporter un rapport', 'reports.export', 'Exporter un rapport.', 'reports', 'export'),
  -- Communication
  ('Voir la communication', 'communication.view', 'Consulter les messages et communications.', 'communication', 'view'),
  ('Créer une communication', 'communication.create', 'Envoyer un message ou une communication.', 'communication', 'create'),
  ('Modifier une communication', 'communication.edit', 'Modifier une communication.', 'communication', 'edit'),
  ('Supprimer une communication', 'communication.delete', 'Supprimer une communication.', 'communication', 'delete'),
  -- Administration
  ('Voir les rôles', 'roles.view', 'Consulter les rôles.', 'roles', 'view'),
  ('Créer un rôle', 'roles.create', 'Créer un rôle.', 'roles', 'create'),
  ('Modifier un rôle', 'roles.edit', 'Modifier un rôle.', 'roles', 'edit'),
  ('Supprimer un rôle', 'roles.delete', 'Supprimer un rôle.', 'roles', 'delete'),
  ('Voir les permissions', 'permissions.view', 'Consulter les permissions.', 'permissions', 'view'),
  ('Gérer les permissions', 'permissions.manage', 'Attribuer ou retirer des permissions.', 'permissions', 'manage'),
  ('Paramètres système', 'system.settings', 'Configurer les paramètres système.', 'system', 'settings'),
  ('Voir les journaux d''audit', 'audit_logs.view', 'Consulter les journaux d''audit.', 'audit_logs', 'view')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action;

-- Map role permissions.

-- Helper to build mappings cleanly.
with role_map as (
  select id, slug from public.roles
), perm_map as (
  select id, slug from public.permissions
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_map r
join perm_map p on (
  (r.slug = 'ceo') or
  (r.slug = 'cfo' and p.slug in (
    'finance.view','finance.create','finance.edit','finance.delete','finance.approve','finance.export',
    'reports.view','reports.export','projects.view','documents.view','members.view'
  )) or
  (r.slug = 'cco' and p.slug in (
    'projects.view','projects.create','projects.edit','projects.assign','projects.approve',
    'tasks.view','tasks.create','tasks.edit','tasks.assign','tasks.complete',
    'production.view','production.create','production.edit','production.assign',
    'members.view','documents.view','communication.view','communication.create'
  )) or
  (r.slug = 'production_manager' and p.slug in (
    'projects.view','projects.create','projects.edit','projects.assign',
    'production.view','production.create','production.edit','production.assign',
    'tasks.view','tasks.create','tasks.edit','tasks.assign','tasks.complete',
    'documents.view','documents.upload','documents.edit','documents.download'
  )) or
  (r.slug = 'post_production_manager' and p.slug in (
    'projects.view','projects.edit','projects.assign',
    'production.view','production.edit','production.assign',
    'tasks.view','tasks.create','tasks.edit','tasks.assign','tasks.complete',
    'documents.view','documents.upload','documents.edit','documents.download','documents.delete'
  )) or
  (r.slug = 'communication_manager' and p.slug in (
    'projects.view','projects.edit','projects.assign',
    'communication.view','communication.create','communication.edit','communication.delete',
    'documents.view','documents.upload','documents.edit','documents.download',
    'reports.view','reports.create','reports.export'
  )) or
  (r.slug = 'technical_manager' and p.slug in (
    'projects.view','projects.edit','projects.assign',
    'documents.view','documents.upload','documents.edit','documents.download',
    'system.settings','audit_logs.view','members.view'
  )) or
  (r.slug = 'project_manager' and p.slug in (
    'projects.view','projects.create','projects.edit','projects.assign',
    'tasks.view','tasks.create','tasks.edit','tasks.assign','tasks.complete',
    'documents.view','documents.upload','documents.edit','documents.download'
  )) or
  (r.slug = 'staff' and p.slug in (
    'projects.view','tasks.view','tasks.complete','documents.view','documents.download'
  )) or
  (r.slug = 'external' and p.slug in (
    'projects.view','tasks.view','documents.view','documents.download'
  ))
)
on conflict (role_id, permission_id) do nothing;

-- Backfill existing members from the legacy schema.

-- Existing members get "Staff" role and "Operations" department if not set.
update public.members m
set
  status = coalesce(m.status, 'active'),
  role_id = coalesce(m.role_id, (select id from public.roles where slug = 'staff')),
  department_id = coalesce(m.department_id, (select id from public.departments where name = 'Operations')),
  cooperative_position = coalesce(m.cooperative_position, case m.role when 'admin' then 'Administrator' else 'Contributor' end),
  occupation = coalesce(m.occupation, 'Non spécifié'),
  first_name = coalesce(m.first_name, 'Membre'),
  last_name = coalesce(m.last_name, 'LeadChasers'),
  updated_at = now()
where m.role_id is null;

-- After backfill, enforce required fields.

alter table public.members
  alter column role_id set not null,
  alter column department_id set not null,
  alter column status set not null,
  alter column cooperative_position set not null,
  alter column occupation set not null,
  alter column first_name set not null,
  alter column last_name set not null;

-- Sync email from auth.users if missing.
update public.members m
set email = coalesce(m.email, u.email)
from auth.users u
where m.user_id = u.id and (m.email is null or m.email = '');

-- Indexes for RBAC queries.

create index if not exists members_user_id_idx on public.members (user_id);
create index if not exists members_role_id_idx on public.members (role_id);
create index if not exists members_department_id_idx on public.members (department_id);
create index if not exists members_status_idx on public.members (status);
create index if not exists role_permissions_permission_id_idx on public.role_permissions (permission_id);
create index if not exists user_permission_overrides_user_id_idx on public.user_permission_overrides (user_id);
create index if not exists user_permission_overrides_permission_id_idx on public.user_permission_overrides (permission_id);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);

-- Row Level Security

alter table public.departments enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.audit_logs enable row level security;

-- Members are cooperative-scoped; users can only see members in their cooperative.
-- The application service layer performs permission checks before writes.

create policy "members view own cooperative" on public.members
  for select using (
    exists (
      select 1 from public.members viewer
      where viewer.user_id = auth.uid() and viewer.cooperative_id = members.cooperative_id
    )
  );

create policy "members no client insert" on public.members
  for insert with check (false);

create policy "members no client update" on public.members
  for update using (false);

create policy "members no client delete" on public.members
  for delete using (false);

-- Departments, roles, and permissions are readable by any authenticated cooperative member.

create policy "departments read authenticated" on public.departments
  for select using (auth.role() = 'authenticated');

create policy "roles read authenticated" on public.roles
  for select using (auth.role() = 'authenticated');

create policy "permissions read authenticated" on public.permissions
  for select using (auth.role() = 'authenticated');

create policy "role_permissions read authenticated" on public.role_permissions
  for select using (auth.role() = 'authenticated');

-- User permission overrides: users can only see their own; admins manage via service role.

create policy "user_permission_overrides view own" on public.user_permission_overrides
  for select using (user_id = auth.uid());

create policy "user_permission_overrides no client mutate" on public.user_permission_overrides
  for all using (false);

-- Audit logs: visible to users with audit_logs.view (enforced in app layer); base policy restricts to self.

create policy "audit_logs view own actor" on public.audit_logs
  for select using (actor_user_id = auth.uid());

create policy "audit_logs no client mutate" on public.audit_logs
  for all using (false);

-- Updated-at triggers.

create trigger departments_set_updated_at
  before update on public.departments
  for each row execute procedure public.set_updated_at();

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute procedure public.set_updated_at();

create trigger user_permission_overrides_set_updated_at
  before update on public.user_permission_overrides
  for each row execute procedure public.set_updated_at();

create trigger members_set_updated_at
  before update on public.members
  for each row execute procedure public.set_updated_at();
