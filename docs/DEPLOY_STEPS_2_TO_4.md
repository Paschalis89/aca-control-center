# Deploy ACA Control Center – Steps 2–4

## Scope
Incremental overlay. Do **not** replace your live `.env`, Traefik config, production database volumes, SSH settings or SSL certificates. It extends the functioning Step 1 installation.

## A. Local workstation
```
cd ~/Progetti/aca-control-center
unzip -o ~/Downloads/ACA_Control_Center_Steps_2_3_4_Patch.zip -d .
git status
git diff --stat
# Review. Then:
git add backend frontend docker-compose.yml .env.example docs/STEP2_3_4_SCOPE.md docs/DEPLOY_STEPS_2_TO_4.md scripts/phase234_smoke.cjs
git commit -m "feat: commerce partners marketing reports and insights"
git push origin main
```
Run `NODE_PATH="$(npm root -g)" node scripts/phase234_smoke.cjs` locally if TypeScript is globally installed. This test checks numeric helpers and TS syntax; it is **not** a full application build.

## B. Before modifying the live database
```
ssh root@YOUR_VPS
cd /opt/aca-control-center
export COMPOSE_FILE=docker-compose.yml:docker-compose.traefik.yml
mkdir -p /root/aca-backups
chmod 700 /root/aca-backups
BACKUP="/root/aca-backups/aca-before-phase234-$(date -u +%Y%m%d-%H%M%S).dump"
docker compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP"
ls -lh "$BACKUP"
```
Confirm the backup is non-empty. Keep a copy on external backup storage. Do not use `docker compose down -v`.

## C. Update code/build/migrate
```
cd /opt/aca-control-center
git pull --ff-only origin main
docker compose config --quiet
docker compose build --no-cache backend frontend
# Once backend build succeeds; data-preserving schema update only:
docker compose run --rm backend ./node_modules/.bin/prisma db push --skip-generate
# STOP if Prisma asks for reset or reports destructive changes. No force flags.
docker compose up -d backend frontend
docker compose ps
docker compose logs --tail=100 backend
```
Traefik remains unchanged and BasicAuth is **not** reintroduced by this patch.

## D. Verify before enabling Shopify
- Login works with existing admin user; no seed rerun required.
- Existing Overview/Forecast/Expenses/Settings data unchanged.
- Partners: create a partner, confirm list/edit/profitability.
- Marketing: add sample monthly budget and campaign, check totals and CSV.
- Reports and Insights endpoints work without Shopify credentials.
- `curl -s https://control.amalficoastartistry.com/api/healthz` reports healthy.

## E. Optional Shopify configuration (admin only)
Edit **only the VPS `.env`** (never commit it):
```
SHOPIFY_SHOP_DOMAIN=YOUR_SHOP.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=YOUR_SHOPIFY_CUSTOM_APP_TOKEN
SHOPIFY_API_VERSION=2026-07
SHOPIFY_SYNC_MAX_PAGES=4
```
Required: suitable custom app `read_orders` scope; `read_all_orders` if approved and historical data is necessary. After editing `.env`:
```
docker compose up -d --force-recreate backend
```
In the UI, map partner *variant IDs / base prices before initial sync*. Run **Synchronize orders** as ADMIN. Watch for incomplete margins caused by missing prices, discounts, refunds or tax-inclusive prices. Never upload customer PII to tests.

## F. Optional AI
Only after privacy/legal review; it is not needed for the rest of the app.
```
FINANCIAL_AI_ENABLED=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
```
If enabled, restart backend and use Insights as ADMIN. API key always remains server-only. The provider/model must be verified against your available API access.

## G. Rollback
For an app-only rollback, return Git to the last known good commit and rebuild both images. **Do not drop new database tables** or restore an old dump unless you have first checked whether newer data must be retained.
