# Round 3: Master Data Testing

Date: 2026-09-07  
Environment: `http://localhost:3000`  
Status: IN PROGRESS

## Completed Tests

| Test ID | Precondition | Action | Expected result | Actual result | Evidence | Status |
|---|---|---|---|---|---|---|
| R3-01 | Authenticated Super Administrator; services running | Open Product Master, refresh, create a category from the UI | Page loads and category is created and listed ACTIVE | Master-data page loaded; `Round 3 Test Category` created and listed ACTIVE | Browser UI/status message | PASS |
| R3-02 | Existing category name | Submit the same category name again | Duplicate is rejected without a second record | UI showed `Category Round 3 Test Category already exists`; HTTP 409 expected | Browser alert/network event | PASS |
| R3-03 | Existing test category | Edit description, search it, then deactivate it | Changes persist, search narrows results, deactivation succeeds | Description updated; search returned one record; deactivation succeeded | Browser status/list | PASS |
| R3-04 | Master-data tabs available | Switch from Categories with a search term to Brands | Search state resets and Brands list loads normally | Found stale-search bug; fixed tab state reset; Brands showed 3 records and empty search | Browser UI | PASS after fix |
| R3-05 | Brands UI loaded | Create a brand, then submit the same name | Brand is created; duplicate is rejected | `Round 3 Test Brand` created; duplicate returned `Brand Round 3 Test Brand already exists` | Browser status/alert; HTTP 409 | PASS |
| R3-06 | Units UI loaded | Create unit, submit duplicate code, submit empty form | Unit created; duplicate code and empty fields rejected | `R3U` created; duplicate returned `Unit code R3U already exists`; empty returned `Units name and code is required.` | Browser status/alerts | PASS |
| R3-07 | Product create form and master data lookups available | Create stock product with SKU, barcode, prices, levels, and serial tracking | Product is created with supplied values | `Round 3 Test Product` created with `R3-PROD-001`, `R3-BAR-001`, prices 100/150, stock levels, and serial tracking | Browser status/list | PASS |
| R3-08 | Existing product SKU | Submit another product using `R3-PROD-001` | Duplicate SKU is rejected | UI request returned HTTP 409; no duplicate product appeared | Browser network/list | PASS |
| R3-09 | Product create form | Submit selling price below cost price | Product is rejected with pricing validation | UI showed `Selling price must be >= cost price`; after correction, valid product was created | Browser alert/status; HTTP 400 | PASS |
| R3-10 | Customer create form | Create customer with name, email, phone, and address | Customer is created and searchable | `Round 3 Test Customer` created and listed | Browser status/list | PASS |
| R3-11 | Supplier create form | Create supplier with name, email, and phone | Supplier is created and searchable | `Round 3 Test Supplier` created and listed | Browser status/list | PASS |
| R3-12 | Location create form | Create a branch with name, code, type, and address | Branch is created ACTIVE | `Round 3 Branch` / `R3-BRANCH` created and listed ACTIVE | Browser status/list | PASS |
| R3-13 | Payment form and seeded methods | Record customer payment using Cash | Payment is recorded and appears in ledger | `PAY-2026-000006` recorded for Round 3 Test Customer, TSh 100 | Browser status/ledger | PASS |
| R3-14 | Payment-method configuration UI | Create method `R3W`, submit duplicate code, then deactivate it | Method creates, duplicate is rejected, inactive method is removed from active lookup | `Round 3 Wallet` created; duplicate code returned 409; deactivation succeeded | Browser status/alert/list | PASS |
| R3-15 | Product edit workspace | Edit product name and prices | Product changes persist | `Round 3 Edited Product` saved with updated name/prices | Browser status/list | PASS |
| R3-16 | Product edit workspace | Deactivate edited product | Product status becomes INACTIVE | UI showed `Round 3 Edited Product deactivated successfully` and INACTIVE status | Browser status/list | PASS |
| R3-17 | Customer edit workspace | Edit created customer name | Customer changes persist | `Round 3 Edited Customer` saved | Browser status/list | PASS |
| R3-18 | Customer deactivate control | Deactivate edited customer | Customer status becomes INACTIVE | Deactivation succeeded through UI | Browser status/list | PASS |
| R3-19 | Supplier edit workspace | Edit created supplier name | Supplier changes persist | `Round 3 Edited Supplier` saved | Browser status/list | PASS |
| R3-20 | Location deactivate control | Deactivate created branch | Location status becomes INACTIVE | Added missing endpoint; `Round 3 Branch` became INACTIVE | Browser status/list | PASS |
| R3-21 | Customer and Supplier lists | Load master records and balances | Balances are visible and calculated | Customer balances displayed; supplier balances displayed from purchase orders minus payments | Browser UI | PASS |
| R3-22 | Existing customer email | Submit a new customer with an existing email | Duplicate customer is rejected | UI showed `Email john@example.tz already in use`; HTTP 409 | Browser alert/network | PASS |
| R3-23 | Existing supplier email | Submit a new supplier with an existing email | Duplicate supplier is rejected | UI showed `Email supply@techwholesale.tz already in use`; HTTP 409 | Browser alert/network | PASS |
| R3-24 | Product directory | Search by barcode and serial-number query | Barcode and serial matches are found | Barcode matched edited product; `R3-SERIAL-001` was registered through the UI and searching it returned Laptop Computer | Browser UI/status/list | PASS |

## Bugs Fixed During Round 3

- Registered category, brand, and unit modules before the dynamic product ID route so `/products/categories`, `/products/brands`, and `/products/units` are not misrouted as product IDs.
- Reset master-data search when switching tabs.
- Corrected singular form labels from `Categorie` to `Category`.
- Replaced the non-functional generic Product `New product` button with a UI-backed product form, including category, brand, unit, pricing, stock-level, tax, and tracking controls.
- Replaced action-only Customers, Suppliers, and Locations create buttons with a reusable UI-backed master-data workspace.
- Added payment-method create, update, and deactivate API routes plus a Payments configuration panel.
- Added editable Product, Customer, Supplier, and Location workspaces with UI-backed update/deactivate actions.
- Added the missing `PATCH /locations/:id/deactivate` endpoint.
- Added serial-number relation support to product search/list responses.
- Added customer and supplier balance presentation to their master-data lists.
- Added supplier balance calculation endpoint and UI integration.

## Remaining Tests

- Products: barcode uniqueness, search by serial number, and full edit-field coverage.
- Customers: balance display and duplicate validation.
- Suppliers: balance display and duplicate validation.
- Locations: main-store create/edit coverage and duplicate-code validation.

## Current Gaps

- Serial registration and serial-number search are now covered with `R3-SERIAL-001`.

Round 3 core checks passed through the UI; the fresh-dataset acceptance run below is the final confirmation.

## Final Fresh-Dataset Acceptance Run

Date: 2026-09-07  
Dataset prefix: `FINAL-R3-0907`  
Environment: `http://localhost:3000`

| Test ID | Fresh data and action | Actual result | Status |
|---|---|---|---|
| R3-F01 | Create `FINAL-R3-0907 Category`, `FINAL-R3-0907 Brand`, and `FINAL-R3-0907 Unit` (`F9U`) | All three created through Product Master UI | PASS |
| R3-F02 | Create product `FINAL-R3-0907 Product` with SKU `F9-SKU-001`, barcode `F9-BAR-001`, fresh category/brand/unit, prices 500/750, and serial tracking | Product created ACTIVE through Products UI | PASS |
| R3-F03 | Register serial `F9-SERIAL-001` against the fresh product | Serial registered through Products UI and stored in DB | PASS |
| R3-F04 | Search `F9-SERIAL-001` in Products | Fresh product returned as the matching product | PASS |
| R3-F05 | Create `FINAL-R3-0907 Customer` and `FINAL-R3-0907 Supplier` | Both created through their UI forms | PASS |
| R3-F06 | Create branch `FINAL-R3-0907 Branch` with code `F9-BRANCH` | Branch created ACTIVE through Locations UI | PASS |
| R3-F07 | Create payment method `FINAL-R3-0907 Cash` with code `F9-CASH` | Method created and shown in Payments configuration | PASS |
| R3-F08 | Record TSh 1,250 for fresh customer using fresh payment method | `PAY-2026-000007` recorded and shown in Payments ledger | PASS |
| R3-F09 | Edit fresh customer, supplier, branch, and product | All four fresh records updated successfully through UI | PASS |
| R3-F10 | Deactivate fresh customer, branch, and product | All three became INACTIVE through UI | PASS |

The fresh-data acceptance run passed end to end. Previous seeded records were not used as the success condition.
