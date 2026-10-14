# ACA Control Center - Traefik HTTPS (on the standalone Contabo VPS)

This overlay adds a **standalone Traefik 3.7.14** on ports 80/443, without a Docker socket mount. It exposes ONLY the existing frontend via HTTPS. Nginx forwards `/api/` to the private NestJS service. PostgreSQL and NestJS remain unpublished.

The browser will encounter **two independent passwords**: a Traefik HTTP BasicAuth gateway and the ACA application login. This is a temporary extra gate, **not MFA**. Set up an MFA-capable VPN / identity-aware proxy and encrypted off-host backups before storing real financial data.

## Preconditions

1. `control.amalficoastartistry.com` A record points to this VPS public IPv4.
2. Ports **80 and 443** reach this VPS and are not already occupied by another proxy. The HTTP port is required for Let's Encrypt HTTP-01.
3. Your local checkout and VPS are current and the original STEP 1 Compose can build. If a system Traefik/Nginx already listens on 80 or 443, DO NOT start a second Traefik: integrate the route into that existing proxy instead.

## Patch deployment

Apply all files in this package to the project root, commit and push. On VPS:

```bash
cd /opt/aca-control-center
git pull --ff-only origin main
sudo ss -ltnp | grep -E ':(80|443)[[:space:]]' || true
sudo apt-get update && sudo apt-get install -y apache2-utils
```

Edit the existing `.env` (never overwrite it):

```
COOKIE_SECURE=true
PUBLIC_ORIGIN=https://control.amalficoastartistry.com
ACME_EMAIL=you@example.com
```

Create the persistent Let's Encrypt certificate file and a PRIVATE HTTP BasicAuth password:

```bash
mkdir -p deploy/traefik/acme
chmod 700 deploy/traefik/acme
touch deploy/traefik/acme/acme.json
chmod 600 deploy/traefik/acme/acme.json
htpasswd -cB deploy/traefik/users.htpasswd aca-gateway
chmod 600 deploy/traefik/users.htpasswd
```

Use a new strong password for `aca-gateway`, different from your ACA admin login. The `htpasswd` command prompts securely; never paste the password into chat or commit the resulting file.

If using UFW, **make sure SSH remains allowed** before altering firewall rules:

```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Check configuration:

```bash
docker compose -f docker-compose.yml -f docker-compose.traefik.yml config --quiet
```

Build frontend after Nginx change and start the system (rebuild backend if your previous backend image is not yet built):

```bash
docker compose -f docker-compose.yml -f docker-compose.traefik.yml build --no-cache frontend
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d postgres backend frontend traefik
docker compose -f docker-compose.yml -f docker-compose.traefik.yml ps
docker compose -f docker-compose.yml -f docker-compose.traefik.yml logs --tail=100 traefik
```

For a *brand-new* database only, initialize Prisma and seed before signing in (the same commands described in STEP 1's README). Do not run an uncontrolled seed on an already initialized production database.

Check external HTTPS (without putting your BasicAuth password in shell history):

```bash
curl -I http://control.amalficoastartistry.com
curl -I https://control.amalficoastartistry.com
```

Expected: HTTP redirects to HTTPS, HTTPS returns **401** until gateway BasicAuth is provided. In a browser, enter the HTTP gateway username/password; then sign in to ACA itself with the existing app credentials. Test the `/api/healthz` endpoint only after gateway authentication.

## Updating

Always specify the overlay when managing this deployment:

```bash
docker compose -f docker-compose.yml -f docker-compose.traefik.yml ps
docker compose -f docker-compose.yml -f docker-compose.traefik.yml logs -f --tail=100 traefik
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d
```

If an older deployment is running, Docker Compose reuses existing PostgreSQL and receipt volumes. Never run `docker compose down -v` on a server holding data.

Note: Existing `127.0.0.1:8085` loopback-only frontend mapping remains for private troubleshooting. Direct public access is on port 443.
