# ROUND 2 - ROLE AND PERMISSION MATRIX

Date: 2026-09-16
Environment: `http://localhost:3000`
Test method: Browser UI only. API calls were made only by the UI.
Status: IN PROGRESS

## Role Test Accounts

| Role | Email | Password source |
|---|---|---|
| Super Administrator | `admin@shantel.local` | Seeded development account |
| Administrator | `administrator@shantel.local` | Seeded development account |
| Manager | `manager@shantel.local` | Seeded development account |
| Salesperson | `salesperson@shantel.local` | Seeded development account |
| Storekeeper | `storekeeper@shantel.local` | Seeded development account |
| Purchaser | `purchaser@shantel.local` | Seeded development account |
| Accountant/Finance | `accountant@shantel.local` | Seeded development account |

The development passwords are intentionally not repeated in this evidence document.

## R2-01 - All Role Logins

- Precondition: Localhost application was running and seeded role accounts existed.
- Action: Logged in through the browser UI as all seven roles.
- Expected result: Each role reaches `/dashboard` and receives its own role and permissions.
- Actual result: All seven roles reached `/dashboard`; roles matched the account and permissions were returned.
- Screenshot/evidence: Browser role matrix capture; permission counts were Super Administrator 70, Administrator 70, Manager 31, Salesperson 19, Storekeeper 16, Purchaser 17, Accountant/Finance 14.
- Result: PASS

## R2-02 - Permission-Aware Navigation

- Precondition: Each role was logged in through the UI.
- Action: Read the visible navigation generated for that role.
- Expected result: Navigation shows only modules for which the role has view permission.
- Actual result: Navigation was filtered by role. Salesperson saw Sales, Invoices, Products, Locations, Customers, Payments, and Returns. Storekeeper saw Inventory, Products, Locations, Purchasing, Returns, Audit, and Reports. Purchaser saw Inventory, Products, Purchasing, and Suppliers. Accountant/Finance saw Sales, Invoices, Customers, Suppliers, Payments, Expenses, Audit, and Reports.
- Screenshot/evidence: Browser navigation captures from each role session.
- Result: PASS

## R2-03 - Static Unauthorized Routes

- Precondition: Restricted role was authenticated.
- Action: Opened restricted routes directly in the browser.
- Expected result: User is redirected to `/dashboard` and cannot use the restricted page.
- Actual result: Salesperson `/inventory` and `/settings`, Storekeeper `/sales`, Purchaser `/payments`, Accountant/Finance `/inventory`, and Manager `/settings` all redirected to `/dashboard`.
- Screenshot/evidence: Browser URL after each direct navigation.
- Result: PASS

## R2-04 - Dynamic Unauthorized Routes

- Precondition: Restricted role was authenticated.
- Action: Opened `/projects/:id` as Salesperson and `/invoices/:id` as Storekeeper with a UUID-shaped route.
- Expected result: Dynamic detail routes use the parent permission and reject unauthorized roles.
- Actual result: Both routes redirected to `/dashboard`.
- Screenshot/evidence: Browser URLs `/dashboard` after both attempts.
- Result: PASS

## R2-05 - Role-Specific Action Visibility

- Precondition: Role was authenticated and its permitted module was opened through the UI.
- Action: Inspected visible controls on the relevant module page.
- Expected result: Create, review, post, and administration controls match role permissions.
- Actual result: Salesperson saw `Add` and `Save draft` on Sales; Manager invoices showed `Export` but no new-invoice control; Storekeeper inventory showed `Receive stock` and `New adjustment`; Purchaser purchasing showed `New requisition`, `Review approvals`, and `Post GRN`; Accountant/Finance expenses showed `New expense`; Administrator Settings showed `New user`.
- Screenshot/evidence: Browser button text captures for `/sales`, `/invoices`, `/inventory`, `/purchasing`, `/expenses`, and `/settings`.
- Result: PASS

## R2-06 - Manager Approval Access

- Precondition: Manager was authenticated.
- Action: Opened `/approvals` through the browser UI.
- Expected result: Manager can access approvals and sees approval controls appropriate to the role.
- Actual result: `/approvals` rendered the Control Room with approval-related controls and no permission error.
- Screenshot/evidence: Browser page `/approvals`.
- Result: PASS

## R2-07 - Administrator Configuration Access

- Precondition: Administrator was authenticated.
- Action: Opened `/settings` through the browser UI.
- Expected result: Administrator can access user and configuration administration.
- Actual result: Settings rendered with the user directory and `New user` control.
- Screenshot/evidence: Browser page `/settings`, directory rendered with 17 records.
- Result: PASS

## R2-08 - Logout for Every Role

- Precondition: Each role had successfully logged in.
- Action: Clicked `Log out` through the UI for all seven roles.
- Expected result: Redirect to `/login`; session and legacy auth storage are empty.
- Actual result: All seven roles redirected to `/login`; session access token, session user, legacy local token, and legacy local user were all empty.
- Screenshot/evidence: Browser logout matrix assertion for all seven sessions.
- Result: PASS

## R2-09 - Purchaser Purchase Returns Workflow Access

- Precondition: Purchaser was authenticated through the browser UI.
- Action: Opened `/purchasing/returns` and loaded the return form.
- Expected result: Purchaser can view posted GRNs and locations needed to create a purchase return.
- Actual result before fix: Route was visible but displayed `Insufficient permissions` because the role lacked `purchase_returns.view` and `locations.view`.
- Fix: Added `purchase_returns.view` and `locations.view` to the Purchaser role seed permissions and reconciled the local database through the seed command.
- Rerun actual result: Page loaded posted GRNs and stock locations; `Submit return` was visible and no permission error remained.
- Screenshot/evidence: Browser page `/purchasing/returns` showing posted GRN options and the purchase return form.
- Result: PASS after fix

## R2-10 - Module Action Boundary Scan

- Precondition: Each role was authenticated and the relevant module was opened through the browser UI.
- Action: Inspected visible action controls for representative create, approve, post, print, and export boundaries.
- Expected result: Controls appear only where the role's permissions and role expectation allow them.
- Actual result: Salesperson saw customer creation, sales draft, invoice creation, payment viewing, and sales return creation. Storekeeper saw stock receiving, adjustment, transfer, and audit controls. Purchaser saw requisition, PO, approval, GRN posting, and purchase return controls. Accountant/Finance saw expense, payment, receipt, refund, and payment posting controls. Manager saw invoice export, purchasing review/post, approval, and report export controls. Administrator saw Settings user administration.
- Screenshot/evidence: Browser button captures from the role/module scan.
- Result: PASS for visibility scan

## R2-11 - Role Create Forms and Empty Validation

- Precondition: Salesperson, Storekeeper, Purchaser, Accountant/Finance, and Administrator were authenticated through the UI.
- Action: Opened the relevant create forms; submitted the Salesperson customer form and Accountant expense form empty.
- Expected result: Authorized create forms are visible and empty submissions do not create records.
- Actual result: Customer, stock adjustment, requisition, expense, and Settings user forms were visible to their permitted roles. Empty customer and expense submissions remained on the form and produced no new record because required validation blocked submission.
- Screenshot/evidence: Browser forms `/customers`, `/inventory`, `/purchasing`, `/expenses`, and `/settings`; record counts did not change.
- Result: PASS

## R2-12 - Manager Export and Print

- Precondition: Manager was authenticated and had report/document permissions.
- Action: Clicked `CSV` on `/reports`, then clicked `Print invoice` on `/invoices`.
- Expected result: Export and print actions complete through the UI without an error banner.
- Actual result: Inventory CSV response returned `200 text/csv`; invoice print response returned `200 application/pdf`; no error banner appeared.
- Screenshot/evidence: Browser response capture from the UI-triggered export and print actions.
- Result: PASS

## R2-13 - Administrator Boundary and Stale Grant Reconciliation

- Precondition: The Administrator role had previously inherited stale all-permission grants from an older seed run.
- Action: Reconciled role permissions from the current allow-list, logged in as Administrator, inspected navigation, and opened `/sales` directly.
- Expected result: Administrator sees administration/master-data/report/settings features only; Super Administrator remains full access.
- Actual result before fix: Administrator had 70 permissions and full operational navigation.
- Fix: Seed reconciliation now deletes role-permission links outside each role allow-list before upserting current grants.
- Rerun actual result: Administrator has 24 permissions, sees Dashboard, Products, Locations, Customers, Suppliers, Audit, Reports, and Settings, and `/sales` redirects to `/dashboard`.
- Screenshot/evidence: Browser role capture showing Administrator navigation and `/dashboard` after direct `/sales` access.
- Result: PASS after fix

## Fixes Applied During This Round

- Unified role-sensitive page reads on `sessionStorage`, matching the active auth service and API client.
- Preserved only a legacy user identity mirror for an audit page that still reads it; authentication tokens are never mirrored to localStorage.
- Added login-page cleanup for the legacy user identity when no active session exists.
- Extended navigation permission matching to dynamic child routes such as `/projects/:id` and `/invoices/:id`.
- Added Purchaser access to `purchase_returns.view` and `locations.view` required by the purchase return workflow.

## Remaining Required Checks

- Create permissions for every role/module boundary.
- Edit permissions for every role/module boundary.
- Approve and post permissions for sales, purchasing, inventory, expenses, payments, and returns.
- Print and export visibility and execution.
- Server-side unauthorized action rejection through UI-triggered workflows.
- Screenshot evidence for each critical permission boundary.

Round 2 remains open until the remaining checks pass through the UI.