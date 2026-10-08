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
- **Problem 3 — a garbled character.** Editing a file with an old Windows PowerShell command turned `✗` into `âœ—`. Fixed by rewriting the file. **Lesson:** let Claude Code's own edit tools change files.
