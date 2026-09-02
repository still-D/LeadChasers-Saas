# LeadChasers OS — authorization reference

Authorization is cooperative-scoped and enforced on the server. Hiding a control in the interface is never treated as an access check.

## Identity requirements

An application session is usable only when all of these are true:

1. Supabase Auth has a valid user session.
2. The normalized email ends with exactly `@leadchasers.ma`.
3. A matching `members` record exists.
4. The member, role, and department are active.

Invited members may access only the password-setup flow. Suspended and deactivated members are denied.

## Permission resolution

For the protected founder, every permission is always allowed. For other members:

1. Explicit `deny` override.
2. Explicit `allow` override.
3. CEO role.
4. Role permission.
5. Deny by default.

This rule is implemented in both the TypeScript authorization layer and the PostgreSQL helper used by RLS.

## Leadership

- Saad El Hamdani — founder and CEO; immutable founder status, full access, sole employee-account creator.
- Yassir El Hamdani — CFO; finance, pricing, quotations, reports, and project visibility.
- Abdelmonaim Lamrani — CCO; clients, coordination, projects, production, and quotations.

The founder row cannot be deleted, deactivated, suspended, demoted, or stripped of founder status by normal database mutations.

## Protected modules

| Module | Principal permissions |
| --- | --- |
| Projects | `projects.view`, `projects.create`, `projects.edit`, `projects.delete` |
| Production | `production.view`, `production.edit` |
| Clients | `clients.view`, `clients.create`, `clients.edit`, `clients.delete` |
| Pricing | `pricing.view`, `pricing.manage` |
| Quotations | `quotes.view`, `quotes.create`, `quotes.edit`, `quotes.approve` |
| Documents | `documents.view`, `documents.upload`, `documents.delete` |
| Team | `members.view`, `members.create`, `members.edit`, `members.suspend` |
| Administration | `permissions.manage`, `roles.manage`, `system.settings`, `audit_logs.view` |

Use `requireEmployeeSession()` for protected pages and `requireEmployeePermission()` for mutations and sensitive reads. Service-role writes are permitted only after these checks and must include the current cooperative identifier.

## Account lifecycle

| Status | Behavior |
| --- | --- |
| `invited` | May establish a password, then becomes active. |
| `active` | May access only granted modules and actions. |
| `suspended` | Login is rejected until reactivated. |
| `deactivated` | Access is permanently rejected; history is retained. |

Security-sensitive actions are recorded in `audit_logs`, including member changes, permission changes, project/client/quote creation, production updates, and password changes.
