# ClockIn Modern Stack (2026 Rewrite)

## Stack Choice
- Web: Next.js + TypeScript (App Router)
- Mobile: React Native (Expo) + TypeScript
- API: NestJS + TypeScript
- DB: Postgres + Prisma
- Cache/Jobs: Redis (future)
- Auth/SSO: Auth0 Organizations (OIDC/SAML)
- Storage: S3-compatible (R2/S3/GCS)

## Multi-Tenant Model
- Single Postgres database
- `tenant_id` on every business row
- Auth0 `org_id` maps to `tenant.authOrgId`
- Membership records enforce roles per tenant

## Local Dev
1. API
   - Copy `apps/api/.env.example` to `apps/api/.env`
   - Set `DATABASE_URL`
   - Prisma uses `apps/api/prisma.config.ts` to read `DATABASE_URL`
   - Run `npm --workspace apps/api run prisma:generate`
   - Run `npm --workspace apps/api run start:dev`
2. Web
   - Copy `apps/web/.env.example` to `apps/web/.env`
   - Set `AUTH0_BASE_URL` (e.g. `http://localhost:3000`) and `AUTH0_SECRET`
   - Run `npm --workspace apps/web run dev`
3. Mobile
   - Copy `apps/mobile/.env.example` to `apps/mobile/.env`
   - Run `npm --workspace apps/mobile run start`

## Managed VPS Hosting (Recommended)
Option A: Render
- Deploy `apps/api` as a Web Service (Node)
- Deploy `apps/web` as a Web Service (Node)
- Use Render Postgres for the database

Option B: Fly.io
- Deploy API + Web as separate apps
- Use Fly Postgres

## Auth0 / SSO Notes
- Use Auth0 Organizations for multi-tenant SSO.
- Configure the API audience to `AUTH0_AUDIENCE`.
- Configure tenant claims:
  - `TENANT_ID_CLAIM=org_id`
  - `TENANT_NAME_CLAIM=org_name`
- For local dev: set `DEV_BYPASS_AUTH=true` and pass headers:
  - `x-dev-user-id`
  - `x-dev-tenant-id`
  - `x-dev-email`

## Next Steps
- Wire admin actions (edit/delete users, office/group management) to API
- Build report queries (daily time, hours worked, audit log)
- Add payroll exports
- Add approvals workflow
- Add offline mode + sync queue
- Add audit log + timesheet rules
