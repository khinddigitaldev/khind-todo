# Part A Cover + Workflow — Implementation Plan

> Executor: superpowers:executing-plans (native). Spec: `notes/Specs/2026-10-15-part-a-cover-design.md`.
> Branch: `feat/part-a-cover`. DB tests: `npm run db:test` (cloud, no Docker). App: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

**Goal:** Part A lot details, quick check, auto summary, KHIND lot decision (Decision + Action + quantities), click-to-sign, NCR → MDR, A4 print, plus the ripple changes.

## Global constraints
- Same as the MVP plan: cloud only, fictional data, publishable key only, Next 16 `<Suspense>` rules.
- The rules live in the database; TypeScript mirrors them for live feedback.
- Database role value stays `qa`; the UI label is "QC Supervisor".
- No logo image (public repo).

## Review focus
1. **ACCEPT + ACCEPT when the verdict is Reject** must be refused. *Tests: Task 1 (SQL), Task 2 (`decisionProblems`).*
2. **Accept qty + Reject qty ≠ lot qty** must be refused. *Same tests.*
3. **Quick-check lot submitted without a result, or NG without a remark,** must be refused. *Tests: Task 1, Task 2.*
4. **Old demo lots:** after conversion, the dashboard and exports still show sensible numbers. *Tests: Task 1 (conversion), Task 2 (metrics).*
5. **Pages and links to `/ncrs`** keep working via a redirect to `/mdrs`. *Test: Task 4 (check that the redirect works).*

---

### Task 1: Database — migration `20261015000100_part_a.sql` + pgTAP `080_part_a.test.sql`
- [ ] Write `080_part_a.test.sql` covering:
  - decision rules: ACCEPT+ACCEPT blocked on a reject verdict; UAI needs a reason; OTHERS needs text; qty sum; REJECT → MDR; Raise MDR on ACCEPT → MDR;
  - quick-check create/submit (no result → error; NG without remark → error; OK → verdict accept);
  - new header columns editable by the owner, decision columns not;
  - self-approval still blocked.
- [ ] Run `npm run db:test -- 080`. Expect RED.
- [ ] Migration:
  - enums `supplier_category`, `lot_decision`, `lot_action`; `inspection_type` gets `quick`;
  - `suppliers.category`;
  - new `inspections` columns; `sample_size` nullable;
  - convert old dispositions; drop `disposition` and `concession_reason`;
  - rename `ncrs` → `mdrs` with `lot_decision` / `lot_action` replacing `disposition`; renumber `NCR-` → `MDR-`;
  - column grants for the new header fields and `mdrs`;
  - replace `create_inspection` (adds `p_grn`, `p_ref`, `p_motor`; quick parts: no defect rows, null sample size);
  - replace `inspection_verdict` (quick lots);
  - replace `submit_inspection` (quick branch);
  - replace `approve_inspection` (new signature and rules);
  - `inspections_resample` skips quick parts.
- [ ] Update the existing tests that use the old API: `020` (direct insert), `030` (approve signature, ncrs → mdrs, summary text) and `040`.
- [ ] `npm run db:push && npm run db:test`. Expect all files GREEN. Then `npm run db:types`.
- [ ] Commit: "feat(db): Part A fields, quick check, KHIND lot decision, NCR→MDR".

### Task 2: Domain logic (TDD)
- [ ] `lib/iqc/types.ts`:
  - add `LotDecision`, `LotAction`, `DECISION_LABELS`, `ACTION_LABELS`, `ALLOWED_ACTIONS`, `SupplierCategory`;
  - remove `Disposition`;
  - `ROLE_LABELS.qa = "QC Supervisor"`.
- [ ] `lib/iqc/decision.ts` + tests: `decisionProblems({ decision, action, acceptQty, rejectQty, qtyReceived, other, uaiReason, verdict }): string[]`, with the same messages as the DB.
- [ ] `lib/iqc/summary.ts` + tests: `buildSummary(bundle): SummaryRow[]`, with `SummaryRow = { form, test, testedBy, samples, ng, result }`.
- [ ] `lib/iqc/readiness.ts` + tests: a quick-check branch (`quick: { result, qty, remark } | null`).
- [ ] `lib/iqc/metrics.ts` + tests:
  - `LotRow` swaps `disposition` for `decision`, `action` and `quick`;
  - LAR counts accept+accept; rejected = decision reject; PPM skips quick lots.
- [ ] `lib/iqc/payload.ts` + tests:
  - `draftSchema.header` gets `grnNo`, `refNo`, `motorPartNo`, `componentMarking`, plus an optional `quick`;
  - `newInspectionSchema` gets `grn`, `ref`, `motor`;
  - `supplierSchema` gets `category`;
  - `partSchema` accepts `quick`.
- [ ] Commit.

### Task 3: Loader, actions, master data
- [ ] `lib/iqc/load.ts`:
  - new fields, quick block, decision / action / quantities / UAI reason / other / raise MDR;
  - `mdr` replaces `ncr`.
- [ ] `app/(app)/inspections/actions.ts`: create (new fields), saveDraft (new header fields + quick).
- [ ] `qa-actions.ts`: `approve` with the new parameters.
- [ ] Suppliers (category) and parts (quick type) forms and lists.
- [ ] Commit.

### Task 4: Screens
- [ ] Inspection form in Part A layout:
  - lot details, tests performed, quick check, component marking, sheets, live summary;
  - **Sign & submit**.
- [ ] Read-only view in Part A layout + sign-off table.
- [ ] QA panel lot-decision form with live `decisionProblems` and **Sign & approve**.
- [ ] Print page: A4 Part A, QSP footer, review & approval log.
- [ ] `/ncrs` → `/mdrs` pages, with a redirect from `/ncrs` and `/ncrs/[id]`.
- [ ] Dashboard (new metrics), Excel and CSV (new fields), nav labels.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build`. Commit.

### Task 5: Verify and hand over
- [ ] Full `npm run db:test` + app checks.
- [ ] Update `notes/Log.md`.
- [ ] Final self-review against the spec.
- [ ] Ask the user before merging to `main` (merging deploys to Vercel).
