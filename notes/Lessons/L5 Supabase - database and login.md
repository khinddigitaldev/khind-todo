# L5 Supabase — database and login

**Goal:** a Supabase project with the `todos` table, security rules, and email login. ⏱ 20 min

## Steps

### 1. Create the project
1. supabase.com/dashboard → **New project**.
2. Name: `khind-todo`. Region: **Southeast Asia (Singapore)** (closest to Malaysia).
3. Database password: click **Generate**, and save it in a password manager. (The app doesn't need it, but you might later.)
4. Wait ~2 minutes while it starts.

### 2. Create the table + security rules
1. Left menu → **SQL Editor** → **New query**.
2. Paste the whole of `supabase/schema.sql` from the repo → **Run**.
3. Left menu → **Table Editor** → you should see `todos`, with **RLS enabled**.

### 3. Turn off email confirmation (for class)
**Authentication** → **Sign In / Providers** → **Email** → switch off **Confirm email** → Save.
> Why: Supabase's built-in email sender only sends a few emails per hour — a class of 20 would hit the limit. A real product would keep this on and set up its own email sender.

### 4. Copy the two keys into your project
1. Click **Connect** (top of the dashboard) or **Project Settings → API Keys**.
2. In your project folder, copy `.env.example` to a new file `.env.local`.
3. Fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
4. Restart `npm run dev` (env files are read only at start-up).

> **Never** copy the **secret** key (`sb_secret_…`) into this app. It bypasses all the security rules.

## What is Row Level Security (RLS)?

Normally anyone holding the publishable key could read the whole table. RLS adds a rule to **every row**: *"you may only see/change this row if `user_id` is you"*. The check runs inside the database, so even a bug in our app can't leak someone else's todos.

Read the four policies in `schema.sql` — each is one sentence of English.

## What you should see

`todos` in the Table Editor (empty), RLS on, and `.env.local` with two values. `git status` must **not** list `.env.local`.

Next: [[L6 Build - login and todos]]
