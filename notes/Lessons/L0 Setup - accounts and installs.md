# L0 Setup — accounts and installs

**Goal:** every tool installed and every account ready. ⏱ 30 min

## Install on your computer

| Tool | Get it | Check it works (in a terminal) |
|---|---|---|
| Node.js 24 LTS | nodejs.org | `node --version` → `v24…` |
| Git | git-scm.com | `git --version` |
| GitHub CLI | cli.github.com | `gh --version` |
| Obsidian | obsidian.md | opens |
| Claude Code | claude.com/claude-code (desktop app or terminal) | opens |
| A code editor (optional) | VS Code | opens |

## Create free accounts

1. **GitHub** — github.com → Sign up.
2. **Supabase** — supabase.com → Start your project → **Continue with GitHub** (one less password).
3. **Vercel** — vercel.com → Sign up → **Hobby** plan → **Continue with GitHub**.

> Signing in to Supabase and Vercel *with GitHub* links them, which makes L7 much easier.

## Log the GitHub CLI in

```bash
gh auth login
```

Pick **GitHub.com → HTTPS → Login with a web browser** and follow the code it shows.

## What you should see

`gh auth status` says **Logged in to github.com account <your-name>**.

## If it goes wrong

- *"node is not recognized"* → close and reopen the terminal after installing (it needs to reload PATH).
- Corporate laptop blocks installs → ask IT, or use a personal machine for the course.

Next: [[L1 Obsidian - the project notebook]]
