# Round 2: Role and Permission Matrix

Date: 2026-09-07
Environment: `http://localhost:3000`
Status: IN PROGRESS

## Seeded UI Test Accounts

All accounts use the development password `Role@123456`, except the existing Super Administrator account, which uses `Admin@123456`.

| Role | Email | Login | Dashboard | Navigation baseline |
|---|---|---:|---:|---|
| Super Administrator | `admin@shantel.local` | PASS | PASS | Dashboard, Sales, Invoices, Inventory, Products, Locations, Purchasing, Customers, Suppliers, Payments, Approvals, Audit, Reports, Settings |
| Administrator | `administrator@shantel.local` | PASS | PASS | Full operational/admin navigation |
| Manager | `manager@shantel.local` | PASS | PASS | Dashboard, Sales, Invoices, Inventory, Products, Locations, Purchasing, Customers, Suppliers, Payments, Audit, Reports |
| Salesperson | `salesperson@shantel.local` | PASS | PASS | Dashboard, Sales, Invoices, Products, Customers, Payments |
| Storekeeper | `storekeeper@shantel.local` | PASS | PASS | Dashboard, Inventory, Products, Locations, Purchasing, Audit |
| Purchaser | `purchaser@shantel.local` | PASS | PASS | Dashboard, Inventory, Products, Purchasing, Suppliers |
| Accountant/Finance | `accountant@shantel.local` | PASS | PASS | Dashboard, Sales, Invoices, Customers, Suppliers, Payments, Audit, Reports |

## Completed Checks

| Test ID | Check | Result | Evidence |
|---|---|---|---|
| R2-01 | Dashboard has a shared workspace navigation | PASS | Super Administrator dashboard shows permission-aware navigation |
| R2-02 | Inventory route from dashboard | PASS | `/inventory` renders stock balances and movement ledger from API |
| R2-03 | Purchasing route from dashboard | PASS | `/purchasing` renders requisition, PO, and GRN states from API |
| R2-04 | Customers route from dashboard | PASS | `/customers` renders two customer records from API |
| R2-05 | Products, Locations, Suppliers, Payments, Audit routes | PASS | Shared resource workspace routes render without Next.js 404 |
| R2-06 | Reports, Approvals, Settings routes | PASS | Routes render through shared workspace and API state |
| R2-07 | Salesperson navigation filtering | PASS | Only Dashboard, Sales, Invoices, Products, Customers, Payments are visible |
| R2-08 | Salesperson unauthorized direct route | PASS | Direct `/inventory` navigation redirects to `/dashboard` |
| R2-09 | Manager Settings filtering | PASS | Settings is hidden because Manager lacks `documents.configure` |
| R2-10 | Storekeeper action visibility | PASS | Inventory actions are permission-derived: adjustment, transfer, audit |
| R2-11 | Frontend build | PASS | `pnpm run build` completed successfully with 20 routes |
| R2-12 | Manager Approvals route and permission | PASS | Manager login, `/approvals`, empty state, no permission error |
| R2-13 | Accountant Expenses route and permission | PASS | Accountant login, `/expenses`, New expense control, no permission error |
| R2-14 | Super Administrator Settings route | PASS | Settings loads 13 users and New user control |
| R2-15 | Backend build after permission/route changes | PASS | `nest build` completed successfully |
| R2-16 | Manager Sales view-only controls | PASS | Manager has no New invoice/Save draft; Post remains available from invoices.post |
| R2-17 | Manager post with insufficient stock | PASS | UI displayed `Insufficient stock for Laptop Computer. Available: 0, Required: 4`; invoice remained DRAFT |
| R2-18 | Salesperson draft invoice | PASS | `INV-2026-000007` created through UI for A4 Paper; total TSh 29,500; status DRAFT |
| R2-19 | Accountant expense data access | PASS | `/expenses` loads after fixing route precedence; New expense is visible |
| R2-20 | Audit object response | PASS | Audit renders one integrity record without `records.filter` crash |
| R2-21 | Settings create-user validation | PASS | Empty form shows required-field validation |
| R2-22 | Settings create-user workflow | PASS | Super Administrator created `round2.user@shantel.local` as Manager; directory grew from 13 to 14 users |
| R2-23 | Purchasing requisition form | PASS | Super Administrator submitted Laptop quantity 3 with notes through UI |
| R2-24 | Requisition numbering recovery | PASS | Fixed missing sequence and stale-sequence duplicate; UI created `REQ-2026-000002` and retained `REQ-2026-000001` |
| R2-25 | Payments methods and empty validation | PASS | UI loaded Bank Transfer, Cash, Check, and Mobile Money; empty form validation passed |
| R2-26 | Advance customer payment | PASS | Super Administrator recorded `PAY-2026-000002` for Acme Corporation via Cash |
| R2-27 | Payment numbering recovery | PASS | Fixed missing/stale PAYMENT sequence after partial failure; retry succeeded without duplicate |
| R2-28 | Inventory adjustment form | PASS | Super Administrator created `ADJ-2026-000001` with location, product, system quantity, physical quantity, and reason |
| R2-29 | Inventory adjustment approval | PASS | `ADJ-2026-000001` moved from DRAFT to SUBMITTED through the UI |
| R2-30 | Inventory adjustment posting | PASS | `ADJ-2026-000001` moved from SUBMITTED to POSTED through the UI |
| R2-31 | Stock audit create and count | PASS | `AUD-2026-000001` created for Main Store and physical count recorded for A4 Paper |
| R2-32 | Stock audit completion | PASS | Audit moved from IN_PROGRESS to COMPLETED through the UI |
| R2-33 | Stock audit approval | PASS | Audit moved from COMPLETED to APPROVED through the UI |
| R2-34 | Stock audit posting | PASS | Audit moved from APPROVED to POSTED; inventory movement transaction completed |

## Remaining Round 2 Checks

- Test every role's create, edit, approve, post, print, and export buttons on the actual module pages.
- Replace remaining action-only controls with complete forms and submit flows where required.
- Verify server-side unauthorized responses for every restricted route/action.
- Verify logout/session behavior for each role.
- Complete role-specific pages for approvals, payments, audit, and settings workflows.
- Capture screenshots for each role and each critical permission boundary.

## Bugs Fixed During Round 2

- Added role-aware workspace navigation and direct-route permission rejection.
- Added development accounts for all seven roles.
- Added missing module routes and API-backed empty/loading/error states.
- Fixed Nest route precedence so `/approvals/expenses` uses `expenses.view` instead of matching the dynamic approval ID route.
- Corrected Manager and Accountant permission assignments to match the role matrix.
- Gated Sales invoice creation/posting controls by `invoices.create` and `invoices.post`.
- Added `locations.view` to Salesperson because invoice posting requires a stock location.
- Normalized object API responses in shared resource pages to prevent runtime crashes.
- Added a functional Settings user form with role assignment.
- Seeded missing requisition/inventory document sequences.
- Made requisition numbering recover from partial failures without duplicate document numbers.
- Added authenticated payment-method lookup for the payment form.
- Made payment numbering recover from partial failures without duplicate document numbers.
- Added functional stock-adjustment input persistence, including adjustment line items and difference calculation.
- Aligned stock-audit persistence with the schema's `difference` field.
- Added a dedicated Adjustments workspace with permission-gated Approve and Post actions.
- Added a dedicated Stock Audits workspace with create/count/complete/approve/post controls.
- Aligned audit movement writes with the backend Prisma schema and removed nonexistent movement fields.

Round 2 must remain open until the remaining checks pass through the UI.
