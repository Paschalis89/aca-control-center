# Test matrix – ACA Control Center Steps 2–4

## Before any changes
- Ensure the live `.env` remains on VPS, excluded from Git.
- Verify PostgreSQL backup exists and is non-empty.
- Confirm Step 1 login and forecasting data are present.

## STEP 2 Commerce/Partners
1. Create partner "Test Partner" (no address, contact or personal data required).
2. Edit name/vendor and verify save persists.
3. Open Sales & Margins without API token: status should show "Not configured", sync button disabled. No fictional orders.
4. Add a Shopify variant price agreement with valid numeric GID. Wrong GID should fail validation.
5. After read-only token configured, sync max 4 pages; check `processed`, `partial`, rerun if partial.
6. Compare imported order totals manually with Shopify admin. No customer names or addresses must exist in the local order mirror.
7. Verify cancelled, discounted, tax-inclusive, refunded or unpriced lines are flagged, not counted in known contribution.
8. Verify changed partner price does not rewrite existing historical snapshots.

## STEP 3 Marketing/Reports
1. Insert a €500 Meta Ads monthly budget, verify annual total.
2. Insert campaign spend €200, 5 attributed orders and €500 attributed revenue; expect CAC €40 and ROAS 2.5x.
3. Edit campaign and verify recalculation.
4. Download CSV files (expenses, orders, campaigns).
5. Compare approved forecast values with pre-existing version; must be unchanged.
6. Verify recorded marketing expense isn't counted again automatically as an expense from campaign table.

## STEP 4 Insights
1. Open Insights for a year with approved forecast; inspect break-even signals.
2. No external API key: no LLM request possible.
3. Optional admin-only AI: explicit opt-in, aggregate signals only, no PII. Confirm access denied to BUSINESS_MANAGER.
4. CRM reference field can be saved on partners; automatic CRM sync remains disabled until an API contract exists.

## Post-deploy
- Verify `GET /api/healthz` returns 200.
- Confirm user roles still restrict ADMIN-only routes.
- Verify HTTPS certificate and domain.
- Verify Traefik BasicAuth **does not reappear**.
- Check `docker compose logs --tail=100 backend` for any Prisma/P2021 errors.
- DO NOT run `docker compose down -v` or any Prisma `--accept-data-loss` / `--force-reset`.
