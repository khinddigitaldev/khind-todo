# L3 GitHub — repo and first push

**Goal:** your project (code + notes) safely stored on GitHub, with automatic checks. ⏱ 20 min

## Words you need

| Word | Meaning |
|---|---|
| **repo** (repository) | a project folder + its full history |
| **commit** | a saved snapshot with a message ("Add login page") |
| **push** | upload your commits to GitHub |
| **main** | the main line of history; Vercel deploys from it |
| **.gitignore** | list of files git must never save (e.g. `.env.local`, `node_modules`) |

## Steps

> Do this after [[L4 Next.js - the app skeleton]] if your folder has no code yet — the order of L3/L4 is flexible.

1. 💬 *"Check that no secrets will be committed: show me .gitignore and git status."* — `.env.local` must **not** appear.
2. 💬 *"Commit everything with a clear message."*
3. 💬 *"Create a public GitHub repo called khind-todo with gh and push to it."*
   Claude runs something like:
   ```bash
   gh repo create khind-todo --public --source . --push
   ```
4. Open the repo on github.com. Click **Actions** — the **CI** workflow runs lint, typecheck, tests and build. Wait for the green ✓.

## What you should see

- Your files (including the `notes` folder) on github.com.
- A green ✓ next to the latest commit.

## If it goes wrong

- *"remote origin already exists"* → `git remote -v` to see where it points.
- Red ✗ in Actions → click it, open the failed step, paste the error into Claude Code: 💬 *"CI failed with this error, fix it."*
- You committed a secret by mistake → treat it as leaked: **rotate it** in Supabase, then remove it. Deleting the file isn't enough — history keeps it.

Next: [[L4 Next.js - the app skeleton]]
