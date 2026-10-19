# CP financial decision support

Open `http://127.0.0.1:4175/#finance`.

## Install

1. Existing operational schema and `cp_admins` must already exist.
2. Run `06-finance.sql` in Supabase SQL Editor.
3. Run `07-finance-seed.sql`, or each statement in `07-finance-seed.json` in sequence when the editor limits query size. The final statement publishes the dataset manifest, so an interrupted initial import cannot appear complete in the web app.
4. Reload the Finance page. The green Supabase badge indicates database data; an amber notice indicates the bundled read-only fallback. Plans and actuals require the existing administrator account.

The seed uses deterministic IDs and ON CONFLICT DO NOTHING. It preserves edits and operational data. Regenerate source assets with `scripts/generate_finance.py`, then rebuild `dashboard.js` with `scripts/prepare_international_dashboard.py`.

## Data scope

36 months, October 2023–September 2026. All 40 fleet assets are represented with one synthetic trip per month, three delivered jobs per trip: 1,440 trips and 4,320 jobs. This is a separate educational ledger, not a reconciliation of the original 1,800 operational shipments. Fleet capacities come from the source fleet CSV. Prices, service outcomes, FX and costs are assumptions. Currency rounding occurs on each job.

Tables: trips, delivered jobs (customer IDs and names in each row), monthly asset/overhead expenses, dated cash movements, immutable approved plans, monthly actuals and dataset manifest. No future actual performance is seeded.

## Calculations

Operating profit = delivered revenue − trip cost − asset fixed expense − shared expense. It is before tax and finance interest. Asset expenses include depreciation; cash outflows exclude it. Customer receipts may occur in a later month than delivery. Net cash movement is not bank balance.

Group contribution = revenue − trip cost allocated by job weight. This intentionally excludes fixed and shared costs; therefore it must not be called net profit by route/customer/mode.

Scenario base: October 2025–September 2026; targets: October 2026–September 2027. Annual seasonality follows the baseline months. Volume factor = 1 − price increase × elasticity. Trip factor = volume factor × (1 − consolidation). Fuel saving applies only to fuel, then variable trip costs scale by trip factor. Asset fixed costs remain. Implementation expense is spread evenly over 12 months. Every baseline trip's load is inflated by consolidation pressure; maximum must not exceed the selected limit. On-time percentage loses 0.25 percentage points for every consolidation percentage point. This is an explanatory sensitivity model, not a scheduling optimizer or a causal forecast.

Grid search tries 0, 2, 4, 6 and 8% for price/fuel/consolidation, and chooses the highest projected profit among feasible candidates under entered assumptions. A solution may miss the profit goal. For a nonpositive baseline the default monetary goal is break-even.

## Access and lifecycle

Historical synthetic finance data is readable with the public anon key like existing dashboard data. Only existing `cp_admins` can write or read private plans/actuals. No service key is shipped. Draft plans can be deleted; approved plans cannot be edited/deleted (database trigger). A new version is a new plan. Monthly actuals can be corrected by administrators and have updater/time metadata. Future actuals and closing an unfinished month are rejected in both client and database.

Approved targets are snapshots. Tracking compares only matching months; cumulative variance includes only closed months. Missing months remain missing, never zero. Existing operational shipments are deliberately excluded until they have complete prices and accounting identifiers to prevent double counting.
