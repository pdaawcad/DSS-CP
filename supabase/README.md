# CP Logistics — Supabase

Project: https://ozpcucduawdbdgknitwd.supabase.co

## Applied on 2026-10-04

- 01-schema.sql: tables, RLS, public read access for synthetic dashboard data, admin-only mutations.
- 02-seed.sql: imported in small SQL Editor batches. Confirmed remote counts: destinations 26, operators 40, fleet 40, shipments 1,800, events 11,985. ON CONFLICT DO NOTHING preserves existing records.
- 04-decision-plans.sql: decision_plans, shipment revenue/additional costs, atomic activate_decision_plan RPC. This migration is applied; do not rerun its CREATE POLICY statements.
- Frontend Supabase connection is enabled. Public reads work. Anonymous reads of decision_plans and cp_admins, and anonymous activation, correctly return HTTP 401.

## Administrator and verification — 2026-10-06

The account in 03-admin.sql was confirmed by the owner and granted cp_admins membership. The owner logged in successfully through the CP backend using Supabase Auth. The authenticated history page loads successfully.

05-verify-transaction.sql passed against the live database under the authenticated role and the approved administrator user ID. It verifies RLS plan insertion, invalid-destination rejection, selected AIR mode, atomic activation, price and additional cost persistence, cost component totals, the BOOKED tracking event, idempotent retry, shipment updates, draft deletion, and rejection of active-plan deletion. The entire test transaction was rolled back; no test plans or shipments remain. This is a database integration test; browser login/read access was checked separately. No password is stored in project files.

## Data behavior

Saving/deleting plans uses PostgREST with the logged-in user JWT. Activation locks the selected plan, validates its destination and vehicle capacity, and writes a shipment, BOOKED event, and ACTIVE plan together. A repeated activation returns the existing shipment. Draft deletion is allowed; active plans remain attached to their shipment. Historical synthetic shipments have NULL revenue and are excluded from profit totals.

Existing browser plans are not automatically uploaded. The history page offers importing them as drafts; even locally activated plans require a fresh explicit confirmation before creating a database shipment. Database outages show read-only sample data and do not silently redirect writes into localStorage. Session tokens are in sessionStorage; no service-role secret is included in the frontend.

For a fresh installation, run 01-schema.sql, import 02-seed.sql through a direct PostgreSQL connection or split it into SQL Editor batches, then run 04-decision-plans.sql once. Create the administrator account and apply 03-admin.sql for the exact email. Vercel outputDirectory is international-dashboard.
