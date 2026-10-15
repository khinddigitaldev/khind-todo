# Spec — Sub-project 1: Part A cover + workflow (KHIND IQC)

**Date:** 2026-10-15 · **Status:** 🟡 for review · **Builds on:** [[02 Spec]] (PRD v2.1) and the live MVP
**Source format:** `IQC_Combined_Report_A4_3.html` (QSP-18-1 (F1-12) Incoming Inspection Report — combined, Rev.00)

## 1. Why

QC uses a combined HTML report (Part A cover, 17 test sheets, MDR Part B, attachments, review log). The goal is to do that work in the app instead, **as a demo with fictional data first**, then real use after management sees it.

The whole report is too big for one step, so it is split into four sub-projects:

| # | Sub-project | Status |
|---|---|---|
| **1** | **Part A cover + lot decision + workflow** | **this spec** |
| 2 | Test-sheet engine + the 17 QSP-18-1 sheets | later |
| 3 | MDR Part B (QSP-16-1): MRB, 8D/CAPA, CAR, department sign-offs, SBU head dispute, attachments | later |
| 4 | Real master data: part list, supplier list | later; needs a decision on real data vs. the free-tier demo |

## 2. Decisions (2026-10-15)

| Topic | Decision |
|---|---|
| Purpose | Demo with fictional data first, then real use |
| Lot decision | **Exactly as the form:** Decision ACCEPT / REJECT / OTHERS + Action + Accept/Reject qty |
| Sample size | Stays **calculated** from the KHIND table; QC Supervisor can override with a reason |
| Self-approval | **Not allowed.** A Supervisor may inspect, but another Supervisor must approve |
| Signatures | **Click to sign.** "Sign & submit" / "Sign & approve" by the signed-in user. The report shows name, role, date/time. No drawn signature, no password re-entry |
| Header | Text header (no logo image), because the repo is public |
| Role name | The app's "QA approver" is renamed **QC Supervisor** (database value `qa` unchanged) |
| NCR | Renamed **MDR** everywhere (table, pages, numbers `MDR-YYYY-NNNN`). Contents stay minimal until sub-project 3 |

## 3. Part A — what the inspection captures

### 3.1 Lot details (Inspector; editable while Draft/Returned)

| Field | Source | Notes |
|---|---|---|
| Part Number, Part Name / Description | part master data | as today |
| Supplier / Brand / Vendor | supplier master data | as today |
| **Supplier Category** | supplier master data | **new** on suppliers: LOCAL / IMPORT / SUBCONT (QA sets it on the supplier page) |
| **GRN / Storage List No** | typed | new, max 40 |
| PO No, DO No | typed | as today |
| **Ref No** | typed | new, max 40 |
| Quantity In / Lot Qty | typed | as today |
| Sample Size (SS) | calculated | as today (override by Supervisor) |
| Date | received date/time | as today |
| **Motor Part No (if any)** | typed | new, max 40 |
| **Component Marking** | typed text | new, max 1,000 characters |

The current "Lot / batch no" field stays (the form doesn't list it, but it's useful for traceability). It is shown under Ref No.

### 3.2 Quick check (appearance & fitting only)

- New part inspection type **`quick`**: "Appearance & fitting only".
- A quick-check lot shows **only** the quick-check box: **OK / NG**, **Qty checked** (1 ≤ qty ≤ lot qty), **Remark**. There is no checklist, dimensions or defect table.
- Submit needs the result and the qty checked. An NG result needs a remark.
- **Verdict:** OK → accept; NG → reject.

### 3.3 Tests performed + Test result summary (automatic)

- Until sub-project 2, an inspection has at most two "sheets": **General checklist** (the template items) and **Dimensional inspection** (the template dimensions, if any).
- The summary table shows one row per sheet:

  | Column | Content |
  |---|---|
  | Form | e.g. "Checklist", "F1-2" |
  | Test | sheet name |
  | Tested by | the inspector |
  | Samples | sample size, or the number of readings |
  | NG | NG items, or NG dimensions |
  | Result | OK / NG / — |

  Quick-check lots show a single "Appearance & Fitting (quick check)" row.
- It is built by one pure function, `buildSummary(bundle)`, so sub-project 2 can add sheets without changing the cover.

### 3.4 Lot decision (QC Supervisor only; set when approving)

| Lot decision | Allowed actions | Extra |
|---|---|---|
| **ACCEPT** | ACCEPT, UAI | |
| **REJECT** | UAI, ONLINE REWORK/SORTING, OFFLINE REWORK/SORTING, RTS, SCRAP | creates an **MDR** |
| **OTHERS** | any of the 6 actions | **text required** (what "others" means) |

- **Accept Qty + Reject Qty = Quantity received.** Both are ≥ 0.
- The **Raise MDR** tick lets the Supervisor create an MDR for an ACCEPT or OTHERS lot, to inform the supplier.
- **System verdict = Reject** (any defect class at or over Re, or the quick check is NG): the Supervisor **cannot** choose ACCEPT + ACCEPT, and must use UAI or another action.
- **UAI needs a reason** (the old "concession reason").
- These rules are enforced **in the database** (`approve_inspection`) and mirrored in `lib/iqc/decision.ts` for live form feedback.

### 3.5 Sign-off (click to sign)

| | Prepared by (Inspector) | Verified & Approved by (QC Supervisor) |
|---|---|---|
| Name | inspector's full name | approver's full name |
| Signature | "Signed electronically" + role | same |
| Date | `submitted_at` | `approved_at` |

The buttons read **Sign & submit** and **Sign & approve**. A reopened lot clears the Supervisor signature (existing behaviour).

## 4. Workflow

`DRAFT` (Inspector, or a Supervisor inspecting) → **Sign & submit** → `SUBMITTED` → QC Supervisor:
- **Sign & approve** with a decision → `APPROVED & CLOSED`; or
- **Return** with a comment → `RETURNED` → Inspector fixes it and signs & submits again.

An approved lot can be reopened by a Supervisor with a reason (existing behaviour). It cannot be approved by the person who inspected it.

## 5. Data changes (one migration + data conversion)

- `suppliers.category` enum `supplier_category` (`local`, `import`, `subcont`), nullable.
- `inspections.sample_size` becomes **nullable**: quick-check lots have no sample size; `quick_qty` is what was checked.
- `inspection_type` gets the value `quick`.
- `inspections` new columns:
  - `grn_no`, `ref_no`, `motor_part_no` (text ≤ 40), `component_marking` (text ≤ 1000);
  - `quick_result check_result` (only `ok`/`ng` used), `quick_qty int`, `quick_remark text`;
  - `lot_decision` enum (`accept`, `reject`, `others`), `decision_other text`;
  - `lot_action` enum (`accept`, `uai`, `online_rework`, `offline_rework`, `rts`, `scrap`);
  - `accept_qty int`, `reject_qty int`, `raise_mdr boolean default false`;
  - `uai_reason text` (replaces `concession_reason`).
- **Conversion of existing demo lots:**

  | Old disposition | Decision / action |
  |---|---|
  | accept | ACCEPT / ACCEPT, accept_qty = qty |
  | concession | ACCEPT / UAI, uai_reason = concession_reason, accept_qty = qty |
  | sort | REJECT / OFFLINE REWORK, reject_qty = qty |
  | reject | REJECT / RTS, reject_qty = qty |

  After conversion, `disposition` and `concession_reason` are dropped.
- `ncrs` is renamed to `mdrs`. Its `disposition` column is replaced by `lot_decision` + `lot_action`. Numbering uses kind `MDR`, and existing NCR numbers are renamed `MDR-…`.
- `approve_inspection(p_id, p_decision, p_action, p_accept_qty, p_reject_qty, p_other, p_uai_reason, p_raise_mdr)` replaces the old signature.
- `submit_inspection` adds the quick-check rules (§3.2) and skips the checklist, dimension and defect checks for `quick` lots.
- `create_inspection` takes `p_grn`, `p_ref`, `p_motor` and accepts `quick` parts. For quick parts there are no defect rows, and the sample size is null.
- `inspection_verdict` returns reject/accept from `quick_result` for quick lots.
- The audit trigger and RLS are extended to the new columns. The new header columns are editable by the owner while Draft/Returned; the decision columns only through `approve_inspection`.

## 6. Screens

- **Inspection page (Inspector, Draft/Returned)**, laid out as Part A:
  1. Lot details
  2. Tests performed (shows which sheets apply)
  3. Quick check (quick parts only)
  4. Component marking
  5. Checklist + Dimensional + Defects (as today)
  6. Test result summary
  7. Sign & submit
- **Inspection page (read-only / Supervisor)**: the same Part A layout, read-only, followed by the **Lot decision** panel (decision, action, qty, raise-MDR tick, UAI reason or "others" text) with **Sign & approve** and **Return**.
- **Print (A4):**
  - Part A as on the paper form: header "KHIND MISTRAL INDUSTRIES SDN BHD · QC DEPARTMENT / INCOMING INSPECTION REPORT (IQC)", the sections above, and the sign-off table;
  - footer "QSP-18-1 (F1-12) Incoming Inspection Report – combined";
  - then the checklist/dimension details and the review & approval log (audit trail);
  - page size A4 (`@page { size: A4; margin: 10mm }`).
- **Suppliers page:** adds the Category field.
- **Parts page:** adds "Appearance & fitting only" to the inspection types.
- **MDR pages** (renamed from NCR): list and detail as today, showing decision/action instead of disposition.
- **Dashboard:**
  - LAR counts **ACCEPT + ACCEPT** only, so UAI is not accepted;
  - "Lots rejected" counts **REJECT**;
  - **quick-check lots count in LAR but not in PPM**, because the NG piece count isn't recorded.
- **Excel / CSV exports:** add the new fields and the decision/action.
- **Role label:** "QC Supervisor" everywhere in the UI.

## 7. Testing

- **pgTAP (cloud, via `npm run db:test`):**
  - decision rules: ACCEPT-with-reject-verdict blocked; UAI needs a reason; OTHERS needs text; qty sum must match; REJECT creates an MDR; Raise MDR on ACCEPT creates an MDR;
  - quick-check submit rules;
  - conversion of old dispositions;
  - self-approval still blocked.
- **Vitest:**
  - `decisionProblems(input)` (`lib/iqc/decision.ts`, same rules as the DB);
  - `buildSummary(bundle)`;
  - quick-check readiness;
  - updated metrics (UAI not accepted), Excel fields.
- **User check:**
  - one normal lot and one quick-check lot, end to end, on a tablet;
  - the print looks like the paper Part A.

## 8. Out of scope (later sub-projects)

The 17 test sheets (2), the full MDR Part B, attachments (image/PDF/video), MRB department signatures and the SBU head dispute (3), real part and supplier lists (4), drawn signatures, the logo image.
