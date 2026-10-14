# ACA Control Center - STEP 1

Private financial control application for Amalfi Coast Artistry.

**Scope:** user login / roles, Overview, expense CRUD with receipt uploads, recurring expenses, 2027-2030 business plan with 3 scenarios, editable draft version, approval, forecast KPIs, team settings and audit log. Shopify, CRM, advertising accounts, real sales and external payment systems **are not connected yet**. Figures imported from the business plan are projections, not real income.

## Technologies

- Angular 19 SPA (frontend) + Nginx
- NestJS 10 API (backend) + Prisma 6
- PostgreSQL 16
- Docker Compose; suitable for 8 GB VPS
- No public database port and no public backend port

## First launch on the server (local SSH tunnel, before setting a domain)

1. Install Docker Engine and Compose plugin on the VPS. Secure SSH first.
2. Copy the entire folder to the VPS, e.g. `/opt/aca-control-center`.
3. `cp .env.example .env`, then edit .env to set real random secrets: `openssl rand -hex 48` for `JWT_SECRET`, set strong `POSTGRES_PASSWORD`, `ADMIN_PASSWORD` (12+ chars), real `ADMIN_EMAIL`. Keep `.env` private. Initial values `PUBLIC_ORIGIN=http://localhost:8085` and `COOKIE_SECURE=false` are for local SSH-tunnel access only.
4. Build without cache (your preferred deploy workflow): `docker compose build --no-cache`.
5. `docker compose up -d postgres`.
6. Generate/apply schema: `docker compose run --rm backend node_modules/.bin/prisma db push`.
7. Seed first admin and initial 2027-2030 data: `docker compose --profile setup run --rm seed`.
8. `docker compose up -d backend frontend`.
9. From your laptop: `ssh -L 8085:127.0.0.1:8085 <your-vps-admin>@<server-ip>`. Open `http://localhost:8085` in your own browser.
10. Log in with the admin credentials from `.env`. Create a second `BUSINESS_MANAGER` in Settings > Users.

The seeder is idempotent. It creates the first admin only if absent, an approved baseline and an editable draft, and does not invent real expense transactions.

## Deploy HTTPS and domain later

This is intentionally **not exposed directly to the internet**. The Compose frontend uses `127.0.0.1:8085:80` so use the SSH tunnel until ready for a domain. Once DNS is configured, place an HTTPS reverse proxy (e.g. your existing Traefik setup) in front of the frontend and set `PUBLIC_ORIGIN=https://control.amalficoastartistry.com` and `COOKIE_SECURE=true`. Restart backend. Do not publish the database, API, or port 8085 publicly.

## Backup & security

- Back up PostgreSQL off-server: `docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"` (read variables from your .env first) and encrypt the backup at rest.
- Back up Docker volume `aca_receipts` independently. A PostgreSQL-only backup does not include receipt attachments.
- Configure firewall (SSH restricted to your IP/VPN if possible), automatic OS security updates, SSH keys, disable root-password SSH after admin user is working, VPS backup.
- Password auth is included; TOTP/MFA is **not implemented in this STEP 1**. Deploy behind a VPN, zero-trust access gateway, or additional MFA proxy before exposing financial data on a public domain.
- The current expense 'delete' is a soft delete and activity is recorded in the database.

## Important financial logic

`Net customer price = partner base price * (1 + markup)`
`ACA revenue = orders * base price * markup + extra ACA revenue`
`Operating result = ACA revenue - variable costs - fixed costs`

This is a model of **financial contribution from markup**, not an audited income statement or a tax ledger. Seller-of-record, VAT, split payments, export duties, and partner settlements must be reviewed with your legal and accounting advisers before accounting integrations go live.

## Data source

Seed data imported from `ACA_Forecast_Costi_Reali_2027_2030.xlsx`, with the original `PRUDENTE`, `CENTRALE` and `FAVOREVOLE` scenarios for 2027-2030. In the optimistic/prudent scenarios the Excel supplies only *aggregate monthly core costs*, which are temporarily split into four equal editable line items for the MVP; these must be refined before approval. The approved baseline remains unchanged when you edit the working draft.

## API endpoints

- `GET /api/healthz` (public)
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `/api/expenses` GET/POST, `/api/expenses/:id` PATCH/DELETE, `/api/expenses/:id/receipt` POST/GET
- `/api/recurring` GET/POST, `/api/recurring/:id` PATCH/DELETE
- `/api/forecasts/plans` GET/POST, `/api/forecasts/plans/:id` GET, `/clone` POST, `/approve` POST (admin), `/scenarios/:scenario/years/:year` PUT
- `GET /api/overview?year=2027`
- `/api/settings` GET/PUT (PUT admin), `/api/users` admin GET/POST, `/api/users/:id` admin PATCH, `PUT /api/users/password`, `/api/activity` GET

## Verification performed in the authoring environment

Source structure, JSON parse, ZIP archive integrity, imported seed count and arithmetic consistency were inspected. Package installation / compilation could not be executed because the npm registry was unreachable from the authoring environment. Run `docker compose build --no-cache` on the server to verify the complete Angular/NestJS build before using it for sensitive data.
