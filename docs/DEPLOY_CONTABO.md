# ACA Control Center - Deploy on Contabo (STEP 1)

Do not expose the first release on public HTTP. Start using the private SSH tunnel, then add the DNS name and HTTPS gateway.

## 0. Assumed prerequisites

- Contabo Ubuntu 24.04 LTS VPS with administrative SSH access.
- Docker Engine, Docker Compose plugin and `git` already installed.
- Server SSH hardening, key authentication and firewall rules configured.
- A copy of this folder on the VPS. No real secrets are stored in source control.

## 1. Configure

```bash
cd /opt/aca-control-center
cp .env.example .env
chmod 600 .env
openssl rand -hex 48
```

Set a fresh JWT_SECRET (the output), a strong password for PostgreSQL, and distinct admin email/password in `.env`. For the first local-tunnel deployment keep:

```
PUBLIC_ORIGIN=http://localhost:8085
COOKIE_SECURE=false
```

Use safe URL characters in POSTGRES_PASSWORD to avoid invalid DATABASE_URL encoding (letters and digits only, long random string). Docker does not publish the database or NestJS to the public network.

## 2. Build & initialize

```bash
docker compose build --no-cache
docker compose up -d postgres
docker compose run --rm backend node_modules/.bin/prisma db push
docker compose --profile setup run --rm seed
docker compose up -d backend frontend
docker compose ps
docker compose logs --tail=80 backend frontend
curl -I http://127.0.0.1:8085/
curl http://127.0.0.1:8085/api/healthz
```

Expected health response: `{"ok":true,"service":"aca-control-center"}`.

### Test from your workstation

```bash
ssh -L 8085:127.0.0.1:8085 admin@YOUR_SERVER_IP
```

Open http://localhost:8085 in your browser. Log in with the ADMIN_EMAIL and ADMIN_PASSWORD from the server `.env`.

If another process occupies local port 8085, use `ssh -L 18085:127.0.0.1:8085 ...` and change `PUBLIC_ORIGIN` accordingly.

## 3. Later: DNS + HTTPS

Set an `A` record for `control.amalficoastartistry.com` pointing at the VPS IPv4. Add your TLS reverse proxy routing to the `frontend` container, then set:

```
PUBLIC_ORIGIN=https://control.amalficoastartistry.com
COOKIE_SECURE=true
```

Restart backend with `docker compose up -d backend`. Before granting public access enforce VPN or an MFA-enabled identity-aware proxy: TOTP is not yet native to the STEP 1 app.

Never publish PostgreSQL port 5432 or Nest port 3000. Do not map frontend port 8085 to `0.0.0.0` without HTTPS and appropriate access controls.

## 4. Data safety

Keep daily off-server encrypted PostgreSQL dumps and separate encrypted attachment backups for the `aca_receipts` volume. Verify restoration at least once. Monitor disk space, CPU, memory, uptime and database health. Use a versioned deployment and run upgrades with a full backup first.

## 5. Live economic data

Shopify is NOT connected; the initial sales and partners are forecast numbers from the ACA business plan. Do not use those figures as proof of revenue or cash in the bank.
