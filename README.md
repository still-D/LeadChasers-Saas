# LeadChasers OS

Private operations platform for LeadChasers Media Coop. It centralizes the agency pipeline, client records, deals, production timelines, internal pricing, quotations, finance visibility, employee accounts, role permissions, and audit history.

## Security model

- Access is invitation-only and restricted to exact `@leadchasers.ma` addresses.
- A member must be active and assigned to an active role and department.
- Authorization is enforced in server actions, the data-access layer, and PostgreSQL RLS.
- Saad El Hamdani is the protected founder account and is the only user allowed to create employee accounts.
- Temporary passwords must be changed at first sign-in. Password reset redirects are restricted to internal application paths.
- Privileged service credentials never enter the browser.

## Local setup

1. Copy `.env.example` to `.env.local` and provide the Supabase URL, publishable key, and server-only secret key. Legacy projects may use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SECRET_KEY`.
2. Apply every SQL file in `supabase/migrations` in filename order.
3. Bootstrap the leadership accounts:

   ```bash
   npm run bootstrap:leadership
   ```

   The command prints generated temporary passwords once for newly created accounts. Store them in a password manager and require each leader to replace theirs on first sign-in.

4. Start the application:

   ```bash
   npm install
   npm run dev
   ```

The leadership bootstrap creates:

| Person | Company address | Access |
| --- | --- | --- |
| Saad El Hamdani | `elhamdanisaad@leadchasers.ma` | Protected founder / full administration |
| Yassir El Hamdani | `elhamdaniyassir@leadchasers.ma` | Chief Financial Officer |
| Abdelmonaim Lamrani | `lamraniabdelmonaim@leadchasers.ma` | Chief Coordination Officer |

Yassir's address intentionally uses `@leadchasers.ma`; the singular-domain typo is not accepted by the security policy.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

See `docs/architecture.md` and `docs/RBAC.md` for implementation details.
