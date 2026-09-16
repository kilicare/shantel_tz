# Round 4 - Inventory Testing Evidence

Date: 2026-09-17
Environment: `http://localhost:3000` browser UI. Inventory actions were performed through the browser UI; the fresh low-stock fixture metadata was set through an authenticated browser request because the current product form does not expose minimum-stock fields.

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

## Fresh Browser Acceptance Run (2026-09-17)

Fresh fixtures created through the browser UI:

- Product: `R4 UI Inventory Product 1789596578204`, SKU `R4-UI-SKU-1789596578204`.
- Locations: `R4 UI Main 1789596578204` and `R4 UI Branch 1789596578204`.
- Fresh customer: `UI R3 Customer 1789595300053 Edited`.

| Flow | Fresh browser evidence | Status |
|---|---|---|
| Stock in | Received 10 units into the fresh Main location; inventory showed 10; reports showed `STOCK_IN +10 / -0` | PASS |
| Stock out | Posted `INV-2026-000021` for quantity 3; fresh Main balance changed 10 -> 7; reports showed `SALE +0 / -3` | PASS |
| Negative stock | Reduced fresh Main to 2 through posted `ADJ-2026-000009`; attempted invoice quantity 5; UI returned `Available: 2, Required: 5`, invoice stayed DRAFT, balance stayed 2 | PASS |
| Transfer | Topped fixture back to 10 via browser Receive stock, created `TRF-2026-000005` quantity 4 Main -> Branch, approved and posted; balances became Main 6 and Branch 4 | PASS |
| Transfer movements | Reports showed `TRANSFER_OUT -4` at Main and `TRANSFER_IN +4` at Branch | PASS |
| Adjustment reject | Created fresh reasoned `ADJ-2026-000010`; Reject changed it to `CANCELLED` with no stock posting | PASS |
| Adjustment approve/post | `ADJ-2026-000009` moved DRAFT -> SUBMITTED -> POSTED and changed stock from 7 to 2 | PASS |
| Stock audit | Created `AUD-2026-000008` for fresh Branch with system 4 and physical 3; completed, approved, and posted; balance became 3 | PASS |
| Audit movement trail | Reports showed fresh Branch `AUDIT +0 / -1` after posting | PASS |
| Reports filters | Location filter returned fresh Main-only rows; product filter returned fresh product-only current stock, movement and valuation rows; low stock showed fresh Main 6/min 10 and Branch 3/min 10 | PASS |
| Reports export | Fresh filtered CSV, Excel, and PDF buttons each returned HTTP 200 with CSV, XLSX, and PDF content types | PASS |
| Mobile inventory | At 375x812, `scrollWidth=360`, matching `clientWidth=360`; heading and Receive stock remained visible | PASS |

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

## Evidence Note

Inventory accountability was verified through fresh adjustment/audit status transitions and the movement ledger. The `/audit` route remains a generic integrity view rather than a detailed inventory entity audit-log viewer; the Round 4 audit-trail requirement is covered by the posted audit movement and status evidence above.

Round 4 inventory testing is complete and ready for Round 5.
