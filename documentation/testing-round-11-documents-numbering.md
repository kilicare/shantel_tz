# Round 11 - Documents and Numbering

Environment: `http://localhost:3000` browser UI, authenticated Super Administrator session.

Date: 2026-09-16

## Evidence

| Document | Browser result | Number / data evidence | PDF result | Status |
|---|---|---|---|---|
| Quotation | Created a draft for Acme Corporation, A4 Paper, quantity 2, unit price TSh 10,000 | `QT-2026-000002`; total `TSh 23,600`; customer and product shown correctly | Print endpoint returned `200`, `application/pdf`, `%PDF-`, 2335 bytes | PASS after fix |
| Sales Order | Converted `QT-2026-000002` in the browser | `SO-2026-000002`; total `TSh 23,600`; quotation link shown | `200`, `application/pdf`, `%PDF-`, 2319 bytes | PASS |
| Invoice | Converted the new sales order in the browser | `INV-2026-000020`; total and balance `TSh 23,600.00` | Print endpoint returned `200`, `application/pdf`, `%PDF-`, 2368 bytes | PASS |
| Payment | Recorded and posted a payment against `INV-2026-000013` | `PAY-2026-000011`; Check; reference `R11-PAY-001`; amount `TSh 1,000`; partial-payment message shown | `200`, `application/pdf`, `%PDF-`, 2077 bytes | PASS |
| Receipt | Generated from the posted payment | `RCP-2026-000002`; receipt amount `TSh 1,000` | `200`, `application/pdf`, `%PDF-`, 2095 bytes | PASS |
| Requisition | Opened after aligning frontend permission, submitted and approved `REQ-2026-000001` | Sequential register through `REQ-2026-000005`; converted to `PO-2026-000003` | `REQ-2026-000005`: `200`, `application/pdf`, `%PDF-`, 2092 bytes | PASS |
| Purchase Order | Converted requisition, submitted, approved, posted | `PO-2026-000003`; Tech Wholesale Ltd; Laptop x3; received 3/3 | `200`, `application/pdf`, `%PDF-`, 2335 bytes | PASS |
| GRN | Created and posted receipt for `PO-2026-000003` at Main Store | `GRN-2026-000004`; POSTED; PO received 3/3 | `200`, `application/pdf`, `%PDF-`, 2110 bytes | PASS |
| Sales Return | Created, submitted, approved, and posted against `INV-2026-000011` | `SR-2026-000004`; POSTED; invalid DRAFT invoice and quantity were correctly rejected | `200`, `application/pdf`, `%PDF-`, 2255 bytes | PASS |
| Purchase Return | Created, submitted, approved, and posted against `GRN-2026-000003` | `PR-2026-000002`; POSTED; supplier and GRN shown | `200`, `application/pdf`, `%PDF-`, 2216 bytes | PASS |
| Stock Transfer | Created Main Store to Project Store, submitted, approved, and posted | `TRF-2026-000004`; POSTED; quantity 1 Laptop | `200`, `application/pdf`, `%PDF-`, 2140 bytes; no monetary `0.00` placeholder | PASS |
| Stock Audit | Created partial count, completed, approved, and posted | `AUD-2026-000005`; Main Store; Laptop physical quantity 9 | `200`, `application/pdf`, `%PDF-`, 2146 bytes; no monetary `0.00` placeholder | PASS |
| Expense | Added functional form, created Office Supplies expense by Check | `EXP-2026-000003`; DRAFT; amount `TSh 1,250` | `200`, `application/pdf`, `%PDF-`, 1978 bytes | PASS |

## Bugs found and fixed during Round 11

- Quotation creation reused `QT-2026-000001` when the sequence row was stale or missing. The service now reconciles the sequence with existing current-year quotations and uses the current year.
- Sales order conversion reused `SO-2026-000001` for the same stale-sequence condition. The conversion now reconciles existing current-year sales orders and uses the current year.
- Receipt generation failed when the `RECEIPT` sequence row did not exist because it called `update` instead of creating the sequence. It now reconciles existing receipts and uses `upsert`.
- Expense creation had a non-functional `New expense` button and displayed UUIDs instead of document numbers. It now has a browser form and current-year sequence reconciliation.
- Requisition navigation required nonexistent frontend permission `requisitions.view` while the backend and role use `purchase_orders.view`. The permission is now aligned.
- Added preview/PDF builders for requisitions, payments, expenses, purchase returns, stock transfers, and stock audits.
- Removed zero-value monetary totals from non-financial document PDFs.

## Round status

Round 11 is **complete for browser workflow, numbering, preview, PDF response, and data checks**. The PDFs were verified as valid PDF responses and the browser print actions were exercised; visual print-layout inspection in a native PDF viewer remains a residual manual check.