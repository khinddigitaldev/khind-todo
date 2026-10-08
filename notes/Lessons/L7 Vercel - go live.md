# L7 Vercel — go live

**Goal:** the app on a public URL anyone can open. ⏱ 15 min

## Steps

1. vercel.com → **Add New… → Project**.
2. **Import Git Repository** → pick `khind-todo`.
   - Don't see it? Click **Adjust GitHub App Permissions** and give Vercel access to the repo.
3. Framework preset: **Next.js** (auto-detected). Leave build settings as they are.
4. Open **Environment Variables** and add both (same values as `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. **Create Project** (this is the deploy button). Wait ~1 minute → 🎉 "Congratulations!" with a preview of your login page.
6. **Continue to Project** → your public address is under **Domains**, e.g. `https://khind-todo.vercel.app`.
   > Longer addresses like `khind-todo-<team>.vercel.app` ask for a Vercel login (Deployment Protection). Share the short one.

### Tell Supabase about your new address
Supabase → **Authentication → URL Configuration** → **Site URL** = your Vercel URL → Save.
(Used in emails such as confirmation links.)

## Acceptance checklist — test on the live URL

- [ ] Opening the URL sends you to `/login`
- [ ] Create account A → empty list
- [ ] Add, tick, un-tick, delete todos; refresh keeps them
- [ ] Empty todo → "Please type a todo first."
- [ ] Sign out → back to `/login`; visiting `/` sends you to `/login`
- [ ] Create account B (in a private/incognito window) → **can't see A's todos**
- [ ] Works on your phone

## If it goes wrong

| You see | Fix |
|---|---|
| Build failed in Vercel | Open the deployment → **Build Logs**; paste the error into Claude Code |
| Error page "Missing NEXT_PUBLIC_…" | Env vars not set, or added *after* deploying → **Deployments → ⋯ → Redeploy** |
| Login works locally but not live | Check both env values on Vercel for typos/extra spaces |

> `NEXT_PUBLIC_` values are baked into the app **when it builds**. Changing them in Vercel always needs a redeploy.

Next: [[L8 Ship a change - push to deploy]]
