# 01 Idea — KHIND IQC

**Date:** 2026-10-12 · **Replaces:** [[01 Idea v1 - Todo MVP]] (the todo app was our practice run)

## One sentence

A shared web system where KHIND's incoming-quality (IQC) inspectors record every delivered lot, QA approves the decision, purchasing chases supplier problems, and management sees supplier quality — replacing a checklist that lives in one browser.

## Where we start from

Today IQC uses a single HTML checklist (`iqc-checklist-web.html`): header details, OK/NG/N/A checks, dimensional readings, an AQL table, disposition and sign-off, saved **only in that browser** and exported to Excel one inspection at a time.

That works for one inspector, but:
- nobody else can see the record until someone emails the Excel file;
- sample size and accept/reject numbers are looked up and typed by hand;
- "approved by" is a typed name — no proof of who approved, or when;
- answering "how is supplier X doing this quarter?" means opening dozens of files.

## Who is it for?

| Person | Wants |
|---|---|
| IQC inspector | Record a lot quickly on a tablet at the receiving area |
| QA approver | Review, decide, sign off; approve concessions |
| Purchasing | See rejections; raise SCAR / RMA with the supplier |
| Management | Lot acceptance rate and supplier PPM without asking anyone |

It's also still our **teaching project**: the course notes show how it was built.

## How will we know it worked?

- Every incoming lot at the receiving site is recorded in the system.
- QA decides on every lot within one working day.
- Supplier quality reports need zero manual Excel work.
- An auditor can open any inspection and see who did what, and when.

Next: [[02 Spec]]
