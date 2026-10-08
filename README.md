# KHIND Todo

A simple todo app used to teach the full journey from idea to live website with four tools:

| Tool | Job in this project |
|---|---|
| **Obsidian** | Project notebook: idea, spec, plan, lessons (`notes/` folder) |
| **GitHub** | Stores the code and its history; runs checks on every push |
| **Supabase** | Login (email + password) and the `todos` database table |
| **Vercel** | Builds the app and puts it online; redeploys on every push |

Built with Next.js 16, TypeScript, Tailwind CSS and `@supabase/ssr`.

**Start the course:** open the `notes/` folder as a vault in Obsidian and read `00 Start Here`.

## Run it on your computer

You need Node.js 24+ and a Supabase project (see lesson L5).

```bash
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev                  # open http://localhost:3000
```

Database setup: paste [`supabase/schema.sql`](supabase/schema.sql) into Supabase → SQL Editor → Run.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally with live reload |
| `npm test` | Run the unit tests |
| `npm run lint` | Check code style |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Build for production (what Vercel runs) |

## How the code is organised

```
app/page.tsx            todo list page (server component)
app/actions.ts          add / tick / delete / sign out (Server Actions)
app/add-todo-form.tsx   the "add" form (client component)
app/login/              login page, form and sign-in/sign-up action
lib/supabase/server.ts  Supabase client for server code
lib/supabase/proxy.ts   refreshes the login cookie, guards pages
lib/supabase/env.ts     reads the two env vars with a clear error
lib/validation.ts       input checks (unit tested)
proxy.ts                runs before every request (Next.js 16 "proxy")
supabase/schema.sql     todos table + Row Level Security rules
```

## Security in one paragraph

The Supabase **publishable key** is meant to be public — it ends up in the browser. What keeps data safe is **Row Level Security** (see `supabase/schema.sql`): the database only lets a signed-in user read or change rows whose `user_id` is their own. Never put the **secret** key (`sb_secret_…`) in this app or in any `NEXT_PUBLIC_` variable.
