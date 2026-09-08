# Round 4 - Inventory Testing Evidence

Environment: `http://localhost:3000` browser UI. API was accessed only by UI actions.

## Test Results

| Test ID | Precondition | Action | Expected result | Actual result | Browser evidence | Status |
|---|---|---|---|---|---|---|
| R4-08-01 | A4 Paper, Project Store = 0 | Inventory > Receive stock, receive 3 units at unit cost 10000 | Balance increases and receipt is accepted | UI reported `Received 3 units into stock`; Project Store became 3 | `/inventory`, Receive stock form and success status | PASS |
| R4-08-02 | R4-08-01 receipt exists | Open Reports movement history | STOCK_IN movement exists for product/location | `A4 Paper ... STOCK_IN ... Project Store: +3 / -0` displayed | `/reports`, Movement history | PASS |
| R4-09-01 | Laptop Main Store = 10 | Sales UI invoice quantity 3 | Balance becomes 7 and SALE movement is created | Invoice INV-2026-000011 posted; Inventory showed 7 | `/sales` post confirmation; `/inventory` balance | PASS |
| R4-10-01 | Office Chair Main Store = 0 | Sales UI invoice quantity 5, then Post | Request rejected, balance unchanged, no movement | UI displayed `Insufficient stock ... Available: 0, Required: 5`; balance stayed 0 | `/sales` error and invoice remained DRAFT | PASS |
| R4-11-01 | Laptop Main Store = 10, Project Store = 0 | Create qty 4 transfer, approve, post | Main = 6, Project = 4; two movements and POSTED status | TRF-2026-000003 reached POSTED; balances became 6 and 4; TRANSFER_OUT and TRANSFER_IN displayed | `/inventory/transfers`, `/inventory`, `/reports` | PASS |
| R4-12-01 | New draft adjustment | Create reasoned adjustment and Reject | Adjustment becomes rejected/cancelled without stock posting | ADJ-2026-000006 became CANCELLED | `/inventory`, `/inventory/adjustments` | PASS |
| R4-12-02 | Laptop Main Store = 11 | Adjustment system 11, physical 10, approve, post | Balance changes to 10 and adjustment movement is recorded | ADJ-2026-000007 reached POSTED; Main became 10 | `/inventory/adjustments`, `/inventory`, `/reports` | PASS |
| R4-13-01 | A4 Project Store = 3 | Start audit, record physical 2, complete, approve, post | Variance -1 applies and balance becomes 2 | AUD-2026-000004 reached POSTED; Project became 2; AUDIT movement -1 displayed | `/inventory/audits`, `/inventory`, `/reports` | PASS |
| R4-14-01 | Inventory data exists | Filter reports by Main Store | Report rows are location-specific | Current stock filtered from 9 rows to 3 Main Store rows | `/reports` location filter | PASS |
| R4-14-02 | Inventory data exists | Filter reports by Laptop Computer | Report cards show selected product only | Current stock, low stock, movement, and valuation filtered to Laptop rows | `/reports` product filter | PASS |
| R4-14-03 | Inventory movements exist | Open Reports | Low stock, movement history, and valuation render | 7 low-stock rows, 22 movement rows, and valuation rows rendered | `/reports` | PASS |
| R4-14-04 | Authenticated Super Administrator session | Click CSV export | Authenticated CSV download returns 200 with attachment header | Browser response was 200, `text/csv`, `attachment; filename="inventory-report.csv"` | `/reports` CSV button | PASS |
| R4-14-05 | Mobile viewport 375x812 | Open Inventory | No horizontal overflow and controls remain visible | Body scrollWidth was 360; heading and Receive stock button visible | `/inventory` at 375x812 | PASS |

## Bugs Fixed During Round 4

- Added browser-visible Receive stock form and `POST /inventory/stock-in` workflow.
- Made stock-in balance and movement writes atomic in one database transaction.
- Removed invalid `createdById` write from inventory movement creation.
- Corrected manual receipt reference IDs to use a valid UUID.
- Added stock adjustment Reject UI and backend transition to `CANCELLED`.
- Corrected Purchasing `Post GRN` navigation to `/purchasing/orders`.
- Replaced customer-only Reports page with inventory reports and filters.
- Added location filters for low stock, movement history, and valuation reports.
- Added authenticated CSV, Excel, and PDF export controls.
- Fixed duplicate movement report React keys.

## Remaining Evidence Note

The `/audit` route currently renders a generic integrity result rather than a detailed inventory entity audit-log viewer. Inventory accountability was verified through adjustment/audit status transitions and the movement ledger. A dedicated inventory audit-log detail view is still a separate UI enhancement if strict audit-log screen evidence is required.
