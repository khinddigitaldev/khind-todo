# Log — build diary

Write down what happened, especially what broke and how you fixed it. Newest at the bottom.

## 2026-10-08 — reference build

- **Design:** chose a todo app, Next.js + Supabase, notes inside the repo, public repo. → [[02 Spec v1 - Todo MVP]]
- **Scaffold:** `npx create-next-app@16.4.0 khind-todo` (TypeScript, Tailwind, App Router). It also ran `git init` for us.
- **Problem 1 — Vitest wouldn't install.** npm said `ERESOLVE could not resolve`: Vitest 5 wants `@types/node` 22 or newer, the template had 20.
  **Fix:** `npm install -D @types/node@^24 vitest` (we run Node 24 anyway).
  **Lesson:** read the *first* lines of an npm error; they name the two packages that disagree.
- **Tests first:** wrote `validation.test.ts` and `env.test.ts`, ran them, saw them fail ("Cannot find module"), then wrote the code until they passed. 23 tests green.
- **Problem 2 — build failed: "uncached or runtime data during prerendering".** Next.js 16.4 turns on *Cache Components*: a page that reads cookies (our login) must put that part inside `<Suspense>`.
  **Fix:** the todo page shows its title straight away and streams the list in behind `<Suspense fallback="Loading your todos…">`. The "already signed in? skip login" check moved into `proxy.ts`.
  **Lesson:** frameworks change fast. Check the docs that ship with the version you installed (`node_modules/next/dist/docs/`), not old blog posts.
- **npm audit** shows 5 "high" warnings, all inside ESLint's tooling (dev only, not shipped to users). `npm audit --omit=dev` = 0. We left them.
- **Supabase setup:** created the project, copied the URL + publishable key from **Connect** into `.env.local`.
- **Problem 4 — "Confirm email" looked saved but was still on.** In Supabase a **green** switch means ON. "Save changes" stays greyed out until you actually change something.
  **Fix:** click the switch so it turns **grey**, then **Save changes**.
  **Lesson:** don't trust how a screen looks — check the result. (Claude checked by calling `…/auth/v1/settings`, where `mailer_autoconfirm: true` means confirmation is off.)
- **Local test passed:** sign up, add, tick, delete, sign out, second account can't see the first one's todos.
- **Problem 5 — dev log warning: "encountered the unstable value `Date.now()` while prerendering".** Supabase checks when your login expires using the current time; Next.js 16 wants to pre-build pages and refuses "the current time" during that.
  **Fix:** `await connection()` at the start of `createClient()` in `lib/supabase/server.ts` — "this code runs per request".
  **Lesson:** read the server log (terminal), not only the browser. The page worked, but the log was warning us.
- **Problem 6 — Vercel: "Social Account is not yet connected to any Vercel user".** Clicked *Log in with GitHub* but the Vercel account didn't exist / wasn't linked to GitHub. **Fix:** sign up (or log in the original way) and connect GitHub. Added a warning to [[L0 Setup - accounts and installs]].
- **Live!** Vercel → Add New → Project → Import `khind-todo` → added the 2 env vars → **Create Project** (that's the deploy button now). Live at **https://khind-todo.vercel.app**.
  Note: Vercel also makes team URLs like `khind-todo-<team>.vercel.app`; those are protected by Vercel login. Share the short production URL.
- **Problem 3 — a garbled character.** Editing a file with an old Windows PowerShell command turned `✗` into `âœ—`. Fixed by rewriting the file. **Lesson:** let Claude Code's own edit tools change files.

## 2026-10-12 — new direction: KHIND IQC

- The todo app did its job as a practice run. The real target is an **Incoming Quality Control (IQC)** system, starting from QA's single-file `iqc-checklist-web.html`.
- Decisions: real KHIND use + teaching; roles = inspector, QA approver, purchasing, management; supplier/part data kept in the app (ERP later); repo stays public with **fictional demo data only**; < 30 lots/day on tablet + PC.
- Research surprises worth teaching:
  - **AQL sampling tables (ANSI/ASQ Z1.4, ISO 2859-1) are copyrighted** → the app stores them as data QA enters from the licensed copy; the public repo only has a demo table.
  - **Free tiers aren't for company use**: Vercel Hobby is non-commercial; Supabase Free pauses idle projects and has no backups → paid plans before go-live.
- Old idea + spec moved to `notes/Archive/`. New PRD: [[02 Spec]] (v2 draft, awaiting review).
- **PRD v2.1:** no licensed AQL standard → **KHIND's own sampling table, c = 0** (any defect rejects). No paid plans → **free tiers with listed risks + safeguards** (weekly full export to OneDrive, usage meter, small photos). Not ISO certified → records kept as good practice.
- **MVP = demo system on Vercel Hobby, fictional data only.** No other host, no fallback. Real daily use (and where to host it) is decided after the demo.

## 2026-10-15 — Part A cover (sub-project 1 of 4)

- QC shared their real combined report (`IQC_Combined_Report_A4_3.html`): Part A cover, 17 QSP-18-1 test sheets, MDR Part B (QSP-16-1), attachments, Inspector → QC Supervisor workflow. Split into 4 sub-projects; this is #1. Spec: [[Specs/2026-10-15-part-a-cover-design]].
- **Real data warning:** that HTML file contains KHIND's real supplier list and ~850 KB of real part numbers. It stays out of the public repo.
- Decisions: lot decision exactly as the paper form (ACCEPT / REJECT / OTHERS + 6 actions + accept/reject qty); click-to-sign; sample size still calculated; no self-approval; NCR renamed MDR.
- **Problem 7 — `supabase test db` needs Docker even for the cloud project.** We chose no Docker: `scripts/db-test.mjs` runs each pgTAP file through `supabase db query --linked` inside a function that collects the results and then rolls everything back.
- **Problem 8 — `found` is a reserved PL/pgSQL variable.** `where found is null` was ambiguous. **Fix:** always qualify columns (`d.found`). **Lesson:** avoid column names that clash with language keywords.
- **Problem 9 — `text[] || 'some text'` is read as an array literal.** **Fix:** `array_append(missing, '...')`. The pgTAP test caught it on the first run.
- **Problem 10 — the CLI doesn't re-run a changed seed**, it only records its new hash. **Fix:** `npm run db:seed` runs the (idempotent) seed directly.
- Note: development and the live demo share one Supabase project, so the live site was briefly out of step with the new database until this branch was merged. Next time: a separate dev project.
- Checks: 9 database test files (83 checks) and 130 unit tests green; lint, typecheck and build clean.
