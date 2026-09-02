# LeadChasers OS — architecture

## Application structure

LeadChasers OS is a private Next.js App Router application backed by Supabase Auth and PostgreSQL. Server Components render cooperative data, Server Actions own mutations, and RLS provides a database boundary if an application-layer check is missed.

The primary workspace modules are:

- Dashboard — operational overview, agenda, attention queue, and deal pipeline.
- Projects — briefs, deal value and stage, priority, dates, client need, and delivery context.
- Production — seven-phase timeline from discovery through delivery, with phase ownership and progress.
- Clients — CRM contacts, acquisition context, needs, budget, notes, and project history.
- Pricing — internal MAD rate card and server-validated quotation builder.
- Finance — authorized financial visibility for leadership and finance roles.
- Administration — members, roles, departments, permission overrides, and cooperative audit history.

## Trust boundaries

`proxy.ts` refreshes authentication cookies only. It does not make authorization decisions. Protected routes call the server-side employee session layer, which verifies the authenticated account, exact company domain, membership, status, role, and department.

Browser input is considered untrusted. Actions validate payloads with Zod, derive the cooperative and actor from the authenticated session, and re-read sensitive values such as catalog pricing from PostgreSQL. Supabase's service-role client is server-only and configured without persistent sessions.

## Data isolation

Every operational record belongs directly or indirectly to one cooperative. Queries made with the service client always include cooperative scope. Database policies use `current_active_cooperative_id()` and `has_employee_permission()` to enforce the same model for ordinary authenticated clients.

The `20260902_internal_operations_and_security.sql` migration removes legacy recursive policies, installs permission-aware policies, protects the founder identity, and adds clients, production phases, the rate card, quotations, and cooperative audit scoping. The former public SaaS subscription/Stripe layer has been removed; pricing now means LeadChasers client services and quotations.

## Project lifecycle

Projects move through commercial deal stages and an independent production timeline. Each new project receives these phases automatically:

1. Discovery
2. Creative brief
3. Pre-production
4. Production
5. Post-production
6. Client review
7. Delivery

Phase updates recalculate project progress. Completing delivery closes the project; earlier activity moves a draft project into progress.

## Deployment checklist

1. Configure Supabase production secrets and application URL.
2. Apply migrations in order.
3. Run the leadership bootstrap once and secure the generated temporary credentials.
4. Configure the approved production hostname in Supabase Auth redirect URLs.
5. Run lint, tests, and a production build.
6. Verify invitation email delivery and first-login password replacement.
7. Confirm backups, audit-log retention, and secret rotation procedures before onboarding employees.
