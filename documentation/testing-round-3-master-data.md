# Round 3: Master Data Testing

Date: 2026-09-17  
Environment: `http://localhost:3000`  
Status: GREEN - FRESH BROWSER ACCEPTANCE PASSED

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
- Enabled the global NestJS `ValidationPipe` with `whitelist` and `transform`, making empty DTO payloads return HTTP 400 instead of Prisma HTTP 500 errors.
- Added explicit payment-method name and code validation so empty payment-method submissions return HTTP 400.
- Added a location status selector to the browser edit form so inactive locations can be reactivated through the UI.

All previously listed Round 3 gaps are now covered by the fresh re-validation below.

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

## Fresh Re-validation Run (2026-09-17)

| Check | Result | Evidence |
|---|---|---|
| Empty master-data payloads | PASS | Categories, brands, units, products, customers, suppliers, and locations returned HTTP 400 after global DTO validation was enabled |
| Empty payment-method payload | PASS | Returned HTTP 400 with `Payment method name and code are required` |
| Categories, brands, units | PASS | Fresh create returned 201; edit and inactive status returned 200 |
| Product uniqueness and search | PASS | Duplicate SKU/barcode returned 409; name, SKU, and barcode searches returned 200 |
| Product pricing and tracking | PASS | Selling price below cost returned 400; serialized product persisted `trackStock=true` and `trackSerialNumber=true` |
| Customer workflow | PASS | Create, duplicate email 409, name/phone/email searches, edit, balance, and deactivate passed |
| Supplier workflow | PASS | Create, duplicate email 409, name/phone searches, edit, balance, and deactivate passed |
| Locations | PASS | Main store and branch create returned 201; edit/deactivate returned 200 |
| Payment methods | PASS | List 200, create 201, duplicate code 409, edit 200, deactivate 200 |
| Serial numbers | PASS | Register returned 201, duplicate returned 409, search returned 200 with one match |
| Production builds | PASS | Frontend generated 44 routes; backend watcher compiled with zero TypeScript errors |

Round 3 master-data testing is complete and ready for Round 4.

## Fresh Browser Acceptance Run (UI Dataset: `UI R3 1789595300053`)

| Area | Browser result | Fresh evidence |
|---|---|---|
| Categories | PASS | Created `UI R3 Category 1789595300053`; duplicate was rejected; search found one record; edit saved; deactivate showed success |
| Brands | PASS | Created, duplicate-tested, searched, edited, and deactivated `UI R3 Brand 1789595300053` |
| Units | PASS | Created, duplicate-code-tested, searched, edited, and deactivated `UI R3 Unit 1789595300053` with code `UI530053` |
| Product | PASS | Created `UI R3 Serialized 1789595300053` with SKU `UI-R3-SKU-1789595300053`, barcode `UI-R3-BAR-1789595300053`, cost 1000, selling 1500, serial tracking enabled; duplicate SKU rejected; name/SKU/barcode searches matched; edit saved; product deactivated |
| Serial number | PASS | Registered `UI-R3-SERIAL-1789595300053`; duplicate serial rejected with an already-exists message |
| Customer | PASS | Created `UI R3 Customer 1789595300053`; duplicate email rejected; search by name, phone, and email matched; balance displayed; edit and deactivate succeeded |
| Supplier | PASS | Created `UI R3 Supplier 1789595300053`; duplicate email rejected; search by name and phone matched; balance displayed; edit and deactivate succeeded |
| Locations | PASS | Created `UI R3 Main Store 1789595300053` and `UI R3 Branch 1789595300053`; branch edit saved; status changed to INACTIVE and then back to ACTIVE through the new browser status selector |
| Payment method | PASS | Created clean UI method `UI R3 Clean Method 1789595300053` with code `UI-CLEAN-300053`; duplicate code was rejected; the malformed duplicate-test record was deactivated |
| Payment transaction | PASS | Recorded TSh 3,250 advance payment for the fresh UI customer using the clean UI payment method, with reference `UI-R3-CLEAN-TXN-530053`; payment appeared in the finance UI |
