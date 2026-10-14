# ACA Control Center – Steps 2, 3 and 4

## STEP 2 – Commerce & Partner Finance
- Read-only Shopify Admin GraphQL integration, **opt-in via server environment only**.
- Paginated manual synchronization; store no customer email, names, addresses or phone numbers.
- Shopify orders and line items are financial mirror copies; the Shopify store is the source of truth.
- Local partner directory with assigned **variant ID -> contractual base price**.
- Price snapshots for incoming orders; changing partner agreements cannot automatically reprice saved historical orders.
- Profitability views explicitly exclude unpriced, discounted, refunded, tax-inclusive and cancelled lines.
- Margin is a partial contribution **not net profit** and not a payment instruction.
- Older Shopify order history may require Shopify `read_all_orders` approval, beyond `read_orders`.

## STEP 3 – Marketing & Reports
- CRUD marketing campaigns with manual spending, attributed orders and attributed revenue.
- Monthly per-channel ad budget with upsert and annual rollups.
- ROAS and CAC are calculated from *manually attributed* campaign data and **may double count attribution**.
- CSV downloads: expenses, Shopify order totals and campaign costs.
- Actual expenses and budgets/forecasts remain separate. Marketing campaign spend is not automatically added to expenses (do not duplicate if the corresponding invoice is recorded in Expenses).

## STEP 4 – Insights & Ecosystem Foundation
- Deterministic financial alerts with explainable input data, no fictional sales.
- Optional **administrator-only** LLM Q&A via OpenAI Responses API is gated by `FINANCIAL_AI_ENABLED=true` and an API key. It sends only aggregated rule-based alerts, not order line items, invoices, contact details or receipts. Optional: disabled by default.
- ACA CRM reference field on Partner. **No automatic CRM synchronization** is claimed: that requires the actual ACA CRM API contract, authentication strategy and field mapping.
- No write operations against Shopify; no automated payouts/refunds; no external AI actions.

## Known accounting boundaries
- GMV is not ACA revenue. Price and currency rules depend on the final legal marketplace vs reseller model.
- Shopify `shopMoney` is in shop currency. Current views presume the shop accounting currency is EUR; do not aggregate other currencies as EUR.
- Tax-inclusive orders and those with discounts/refunds are conservatively excluded from verified margins pending a full reconciliation engine.
- Expenses are stored with net and gross values but are **not** full accrual accounting. These reports do not replace an accountant's books.
- Without a Shopify token, Sales/Partners/Marketing/Reports still function with local records, but no actual orders are displayed.

## Preproduction testing still required
1. `docker compose ... build --no-cache backend frontend` on Contabo (npm registry unavailable in artifact environment).
2. `prisma db push` on backed-up database, without `--accept-data-loss`.
3. User-role and CRUD smoke checks; test unauthorized access on all API routes.
4. Test Shopify test store, compare order totals and manual base prices, verify refunds and discounts are flagged.
5. Test security hardening (MFA, access controls, backups) before loading real financial documents.
