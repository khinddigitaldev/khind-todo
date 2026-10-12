# 02 Spec — KHIND Todo MVP design

**Date:** 2026-10-08 · **Status:** approved · Comes from [[01 Idea]]

## Decisions

| Topic | Decision | Why |
|---|---|---|
| App | Personal todo list with login | Covers login, database, deploy, version control — nothing extra |
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind | Industry standard; official Supabase + Vercel support |
| Login | Supabase Auth, email + password | No extra services to set up |
| Email confirmation | **Off** for the class | Supabase's built-in email sender is rate-limited; the app still works if it's on |
| Database | Supabase Postgres, one `todos` table | |
| Security | Row Level Security (RLS) | The database itself stops users seeing each other's data |
| Hosting | Vercel, connected to GitHub | Every push to `main` redeploys |
| Repo | Public, `khinddigitaldev/khind-todo` | Beginners can clone it. No secrets ever go in it |
| Notes | This Obsidian vault, inside the repo | Notes and code travel together |

## Architecture

```
Browser ──► Vercel (Next.js)
              ├─ proxy.ts          refreshes login cookie; signed-out → /login
              ├─ /login            sign in / create account (Server Action)
              └─ /                 todo list (Server Component) + Server Actions
                       │
                       ▼
              Supabase: Auth + Postgres table `todos` (RLS on)
```

- All Supabase calls happen **on the server** (Server Components and Server Actions). The browser never talks to Supabase directly.
- Next.js 16 note: pages that read the login cookie must render inside `<Suspense>`. The todo page shows its title instantly and streams the list in.

## Data

Table `todos` (see `supabase/schema.sql`):

| Column | Type | Notes |
|---|---|---|
| `id` | bigint, auto | primary key |
| `user_id` | uuid | defaults to the signed-in user (`auth.uid()`); deleted with the user |
| `title` | text | 1–200 characters |
| `is_done` | boolean | default `false` |
| `created_at` | timestamptz | default now; list is sorted by this |

RLS policies: a signed-in user may select / insert / update / delete only rows where `user_id = auth.uid()`.

## Settings (environment variables)

| Name | Where to find it | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect / Project Settings | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys | No — RLS protects the data |

Stored in `.env.local` on your PC (git ignores it) and in Vercel's project settings. Missing values produce a clear error that names them.

## Screens

- **/login** — email, password, buttons **Sign in** and **Create account**. Errors shown in red.
- **/** — "KHIND Todo", your email, "N left", Sign out; an input + **Add**; the list with a tick box and ✕ per item; a friendly message when the list is empty.

## Error handling

| Situation | What the user sees |
|---|---|
| Empty or too-long todo | "Please type a todo first." / "Keep it under 200 characters." |
| Bad email / short password | Message under the form |
| Wrong password, existing account | Supabase's message, e.g. "Invalid login credentials" |
| Database unreachable | "Something went wrong" page with **Try again** |
| Env vars missing | Error naming the missing variable and where to set it |

## Testing

- **Unit tests (Vitest):** input checks (`lib/validation.ts`) and env-var reading (`lib/supabase/env.ts`).
- **GitHub Actions CI:** lint, typecheck, tests, build on every push.
- **Manual acceptance test** on the live URL: see [[L7 Vercel - go live]] checklist, including the two-accounts privacy test.

## Out of scope

Editing todo text, due dates, sharing, password reset, social login, offline mode, automated browser tests.

Next: [[03 Plan]]
