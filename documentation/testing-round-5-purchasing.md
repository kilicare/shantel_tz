# Round 5 - Purchasing Testing Evidence

Date: 2026-09-17
Environment: `http://localhost:3000` browser UI
Status: GREEN - FRESH BROWSER ACCEPTANCE PASSED

## Fresh Fixtures

- Supplier: `R5 UI Supplier 1789596981937`
- Product: `R5 UI Purchase Product 1789596981937`, SKU `R5-UI-SKU-1789596981937`
- Receiving location: `R5 UI Receiving 1789596981937`

## Fresh Browser Results

| Area | Fresh evidence | Status |
|---|---|---|
| Requisition create/items | `REQ-2026-000006` created through the UI with the fresh product, quantity 20, and notes; item appeared as Qty 20 | PASS |
| Requisition submit/approve | `REQ-2026-000006` moved DRAFT -> SUBMITTED -> APPROVED | PASS |
| Requisition approval history | UI History showed `Step 1: APPROVED · System Administrator` | PASS |
| Requisition reject | Fresh `REQ-2026-000007` submitted and rejected with a reason; status became REJECTED | PASS |
| Requisition return | Fresh `REQ-2026-000008` submitted and returned with a reason; status became RETURNED_FOR_CORRECTION | PASS |
| PO creation/calculation | `PO-2026-000004` converted from the approved requisition; UI confirmed subtotal, 18% tax and total calculation | PASS |
| PO submit/approve | `PO-2026-000004` moved DRAFT -> SUBMITTED -> APPROVED | PASS |
| PO numbering | Fresh PO number `PO-2026-000004` was displayed consistently in the UI | PASS |
| PO print | Print action for `PO-2026-000004` returned HTTP 200 with `application/pdf` | PASS |
| PO reject | Fresh `PO-2026-000005` was submitted and rejected with `R5 fresh PO rejection test`; status became REJECTED | PASS |
| GRN partial receipt | `GRN-2026-000005` created from `PO-2026-000004` with accepted quantity 18 of ordered 20 | PASS |
| GRN outstanding quantity | PO UI showed `RECEIVED 18 / 20 · OUTSTANDING 2` after the partial GRN | PASS |
| GRN posting | `GRN-2026-000005` posted into the fresh receiving location | PASS |
| GRN excess validation | Attempted a second GRN quantity 3; UI rejected it with `Outstanding: 2`, leaving the PO at 18 / 20 | PASS |
| Stock increase | Fresh product stock at the receiving location increased to 18 after GRN posting | PASS |
| Supplier liability | Fresh supplier balance showed `TSh 4956` after the PO/GRN flow | PASS |
| GRN audit/movement trail | Reports showed `R5 UI Purchase Product ... · GRN · R5 UI Receiving ...: +18 / -0` | PASS |
| Purchase return create/submit | `PR-2026-000003` created for the posted GRN/product, quantity 2, with a reason; status became SUBMITTED | PASS |
| Purchase return approve/post | `PR-2026-000003` was approved/submitted through the UI and posted from the fresh receiving location | PASS |
| Return stock effect | Fresh product balance decreased 18 -> 16 after posting the return | PASS |
| Return supplier balance | Fresh supplier balance changed `TSh 4956 -> TSh 4556` | PASS |
| Return audit/movement trail | Reports showed `PURCHASE_RETURN ... R5 UI Receiving ...: +0 / -2` | PASS |

## Notes

- All acceptance records above were created or operated in a fresh browser run on 2026-09-17.
- Existing purchasing records were not used as the success condition.
- The purchase-return UI represents the approval transition as the first decision action (DRAFT -> SUBMITTED), followed by explicit location selection and Post; the final required state was POSTED.
- Requisition item creation was covered by the create form and displayed Qty 20 in the requisition decision page.

Round 5 purchasing testing is complete and ready for Round 6.
