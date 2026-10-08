# L6 Build — login and todos

**Goal:** the full app working on your computer against your Supabase project. ⏱ 45 min

## How we build: tests first

For the small "pure" pieces (checking input), we write the **test first**, watch it fail, then write the code until it passes. That's called TDD (test-driven development).

💬 *"Following notes/02 Spec.md, write Vitest tests first for lib/validation.ts (parseTitle, parseCredentials, parseId) and lib/supabase/env.ts. Run them and show me they fail. Then implement until they pass."*

```bash
npm test
```
→ `Tests 23 passed`.

## Then the app

💬 *"Now build the rest of the spec: Supabase server client and proxy (follow Supabase's official Next.js example), the /login page with sign in + create account, and the todo page with add / tick / delete / sign out using Server Actions. Read node_modules/next/dist/docs first — this is Next.js 16."*

### Map of the code

| File | Job |
|---|---|
| `proxy.ts` + `lib/supabase/proxy.ts` | before each request: refresh the login cookie; signed-out → `/login`; signed-in on `/login` → `/` |
| `lib/supabase/server.ts` | makes a Supabase client for server code; `getCurrentUser()` |
| `lib/supabase/env.ts` | reads the two env vars, clear error if missing |
| `lib/validation.ts` | checks todo text, email, password, ids |
| `app/login/actions.ts` | sign in or sign up (which button was clicked decides) |
| `app/actions.ts` | add, tick, delete, sign out — each checks who's signed in first |
| `app/page.tsx` | shows the list (inside `<Suspense>`, required by Next.js 16) |

## Try it

```bash
npm run dev
```

1. Go to http://localhost:3000 → you're sent to `/login`.
2. Type an email + a password of 6+ characters → **Create account** → you land on your list.
3. Add 3 todos, tick one, delete one. Refresh — they're still there (saved in Supabase).
4. In Supabase **Table Editor → todos**, see your rows.
5. **Sign out**, create a second account → its list is empty. RLS works!

## Before you push, run the same checks as CI

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Then 💬 *"Commit and push."*

## If it goes wrong

| You see | Likely cause |
|---|---|
| `Missing NEXT_PUBLIC_SUPABASE_URL…` | `.env.local` missing/misspelled, or dev server not restarted |
| `Invalid login credentials` | wrong password, or account doesn't exist yet |
| `Email not confirmed` | "Confirm email" still on in Supabase (L5 step 3) |
| `new row violates row-level security policy` | schema.sql not run fully; re-run it |
| `relation "public.todos" does not exist` | schema.sql not run at all |

Next: [[L7 Vercel - go live]]
