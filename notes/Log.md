# Log — build diary

Write down what happened, especially what broke and how you fixed it. Newest at the bottom.

## 2026-10-08 — reference build

- **Design:** chose a todo app, Next.js + Supabase, notes inside the repo, public repo. → [[02 Spec]]
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
