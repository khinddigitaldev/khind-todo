# L4 Next.js — the app skeleton

**Goal:** a working Next.js app running on your computer. ⏱ 15 min

## Steps

1. In the folder *above* your project (e.g. `C:\Github`), 💬 *"Create a Next.js 16 app called khind-todo with TypeScript, Tailwind and the App Router, using npm."*
   Claude runs:
   ```bash
   npx create-next-app@latest khind-todo --ts --tailwind --eslint --app --use-npm --yes
   ```
   (If you already made `khind-todo/notes` in L1, move the `notes` folder into the new project afterwards.)
2. 💬 *"Start the dev server."* → `npm run dev`
3. Open http://localhost:3000.

## What's in the box

| Path | What it is |
|---|---|
| `app/page.tsx` | the home page (`/`) |
| `app/layout.tsx` | wrapper around every page (fonts, `<html>`) |
| `app/globals.css` | global styles (Tailwind) |
| `package.json` | list of libraries + commands (`dev`, `build`, …) |
| `node_modules/` | downloaded libraries — never commit, never edit |
| `AGENTS.md` | notes for AI assistants: "read the docs for *this* Next.js version" |

## Key ideas

- **Server Component** — runs on the server; can safely talk to the database. Default in `app/`.
- **Client Component** — file starts with `"use client"`; runs in the browser; needed for interactivity like "show a spinner while saving".
- **Server Action** — a function marked `"use server"` that a form can call. We use these to add/tick/delete todos.

## What you should see

The Next.js welcome page at localhost:3000. Edit `app/page.tsx`, save, and the page updates by itself.

Next: [[L5 Supabase - database and login]]
