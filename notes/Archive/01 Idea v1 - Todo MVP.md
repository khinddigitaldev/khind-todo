# 01 Idea

**Date:** 2026-10-08

## One sentence

A simple todo list where each person signs in and sees only their own todos — built so beginners can learn the full idea → design → code → live website journey.

## Who is it for?

- **Users of the app:** anyone who wants a private todo list.
- **Real audience:** beginners learning how Obsidian, GitHub, Supabase and Vercel fit together.

## What must it do? (MVP = Minimum Viable Product)

1. Create an account and sign in with email + password.
2. Add a todo.
3. Tick a todo as done (and un-tick it).
4. Delete a todo.
5. Sign out.
6. Nobody can see anyone else's todos.

## What it will NOT do (yet)

Editing a todo's text, due dates, sharing lists, "forgot password", social login, mobile app. Small on purpose — see [[02 Spec]].

## How will we know it worked?

- It's live on a public `*.vercel.app` URL.
- Two different accounts each see only their own todos.
- Changing the code and pushing to GitHub updates the live site automatically.

Next: [[02 Spec]]
