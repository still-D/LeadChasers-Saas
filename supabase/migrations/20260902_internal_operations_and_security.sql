-- LeadChasers internal operations platform: employee-only access, production CRM,
-- quotations, pricing, founder protection, and corrected row-level security.

alter table public.members
  add column if not exists is_founder boolean not null default false;

create unique index if not exists members_one_founder_per_cooperative_idx
  on public.members (cooperative_id) where is_founder;

create or replace function public.protect_founder_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_founder then
    raise exception 'The founder membership cannot be deleted';
  end if;

  if tg_op = 'UPDATE' and old.is_founder and (
    new.is_founder is not true or
    new.user_id is distinct from old.user_id or
    new.cooperative_id is distinct from old.cooperative_id or
    new.role_id is distinct from old.role_id or
    new.status is distinct from 'active'
  ) then
    raise exception 'The founder role and active status are protected';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists members_protect_founder on public.members;
create trigger members_protect_founder
  before update or delete on public.members
  for each row execute function public.protect_founder_membership();

-- Security-definer helpers avoid recursive policies on public.members. They
-- expose booleans/IDs only and never return profile rows.
create or replace function public.current_active_cooperative_id()
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
    and r.active = true
    and d.active = true
    and lower(coalesce(u.email, '')) ~ '^[^@]+@leadchasers[.]ma$'
  limit 1;
$$;

create or replace function public.has_employee_permission(permission_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    join public.roles r on r.id = m.role_id and r.active = true
    join public.departments d on d.id = m.department_id and d.active = true
    join auth.users u on u.id = m.user_id
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and lower(coalesce(u.email, '')) ~ '^[^@]+@leadchasers[.]ma$'
      and (
        m.is_founder = true
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

revoke all on function public.current_active_cooperative_id() from public;
revoke all on function public.has_employee_permission(text) from public;
grant execute on function public.current_active_cooperative_id() to authenticated;
grant execute on function public.has_employee_permission(text) to authenticated;

-- CRM clients.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references public.cooperatives(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 140),
  company text check (company is null or char_length(company) <= 160),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  source text not null default 'referral' check (source in ('referral','social','website','outbound','partner','returning','other')),
  status text not null default 'lead' check (status in ('lead','qualified','client','inactive')),
  notes text check (notes is null or char_length(notes) <= 4000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists brief_summary text,
  add column if not exists deal_status text not null default 'discovery',
  add column if not exists priority text not null default 'normal',
  add column if not exists start_date date,
  add column if not exists deadline date,
  add column if not exists progress smallint not null default 0;

alter table public.projects drop constraint if exists projects_deal_status_check;
alter table public.projects add constraint projects_deal_status_check
  check (deal_status in ('discovery','proposal','negotiation','won','lost','on_hold'));
alter table public.projects drop constraint if exists projects_priority_check;
alter table public.projects add constraint projects_priority_check
  check (priority in ('low','normal','high','urgent'));
alter table public.projects drop constraint if exists projects_progress_check;
alter table public.projects add constraint projects_progress_check check (progress between 0 and 100);

create table if not exists public.production_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase text not null check (phase in ('discovery','proposal','preproduction','production','postproduction','client_review','delivery')),
  status text not null default 'pending' check (status in ('pending','in_progress','blocked','completed')),
  position smallint not null check (position between 1 and 20),
  due_date date,
  completed_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, phase)
);

create or replace function public.seed_project_phases()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.production_phases (project_id, phase, position, status)
  values
    (new.id, 'discovery', 1, 'completed'),
    (new.id, 'proposal', 2, case when new.deal_status in ('won','lost') then 'completed' else 'in_progress' end),
    (new.id, 'preproduction', 3, 'pending'),
    (new.id, 'production', 4, 'pending'),
    (new.id, 'postproduction', 5, 'pending'),
    (new.id, 'client_review', 6, 'pending'),
    (new.id, 'delivery', 7, 'pending')
  on conflict (project_id, phase) do nothing;
  return new;
end;
$$;

drop trigger if exists projects_seed_phases on public.projects;
create trigger projects_seed_phases
  after insert on public.projects
  for each row execute function public.seed_project_phases();

insert into public.production_phases (project_id, phase, position, status)
select p.id, phase_data.phase, phase_data.position,
  case
    when phase_data.phase = 'delivery' and p.status in ('delivery','archived') then 'completed'
    when phase_data.phase = 'postproduction' and p.status in ('postproduction','delivery','archived') then 'completed'
    when phase_data.phase = 'production' and p.status in ('production','postproduction','delivery','archived') then 'completed'
    when phase_data.phase = 'preproduction' and p.status in ('preproduction','production','postproduction','delivery','archived') then 'completed'
    when phase_data.phase = 'discovery' then 'completed'
    when phase_data.phase = 'proposal' then 'completed'
    else 'pending'
  end
from public.projects p
cross join (values
  ('discovery', 1), ('proposal', 2), ('preproduction', 3),
  ('production', 4), ('postproduction', 5), ('client_review', 6), ('delivery', 7)
) as phase_data(phase, position)
on conflict (project_id, phase) do nothing;

-- Internal rate card and quotations (not SaaS subscription billing).
create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references public.cooperatives(id) on delete cascade,
  category text not null check (char_length(category) between 2 and 80),
  name text not null check (char_length(name) between 2 and 160),
  description text,
  unit text not null default 'project' check (char_length(unit) between 2 and 40),
  base_price numeric(12,2) not null check (base_price >= 0),
  currency text not null default 'MAD' check (currency in ('MAD','EUR','USD')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cooperative_id, name)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references public.cooperatives(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  quote_number text not null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  total numeric(12,2) not null default 0 check (total >= 0),
  valid_until date,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cooperative_id, quote_number)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  service_id uuid references public.service_catalog(id) on delete set null,
  description text not null check (char_length(description) between 2 and 300),
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored,
  position integer not null default 0
);

insert into public.permissions (name, slug, description, resource, action)
values
  ('Voir les clients', 'clients.view', 'Consulter le portefeuille clients.', 'clients', 'view'),
  ('Créer un client', 'clients.create', 'Ajouter un prospect ou client.', 'clients', 'create'),
  ('Modifier un client', 'clients.edit', 'Mettre à jour un client.', 'clients', 'edit'),
  ('Supprimer un client', 'clients.delete', 'Supprimer un client.', 'clients', 'delete'),
  ('Voir la grille tarifaire', 'pricing.view', 'Consulter les prix internes.', 'pricing', 'view'),
  ('Gérer la grille tarifaire', 'pricing.manage', 'Modifier les prix internes.', 'pricing', 'manage'),
  ('Voir les devis', 'quotes.view', 'Consulter les devis.', 'quotes', 'view'),
  ('Créer un devis', 'quotes.create', 'Créer un devis client.', 'quotes', 'create'),
  ('Modifier un devis', 'quotes.edit', 'Modifier un devis.', 'quotes', 'edit'),
  ('Approuver un devis', 'quotes.approve', 'Approuver un devis.', 'quotes', 'approve')
on conflict (slug) do update set name = excluded.name, description = excluded.description;

with grants(role_slug, permission_slug) as (
  values
    ('cfo','clients.view'), ('cfo','pricing.view'), ('cfo','pricing.manage'),
    ('cfo','quotes.view'), ('cfo','quotes.create'), ('cfo','quotes.edit'), ('cfo','quotes.approve'),
    ('cco','clients.view'), ('cco','clients.create'), ('cco','clients.edit'), ('cco','pricing.view'),
    ('cco','quotes.view'), ('cco','quotes.create'), ('cco','quotes.edit'),
    ('project_manager','clients.view'), ('project_manager','clients.create'), ('project_manager','clients.edit'),
    ('project_manager','pricing.view'), ('project_manager','quotes.view'), ('project_manager','quotes.create'), ('project_manager','quotes.edit'),
    ('production_manager','clients.view'), ('production_manager','pricing.view'),
    ('communication_manager','clients.view'), ('communication_manager','clients.create'), ('communication_manager','clients.edit')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from grants g
join public.roles r on r.slug = g.role_slug
join public.permissions p on p.slug = g.permission_slug
on conflict do nothing;

-- Seed the standard rate card for cooperatives created after this migration.
create or replace function public.seed_leadchasers_rate_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.service_catalog (cooperative_id, category, name, description, unit, base_price, sort_order)
  values
    (new.id, 'Production vidéo', 'Film corporate', 'Préproduction, tournage et film principal monté.', 'projet', 12000, 10),
    (new.id, 'Production vidéo', 'Interview premium', 'Captation une caméra, son, lumière et montage.', 'demi-journée', 4500, 20),
    (new.id, 'Événementiel', 'Captation événement', 'Équipe deux caméras et montage récapitulatif.', 'journée', 8500, 30),
    (new.id, 'Live', 'Livestream multi-caméras', 'Régie, deux caméras, diffusion et enregistrement.', 'journée', 11000, 40),
    (new.id, 'Photographie', 'Reportage photo', 'Photographe, sélection et retouche de 60 photos.', 'journée', 3500, 50),
    (new.id, 'Aérien', 'Prise de vue drone', 'Pilote, drone 4K et rushes stabilisés.', 'session', 4000, 60),
    (new.id, 'Post-production', 'Montage vidéo', 'Montage, habillage simple, mixage et exports.', 'jour', 2200, 70),
    (new.id, 'Post-production', 'Étalonnage & mixage', 'Finition image et son pour un master.', 'jour', 2600, 80),
    (new.id, 'Stratégie', 'Concept & direction créative', 'Atelier, concept, script et traitement créatif.', 'projet', 5000, 90)
  on conflict (cooperative_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists cooperatives_seed_rate_card on public.cooperatives;
create trigger cooperatives_seed_rate_card
after insert on public.cooperatives
for each row execute function public.seed_leadchasers_rate_card();

-- Apply the starter rate card once per existing cooperative.
insert into public.service_catalog (cooperative_id, category, name, description, unit, base_price, sort_order)
select c.id, seed.category, seed.name, seed.description, seed.unit, seed.price, seed.sort_order
from public.cooperatives c
cross join (values
  ('Production vidéo','Film corporate','Préproduction, tournage et film principal monté.','projet',12000::numeric,10),
  ('Production vidéo','Interview premium','Captation une caméra, son, lumière et montage.','demi-journée',4500::numeric,20),
  ('Événementiel','Captation événement','Équipe deux caméras et montage récapitulatif.','journée',8500::numeric,30),
  ('Live','Livestream multi-caméras','Régie, deux caméras, diffusion et enregistrement.','journée',11000::numeric,40),
  ('Photographie','Reportage photo','Photographe, sélection et retouche de 60 photos.','journée',3500::numeric,50),
  ('Aérien','Prise de vue drone','Pilote, drone 4K et rushes stabilisés.','session',4000::numeric,60),
  ('Post-production','Montage vidéo','Montage, habillage simple, mixage et exports.','jour',2200::numeric,70),
  ('Post-production','Étalonnage & mixage','Finition image et son pour un master.','jour',2600::numeric,80),
  ('Stratégie','Concept & direction créative','Atelier, concept, script et traitement créatif.','projet',5000::numeric,90)
) as seed(category, name, description, unit, price, sort_order)
on conflict (cooperative_id, name) do nothing;

create index if not exists clients_cooperative_status_idx on public.clients (cooperative_id, status, created_at desc);
create index if not exists projects_client_id_idx on public.projects (client_id);
create index if not exists projects_deal_status_idx on public.projects (cooperative_id, deal_status);
create index if not exists production_phases_project_position_idx on public.production_phases (project_id, position);
create index if not exists service_catalog_cooperative_idx on public.service_catalog (cooperative_id, active, sort_order);
create index if not exists quotes_cooperative_status_idx on public.quotes (cooperative_id, status, created_at desc);
create index if not exists quote_items_quote_position_idx on public.quote_items (quote_id, position);

alter table public.clients enable row level security;
alter table public.production_phases enable row level security;
alter table public.service_catalog enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

-- Replace permissive/recursive legacy policies with explicit RBAC policies.
drop policy if exists "members view membership" on public.members;
drop policy if exists "members view own cooperative" on public.members;
drop policy if exists "members view their cooperative" on public.cooperatives;
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
drop policy if exists "audit_logs view own actor" on public.audit_logs;

create policy "active employees view cooperative" on public.cooperatives
  for select using (id = public.current_active_cooperative_id());
create policy "employees view cooperative members" on public.members
  for select using (cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('members.view'));
create policy "employees view reference departments" on public.departments
  for select using (public.current_active_cooperative_id() is not null);
create policy "employees view reference roles" on public.roles
  for select using (public.current_active_cooperative_id() is not null);
create policy "employees view reference permissions" on public.permissions
  for select using (public.current_active_cooperative_id() is not null);
create policy "employees view reference role permissions" on public.role_permissions
  for select using (public.current_active_cooperative_id() is not null);

create policy "authorized employees view projects" on public.projects for select using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('projects.view')
);
create policy "authorized employees create projects" on public.projects for insert with check (
  cooperative_id = public.current_active_cooperative_id() and created_by = auth.uid() and public.has_employee_permission('projects.create')
);
create policy "authorized employees update projects" on public.projects for update using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('projects.edit')
) with check (cooperative_id = public.current_active_cooperative_id());
create policy "authorized employees delete projects" on public.projects for delete using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('projects.delete')
);

create policy "authorized employees view briefs" on public.project_briefs for select using (
  public.has_employee_permission('documents.view') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = public.current_active_cooperative_id()
  )
);
create policy "authorized employees create briefs" on public.project_briefs for insert with check (
  created_by = auth.uid() and public.has_employee_permission('documents.upload') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = public.current_active_cooperative_id()
  )
);
create policy "authorized employees delete briefs" on public.project_briefs for delete using (
  public.has_employee_permission('documents.delete') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = public.current_active_cooperative_id()
  )
);

create policy "authorized employees view clients" on public.clients for select using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('clients.view')
);
create policy "authorized employees create clients" on public.clients for insert with check (
  cooperative_id = public.current_active_cooperative_id() and created_by = auth.uid() and public.has_employee_permission('clients.create')
);
create policy "authorized employees update clients" on public.clients for update using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('clients.edit')
) with check (cooperative_id = public.current_active_cooperative_id());
create policy "authorized employees delete clients" on public.clients for delete using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('clients.delete')
);

create policy "authorized employees view phases" on public.production_phases for select using (
  public.has_employee_permission('production.view') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = public.current_active_cooperative_id()
  )
);
create policy "authorized employees manage phases" on public.production_phases for all using (
  public.has_employee_permission('production.edit') and exists (
    select 1 from public.projects p where p.id = project_id and p.cooperative_id = public.current_active_cooperative_id()
  )
);

create policy "authorized employees view pricing" on public.service_catalog for select using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('pricing.view')
);
create policy "authorized employees manage pricing" on public.service_catalog for all using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('pricing.manage')
) with check (cooperative_id = public.current_active_cooperative_id());

create policy "authorized employees view quotes" on public.quotes for select using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('quotes.view')
);
create policy "authorized employees create quotes" on public.quotes for insert with check (
  cooperative_id = public.current_active_cooperative_id() and created_by = auth.uid() and public.has_employee_permission('quotes.create')
);
create policy "authorized employees update quotes" on public.quotes for update using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('quotes.edit')
) with check (cooperative_id = public.current_active_cooperative_id());
create policy "authorized employees view quote items" on public.quote_items for select using (
  exists (select 1 from public.quotes q where q.id = quote_id and q.cooperative_id = public.current_active_cooperative_id())
  and public.has_employee_permission('quotes.view')
);
create policy "authorized employees manage quote items" on public.quote_items for all using (
  exists (select 1 from public.quotes q where q.id = quote_id and q.cooperative_id = public.current_active_cooperative_id())
  and public.has_employee_permission('quotes.edit')
);

alter table public.audit_logs add column if not exists cooperative_id uuid references public.cooperatives(id) on delete set null;
update public.audit_logs a set cooperative_id = m.cooperative_id
from public.members m where a.actor_user_id = m.user_id and a.cooperative_id is null;
create index if not exists audit_logs_cooperative_created_idx on public.audit_logs (cooperative_id, created_at desc);
create policy "authorized employees view cooperative audit" on public.audit_logs for select using (
  cooperative_id = public.current_active_cooperative_id() and public.has_employee_permission('audit_logs.view')
);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists production_phases_set_updated_at on public.production_phases;
create trigger production_phases_set_updated_at before update on public.production_phases for each row execute function public.set_updated_at();
drop trigger if exists service_catalog_set_updated_at on public.service_catalog;
create trigger service_catalog_set_updated_at before update on public.service_catalog for each row execute function public.set_updated_at();
drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at before update on public.quotes for each row execute function public.set_updated_at();
